const express = require("express");
const axios = require("axios");
const router = express.Router();
const jwt = require("jsonwebtoken");
const cron = require("node-cron");
const Prediction = require("../Models/PredictionModel");
const User = require("../Models/UserModel");
const twilio = require("twilio");

// Twilio Credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID; 
const authToken = process.env.TWILIO_AUTH_TOKEN; 
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER; 
const client = twilio(accountSid, authToken);

const regionModelMap = {
    orissa: "http://localhost:5000/predict",
};

function getRegion(lat, lon) {
    return "orissa"; 
}

/* -------------------------------------------------------------
    🚀 AUTOMATION MODE: EVERY 1 HOUR & HIGH RISK ONLY
------------------------------------------------------------- */
// Change 1: Updated cron to "0 * * * *" for hourly execution
/* cron.schedule("0 * * * *", async () => {
    console.log("🕒 [Automation] Starting hourly fire risk check...");
    
    try {
        const users = await User.find({ phoneNumber: { $exists: true } });
        console.log(`📊 Checking risk for ${users.length} users.`);

        for (const user of users) {
            const latestPrediction = await Prediction.findOne({ user: user._id })
                                                     .sort({ createdAt: -1 });

            if (!latestPrediction) {
                console.log(`⏩ Skipping ${user.username}: No history found.`);
                continue;
            }

            const { latitude, longitude } = latestPrediction;
            const modelURL = regionModelMap[getRegion(latitude, longitude)];

            try {
                const response = await axios.post(modelURL, { latitude, longitude });
                const risk = response.data.risk;

                // Change 2: Logic added to ONLY send SMS if risk is HIGH
                if (risk && risk.toUpperCase() === "HIGH") {
                    console.log(`⚠️ HIGH RISK detected for ${user.username}. Sending Twilio SMS...`);
                    
                    const currentTime = new Date().toLocaleTimeString();
                    
                    await client.messages.create({
                        body: `🔥 URGENT FIRE ALERT [${currentTime}]:\nAt(${latitude}, ${longitude})\nHigh fire risk detected.\nPlease take necessary precautions!`,
                        from: twilioPhoneNumber,
                        to: user.phoneNumber 
                    });

                    console.log(`✅ HIGH RISK SMS SENT to ${user.phoneNumber}`);
                } else {
                    console.log(`ℹ️ Risk for ${user.username} is ${risk}. No SMS sent.`);
                }

            } catch (innerErr) {
                console.error(`❌ Twilio/ML Error for ${user.username}:`, innerErr.message);
            }
        }
    } catch (error) {
        console.error("❌ Automation Cron Error:", error.message);
    }
});
 */
/* -------------------------------------------------------------
    ✅ POST /api/predict-fire (MANUAL PREDICTION)
------------------------------------------------------------- */
router.post("/predict-fire", async (req, res) => {
    try {
        const { latitude, longitude, isGuest } = req.body;

        if (latitude == null || longitude == null)
            return res.status(400).json({ error: "Missing latitude or longitude" });

        const region = getRegion(latitude, longitude);
        const modelURL = regionModelMap[region];

        const response = await axios.post(modelURL, { latitude, longitude });

        const prediction = response.data.fire_probability;
        const risk = response.data.risk;

        const token = req.cookies.token;

        if (!isGuest && token) {
            try {
                const decoded = jwt.verify(token, process.env.TOKEN_KEY);
                await Prediction.create({
                    user: decoded.id,
                    latitude,
                    longitude,
                    probability: prediction,
                    riskLevel: risk,
                });
                console.log("Prediction stored in DB");
            } catch (err) {
                console.log("Auth failed, not saving.");
            }
        }

        res.json({ region, prediction, risk });

    } catch (error) {
        console.error("Manual Prediction error:", error);
        res.status(500).json({ error: "Prediction failed" });
    }
});

module.exports = router;