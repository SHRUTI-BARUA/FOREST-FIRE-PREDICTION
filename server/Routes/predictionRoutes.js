const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Prediction = require("../Models/PredictionModel");

router.post("/save", async (req, res) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const decoded = jwt.verify(token, process.env.TOKEN_KEY);

    const { latitude, longitude, probability, riskLevel } = req.body;

    await Prediction.create({
      user: decoded.id,
      latitude,
      longitude,
      probability,
      riskLevel,
    });

    res.status(201).json({ message: "Saved successfully" });

  } catch (error) {
    res.status(500).json({ message: "Save failed" });
  }
});

module.exports = router;