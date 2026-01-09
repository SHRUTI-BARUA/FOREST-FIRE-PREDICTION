const router = require('express').Router();
const {
  Signup,
  Login,
  userVerification,
  ForgotPassword,
  ResetPassword,
} = require("../Controllers/AuthController");

router.post('/signup', Signup);
router.post('/login', Login);
router.post('/', userVerification); 
router.post("/forgot-password", ForgotPassword);
router.post("/reset-password/:token", ResetPassword);

module.exports = router;
