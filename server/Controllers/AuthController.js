const User = require("../Models/UserModel");
const bcrypt = require("bcryptjs");
const { createSecretToken } = require("../util/SecretToken");
const jwt = require("jsonwebtoken");
const axios = require("axios"); // For email validation API
const https = require("https"); // <-- THIS MUST BE at the top
const crypto = require("crypto");
const nodemailer = require("nodemailer");


const MAILBOXLAYER_KEY = "d6afc88eedec0185c50f62de2f27c9c1"; // Your API key

/* -------------------------------------------------------------
   ✅ Verify user from cookie token
------------------------------------------------------------- */
module.exports.userVerification = (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.json({ status: false, message: "No token found" });
    }

    jwt.verify(token, process.env.TOKEN_KEY, async (err, data) => {
      if (err) {
        return res.json({ status: false, message: "Invalid token" });
      } else {
        return res.json({ status: true, user: data });
      }
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.json({ status: false, message: "Error verifying user" });
  }
};

/* -------------------------------------------------------------
   ✅ Signup Controller (secure password hashing + real email check)
------------------------------------------------------------- */

module.exports.Signup = async (req, res) => {
  try {
    const { email, password, username, createdAt } = req.body;

    // 1️⃣ Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({ message: "User already exists", success: false });
    }

    // 2️⃣ Validate email using Mailboxlayer API
    const agent = new https.Agent({ rejectUnauthorized: false });
    const response = await axios.get(
      `https://apilayer.net/api/check?access_key=${MAILBOXLAYER_KEY}&email=${email}`,
      { httpsAgent: agent }
    );
    const { format_valid, smtp_check, disposable } = response.data;

    if (!format_valid)
      return res.json({ success: false, message: "Invalid email format" });
    if (!smtp_check)
      return res.json({ success: false, message: "Email does not exist" });
    if (disposable)
      return res.json({ success: false, message: "Disposable emails are not allowed" });

    // 3️⃣ Password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    // Minimum 8 chars, 1 uppercase, 1 lowercase, 1 number
    if (!passwordRegex.test(password)) {
      return res.json({
        success: false,
        message:
          "Password must be at least 8 characters, include 1 uppercase letter, 1 lowercase letter, and 1 number",
      });
    }

    // 4️⃣ Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5️⃣ Create new user
    const user = await User.create({
      email,
      password: hashedPassword,
      username,
      createdAt,
    });

    // 6️⃣ Create JWT token and set cookie
    //const token = createSecretToken(user._id);
    const token = createSecretToken(user);

    res.cookie("token", token, { withCredentials: true, httpOnly: false });

    return res.status(201).json({
      message: "User signed up successfully",
      success: true,
      user: user.username,
    });
  } catch (error) {
    console.error("Signup error:", error.message);
    res.status(500).json({ message: "Server error during signup", success: false });
  }
};


/* -------------------------------------------------------------
   ✅ Login Controller (validates email + password)
------------------------------------------------------------- */
module.exports.Login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.json({ message: "All fields are required", success: false });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({
        message: "Incorrect email or password",
        success: false,
      });
    }

    const auth = await bcrypt.compare(password, user.password);

    if (!auth) {
      return res.json({
        message: "Incorrect email or password",
        success: false,
      });
    }

    //const token = createSecretToken(user._id);
    const token = createSecretToken(user);


    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
      maxAge: 3 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "User logged in successfully",
      success: true,
      user: user.username,
      isVerified: user.isVerified,
    });
  } catch (error) {
    console.error("Login error:", error);
    res
      .status(500)
      .json({ message: "Server error during login", success: false });
  }
};


// --------------------- Forgot Password ---------------------
module.exports.ForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.json({ success: false, message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found" });

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    const resetLink = `http://localhost:3000/reset-password/${resetToken}`;

    // Send email
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Forest Fire Support" <${process.env.EMAIL}>`,
      to: user.email,
      subject: "Password Reset Request",
      html: `<p>Click below to reset your password (expires in 15 min):</p>
             <a href="${resetLink}">${resetLink}</a>`,
    });

    return res.json({ success: true, message: "Password reset link sent to email" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// --------------------- Reset Password ---------------------
module.exports.ResetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) return res.json({ success: false, message: "Password is required" });

    console.log("Token from frontend:", token);
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    console.log("Hashed token:", hashedToken);

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user)
      return res.json({ success: false, message: "Invalid or expired reset token" });

    // Hash new password
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({ success: true, message: "Password reset successful" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
