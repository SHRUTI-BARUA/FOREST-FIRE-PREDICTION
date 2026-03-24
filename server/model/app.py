import os
import joblib
import pandas as pd
import numpy as np
import datetime
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ================= CONFIG =================
OPENWEATHER_KEY = ""
AGRO_POLY_ID = ""
EXPRESS_SAVE_URL = "http://localhost:4000/api/predict-fire/save"

FEATURE_COLS = [
    'LST_C', 'NDVI', 'aspect', 'era_precip', 'landcover', 
    'slope', 'temp_c', 'RH', 'wind_speed', 'month', 'veg_dryness'
]
ODISHA_BOUNDS = {
    "min_lat": 17.8,
    "max_lat": 22.6,
    "min_lon": 81.3,
    "max_lon": 87.5
}
# ================= LOAD MODEL =================
# Ensure these files are in your directory
model = joblib.load("final_fire_model.pkl")
bounds = joblib.load("training_frontiers.pkl")

# ================= LIVE DATA FETCHERS =================

def get_live_ndvi():
    try:
        url = f"http://api.agromonitoring.com/agro/1.0/ndvi/history?polyid={AGRO_POLY_ID}&appid={OPENWEATHER_KEY}"
        resp = requests.get(url, timeout=10)
        data = resp.json()
        if data and len(data) > 0:
            return float(data[-1]['data']['median'])
        return 0.45 
    except:
        return 0.45

def get_live_terrain(lat, lon):
    try:
        elev_url = f"https://api.open-elevation.com/api/v1/lookup?locations={lat},{lon}"
        elev_resp = requests.get(elev_url, timeout=5).json()
        elevation = elev_resp['results'][0]['elevation']
        return {
            "slope": round(min(45, elevation / 50), 2), 
            "aspect": round((lat * 100) % 360, 2),
            "landcover": 4.0 
        }
    except:
        return {"slope": 10.0, "aspect": 180.0, "landcover": 4.0}

def get_live_weather(lat, lon):
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_KEY}&units=metric"
        data = requests.get(url, timeout=5).json()
        return {
            "temp_c": data["main"]["temp"],
            "RH": data["main"]["humidity"],
            "wind_speed": data["wind"]["speed"],
            "era_precip": data.get("rain", {}).get("1h", 0)
        }
    except:
        return None

# ================= MONOTONIC LOGIC =================

def predict_with_monotonic_logic(df):
    probs = model.predict_proba(df)[:, 1]
    
    # Extract values for calculation
    temp = df["temp_c"].values
    lst = df["LST_C"].values
    rh = df["RH"].values
    wind = df["wind_speed"].values
    veg = df["veg_dryness"].values

    total_boost = (
        np.maximum(0, temp - bounds["temp_c"]) * 0.025 +
        np.maximum(0, lst - bounds["LST_C"]) * 0.020 +
        np.maximum(0, bounds["RH"] - rh) * 0.025 +
        np.maximum(0, wind - bounds["wind_speed"]) * 0.050 +
        np.maximum(0, veg - bounds["veg_dryness"]) * 0.015
    )

    final_prob = np.clip(probs + total_boost, 0, 1)
    return (final_prob >= 0.5).astype(int), final_prob

# ================= PREDICT ROUTE =================

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json
        lat = data.get("latitude")
        lon = data.get("longitude")
        is_logged_in = data.get("isLoggedIn", False) # Check login status from frontend
        if not (ODISHA_BOUNDS["min_lat"] <= lat <= ODISHA_BOUNDS["max_lat"] and 
                ODISHA_BOUNDS["min_lon"] <= lon <= ODISHA_BOUNDS["max_lon"]):
            return jsonify({
                "error": "Invalid Coordinates",
                "message": "The system currently only supports locations within Odisha."
            }), 400
        # 1. Fetch all real-time data
        weather = get_live_weather(lat, lon)
        if not weather: 
            return jsonify({"error": "Weather API failed"}), 503
        
        ndvi = get_live_ndvi()
        terrain = get_live_terrain(lat, lon)

        # 2. Construct Feature set
        features = {**weather, **terrain, "NDVI": ndvi}
        features["LST_C"] = features["temp_c"] + 3.5 
        features["month"] = datetime.datetime.now().month
        features["veg_dryness"] = features["NDVI"] * (100 - features["RH"])

        # 3. Convert to DataFrame and Run Model
        df = pd.DataFrame([features])[FEATURE_COLS]
        pred, prob = predict_with_monotonic_logic(df)
        
        probability = float(prob[0])
        prob_percent = probability * 100

        # 4. Determine Risk Level
        if prob_percent < 40:
            risk = "LOW"
        elif prob_percent < 70:
            risk = "MODERATE"
        else:
            risk = "HIGH"

        result = {
            "prediction": int(pred[0]),
            "fire_probability": round(probability, 4),
            "risk": risk,
            "features": features
        }

        # 5. SAVE TO EXPRESS IF LOGGED IN (Exactly like hardcoded logic)
        if is_logged_in:
            try:
                requests.post(
                    EXPRESS_SAVE_URL,
                    json={
                        "latitude": lat,
                        "longitude": lon,
                        "probability": probability,
                        "riskLevel": risk
                    },
                    timeout=3
                )
                print(f"Success: Prediction saved for {lat}, {lon}")
            except Exception as e:
                print("Warning: Failed to save prediction to Express:", e)

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
