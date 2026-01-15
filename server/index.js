const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();
require("dotenv").config();
const cookieParser = require("cookie-parser");
const authRoute = require("./Routes/AuthRoute");

const fireRiskRoute = require("./Routes/FireRiskRoute");

const { MONGO_URL, PORT } = process.env;

// ✅ MongoDB connection
mongoose
  .connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB is connected successfully"))
  .catch((err) => console.error(err));

// ✅ Middlewares
app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// ✅ Routes
app.use("/", authRoute);
app.use("/api", fireRiskRoute); 

app.get("/", (req, res) => {
  res.send("🔥 Root route is working!!");
});

// ✅ Start server (keep this LAST)
app.listen(PORT || 4000, () => {
  console.log(`Server is listening on port ${PORT || 4000}`);
});

