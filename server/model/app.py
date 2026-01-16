from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import math
import os

ODISHA_BOUNDS = {
    "min_lat": 17.8,
    "max_lat": 22.6,
    "min_lo": 81.3,
    "max_lo": 87.5
}

app = Flask(__name__)
CORS(app)

MODEL_PATH = "orissa_model.pkl"
loaded = joblib.load("orissa_model.pkl")

if isinstance(loaded, tuple):
    model = loaded[0]   # 👈 actual ML model
else:
    model = loaded

print("✅ Orissa model loaded")

FEATURE_COLS = [
    'temp_c', 'rh', 'wind_ms', 'rain_mm',
    'NDVI', 'Elevation', 'Slope',
    'DOY_sin', 'DOY_cos', 'Month_sin', 'Month_cos'
]

def build_features(data):
    day = int(data["day"])
    month = int(data["month"])

    features = {
        "temp_c": float(data["temp_c"]),
        "rh": float(data["rh"]),
        "wind_ms": float(data["wind_ms"]),
        "rain_mm": float(data["rain_mm"]),
        "NDVI": float(data["NDVI"]),
        "Elevation": float(data["Elevation"]),
        "Slope": float(data["Slope"]),
        "DOY_sin": math.sin(2 * math.pi * day / 365),
        "DOY_cos": math.cos(2 * math.pi * day / 365),
        "Month_sin": math.sin(2 * math.pi * month / 12),
        "Month_cos": math.cos(2 * math.pi * month / 12),
    }

    df = pd.DataFrame([features], columns=FEATURE_COLS)
    print("🔥 MODEL INPUT\n", df)
    return df

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json

        lat = float(data["latitude"])
        lo = float(data["longitude"])

        if not (
            ODISHA_BOUNDS["min_lat"] <= lat <= ODISHA_BOUNDS["max_lat"]
            and ODISHA_BOUNDS["min_lo"] <= lo <= ODISHA_BOUNDS["max_lo"]
        ):
            return jsonify({
                "fire_probability": 0.0,
                "risk": "LOW",
                "error": "Outside Odisha"
            })

        X = build_features(data)

        prob = (
            float(model.predict_proba(X)[0][1])
            if hasattr(model, "predict_proba")
            else float(model.predict(X)[0])
        )

        return jsonify({
            "fire_probability": prob,
            "risk": "HIGH" if prob >= 0.6 else "LOW"
        })

    except Exception as e:
        print("🔥 ERROR:", e)
        return jsonify({
            "fire_probability": 0.0,
            "risk": "LOW",
            "error": str(e)
        })

if __name__ == "__main__":
    app.run(port=5000, debug=True)
