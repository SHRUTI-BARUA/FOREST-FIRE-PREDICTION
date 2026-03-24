/* const mongoose = require("mongoose");

const predictionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    latitude: Number,
    longitude: Number,
    result: String,
    region: String,
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("Prediction", predictionSchema); */
const mongoose = require("mongoose");

const predictionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  latitude: Number,
  longitude: Number,
  probability: Number,
  riskLevel: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Prediction", predictionSchema);