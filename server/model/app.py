import os
import json
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
from dotenv import load_dotenv
import ee
import rasterio

load_dotenv()  # Load environment variables from .env file

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ✅ SERVICE ACCOUNT AUTH — loaded from environment variables (no JSON file needed)
SERVICE_ACCOUNT = os.environ.get("GEE_SERVICE_ACCOUNT", "")

# Build the credentials dict from individual env vars
_gee_key_data = {
    "type": "service_account",
    "project_id": os.environ.get("GEE_PROJECT_ID", ""),
    "private_key_id": os.environ.get("GEE_PRIVATE_KEY_ID", ""),
    "private_key": os.environ.get("GEE_PRIVATE_KEY", "").replace("\\n", "\n"),
    "client_email": os.environ.get("GEE_CLIENT_EMAIL", SERVICE_ACCOUNT),
    "client_id": os.environ.get("GEE_CLIENT_ID", ""),
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{SERVICE_ACCOUNT.replace('@', '%40')}",
    "universe_domain": "googleapis.com"
}

# Write a temporary key file in memory via a named temp file, or use ServiceAccountCredentials directly
import tempfile
_tmp_key_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
json.dump(_gee_key_data, _tmp_key_file)
_tmp_key_file.flush()
_tmp_key_file.close()

credentials = ee.ServiceAccountCredentials(SERVICE_ACCOUNT, _tmp_key_file.name)
ee.Initialize(credentials)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# ================= CONFIG =================
OPENWEATHER_KEY = os.environ.get("OPENWEATHER_KEY", "")
AGRO_POLY_ID = os.environ.get("AGRO_POLY_ID", "")

FEATURE_COLS = [
    'LST_C', 'NDVI', 'aspect', 'era_precip', 'landcover',
    'slope', 'temp_c', 'RH', 'wind_speed', 'month', 'veg_dryness'
]
# ================= FIRE MODEL CLASS =================
class FireRiskModel:
    
    def __init__(self, model, bounds):
        self.model = model
        self.bounds = bounds
        
    def predict_proba(self, data):
        # 🚀 QUICK MASK FOR NO-MODEL BYPASS
        mask_80 = (data['landcover'] == 80).values
        probs = np.zeros(len(data))

        if not np.all(mask_80):
            # Only run model for valid vegetation/land points
            probs[~mask_80] = self.model.predict_proba(data[~mask_80])[:, 1]
        
        t_boost = np.maximum(0, data['temp_c'].values - self.bounds['temp_c']) * 0.025
        r_boost = np.maximum(0, self.bounds['RH'] - data['RH'].values) * 0.025
        w_boost = np.maximum(0, data['wind_speed'].values - self.bounds['wind_speed']) * 0.050
        v_boost = np.maximum(0, data['veg_dryness'].values - self.bounds['veg_dryness']) * 0.015
        
        seasonal_boost = np.where(
            (data['month'].isin([3,4,5])) & (data['RH'] < 45),
            0.03,
            0
        )
        
        combined_prob = probs + t_boost + r_boost + w_boost + v_boost + seasonal_boost
        
        final_probs = np.where(
            combined_prob >= 0.50,
            0.50 + (combined_prob - 0.50) * 1.5,
            combined_prob
        )
        
        final_probs = np.where(data['landcover'].values == 80, 0.0, final_probs)
        final_probs = np.clip(final_probs, 0, 1.0)
        
        return final_probs
    
    def predict(self, data, threshold=0.52):
        probs = self.predict_proba(data)
        return (probs >= threshold).astype(int)
# ================= LOAD MODEL =================
try:
    model = joblib.load("final_fire_model.pkl")
    bounds = joblib.load("training_frontiers.pkl")
except Exception as e:
    print(f"Error loading model files: {e}")

# ================= LIVE DATA HELPERS =================
# ================= NEW FUNCTION (ADDED) =================

LANDCOVER_FILE = "landcover.tif"
LANDCOVER_DOWNLOAD_URL = os.environ.get("LANDCOVER_DOWNLOAD_URL", "") # e.g., Direct GDrive download link

if not os.path.exists(LANDCOVER_FILE):
    if LANDCOVER_DOWNLOAD_URL:
        print(f"Downloading {LANDCOVER_FILE} from {LANDCOVER_DOWNLOAD_URL}...")
        try:
            response = requests.get(LANDCOVER_DOWNLOAD_URL, stream=True)
            response.raise_for_status()
            with open(LANDCOVER_FILE, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            print("Download complete.")
        except Exception as e:
            print(f"Error downloading {LANDCOVER_FILE}: {e}")
    else:
        print(f"WARNING: {LANDCOVER_FILE} not found and LANDCOVER_DOWNLOAD_URL is not set.")

try:
    landcover_dataset = rasterio.open(LANDCOVER_FILE)
except Exception as e:
    print(f"Error opening {LANDCOVER_FILE}: {e}")
    landcover_dataset = None



def get_landcover(lat, lon):
    """
    Optimized to use the globally opened landcover_dataset for speed.
    """
    try:
        if landcover_dataset is None:
            return 30
        for val in landcover_dataset.sample([(lon, lat)]):
            return int(val[0])
        return 30
    except Exception as e:
        print("❌ LC error:", e)
        return 30
    
 
@lru_cache(maxsize=100)
def get_live_ndvi(lat, lon):
    try:
        point = ee.Geometry.Point([lon, lat])

        today = datetime.date.today()
        start = str(today - datetime.timedelta(days=7))
        end = str(today)

        dataset = (ee.ImageCollection('COPERNICUS/S2_SR')
                   .filterBounds(point)
                   .filterDate(start, end)
                   .sort('CLOUDY_PIXEL_PERCENTAGE')
                   .first())
        if dataset is None:
            return 0.45
        
        ndvi = dataset.normalizedDifference(['B8', 'B4']).rename('NDVI')

        value = ndvi.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=point,
            scale=10
        ).get('NDVI')

        ndvi_value = value.getInfo()

        print("🌿 NDVI VALUE:", ndvi_value)   # ✅ ADDED

        if ndvi_value is None:
            return 0.45
        return float(ndvi_value)

    except Exception as e:
        print("NDVI error:", e)
        return 0.45


def get_live_terrain(lat, lon):
    """
    Warning: Now used primarily for single-point prediction. 
    Grid prediction uses batch_elevation for 10x speedup.
    """
    try:
        elev_url = f"https://api.open-elevation.com/api/v1/lookup?locations={lat},{lon}"
        elev_resp = requests.get(elev_url, timeout=12).json()
        elevation = elev_resp['results'][0]['elevation']

        terrain_data = {
            "slope": round(min(45, elevation / 50), 2),
            "aspect": round((lat * 100) % 360, 2),
            "landcover": get_landcover(lat, lon)
        }
        return terrain_data
    except Exception as e:
        print("⛰️ Terrain error:", e)
        return {"slope": 10.0, "aspect": 180.0, "landcover": 4.0}



@lru_cache(maxsize=100)
def get_live_weather(lat, lon):
    try:
        if lat is None or lon is None:
            print("❌ Missing lat/lon")
            return None

        url = f"https://api.openweathermap.org/data/2.5/weather"
        params = {
            "lat": lat,
            "lon": lon,
            "appid": OPENWEATHER_KEY,
            "units": "metric"
        }

        response = requests.get(url, params=params, timeout=8)
        data = response.json()

        print("🌐 RAW RESPONSE:", data)

        if response.status_code != 200:
            print("❌ HTTP ERROR:", response.status_code)
            return None

        if str(data.get("cod")) != "200":
            print("❌ API ERROR:", data)
            return None

        return {
            "temp_c": data.get("main", {}).get("temp", 30),
            "RH": data.get("main", {}).get("humidity", 50),
            "wind_speed": data.get("wind", {}).get("speed", 2),
            "era_precip": data.get("rain", {}).get("1h", 0)
        }

    except Exception as e:
        print("❌ WEATHER EXCEPTION:", str(e))
        return None

# ================= ROUTES =================

@app.route("/search", methods=["GET"])
def proxy_search():
    try:
        # Pass all query parameters to Nominatim (format, q, lat, lon, etc.)
        params = dict(request.args)
        if "format" not in params:
            params["format"] = "json"
            
        # Nominatim requires a User-Agent
        headers = {
            "User-Agent": "FireGuardAI-Research/1.0 (contact: your-email@example.com)"
        }
        url = "https://nominatim.openstreetmap.org/search"
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        return jsonify(response.json())
    except Exception as e:
        print("❌ Search proxy error:", e)
        return jsonify({"error": str(e)}), 500

def predict_with_monotonic_logic(df):
    print("📊 INPUT DATAFRAME:\n", df)   # ✅ ADDED

    # 🚀 CORE BYPASS: Skip model for Landcover 80 (Water/Urban)
    # This ensures those points 'not even go through the model'
    mask_80 = (df['landcover'] == 80).values
    probs = np.zeros(len(df))

    if not np.all(mask_80):
        # Only predict for valid land/vegetation rows
        df_valid = df[~mask_80]
        probs_raw = model.predict_proba(df_valid)

        if len(probs_raw.shape) == 1:
            p_val = probs_raw
        else:
            p_val = probs_raw[:, 1]
        
        # Re-insert predictions into their original positions
        probs[~mask_80] = p_val

    final_prob = probs

    print("🔥 BASE PROB:", probs)           # ✅ ADDED
    print("🚨 FINAL PROB:", final_prob)    # ✅ ADDED

    return (final_prob >= 0.5).astype(int), final_prob

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        lat, lon = data.get("latitude"), data.get("longitude")

        print("\n📍 REQUEST RECEIVED:", lat, lon)   # ✅ ADDED
        
        # 🚀 QUICK EXIT FOR LANDCOVER 80 (WATER/URBAN/NO-FUEL)
        lc_check = get_landcover(lat, lon)
        if lc_check == 80:
            print(f"🎯 LANDCOVER 80 (Water/Urban) - Skipping Model & API Calls.")
            feat_exit = {
                "temp_c": 0, "RH": 0, "wind_speed": 0, "era_precip": 0,
                "slope": 0, "aspect": 0, "landcover": 80, "NDVI": 0,
                "LST_C": 0, "month": datetime.datetime.now().month, "veg_dryness": 0
            }
            return jsonify({
                "prediction": 0,
                "fire_probability": 0.0,
                "risk": "NO RISK",
                "features": feat_exit
            })

        # weather = get_live_weather(lat, lon)
        weather = get_live_weather(lat, lon)
        if weather is None:
            return jsonify({"error": "Weather API failed"}), 500
        ndvi = get_live_ndvi(lat, lon)
        terrain = get_live_terrain(lat, lon)


        feat = {**weather, **terrain, "NDVI": ndvi}
        feat["LST_C"] = feat["temp_c"] + 3.5
        feat["month"] = datetime.datetime.now().month
        feat["veg_dryness"] = feat["NDVI"] * (100 - feat["RH"])

        print("🧾 FINAL FEATURE VECTOR:", feat)   # ✅ ADDED

        df = pd.DataFrame([feat])[FEATURE_COLS]
        pred, prob = predict_with_monotonic_logic(df)
        
        prob_val = float(prob[0])
        # 🎯 SYNC: Updated to include NO RISK status
        risk = "HIGH" if prob_val >= 0.70 else "MODERATE" if prob_val >= 0.35 else "LOW" if prob_val > 0 else "NO RISK"

        print("🎯 RESULT:", risk, prob_val)   # ✅ ADDED

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

        print("\n📍 GRID REQUEST:", c_lat, c_lon)   # ✅ ADDED

        grid_size, step = 5, 0.002

        lats = [c_lat + i * step for i in range(-grid_size, grid_size + 1)]
        lons = [c_lon + j * step for j in range(-grid_size, grid_size + 1)]
        coords = [(lat, lon) for lat in lats for lon in lons]

        # 🚀 IMMEDIATE CENTRAL BYPASS (WATER/URBAN)
        if get_landcover(c_lat, c_lon) == 80:
            print(f"🎯 GRID BYPASS: Center {c_lat}, {c_lon} is Landcover 80.")
            grid_data = [{"lat": lt, "lon": ln, "risk": 0.0} for lt, ln in coords]
            timeseries = [{"hour": t, "data": grid_data} for t in range(13)]
            return jsonify({
                "status": "success", "initial": timeseries[0]["data"],
                "timeseries": timeseries, "is_high_risk": False
            })

        base_ndvi = get_live_ndvi(c_lat, c_lon)
        weather = get_live_weather(c_lat, c_lon) 

        if weather is None:
            print("❌ WEATHER API FAILED IN GRID REQUEST")
            return jsonify({"error": "Weather API failed for grid prediction"}), 500

        print("🌿 BASE NDVI:", base_ndvi)   # ✅ ADDED
        print("🌦️ BASE WEATHER:", weather) # ✅ ADDED

        # 🚀 PERFORMANCE OPTIMIZATION: Batch Processing
        # instead of ThreadPoolExecutor calling API 121 times, we batch everything.

        # 1. Batch Landcover (Fast local I/O)
        lcs = [get_landcover(lat, lon) for lat, lon in coords]

        # 2. Batch Elevation (One single API call for the whole grid)
        print("📡 FETCHING BATCH ELEVATION...")
        batch_locs = [{"latitude": lat, "longitude": lon} for lat, lon in coords]
        try:
            elev_resp = requests.post(
                "https://api.open-elevation.com/api/v1/lookup", 
                json={"locations": batch_locs}, 
                timeout=12
            ).json()
            elevations = [r['elevation'] for r in elev_resp['results']]
        except Exception as e:
            print("❌ Batch Elevation failed, using defaults:", e)
            elevations = [150.0] * len(coords)

        # 3. Construct Features (Vectorized feel)
        grid_features = []
        for i, (lat, lon) in enumerate(coords):
            elev = elevations[i]
            t = {
                "slope": round(min(45, elev / 50), 2),
                "aspect": round((lat * 100) % 360, 2),
                "landcover": lcs[i]
            }
            f = {**weather, **t, "NDVI": base_ndvi}
            f["LST_C"] = f["temp_c"] + 3.5
            f["month"] = datetime.datetime.now().month
            f["veg_dryness"] = f["NDVI"] * (100 - f["RH"])
            grid_features.append(f)

        print("📦 GRID FEATURES SAMPLE:", grid_features[:5])   # ✅ ADDED

        df_grid = pd.DataFrame(grid_features)[FEATURE_COLS]
        _, probs = predict_with_monotonic_logic(df_grid)

        print("🗺️ GRID PROBABILITIES SAMPLE:", probs[:10])   # ✅ ADDED
        
        side = 2 * grid_size + 1
        risk_matrix = np.array(probs).reshape(side, side)

        # 🎯 SYNC: Ensure visual consistency across the whole grid
        center_val = float(risk_matrix[grid_size, grid_size])
        if center_val < 0.35:
            # Low Risk -> Constant Green Patch (No spread)
            risk_matrix = np.clip(risk_matrix, 0, 0.34)
            fire_steps = [risk_matrix] * 13 # Force constant patch
        elif center_val < 0.70:
            # Moderate Risk -> Yellow/Orange (CA Physics spread)
            risk_matrix = np.clip(risk_matrix, 0.35, 0.69)
            fire_steps = simulate_fire(risk_matrix, steps=12, wind=(1, 0))
        else:
            # High Risk -> Red Zone (CA Physics spread)
            risk_matrix = np.clip(risk_matrix, 0.70, 1.0)
            fire_steps = simulate_fire(risk_matrix, steps=12, wind=(1, 0))

        timeseries = []
        for t, step_map in enumerate(fire_steps):
            step_data = [{"lat": coords[i][0], "lon": coords[i][1], "risk": float(val)} 
                         for i, val in enumerate(step_map.flatten())]
            timeseries.append({"hour": t, "data": step_data})

        return jsonify({
            "status": "success",
            "initial": timeseries[0]["data"],
            "timeseries": timeseries,
            "is_high_risk": bool(center_val >= 0.70)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)




