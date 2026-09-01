const User = require("../Models/UserModel");
const bcrypt = require("bcryptjs");
const { createSecretToken } = require("../util/SecretToken");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const https = require("https");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const MAILBOXLAYER_KEY = process.env.MAILBOXLAYER_KEY || "";

/* -------------------------------------------------------------
    ✅ USER COOKIE VERIFY
------------------------------------------------------------- */
module.exports.userVerification = (req, res) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    if (!token) return res.json({ status: false });

    const secretKey = process.env.TOKEN_KEY || "mySuperStrongSecretKey123";
    jwt.verify(token, secretKey, async (err, data) => {
      if (err) return res.json({ status: false });
      return res.json({ status: true, user: data });
    });
  } catch (error) {
    res.json({ status: false });
  }
};

/* -------------------------------------------------------------
    ✅ SIGNUP (WITH EMAIL VERIFICATION)
------------------------------------------------------------- */
module.exports.Signup = async (req, res) => {
  try {
    const { email, password, username, phoneNumber } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (existingUser.isVerified) {
        return res.json({
          success: false,
          message: "User already registered. Please login.",
        });
      }

      const verifyToken = crypto.randomBytes(32).toString("hex");
      const hashedVerifyToken = crypto
        .createHash("sha256")
        .update(verifyToken)
        .digest("hex");

      existingUser.emailVerificationToken = hashedVerifyToken;
      existingUser.emailVerificationExpires =
        Date.now() + 24 * 60 * 60 * 1000;

      await existingUser.save();

      const frontendBase = process.env.FRONTEND_URL || "http://localhost:3000";
      const verifyLink = `${frontendBase}/verify-email/${verifyToken}`;

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
        to: existingUser.email,
        subject: "Verify Your Email",
        html: `
          <h3>Email Verification</h3>
          <p>Your account exists but is not verified.</p>
          <p>Click below to verify:</p>
          <a href="${verifyLink}">${verifyLink}</a>
        `,
      });

      return res.json({
        success: true,
        message: "Verification email resent. Please verify your email.",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.json({ success: false, message: "Invalid email format" });
    }

    if (MAILBOXLAYER_KEY) {
      try {
        const agent = new https.Agent({ rejectUnauthorized: false });
        const response = await axios.get(
          `https://apilayer.net/api/check?access_key=${MAILBOXLAYER_KEY}&email=${email}`,
          { httpsAgent: agent, timeout: 4000 }
        );
        if (response.data && response.data.format_valid !== undefined) {
          const { format_valid, smtp_check, disposable } = response.data;
          if (!format_valid)
            return res.json({ success: false, message: "Invalid email format" });
          if (disposable)
            return res.json({
              success: false,
              message: "Disposable emails not allowed",
            });
        }
      } catch (checkErr) {
        console.warn("Mailboxlayer check warning:", checkErr.message);
      }
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.json({
        success: false,
        message:
          "Password must be 8+ chars with uppercase, lowercase, number",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const verifyToken = crypto.randomBytes(32).toString("hex");
    const hashedVerifyToken = crypto
      .createHash("sha256")
      .update(verifyToken)
      .digest("hex");

    const user = await User.create({
      email,
      username,
      password: hashedPassword,
      phoneNumber,
      isVerified: false,
      emailVerificationToken: hashedVerifyToken,
      emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000,
    });

    const frontendBase = process.env.FRONTEND_URL || "http://localhost:3000";
    const verifyLink = `${frontendBase}/verify-email/${verifyToken}`;

    try {
      if (process.env.EMAIL && process.env.EMAIL_PASS) {
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
          subject: "Verify Your Email",
          html: `
            <h3>Email Verification</h3>
            <p>Click below to verify your account (expires in 24 hours):</p>
            <a href="${verifyLink}">${verifyLink}</a>
          `,
        });
      } else {
        console.warn("EMAIL / EMAIL_PASS not set; skipping email verification dispatch.");
      }
    } catch (mailError) {
      console.error("Nodemailer error:", mailError.message);
    }

    return res.status(201).json({
      success: true,
      message: "Signup successful! Please check your email to verify before login.",
    });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ success: false, message: error.message || "Signup failed" });
  }
};

/* -------------------------------------------------------------
    ✅ VERIFY EMAIL CONTROLLER
------------------------------------------------------------- */
module.exports.VerifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(200).json({
        success: false,
        message: "Invalid or expired verification link",
      });
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. Please login.",
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Verification failed",
    });
  }
};

/* -------------------------------------------------------------
    ✅ LOGIN (BLOCK IF NOT VERIFIED)
------------------------------------------------------------- */
module.exports.Login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.json({
        success: false,
        message: "All fields are required",
      });
    }

    const user = await User.findOne({ email });
    if (!user)
      return res.json({
        success: false,
        message: "Incorrect email or password",
      });

    if (!user.isVerified)
      return res.json({
        success: false,
        message: "Please verify your email before login",
      });

    const auth = await bcrypt.compare(password, user.password);
    if (!auth)
      return res.json({
        success: false,
        message: "Incorrect email or password",
      });

    const token = createSecretToken(user);

    const isProd = process.env.NODE_ENV === "production" || !process.env.FRONTEND_URL?.includes("localhost");

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: isProd ? "None" : "Lax",
      secure: isProd ? true : false,
      maxAge: 3 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: "Login successful",
      token: token,
      user: {
        _id: user._id,
        id: user._id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        isVerified: user.isVerified,
      },
      isVerified: user.isVerified,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ success: false, message: error.message || "Login failed" });
  }
};

/* -------------------------------------------------------------
    ✅ FORGOT PASSWORD
------------------------------------------------------------- */
module.exports.ForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.json({ success: false, message: "No registered account found with this email" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    const frontendBase = process.env.FRONTEND_URL || "https://forest-fire-prediction-weld.vercel.app";
    const resetLink = `${frontendBase}/reset-password/${resetToken}`;

    if (process.env.EMAIL && process.env.EMAIL_PASS) {
      try {
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
          subject: "Reset Your ForestGuard Password",
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #e67e22;">Password Reset Request</h2>
              <p>We received a request to reset your ForestGuard account password.</p>
              <p>Click the button below to choose a new password (valid for 15 minutes):</p>
              <p style="margin: 20px 0;">
                <a href="${resetLink}" style="background-color: #e67e22; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
              </p>
              <p>Or paste this link into your browser:</p>
              <p><a href="${resetLink}">${resetLink}</a></p>
              <p style="color: #888; font-size: 12px; margin-top: 25px;">If you didn't request this reset, you can safely ignore this email.</p>
            </div>
          `,
        });
      } catch (mailError) {
        console.error("Nodemailer reset error:", mailError.message);
        return res.status(500).json({
          success: false,
          message: "Unable to deliver reset email. Please try again or check support.",
        });
      }
    } else {
      console.warn("EMAIL credentials not set; email dispatch skipped.");
    }

    res.json({ success: true, message: "Password reset link sent! Check your inbox." });
  } catch (error) {
    console.error("ForgotPassword error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to process request" });
  }
};

/* -------------------------------------------------------------
    ✅ RESET PASSWORD
------------------------------------------------------------- */
module.exports.ResetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.json({
        success: false,
        message: "Password reset link is invalid or has expired.",
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: "Password reset successful! You can now log in.",
    });
  } catch (error) {
    console.error("ResetPassword error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to reset password" });
  }
};

/* -------------------------------------------------------------
    ✅ SAVE LOCATION (NEW)
// ------------------------------------------------------------- */
// module.exports.SaveLocation = async (req, res) => {
//   try {
//     const { latitude, longitude, userId } = req.body;

//     if (!latitude || !longitude) {
//       return res.json({ success: false, message: "Coordinates are required" });
//     }

//     const user = await User.findByIdAndUpdate(
//       userId,
//       { latitude, longitude },
//       { new: true }
//     );

//     if (!user) {
//       return res.json({ success: false, message: "User not found" });
//     }

//     res.json({ 
//       success: true, 
//       message: "Location saved! You will receive alerts for this area." 
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: "Failed to save location" });
//   }
// };
module.exports.SaveLocation = async (req, res) => {
  try {
    const { latitude, longitude, userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { latitude, longitude },
      { new: true }
    );

    console.log(`✅ Database Updated for ${updatedUser.username}: Lat ${latitude}, Lon ${longitude}`);
    
    res.status(200).json({ status: true, message: "Location saved" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

module.exports.CheckAuth = async (req, res) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.json({ status: false });
    }

    const secretKey = process.env.TOKEN_KEY || "mySuperStrongSecretKey123";
    const decoded = jwt.verify(token, secretKey);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.json({ status: false });
    }

    return res.json({
      status: true,
      user: {
        id: user._id,
        _id: user._id,
        email: user.email,
        username: user.username,
        phoneNumber: user.phoneNumber,
        latitude: user.latitude,
        longitude: user.longitude,
      },
    });
  } catch (err) {
    return res.json({ status: false });
  }
};

module.exports.Logout = (req, res) => {
  const isProd = process.env.NODE_ENV === "production" || !process.env.FRONTEND_URL?.includes("localhost");
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: isProd ? "None" : "Lax",
    secure: isProd ? true : false,
  });

  return res.json({ success: true, message: "Logged out successfully" });
};