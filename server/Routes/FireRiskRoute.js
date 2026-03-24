// // // // // // // const express = require("express");
// // // // // // // const axios = require("axios");
// // // // // // // const router = express.Router();
// // // // // // // const jwt = require("jsonwebtoken");
// // // // // // // const Prediction = require("../Models/PredictionModel");

// // // // // // // // Map regions to Flask endpoints
// // // // // // // const regionModelMap = {
// // // // // // //     orissa: "http://localhost:5000/predict",
// // // // // // // };

// // // // // // // // Determine region based on coordinates
// // // // // // // function getRegion(lat, lon) {
// // // // // // //     if (lat >= 19 && lat <= 21 && lon >= 84 && lon <= 87) return "orissa";
// // // // // // //     return "orissa"; 
// // // // // // // }

// // // // // // // // POST /api/predict-fire
// // // // // // // router.post("/predict-fire", async (req, res) => {
// // // // // // //     try {
// // // // // // //         const { latitude, longitude, isGuest } = req.body;

// // // // // // //         if (latitude == null || longitude == null)
// // // // // // //             return res.status(400).json({ error: "Missing latitude or longitude" });

// // // // // // //         const region = getRegion(latitude, longitude);
// // // // // // //         const modelURL = regionModelMap[region];

// // // // // // //         const response = await axios.post(modelURL, {
// // // // // // //             latitude,
// // // // // // //             longitude,
// // // // // // //         });

// // // // // // //         const prediction = response.data.fire_probability;
// // // // // // //         const risk = response.data.risk;

// // // // // // //         const token = req.cookies.token;

// // // // // // //         if (!isGuest && token) {
// // // // // // //             try {
// // // // // // //                 const decoded = jwt.verify(token, process.env.TOKEN_KEY);

// // // // // // //                 await Prediction.create({
// // // // // // //                     user: decoded.id,
// // // // // // //                     latitude,
// // // // // // //                     longitude,
// // // // // // //                     probability: prediction,
// // // // // // //                     riskLevel: risk,
// // // // // // //                 });

// // // // // // //                 console.log("Prediction saved to DB");
// // // // // // //             } catch (err) {
// // // // // // //                 console.log("Token invalid, not saving prediction");
// // // // // // //             }
// // // // // // //         }

// // // // // // //         res.json({
// // // // // // //             region,
// // // // // // //             prediction,
// // // // // // //             risk,
// // // // // // //         });

// // // // // // //     } catch (error) {
// // // // // // //         console.error("Prediction error:", error);
// // // // // // //         res.status(500).json({ error: "Prediction failed" });
// // // // // // //     }
// // // // // // // });

// // // // // // // module.exports = router;



// // // // // // const express = require("express");
// // // // // // const axios = require("axios");
// // // // // // const router = express.Router();
// // // // // // const jwt = require("jsonwebtoken");
// // // // // // const cron = require("node-cron");
// // // // // // const Prediction = require("../Models/PredictionModel");
// // // // // // const User = require("../Models/UserModel"); // Import User model to access saved locations

// // // // // // // Map regions to Flask endpoints
// // // // // // const regionModelMap = {
// // // // // //     orissa: "http://localhost:5000/predict",
// // // // // // };

// // // // // // // Determine region based on coordinates
// // // // // // function getRegion(lat, lon) {
// // // // // //     if (lat >= 19 && lat <= 21 && lon >= 84 && lon <= 87) return "orissa";
// // // // // //     return "orissa"; 
// // // // // // }

// // // // // // /* -------------------------------------------------------------
// // // // // //     ✅ HOURLY BACKGROUND FIRE RISK CHECK (Fast2SMS)
// // // // // // ------------------------------------------------------------- */
// // // // // // // This runs automatically every hour (at minute 0)
// // // // // // cron.schedule("0 * * * *", async () => {
// // // // // //     console.log("🕒 [Automation] Starting hourly fire risk check for all users...");
    
// // // // // //     try {
// // // // // //         // Find all users who have both coordinates and a phone number saved
// // // // // //         const users = await User.find({ 
// // // // // //             latitude: { $exists: true }, 
// // // // // //             longitude: { $exists: true },
// // // // // //             phoneNumber: { $exists: true }
// // // // // //         });

// // // // // //         for (const user of users) {
// // // // // //             const region = getRegion(user.latitude, user.longitude);
// // // // // //             const modelURL = regionModelMap[region];

// // // // // //             // Request prediction for the user's specific saved location
// // // // // //             const response = await axios.post(modelURL, {
// // // // // //                 latitude: user.latitude,
// // // // // //                 longitude: user.longitude,
// // // // // //             });

// // // // // //             const risk = response.data.risk;

// // // // // //             // Trigger SMS via Fast2SMS if the risk is HIGH
// // // // // //             if (risk && risk.toUpperCase() === "HIGH") {
// // // // // //                 try {
// // // // // //                     await axios.get('https://www.fast2sms.com/dev/bulkV2', {
// // // // // //                         params: {
// // // // // //                             authorization: process.env.FAST2SMS_API_KEY,
// // // // // //                             message: `⚠️ FOREST FIRE ALERT: High risk detected at your saved location (${user.latitude}, ${user.longitude}). Please stay alert!`,
// // // // // //                             language: "english",
// // // // // //                             route: "q", // Quick SMS route (No DLT needed)
// // // // // //                             numbers: user.phoneNumber
// // // // // //                         }
// // // // // //                     });
// // // // // //                     console.log(`📩 SMS Alert successfully sent to ${user.username} (${user.phoneNumber})`);
// // // // // //                 } catch (smsErr) {
// // // // // //                     console.error(`❌ Failed to send SMS to ${user.username}:`, smsErr.message);
// // // // // //                 }
// // // // // //             }
// // // // // //         }
// // // // // //     } catch (error) {
// // // // // //         console.error("❌ Background Check Error:", error.message);
// // // // // //     }
// // // // // // });

// // // // // // /* -------------------------------------------------------------
// // // // // //     ✅ POST /api/predict-fire (MANUAL PREDICTION)
// // // // // // ------------------------------------------------------------- */
// // // // // // router.post("/predict-fire", async (req, res) => {
// // // // // //     try {
// // // // // //         const { latitude, longitude, isGuest } = req.body;

// // // // // //         if (latitude == null || longitude == null)
// // // // // //             return res.status(400).json({ error: "Missing latitude or longitude" });

// // // // // //         const region = getRegion(latitude, longitude);
// // // // // //         const modelURL = regionModelMap[region];

// // // // // //         const response = await axios.post(modelURL, {
// // // // // //             latitude,
// // // // // //             longitude,
// // // // // //         });

// // // // // //         const prediction = response.data.fire_probability;
// // // // // //         const risk = response.data.risk;

// // // // // //         const token = req.cookies.token;

// // // // // //         if (!isGuest && token) {
// // // // // //             try {
// // // // // //                 const decoded = jwt.verify(token, process.env.TOKEN_KEY);

// // // // // //                 await Prediction.create({
// // // // // //                     user: decoded.id,
// // // // // //                     latitude,
// // // // // //                     longitude,
// // // // // //                     probability: prediction,
// // // // // //                     riskLevel: risk,
// // // // // //                 });

// // // // // //                 console.log("Prediction saved to DB");
// // // // // //             } catch (err) {
// // // // // //                 console.log("Token invalid, not saving prediction");
// // // // // //             }
// // // // // //         }

// // // // // //         res.json({
// // // // // //             region,
// // // // // //             prediction,
// // // // // //             risk,
// // // // // //         });

// // // // // //     } catch (error) {
// // // // // //         console.error("Prediction error:", error);
// // // // // //         res.status(500).json({ error: "Prediction failed" });
// // // // // //     }
// // // // // // });

// // // // // // module.exports = router;
// // // // // const express = require("express");
// // // // // const axios = require("axios");
// // // // // const router = express.Router();
// // // // // const jwt = require("jsonwebtoken");
// // // // // const cron = require("node-cron");
// // // // // const Prediction = require("../Models/PredictionModel");
// // // // // const User = require("../Models/UserModel");

// // // // // // Map regions to Flask endpoints
// // // // // const regionModelMap = {
// // // // //     orissa: "http://localhost:5000/predict",
// // // // // };

// // // // // // Determine region based on coordinates
// // // // // function getRegion(lat, lon) {
// // // // //     if (lat >= 19 && lat <= 21 && lon >= 84 && lon <= 87) return "orissa";
// // // // //     return "orissa"; 
// // // // // }

// // // // // /* -------------------------------------------------------------
// // // // //     ✅ HOURLY BACKGROUND FIRE RISK CHECK (Fast2SMS)
// // // // // ------------------------------------------------------------- */
// // // // // cron.schedule("0 * * * *", async () => {
// // // // //     console.log("🕒 [Automation] Starting hourly fire risk check...");
    
// // // // //     try {
// // // // //         const users = await User.find({ 
// // // // //             latitude: { $exists: true }, 
// // // // //             longitude: { $exists: true },
// // // // //             phoneNumber: { $exists: true }
// // // // //         });

// // // // //         for (const user of users) {
// // // // //             const region = getRegion(user.latitude, user.longitude);
// // // // //             const modelURL = regionModelMap[region];

// // // // //             const response = await axios.post(modelURL, {
// // // // //                 latitude: user.latitude,
// // // // //                 longitude: user.longitude,
// // // // //             });

// // // // //             const risk = response.data.risk;

// // // // //             // Trigger SMS via Fast2SMS if the risk is HIGH
// // // // //             if (risk && risk.toUpperCase() === "HIGH") {
// // // // //                 try {
// // // // //                     // This matches the GET request structure in your screenshot
// // // // //                     await axios.get('https://www.fast2sms.com/dev/bulkV2', {
// // // // //                         params: {
// // // // //                             authorization: process.env.FAST2SMS_API_KEY,
// // // // //                             route: 'q', // 'q' stands for Quick SMS route
// // // // //                             message: `⚠️ FIRE ALERT: High risk detected at your saved location (${user.latitude}, ${user.longitude}). Please stay alert!`,
// // // // //                             language: 'english',
// // // // //                             flash: '0',
// // // // //                             numbers: user.phoneNumber
// // // // //                         }
// // // // //                     });
// // // // //                     console.log(`📩 SMS Alert successfully sent to ${user.username}`);
// // // // //                 } catch (smsErr) {
// // // // //                     console.error(`❌ Fast2SMS Error:`, smsErr.message);
// // // // //                 }
// // // // //             }
// // // // //         }
// // // // //     } catch (error) {
// // // // //         console.error("❌ Background Check Error:", error.message);
// // // // //     }
// // // // // });

// // // // // /* -------------------------------------------------------------
// // // // //     ✅ POST /api/predict-fire (MANUAL PREDICTION)
// // // // // ------------------------------------------------------------- */
// // // // // router.post("/predict-fire", async (req, res) => {
// // // // //     try {
// // // // //         const { latitude, longitude, isGuest } = req.body;

// // // // //         if (latitude == null || longitude == null)
// // // // //             return res.status(400).json({ error: "Missing latitude or longitude" });

// // // // //         const region = getRegion(latitude, longitude);
// // // // //         const modelURL = regionModelMap[region];

// // // // //         const response = await axios.post(modelURL, {
// // // // //             latitude,
// // // // //             longitude,
// // // // //         });

// // // // //         const prediction = response.data.fire_probability;
// // // // //         const risk = response.data.risk;

// // // // //         const token = req.cookies.token;

// // // // //         if (!isGuest && token) {
// // // // //             try {
// // // // //                 const decoded = jwt.verify(token, process.env.TOKEN_KEY);

// // // // //                 await Prediction.create({
// // // // //                     user: decoded.id,
// // // // //                     latitude,
// // // // //                     longitude,
// // // // //                     probability: prediction,
// // // // //                     riskLevel: risk,
// // // // //                 });

// // // // //                 console.log("Prediction saved to DB");
// // // // //             } catch (err) {
// // // // //                 console.log("Token invalid, not saving prediction");
// // // // //             }
// // // // //         }

// // // // //         res.json({
// // // // //             region,
// // // // //             prediction,
// // // // //             risk,
// // // // //         });

// // // // //     } catch (error) {
// // // // //         console.error("Prediction error:", error);
// // // // //         res.status(500).json({ error: "Prediction failed" });
// // // // //     }
// // // // // });

// // // // // module.exports = router;

// // // // const express = require("express");
// // // // const axios = require("axios");
// // // // const router = express.Router();
// // // // const jwt = require("jsonwebtoken");
// // // // const cron = require("node-cron");
// // // // const Prediction = require("../Models/PredictionModel");
// // // // const User = require("../Models/UserModel");

// // // // // Map regions to Flask endpoints
// // // // const regionModelMap = {
// // // //     orissa: "http://localhost:5000/predict",
// // // // };

// // // // // Determine region based on coordinates
// // // // function getRegion(lat, lon) {
// // // //     if (lat >= 19 && lat <= 21 && lon >= 84 && lon <= 87) return "orissa";
// // // //     return "orissa"; 
// // // // }

// // // // /* -------------------------------------------------------------
// // // //     ✅ TEST MODE: EVERY 1 MINUTE & ALL RISK LEVELS
// // // // // ------------------------------------------------------------- */
// // // // // cron.schedule("* * * * *", async () => {
// // // // //     console.log("🕒 [TEST RUN] Starting 1-minute fire risk check for all users...");
    
// // // // //     try {
// // // // //         const users = await User.find({ 
// // // // //             latitude: { $exists: true }, 
// // // // //             longitude: { $exists: true },
// // // // //             phoneNumber: { $exists: true }
// // // // //         });

// // // // //         for (const user of users) {
// // // // //             const region = getRegion(user.latitude, user.longitude);
// // // // //             const modelURL = regionModelMap[region];

// // // // //             const response = await axios.post(modelURL, {
// // // // //                 latitude: user.latitude,
// // // // //                 longitude: user.longitude,
// // // // //             });

// // // // //             const risk = response.data.risk;
// // // // //             console.log(`🔍 Prediction for ${user.username}: ${risk}`);

// // // // //             // TRIGGER SMS FOR ALL RISKS DURING TESTING
// // // // //             try {
// // // // //                 await axios.get('https://www.fast2sms.com/dev/bulkV2', {
// // // // //                     params: {
// // // // //                         authorization: process.env.FAST2SMS_API_KEY,
// // // // //                         route: 'q', // Quick SMS route
// // // // //                         message: `TEST ALERT: The fire risk at your location (${user.latitude}, ${user.longitude}) is currently ${risk.toUpperCase()}.`,
// // // // //                         language: 'english',
// // // // //                         flash: '0',
// // // // //                         numbers: user.phoneNumber
// // // // //                     }
// // // // //                 });
// // // // //                 console.log(`📩 SMS successfully triggered for ${user.username} at ${user.phoneNumber}`);
// // // // //             } catch (smsErr) {
// // // // //                 console.error(`❌ Fast2SMS Error:`, smsErr.message);
// // // // //             }
// // // // //         }
// // // // //     } catch (error) {
// // // // //         console.error("❌ Background Check Error:", error.message);
// // // // //     }
// // // // // });

// // // // cron.schedule("* * * * *", async () => {
// // // //     console.log("🕒 [DEBUG] Minute-by-minute fire check starting...");
    
// // // //     try {
// // // //         const users = await User.find({}); // Get ALL users first to check their data
// // // //         console.log(`📊 Found ${users.length} total users in DB.`);

// // // //         for (const user of users) {
// // // //             console.log(`--- Checking User: ${user.username || 'Unknown'} ---`);
            
// // // //             // Debugging the data check
// // // //             if (!user.latitude || !user.longitude || !user.phoneNumber) {
// // // //                 console.log(`❌ Skipping user: Missing info. Lat: ${user.latitude}, Lon: ${user.longitude}, Phone: ${user.phoneNumber}`);
// // // //                 continue;
// // // //             }

// // // //             const region = getRegion(user.latitude, user.longitude);
// // // //             const modelURL = regionModelMap[region];

// // // //             console.log(`📡 Contacting Flask ML at: ${modelURL}`);
            
// // // //             const response = await axios.post(modelURL, {
// // // //                 latitude: user.latitude,
// // // //                 longitude: user.longitude,
// // // //             });

// // // //             const risk = response.data.risk;
// // // //             console.log(`🔥 ML Result: ${risk}`);

// // // //             console.log(`📱 Attempting to send SMS to: ${user.phoneNumber}`);
            
// // // //             try {
// // // //                 const smsResponse = await axios.get('https://www.fast2sms.com/dev/bulkV2', {
// // // //                     params: {
// // // //                         authorization: process.env.FAST2SMS_API_KEY,
// // // //                         route: 'q', 
// // // //                         message: `TEST: Risk is ${risk}. Lat: ${user.latitude}, Lon: ${user.longitude}`,
// // // //                         language: 'english',
// // // //                         flash: '0',
// // // //                         numbers: user.phoneNumber
// // // //                     }
// // // //                 });
// // // //                 console.log(`✅ Fast2SMS API Response:`, smsResponse.data);
// // // //             } catch (smsErr) {
// // // //                 console.error(`❌ Fast2SMS API Error:`, smsErr.response?.data || smsErr.message);
// // // //             }
// // // //         }
// // // //     } catch (error) {
// // // //         console.error("❌ Major Cron Error:", error.message);
// // // //     }
// // // // });
// // // // /* -------------------------------------------------------------
// // // //     ✅ POST /api/predict-fire (MANUAL PREDICTION)
// // // // ------------------------------------------------------------- */
// // // // router.post("/predict-fire", async (req, res) => {
// // // //     try {
// // // //         const { latitude, longitude, isGuest } = req.body;

// // // //         if (latitude == null || longitude == null)
// // // //             return res.status(400).json({ error: "Missing latitude or longitude" });

// // // //         const region = getRegion(latitude, longitude);
// // // //         const modelURL = regionModelMap[region];

// // // //         const response = await axios.post(modelURL, {
// // // //             latitude,
// // // //             longitude,
// // // //         });

// // // //         const prediction = response.data.fire_probability;
// // // //         const risk = response.data.risk;

// // // //         const token = req.cookies.token;

// // // //         if (!isGuest && token) {
// // // //             try {
// // // //                 const decoded = jwt.verify(token, process.env.TOKEN_KEY);

// // // //                 await Prediction.create({
// // // //                     user: decoded.id,
// // // //                     latitude,
// // // //                     longitude,
// // // //                     probability: prediction,
// // // //                     riskLevel: risk,
// // // //                 });

// // // //                 console.log("Prediction saved to DB");
// // // //             } catch (err) {
// // // //                 console.log("Token invalid, not saving prediction");
// // // //             }
// // // //         }

// // // //         res.json({
// // // //             region,
// // // //             prediction,
// // // //             risk,
// // // //         });

// // // //     } catch (error) {
// // // //         console.error("Prediction error:", error);
// // // //         res.status(500).json({ error: "Prediction failed" });
// // // //     }
// // // // });

// // // // module.exports = router;




// // // const express = require("express");
// // // const axios = require("axios");
// // // const router = express.Router();
// // // const jwt = require("jsonwebtoken");
// // // const cron = require("node-cron");
// // // const Prediction = require("../Models/PredictionModel");
// // // const User = require("../Models/UserModel");

// // // // Map regions to Flask endpoints
// // // const regionModelMap = {
// // //     orissa: "http://localhost:5000/predict",
// // // };

// // // function getRegion(lat, lon) {
// // //     return "orissa"; 
// // // }

// // // /* -------------------------------------------------------------
// // //     ✅ HOURLY AUTOMATED FIRE RISK CHECK
// // // ------------------------------------------------------------- */
// // // // Runs every hour at minute 0 (0 * * * *)
// // // cron.schedule("0 * * * *", async () => {
// // //     console.log("🕒 [Automation] Starting hourly fire risk check for all registered users...");
    
// // //     try {
// // //         // 1. Get all users who have a phone number
// // //         const users = await User.find({ phoneNumber: { $exists: true } });
// // //         console.log(`📊 Found ${users.length} users with phone numbers.`);

// // //         for (const user of users) {
// // //             // 2. Find the LATEST prediction/location for this specific user
// // //             const latestPrediction = await Prediction.findOne({ user: user._id })
// // //                                                      .sort({ createdAt: -1 });

// // //             if (!latestPrediction) {
// // //                 console.log(`⏩ Skipping ${user.username}: No location history found in Prediction collection.`);
// // //                 continue;
// // //             }

// // //             const { latitude, longitude } = latestPrediction;
// // //             const modelURL = regionModelMap[getRegion(latitude, longitude)];

// // //             // 3. Contact Flask ML with the user's last known location
// // //             try {
// // //                 const response = await axios.post(modelURL, { latitude, longitude });
// // //                 const risk = response.data.risk;

// // //                 console.log(`🔍 User: ${user.username} | Lat: ${latitude} | Risk: ${risk}`);

// // //                 // 4. If Risk is HIGH, send the SMS Alert
// // //                 if (risk && risk.toUpperCase() === "HIGH") {
// // //                     await axios.get('https://www.fast2sms.com/dev/bulkV2', {
// // //                         params: {
// // //                             authorization: process.env.FAST2SMS_API_KEY,
// // //                             route: 'q',
// // //                             message: `⚠️ FIRE ALERT: High risk detected at your last analyzed location (${latitude}, ${longitude}). Please stay safe!`,
// // //                             language: 'english',
// // //                             flash: '0',
// // //                             numbers: user.phoneNumber
// // //                         }
// // //                     });
// // //                     console.log(`📩 ALERT SENT to ${user.username} at ${user.phoneNumber}`);
// // //                 }
// // //             } catch (innerErr) {
// // //                 console.error(`❌ ML/SMS Error for ${user.username}:`, innerErr.message);
// // //             }
// // //         }
// // //     } catch (error) {
// // //         console.error("❌ Automation Cron Error:", error.message);
// // //     }
// // // });

// // // /* -------------------------------------------------------------
// // //     ✅ POST /api/predict-fire (MANUAL PREDICTION)
// // // ------------------------------------------------------------- */
// // // router.post("/predict-fire", async (req, res) => {
// // //     try {
// // //         const { latitude, longitude, isGuest } = req.body;

// // //         if (latitude == null || longitude == null)
// // //             return res.status(400).json({ error: "Missing latitude or longitude" });

// // //         const region = getRegion(latitude, longitude);
// // //         const modelURL = regionModelMap[region];

// // //         const response = await axios.post(modelURL, { latitude, longitude });

// // //         const prediction = response.data.fire_probability;
// // //         const risk = response.data.risk;

// // //         const token = req.cookies.token;

// // //         if (!isGuest && token) {
// // //             try {
// // //                 const decoded = jwt.verify(token, process.env.TOKEN_KEY);
// // //                 // Saves to the Prediction collection
// // //                 await Prediction.create({
// // //                     user: decoded.id,
// // //                     latitude,
// // //                     longitude,
// // //                     probability: prediction,
// // //                     riskLevel: risk,
// // //                 });
// // //                 console.log("Prediction saved to DB for user history");
// // //             } catch (err) {
// // //                 console.log("Token invalid, not saving prediction");
// // //             }
// // //         }

// // //         res.json({
// // //             region,
// // //             prediction,
// // //             risk,
// // //         });

// // //     } catch (error) {
// // //         console.error("Prediction error:", error);
// // //         res.status(500).json({ error: "Prediction failed" });
// // //     }
// // // });

// // // module.exports = router;



// // const express = require("express");
// // const axios = require("axios");
// // const router = express.Router();
// // const jwt = require("jsonwebtoken");
// // const cron = require("node-cron");
// // const Prediction = require("../Models/PredictionModel");
// // const User = require("../Models/UserModel");

// // // Map regions to Flask endpoints
// // const regionModelMap = {
// //     orissa: "http://localhost:5000/predict",
// // };

// // function getRegion(lat, lon) {
// //     return "orissa"; 
// // }

// // /* -------------------------------------------------------------
// //     🚀 TEST MODE: EVERY 1 MINUTE & ALL RISK LEVELS
// // ------------------------------------------------------------- */
// // cron.schedule("* * * * *", async () => {
// //     console.log("🕒 [TEST RUN] Starting minute-by-minute fire risk check...");
    
// //     try {
// //         // 1. Fetch all users
// //         const users = await User.find({ phoneNumber: { $exists: true } });
// //         console.log(`📊 Testing ${users.length} users.`);

// //         for (const user of users) {
// //             // 2. Find the most recent location from the Prediction collection
// //             const latestPrediction = await Prediction.findOne({ user: user._id })
// //                                                      .sort({ createdAt: -1 });

// //             if (!latestPrediction) {
// //                 console.log(`⏩ Skipping ${user.username}: No history in Prediction schema.`);
// //                 continue;
// //             }

// //             const { latitude, longitude } = latestPrediction;
// //             const modelURL = regionModelMap[getRegion(latitude, longitude)];

// //             try {
// //                 // 3. Get prediction from Flask
// //                 const response = await axios.post(modelURL, { latitude, longitude });
// //                 const risk = response.data.risk;

// //                 console.log(`🔍 User: ${user.username} | Risk: ${risk} | Sending SMS...`);

// //                 // 4. TEST: Send SMS for ALL risks 
// //                 // Added a unique timestamp (currentTime) to bypass Fast2SMS spam filters
// //                 const currentTime = new Date().toLocaleTimeString();
                
// //                 await axios.get('https://www.fast2sms.com/dev/bulkV2', {
// //                     params: {
// //                         authorization: process.env.FAST2SMS_API_KEY,
// //                         route: 'q',
// //                         message: `TEST [${currentTime}]: Current fire risk at (${latitude}, ${longitude}) is ${risk.toUpperCase()}.`,
// //                         language: 'english',
// //                         flash: '0',
// //                         numbers: user.phoneNumber
// //                     }
// //                 });
// //                 console.log(`✅ TEST SMS SENT to ${user.phoneNumber}`);

// //             } catch (innerErr) {
// //                 // Enhanced error logging to capture the exact 400 error reason
// //                 console.error(`❌ SMS API Error for ${user.username}:`, innerErr.response?.data || innerErr.message);
// //             }
// //         }
// //     } catch (error) {
// //         console.error("❌ Test Cron Error:", error.message);
// //     }
// // });

// // /* -------------------------------------------------------------
// //     ✅ POST /api/predict-fire (MANUAL PREDICTION)
// // ------------------------------------------------------------- */
// // router.post("/predict-fire", async (req, res) => {
// //     try {
// //         const { latitude, longitude, isGuest } = req.body;

// //         if (latitude == null || longitude == null)
// //             return res.status(400).json({ error: "Missing latitude or longitude" });

// //         const region = getRegion(latitude, longitude);
// //         const modelURL = regionModelMap[region];

// //         const response = await axios.post(modelURL, { latitude, longitude });

// //         const prediction = response.data.fire_probability;
// //         const risk = response.data.risk;

// //         const token = req.cookies.token;

// //         if (!isGuest && token) {
// //             try {
// //                 const decoded = jwt.verify(token, process.env.TOKEN_KEY);
// //                 await Prediction.create({
// //                     user: decoded.id,
// //                     latitude,
// //                     longitude,
// //                     probability: prediction,
// //                     riskLevel: risk,
// //                 });
// //                 console.log("Prediction stored in DB");
// //             } catch (err) {
// //                 console.log("Auth failed, not saving.");
// //             }
// //         }

// //         res.json({ region, prediction, risk });

// //     } catch (error) {
// //         console.error("Manual Prediction error:", error);
// //         res.status(500).json({ error: "Prediction failed" });
// //     }
// // });

// // module.exports = router;



// const express = require("express");
// const axios = require("axios");
// const router = express.Router();
// const jwt = require("jsonwebtoken");
// const cron = require("node-cron");
// const Prediction = require("../Models/PredictionModel");
// const User = require("../Models/UserModel");
// const twilio = require("twilio"); // 1. Added Twilio requirement

// // 2. Initialize Twilio Client
// // It is highly recommended to put these in your .env file
// const accountSid = process.env.TWILIO_ACCOUNT_SID; 
// const authToken = process.env.TWILIO_AUTH_TOKEN; 
// const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER; 
// const client = twilio(accountSid, authToken);

// // Map regions to Flask endpoints
// const regionModelMap = {
//     orissa: "http://localhost:5000/predict",
// };

// function getRegion(lat, lon) {
//     return "orissa"; 
// }

// /* -------------------------------------------------------------
//     🚀 TEST MODE: EVERY 1 MINUTE & ALL RISK LEVELS
// ------------------------------------------------------------- */
// cron.schedule("* * * * *", async () => {
//     console.log("🕒 [TEST RUN] Starting minute-by-minute fire risk check via Twilio...");
    
//     try {
//         // 1. Fetch all users
//         const users = await User.find({ phoneNumber: { $exists: true } });
//         console.log(`📊 Testing ${users.length} users.`);

//         for (const user of users) {
//             // 2. Find the most recent location from the Prediction collection
//             const latestPrediction = await Prediction.findOne({ user: user._id })
//                                                      .sort({ createdAt: -1 });

//             if (!latestPrediction) {
//                 console.log(`⏩ Skipping ${user.username}: No history in Prediction schema.`);
//                 continue;
//             }

//             const { latitude, longitude } = latestPrediction;
//             const modelURL = regionModelMap[getRegion(latitude, longitude)];

//             try {
//                 // 3. Get prediction from Flask
//                 const response = await axios.post(modelURL, { latitude, longitude });
//                 const risk = response.data.risk;

//                 console.log(`🔍 User: ${user.username} | Risk: ${risk} | Sending Twilio SMS...`);

//                 const currentTime = new Date().toLocaleTimeString();
                
//                 // 4. TWILIO SMS CALL
//                 // Note: Trial accounts only send to VERIFIED numbers.
//                 await client.messages.create({
//                     body: `TEST [${currentTime}]: Current fire risk at (${latitude}, ${longitude}) is ${risk.toUpperCase()}.`,
//                     from: twilioPhoneNumber,
//                     to: user.phoneNumber // Must include country code, e.g., +919876543210
//                 });

//                 console.log(`✅ TWILIO SMS SENT to ${user.phoneNumber}`);

//             } catch (innerErr) {
//                 // Captures specific Twilio errors (like unverified number or balance issues)
//                 console.error(`❌ Twilio API Error for ${user.username}:`, innerErr.message);
//             }
//         }
//     } catch (error) {
//         console.error("❌ Test Cron Error:", error.message);
//     }
// });

// /* -------------------------------------------------------------
//     ✅ POST /api/predict-fire (MANUAL PREDICTION)
// ------------------------------------------------------------- */
// router.post("/predict-fire", async (req, res) => {
//     try {
//         const { latitude, longitude, isGuest } = req.body;

//         if (latitude == null || longitude == null)
//             return res.status(400).json({ error: "Missing latitude or longitude" });

//         const region = getRegion(latitude, longitude);
//         const modelURL = regionModelMap[region];

//         const response = await axios.post(modelURL, { latitude, longitude });

//         const prediction = response.data.fire_probability;
//         const risk = response.data.risk;

//         const token = req.cookies.token;

//         if (!isGuest && token) {
//             try {
//                 const decoded = jwt.verify(token, process.env.TOKEN_KEY);
//                 await Prediction.create({
//                     user: decoded.id,
//                     latitude,
//                     longitude,
//                     probability: prediction,
//                     riskLevel: risk,
//                 });
//                 console.log("Prediction stored in DB");
//             } catch (err) {
//                 console.log("Auth failed, not saving.");
//             }
//         }

//         res.json({ region, prediction, risk });

//     } catch (error) {
//         console.error("Manual Prediction error:", error);
//         res.status(500).json({ error: "Prediction failed" });
//     }
// });

// module.exports = router;



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
cron.schedule("0 * * * *", async () => {
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