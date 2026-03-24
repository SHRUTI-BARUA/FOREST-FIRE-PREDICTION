// const router = require('express').Router();
// const {
//   Signup,
//   Login,
//   userVerification,
//   ForgotPassword,
//   ResetPassword,
//   CheckAuth,   
//   Logout,
// } = require("../Controllers/AuthController");
// const { VerifyEmail } = require("../Controllers/AuthController");

// router.get("/verify-email/:token", VerifyEmail);


// router.post('/signup', Signup);
// router.post('/login', Login);
// router.get('/verify', userVerification);
// router.post("/logout", Logout);
// router.get("/check-auth", CheckAuth);
// router.post("/forgot-password", ForgotPassword);
// router.post("/reset-password/:token", ResetPassword);

// module.exports = router;

const express = require('express');
const router = express.Router();
const {
  Signup,
  Login,
  userVerification,
  ForgotPassword,
  ResetPassword,
  CheckAuth,   
  Logout,
  SaveLocation // ✅ Added this import
} = require("../Controllers/AuthController");
const { VerifyEmail } = require("../Controllers/AuthController");

// Email Verification
router.get("/verify-email/:token", VerifyEmail);

// Authentication Routes
router.post('/signup', Signup);
router.post('/login', Login);
router.get('/verify', userVerification);
router.post("/logout", Logout);
router.get("/check-auth", CheckAuth);
router.post("/forgot-password", ForgotPassword);
router.post("/reset-password/:token", ResetPassword);

// ✅ NEW: Route for syncing user location for SMS alerts
router.post("/save-location", SaveLocation); 

module.exports = router;