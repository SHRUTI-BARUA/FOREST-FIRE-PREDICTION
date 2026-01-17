const express = require("express");
const axios = require("axios");
const router = express.Router();

// Map regions to Flask endpoints
const regionModelMap = {
  
  orissa: "http://localhost:8003/predict/orissa",
};

// Determine region based on coordinates
function getRegion(lat, lon) {
 
  if (lat >= 19 && lat <= 21 && lon >= 84 && lon <= 87) return "orissa";
  return "orissa"; // default
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
