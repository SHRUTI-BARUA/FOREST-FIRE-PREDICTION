from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np

app = Flask(__name__)
CORS(app)

# ------------------ LOAD MODEL ASSETS ------------------
model = joblib.load("model/fire_model.pkl")
scaler = joblib.load("model/scaler.pkl")
FEATURES = joblib.load("model/fire_features.pkl")

# ------------------ HEALTH CHECK ------------------
@app.route("/", methods=["GET"])
def home():
    return {"status": "Fire Prediction API running"}

# ------------------ PREDICTION ROUTE ------------------
@app.route("/predict", methods=["POST"])
def predict():
    data = request.json

    input_data = []
    for feature in FEATURES:
        if feature not in data:
            return jsonify({"error": f"{feature} is required"}), 400
        input_data.append(data[feature])

    X = np.array([input_data])
    X = scaler.transform(X)

    prediction = int(model.predict(X)[0])
    probability = float(model.predict_proba(X)[0][1])

    return jsonify({
        "fire": prediction,
        "confidence": round(probability, 3)
    })

if __name__ == "__main__":
    app.run(debug=True)
