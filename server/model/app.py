"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
import math
import os
from sklearn.impute import SimpleImputer

app = Flask(__name__)
CORS(app)

# ==========================
# Load all models
# ==========================
MODELS = {}

MODEL_PATHS = {
    "orissa": "orissa_model.pkl",
    "algeria": "algeria_model.pkl",
    
}

FEATURE_COLS = ['temp_c', 'rh', 'wind_ms', 'rain_mm', 'NDVI', 'Elevation', 'Slope',
                'DOY_sin', 'DOY_cos', 'Month_sin', 'Month_cos']

for name, path in MODEL_PATHS.items():
    if os.path.exists(path):
        loaded = joblib.load(path)

        # Normalize all models to tuple: (model, imputer, feature_cols)
        if isinstance(loaded, tuple):
            model, imputer, cols = loaded
            MODELS[name] = (model, imputer, cols)
        else:
            # If raw model, add dummy imputer + feature columns
            MODELS[name] = (loaded, SimpleImputer(strategy='median'), FEATURE_COLS)

        print(f"✅ Loaded model {name}: {MODELS[name]}")
    else:
        print(f"⚠️ Model not found: {path}")

print("All models loaded:", list(MODELS.keys()))

# ==========================
# Feature builder
# ==========================
def build_features(data, feature_cols):
    features = {}

    # Add numeric features
    for col in feature_cols:
        if col in data:
            features[col] = data[col]

    # Add cyclical features
    day = int(data.get("day", 1))
    month = int(data.get("month", 1))

    if "DOY_sin" in feature_cols:
        features["DOY_sin"] = math.sin(2 * math.pi * day / 365)
    if "DOY_cos" in feature_cols:
        features["DOY_cos"] = math.cos(2 * math.pi * day / 365)

    if "Month_sin" in feature_cols:
        features["Month_sin"] = math.sin(2 * math.pi * month / 12)
    if "Month_cos" in feature_cols:
        features["Month_cos"] = math.cos(2 * math.pi * month / 12)

    df = pd.DataFrame([features], columns=feature_cols)
    return df

# ==========================
# Prediction API
# ==========================
@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        model_name = data.get("model")
        if model_name not in MODELS:
            return jsonify({"error": f"Invalid model name: {model_name}"}), 400

        model, imputer, feature_cols = MODELS[model_name]

        X = build_features(data, feature_cols)
        X_imp = imputer.fit_transform(X)  # fit_transform ensures missing values handled

        # Some models may not have predict_proba (like older RF)
        if hasattr(model, "predict_proba"):
            prob = model.predict_proba(X_imp)[0, 1]
        else:
            # fallback: binary predict, 0 or 1
            pred = model.predict(X_imp)[0]
            prob = float(pred)

        risk = "HIGH" if prob >= 0.6 else "LOW"

        return jsonify({
            "model": model_name,
            "fire_probability": float(prob),
            "risk": risk
        })

    except Exception as e:
        print("🔥 ERROR:", e)  # prints to console for debugging
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
import math
import os
from sklearn.impute import SimpleImputer

app = Flask(__name__)
CORS(app)

# ==========================
# Load all models
# ==========================
MODELS = {}

MODEL_PATHS = {
    "orissa": "orissa_model.pkl",
    "algeria": "algeria_model.pkl",
    # add "portugal": "portugal_model.pkl" if available
}

FEATURE_COLS = ['temp_c', 'rh', 'wind_ms', 'rain_mm', 'NDVI', 'Elevation', 'Slope',
                'DOY_sin', 'DOY_cos', 'Month_sin', 'Month_cos']

for name, path in MODEL_PATHS.items():
    if os.path.exists(path):
        loaded = joblib.load(path)
        if isinstance(loaded, tuple):
            model, imputer, cols = loaded
            MODELS[name] = (model, imputer, cols)
        else:
            MODELS[name] = (loaded, SimpleImputer(strategy='median'), FEATURE_COLS)
        print(f"✅ Loaded model {name}")
    else:
        print(f"⚠️ Model not found: {path}")

print("All models loaded:", list(MODELS.keys()))

# ==========================
# Feature builder
# ==========================
def build_features(data, feature_cols):
    features = {}

    # Default placeholders if missing
    default_values = {
        "temp_c": 30, "rh": 45, "wind_ms": 3, "rain_mm": 0,
        "NDVI": 0.7, "Elevation": 100, "Slope": 5
    }

    for col in feature_cols:
        features[col] = data.get(col, default_values.get(col, 0))

    # Add cyclical features
    day = int(data.get("day", 1))
    month = int(data.get("month", 1))

    if "DOY_sin" in feature_cols:
        features["DOY_sin"] = math.sin(2 * math.pi * day / 365)
    if "DOY_cos" in feature_cols:
        features["DOY_cos"] = math.cos(2 * math.pi * day / 365)
    if "Month_sin" in feature_cols:
        features["Month_sin"] = math.sin(2 * math.pi * month / 12)
    if "Month_cos" in feature_cols:
        features["Month_cos"] = math.cos(2 * math.pi * month / 12)

    return pd.DataFrame([features], columns=feature_cols)

# ==========================
# Prediction API
# ==========================
@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        model_name = data.get("model")
        if model_name not in MODELS:
            return jsonify({"error": f"Invalid model name: {model_name}"}), 400

        model, imputer, feature_cols = MODELS[model_name]

        X = build_features(data, feature_cols)
        X_imp = imputer.fit_transform(X)

        if hasattr(model, "predict_proba"):
            prob = model.predict_proba(X_imp)[0, 1]
        else:
            pred = model.predict(X_imp)[0]
            prob = float(pred)

        risk = "HIGH" if prob >= 0.6 else "LOW"

        return jsonify({
            "model": model_name,
            "fire_probability": float(prob),
            "risk": risk
        })

    except Exception as e:
        print("🔥 ERROR:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
