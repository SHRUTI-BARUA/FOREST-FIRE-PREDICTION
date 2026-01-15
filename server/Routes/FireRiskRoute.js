/*
const express = require("express");
const axios = require("axios");
const router = express.Router();

// Map regions to Flask endpoints
const regionModelMap = {
  portugal: "http://localhost:8002/predict",
  algeria: "http://localhost:8001/predict",
  orissa: "http://localhost:8003/predict",
};

// Function to determine region from coordinates
function getRegion(lat, lon) {
  // Example bounding boxes — adjust as needed
  if (lat >= 36 && lat <= 42 && lon >= -9 && lon <= -6) return "portugal";
  if (lat >= 28 && lat <= 36 && lon >= 0 && lon <= 10) return "algeria";
  if (lat >= 19 && lat <= 21 && lon >= 84 && lon <= 87) return "orissa";

  // default
  return "portugal";
}

// POST /api/predict-fire
router.post("/predict-fire", async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (latitude == null || longitude == null) {
      return res.status(400).json({ error: "Missing latitude or longitude" });
    }

    // Determine region
    const region = getRegion(latitude, longitude);
    const modelURL = regionModelMap[region];

    // Call the respective Flask model
    const response = await axios.post(modelURL, {
      features: [latitude, longitude], // adjust if model expects more inputs
    });

    const prediction = response.data.fire_risk;

    res.json({
      region,
      prediction,
    });
  } catch (error) {
    console.error("Prediction error:", error.message);
    res.status(500).json({ error: "Prediction failed" });
  }
});

module.exports = router;
*/
const express = require("express");
const axios = require("axios");
const router = express.Router();

// Map regions to Flask endpoints
const regionModelMap = {
  portugal: "http://localhost:8002/predict/portugal",
  algeria: "http://localhost:8001/predict/algeria",
  orissa: "http://localhost:8003/predict/orissa",
};

// Determine region based on coordinates
function getRegion(lat, lon) {
  if (lat >= 36 && lat <= 42 && lon >= -9 && lon <= -6) return "portugal";
  if (lat >= 28 && lat <= 36 && lon >= 0 && lon <= 10) return "algeria";
  if (lat >= 19 && lat <= 21 && lon >= 84 && lon <= 87) return "orissa";
  return "portugal"; // default
}

// POST /api/predict-fire
router.post("/predict-fire", async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (latitude == null || longitude == null)
      return res.status(400).json({ error: "Missing latitude or longitude" });

    const region = getRegion(latitude, longitude);
    const modelURL = regionModelMap[region];

    const response = await axios.post(modelURL, {
      features: [latitude, longitude],
    });

    res.json({ region, prediction: response.data.fire_risk });
  } catch (error) {
    console.error("Prediction error:", error.message);
    res.status(500).json({ error: "Prediction failed" });
  }
});

module.exports = router;
