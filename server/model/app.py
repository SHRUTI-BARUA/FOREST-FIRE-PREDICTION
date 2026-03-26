import os
import joblib
import requests
import pandas as pd
import numpy as np
import datetime
import urllib3
from flask import Flask, request, jsonify
from flask_cors import CORS
from fire_spread import simulate_fire
from functools import lru_cache
from concurrent.futures import ThreadPoolExecutor

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

from dotenv import load_dotenv

# Load root-level .env if it exists, otherwise check local
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

app = Flask(__name__)
# Updated CORS to be more permissive for local development
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# ================= CONFIG =================
OPENWEATHER_KEY = os.getenv("OPENWEATHER_KEY")
AGRO_POLY_ID = os.getenv("AGRO_POLY_ID")

FEATURE_COLS = [
    'LST_C', 'NDVI', 'aspect', 'era_precip', 'landcover',
    'slope', 'temp_c', 'RH', 'wind_speed', 'month', 'veg_dryness'
]

# Load model and bounds relative to this script's directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "final_fire_model.pkl")
BOUNDS_PATH = os.path.join(BASE_DIR, "training_frontiers.pkl")

try:
    model = joblib.load(MODEL_PATH)
    bounds = joblib.load(BOUNDS_PATH)
except Exception as e:
    print(f"CRITICAL: Failed to load model files at {BASE_DIR}: {e}")

# ================= LIVE DATA HELPERS =================

@lru_cache(maxsize=100)
def get_live_ndvi(lat, lon):
    try:
        url = f"http://api.agromonitoring.com/agro/1.0/ndvi?lat={lat}&lon={lon}&appid={OPENWEATHER_KEY}"
        resp = requests.get(url, timeout=3)
        data = resp.json()
        return float(data.get("data", {}).get("median", 0.45))
    except:
        return 0.45

def get_live_terrain(lat, lon):
    try:
        elev_url = f"https://api.open-elevation.com/api/v1/lookup?locations={lat},{lon}"
        elev_resp = requests.get(elev_url, timeout=3).json()
        elevation = elev_resp['results'][0]['elevation']
        return {
            "slope": round(min(45, elevation / 50), 2),
            "aspect": round((lat * 100) % 360, 2),
            "landcover": 4.0
        }
    except:
        return {"slope": 10.0, "aspect": 180.0, "landcover": 4.0}

@lru_cache(maxsize=100)
def get_live_weather(lat, lon):
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_KEY}&units=metric"
        response = requests.get(url, timeout=3)
        data = response.json()
        return {
            "temp_c": data["main"].get("temp", 30),
            "RH": data["main"].get("humidity", 50),
            "wind_speed": data.get("wind", {}).get("speed", 2),
            "era_precip": data.get("rain", {}).get("1h", 0)
        }
    except:
        return {"temp_c": 30, "RH": 50, "wind_speed": 2, "era_precip": 0}

def predict_with_monotonic_logic(df):
    probs = model.predict_proba(df)[:, 1]
    total_boost = (
        # Increased weights for more dynamic probability range
        np.maximum(0, df["temp_c"].values - bounds["temp_c"] + 5) * 0.035 + 
        np.maximum(0, df["LST_C"].values - bounds["LST_C"] + 5) * 0.030 +
        np.maximum(0, bounds["RH"] - df["RH"].values + 10) * 0.040 +
        np.maximum(0, df["wind_speed"].values - bounds["wind_speed"]) * 0.060 +
        np.maximum(0, (0.8 - df["NDVI"].values)) * 0.20 # High NDVI means less dry fuel boost
    )
    final_prob = np.clip(probs + total_boost, 0, 1)
    return (final_prob >= 0.5).astype(int), final_prob

# ================= ROUTES =================

@lru_cache(maxsize=1000)
def get_live_terrain_cached(lat, lon):
    return get_live_terrain(lat, lon)

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        lat, lon = data.get("latitude"), data.get("longitude")
        
        weather = get_live_weather(lat, lon)
        ndvi = get_live_ndvi(lat, lon)
        terrain = get_live_terrain(lat, lon)

        feat = {**weather, **terrain, "NDVI": ndvi}
        feat["LST_C"] = feat["temp_c"] + 3.5
        feat["month"] = datetime.datetime.now().month
        feat["veg_dryness"] = feat["NDVI"] * (100 - feat["RH"])

        df = pd.DataFrame([feat])[FEATURE_COLS]
        pred, prob = predict_with_monotonic_logic(df)
        
        prob_val = float(prob[0])
        risk = "HIGH" if prob_val > 0.7 else "MODERATE" if prob_val > 0.4 else "LOW"

        return jsonify({
            "prediction": int(pred[0]),
            "fire_probability": round(prob_val, 4),
            "risk": risk,
            "features": feat
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/predict-grid", methods=["POST"])
def predict_grid():
    try:
        data = request.get_json()
        c_lat, c_lon = data.get("latitude"), data.get("longitude")
        grid_size, step = 5, 0.007 # Increased step for broader landscape coverage

        lats = [c_lat + i * step for i in range(-grid_size, grid_size + 1)]
        lons = [c_lon + j * step for j in range(-grid_size, grid_size + 1)]
        coords = [(lat, lon) for lat in lats for lon in lons]

        base_ndvi = get_live_ndvi(c_lat, c_lon)
        weather = get_live_weather(c_lat, c_lon) 

        def fetch_features(coord):
            clat, clon = coord
            t = get_live_terrain_cached(clat, clon)
            f = {**weather, **t, "NDVI": base_ndvi}
            f["LST_C"] = f["temp_c"] + 3.5
            f["month"] = datetime.datetime.now().month
            f["veg_dryness"] = f["NDVI"] * (100 - f["RH"])
            return f

        with ThreadPoolExecutor(max_workers=10) as executor:
            grid_features = list(executor.map(fetch_features, coords))

        df_grid = pd.DataFrame(grid_features)[FEATURE_COLS]
        _, probs = predict_with_monotonic_logic(df_grid)
        
        side = 2 * grid_size + 1
        risk_matrix = np.array(probs).reshape(side, side)
        
        # Increased to 18-hour forecast
        fire_steps = simulate_fire(risk_matrix, steps=18, wind=(1, 0))
        
        timeseries = []
        for t, step_map in enumerate(fire_steps):
            step_data = [{"lat": coords[i][0], "lon": coords[i][1], "risk": float(val)} 
                         for i, val in enumerate(step_map.flatten())]
            timeseries.append({"hour": t, "data": step_data})

        return jsonify({
            "status": "success",
            "initial": timeseries[0]["data"],
            "timeseries": timeseries,
            "is_high_risk": bool(risk_matrix[grid_size, grid_size] >= 0.7)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
