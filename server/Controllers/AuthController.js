// // const User = require("../Models/UserModel");
// // const bcrypt = require("bcryptjs");
// // const { createSecretToken } = require("../util/SecretToken");
// // const jwt = require("jsonwebtoken");
// // const axios = require("axios");
// // const https = require("https");
// // const crypto = require("crypto");
// // const nodemailer = require("nodemailer");

// // const MAILBOXLAYER_KEY = "d6afc88eedec0185c50f62de2f27c9c1";
// // /* -------------------------------------------------------------
// //    ✅ USER COOKIE VERIFY
// // ------------------------------------------------------------- */
// // module.exports.userVerification = (req, res) => {
// //   try {
// //     const token = req.cookies.token;
// //     if (!token) return res.json({ status: false });

// //     jwt.verify(token, process.env.TOKEN_KEY, async (err, data) => {
// //       if (err) return res.json({ status: false });
// //       return res.json({ status: true, user: data });
// //     });
// //   } catch (error) {
// //     res.json({ status: false });
// //   }
// // };

// // /* -------------------------------------------------------------
// //    ✅ SIGNUP (WITH EMAIL VERIFICATION)
// // ------------------------------------------------------------- */
// // module.exports.Signup = async (req, res) => {
// //   try {
// //     const { email, password, username } = req.body;

// //     const existingUser = await User.findOne({ email });

// // if (existingUser) {

// //   // ✅ Already verified → Block signup
// //   if (existingUser.isVerified) {
// //     return res.json({
// //       success: false,
// //       message: "User already registered. Please login.",
// //     });
// //   }

// //   // ⚡ Exists but NOT verified → Resend verification email
// //   const verifyToken = crypto.randomBytes(32).toString("hex");
// //   const hashedVerifyToken = crypto
// //     .createHash("sha256")
// //     .update(verifyToken)
// //     .digest("hex");

// //   existingUser.emailVerificationToken = hashedVerifyToken;
// //   existingUser.emailVerificationExpires =
// //     Date.now() + 24 * 60 * 60 * 1000;

// //   await existingUser.save();

// //   // Send email again
// //   const verifyLink = `http://localhost:3000/verify-email/${verifyToken}`;

// //   const transporter = nodemailer.createTransport({
// //     host: "smtp.gmail.com",
// //     port: 587,
// //     secure: false,
// //     auth: {
// //       user: process.env.EMAIL,
// //       pass: process.env.EMAIL_PASS,
// //     },
// //   });

// //   await transporter.sendMail({
// //     from: `"Forest Fire Support" <${process.env.EMAIL}>`,
// //     to: existingUser.email,
// //     subject: "Verify Your Email",
// //     html: `
// //       <h3>Email Verification</h3>
// //       <p>Your account exists but is not verified.</p>
// //       <p>Click below to verify:</p>
// //       <a href="${verifyLink}">${verifyLink}</a>
// //     `,
// //   });

// //   return res.json({
// //     success: true,
// //     message: "Verification email resent. Please verify your email.",
// //   });
// // }


// //     // Email validation API
// //     const agent = new https.Agent({ rejectUnauthorized: false });
// //     const response = await axios.get(
// //       `https://apilayer.net/api/check?access_key=${MAILBOXLAYER_KEY}&email=${email}`,
// //       { httpsAgent: agent }
// //     );

// //     const { format_valid, smtp_check, disposable } = response.data;

// //     if (!format_valid)
// //       return res.json({ success: false, message: "Invalid email format" });
// //     if (!smtp_check)
// //       return res.json({ success: false, message: "Email does not exist" });
// //     if (disposable)
// //       return res.json({
// //         success: false,
// //         message: "Disposable emails not allowed",
// //       });

// //     // Password validation
// //     const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
// //     if (!passwordRegex.test(password)) {
// //       return res.json({
// //         success: false,
// //         message:
// //           "Password must be 8+ chars with uppercase, lowercase, number",
// //       });
// //     }

// //     // Hash password
// //     const hashedPassword = await bcrypt.hash(password, 10);

// //     // Generate verification token
// //     const verifyToken = crypto.randomBytes(32).toString("hex");
// //     const hashedVerifyToken = crypto
// //       .createHash("sha256")
// //       .update(verifyToken)
// //       .digest("hex");

// //     // Create user
// //     const user = await User.create({
// //       email,
// //       username,
// //       password: hashedPassword,
// //       isVerified: false,
// //       emailVerificationToken: hashedVerifyToken,
// //       emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000,
// //     });

// //     // Send verification email
// //     const verifyLink = `http://localhost:3000/verify-email/${verifyToken}`;

// //     const transporter = nodemailer.createTransport({
// //       host: "smtp.gmail.com",
// //       port: 587,
// //       secure: false,
// //       auth: {
// //         user: process.env.EMAIL,
// //         pass: process.env.EMAIL_PASS,
// //       },
// //     });

// //     await transporter.sendMail({
// //       from: `"Forest Fire Support" <${process.env.EMAIL}>`,
// //       to: user.email,
// //       subject: "Verify Your Email",
// //       html: `
// //         <h3>Email Verification</h3>
// //         <p>Click below to verify your account (expires in 24 hours):</p>
// //         <a href="${verifyLink}">${verifyLink}</a>
// //       `,
// //     });

// //     return res.status(201).json({
// //       success: true,
// //       message: "Verification email sent. Please verify before login.",
// //     });
// //   } catch (error) {
// //     console.error(error);
// //     res.status(500).json({ success: false, message: "Signup failed" });
// //   }
// // };

// // /* -------------------------------------------------------------
// //    ✅ VERIFY EMAIL CONTROLLER
// // ------------------------------------------------------------- */
// // /* module.exports.VerifyEmail = async (req, res) => {
// //   try {
// //     const { token } = req.params;

// //     const hashedToken = crypto
// //       .createHash("sha256")
// //       .update(token)
// //       .digest("hex");

// //     const user = await User.findOne({
// //       emailVerificationToken: hashedToken,
// //       emailVerificationExpires: { $gt: Date.now() },
// //     });

// //     if (!user) {
// //       return res.status(400).json({
// //         success: false,
// //         message: "Invalid or expired verification link",
// //       });
// //     }

// //     user.isVerified = true;
// //     user.emailVerificationToken = undefined;
// //     user.emailVerificationExpires = undefined;

// //     await user.save();

// //     // ✅ Create login token
// //     const loginToken = createSecretToken(user);

// //     // ✅ Set cookie
// //     res.cookie("token", loginToken, {
// //   httpOnly: true,
// //   sameSite: "Lax",
// //   secure: false, // true in production (https)
// //   maxAge: 3 * 24 * 60 * 60 * 1000,
// // });
// //     // ✅ Return JSON instead of redirect
// //     return res.status(200).json({
// //       success: true,
// //       message: "Email verified successfully",
// //     });

// //   } catch (error) {
// //     console.error(error);
// //     res.status(500).json({
// //       success: false,
// //       message: "Verification failed",
// //     });
// //   }
// // }; */
// // module.exports.VerifyEmail = async (req, res) => {
// //   try {
// //     const { token } = req.params;

// //     const hashedToken = crypto
// //       .createHash("sha256")
// //       .update(token)
// //       .digest("hex");

// //     const user = await User.findOne({
// //       emailVerificationToken: hashedToken,
// //       emailVerificationExpires: { $gt: Date.now() },
// //     });

// //     if (!user) {
// //       return res.status(200).json({
// //         success: false,
// //         message: "Invalid or expired verification link",
// //       });
// //     }

// //     user.isVerified = true;
// //     user.emailVerificationToken = undefined;
// //     user.emailVerificationExpires = undefined;

// //     await user.save();

// //     return res.status(200).json({
// //       success: true,
// //       message: "Email verified successfully. Please login.",
// //     });

// //   } catch (error) {
// //     console.error(error);
// //     res.status(500).json({
// //       success: false,
// //       message: "Verification failed",
// //     });
// //   }
// // };
// // /* -------------------------------------------------------------
// //    ✅ LOGIN (BLOCK IF NOT VERIFIED)
// // ------------------------------------------------------------- */
// // module.exports.Login = async (req, res) => {
// //   try {
// //     const { email, password } = req.body;

// //     const user = await User.findOne({ email });
// //     if (!user)
// //       return res.json({
// //         success: false,
// //         message: "Incorrect email or password",
// //       });

// //     if (!user.isVerified)
// //       return res.json({
// //         success: false,
// //         message: "Please verify your email before login",
// //       });

// //     const auth = await bcrypt.compare(password, user.password);
// //     if (!auth)
// //       return res.json({
// //         success: false,
// //         message: "Incorrect email or password",
// //       });

// //     const token = createSecretToken(user);

// //     res.cookie("token", token, {
// //       httpOnly: true,
// //       sameSite: "Lax",
// //       secure: false,
// //       maxAge: 3 * 24 * 60 * 60 * 1000,
// //     });

// //     return res.json({
// //       success: true,
// //       message: "Login successful",
// //       user: user.username,
// //     });
// //   } catch (error) {
// //     console.error(error);
// //     res.status(500).json({ success: false, message: "Login failed" });
// //   }
// // };

// // /* -------------------------------------------------------------
// //    ✅ FORGOT PASSWORD (UNCHANGED)
// // ------------------------------------------------------------- */
// // module.exports.ForgotPassword = async (req, res) => {
// //   try {
// //     const { email } = req.body;

// //     const user = await User.findOne({ email });
// //     if (!user)
// //       return res.json({ success: false, message: "User not found" });

// //     const resetToken = crypto.randomBytes(32).toString("hex");
// //     const hashedToken = crypto
// //       .createHash("sha256")
// //       .update(resetToken)
// //       .digest("hex");

// //     user.resetPasswordToken = hashedToken;
// //     user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
// //     await user.save();

// //     const resetLink = `http://localhost:3000/reset-password/${resetToken}`;

// //     const transporter = nodemailer.createTransport({
// //       host: "smtp.gmail.com",
// //       port: 587,
// //       secure: false,
// //       auth: {
// //         user: process.env.EMAIL,
// //         pass: process.env.EMAIL_PASS,
// //       },
// //     });

// //     await transporter.sendMail({
// //       from: `"Forest Fire Support" <${process.env.EMAIL}>`,
// //       to: user.email,
// //       subject: "Password Reset",
// //       html: `<a href="${resetLink}">${resetLink}</a>`,
// //     });

// //     res.json({ success: true, message: "Reset email sent" });
// //   } catch (error) {
// //     res.status(500).json({ success: false });
// //   }
// // };

// // /* -------------------------------------------------------------
// //    ✅ RESET PASSWORD (UNCHANGED)
// // ------------------------------------------------------------- */
// // module.exports.ResetPassword = async (req, res) => {
// //   try {
// //     const { token } = req.params;
// //     const { password } = req.body;

// //     const hashedToken = crypto
// //       .createHash("sha256")
// //       .update(token)
// //       .digest("hex");

// //     const user = await User.findOne({
// //       resetPasswordToken: hashedToken,
// //       resetPasswordExpires: { $gt: Date.now() },
// //     });

// //     if (!user)
// //       return res.json({ success: false, message: "Invalid or expired token" });

// //     user.password = await bcrypt.hash(password, 10);
// //     user.resetPasswordToken = undefined;
// //     user.resetPasswordExpires = undefined;
// //     await user.save();

// //     res.json({ success: true, message: "Password reset successful" });
// //   } catch (error) {
// //     res.status(500).json({ success: false });
// //   }
// // };


// // module.exports.CheckAuth = async (req, res) => {
// //   try {
// //     const token = req.cookies.token;

// //     if (!token) {
// //       return res.json({ status: false });
// //     }

// //     const decoded = jwt.verify(token, process.env.TOKEN_KEY);
// //     const user = await User.findById(decoded.id).select("-password");

// //     if (!user) {
// //       return res.json({ status: false });
// //     }

// //     return res.json({
// //       status: true,
// //       user: {
// //         id: user._id,
// //         email: user.email,
// //         username: user.username,  // ✅ THIS IS THE FIX
// //       },
// //     });
// //   } catch (err) {
// //     return res.json({ status: false });
// //   }
// // };
// // module.exports.Logout = (req, res) => {
// //   res.clearCookie("token", {
// //     httpOnly: true,
// //     sameSite: "Lax",
// //     secure: false,
// //   });

// //   return res.json({ success: true, message: "Logged out successfully" });
// // };


// const User = require("../Models/UserModel");
// const bcrypt = require("bcryptjs");
// const { createSecretToken } = require("../util/SecretToken");
// const jwt = require("jsonwebtoken");
// const axios = require("axios");
// const https = require("https");
// const crypto = require("crypto");
// const nodemailer = require("nodemailer");

// const MAILBOXLAYER_KEY = "d6afc88eedec0185c50f62de2f27c9c1";

// /* -------------------------------------------------------------
//     ✅ USER COOKIE VERIFY
// ------------------------------------------------------------- */
// module.exports.userVerification = (req, res) => {
//   try {
//     const token = req.cookies.token;
//     if (!token) return res.json({ status: false });

//     jwt.verify(token, process.env.TOKEN_KEY, async (err, data) => {
//       if (err) return res.json({ status: false });
//       return res.json({ status: true, user: data });
//     });
//   } catch (error) {
//     res.json({ status: false });
//   }
// };

// /* -------------------------------------------------------------
//     ✅ SIGNUP (WITH EMAIL VERIFICATION)
// ------------------------------------------------------------- */
// module.exports.Signup = async (req, res) => {
//   try {
//     // Added phoneNumber to destructuring
//     const { email, password, username, phoneNumber } = req.body;

//     const existingUser = await User.findOne({ email });

//     if (existingUser) {
//       // ✅ Already verified → Block signup
//       if (existingUser.isVerified) {
//         return res.json({
//           success: false,
//           message: "User already registered. Please login.",
//         });
//       }

//       // ⚡ Exists but NOT verified → Resend verification email
//       const verifyToken = crypto.randomBytes(32).toString("hex");
//       const hashedVerifyToken = crypto
//         .createHash("sha256")
//         .update(verifyToken)
//         .digest("hex");

//       existingUser.emailVerificationToken = hashedVerifyToken;
//       existingUser.emailVerificationExpires =
//         Date.now() + 24 * 60 * 60 * 1000;

//       await existingUser.save();

//       // Send email again
//       const verifyLink = `http://localhost:3000/verify-email/${verifyToken}`;

//       const transporter = nodemailer.createTransport({
//         host: "smtp.gmail.com",
//         port: 587,
//         secure: false,
//         auth: {
//           user: process.env.EMAIL,
//           pass: process.env.EMAIL_PASS,
//         },
//       });

//       await transporter.sendMail({
//         from: `"Forest Fire Support" <${process.env.EMAIL}>`,
//         to: existingUser.email,
//         subject: "Verify Your Email",
//         html: `
//           <h3>Email Verification</h3>
//           <p>Your account exists but is not verified.</p>
//           <p>Click below to verify:</p>
//           <a href="${verifyLink}">${verifyLink}</a>
//         `,
//       });

//       return res.json({
//         success: true,
//         message: "Verification email resent. Please verify your email.",
//       });
//     }

//     // Email validation API
//     const agent = new https.Agent({ rejectUnauthorized: false });
//     const response = await axios.get(
//       `https://apilayer.net/api/check?access_key=${MAILBOXLAYER_KEY}&email=${email}`,
//       { httpsAgent: agent }
//     );

//     const { format_valid, smtp_check, disposable } = response.data;

//     if (!format_valid)
//       return res.json({ success: false, message: "Invalid email format" });
//     if (!smtp_check)
//       return res.json({ success: false, message: "Email does not exist" });
//     if (disposable)
//       return res.json({
//         success: false,
//         message: "Disposable emails not allowed",
//       });

//     // Password validation
//     const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
//     if (!passwordRegex.test(password)) {
//       return res.json({
//         success: false,
//         message:
//           "Password must be 8+ chars with uppercase, lowercase, number",
//       });
//     }

//     // Hash password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Generate verification token
//     const verifyToken = crypto.randomBytes(32).toString("hex");
//     const hashedVerifyToken = crypto
//       .createHash("sha256")
//       .update(verifyToken)
//       .digest("hex");

//     // Create user - Included phoneNumber here
//     const user = await User.create({
//       email,
//       username,
//       password: hashedPassword,
//       phoneNumber, // Added to database creation
//       isVerified: false,
//       emailVerificationToken: hashedVerifyToken,
//       emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000,
//     });

//     // Send verification email
//     const verifyLink = `http://localhost:3000/verify-email/${verifyToken}`;

//     const transporter = nodemailer.createTransport({
//       host: "smtp.gmail.com",
//       port: 587,
//       secure: false,
//       auth: {
//         user: process.env.EMAIL,
//         pass: process.env.EMAIL_PASS,
//       },
//     });

//     await transporter.sendMail({
//       from: `"Forest Fire Support" <${process.env.EMAIL}>`,
//       to: user.email,
//       subject: "Verify Your Email",
//       html: `
//         <h3>Email Verification</h3>
//         <p>Click below to verify your account (expires in 24 hours):</p>
//         <a href="${verifyLink}">${verifyLink}</a>
//       `,
//     });

//     return res.status(201).json({
//       success: true,
//       message: "Verification email sent. Please verify before login.",
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: "Signup failed" });
//   }
// };

// /* -------------------------------------------------------------
//     ✅ VERIFY EMAIL CONTROLLER
// ------------------------------------------------------------- */
// module.exports.VerifyEmail = async (req, res) => {
//   try {
//     const { token } = req.params;

//     const hashedToken = crypto
//       .createHash("sha256")
//       .update(token)
//       .digest("hex");

//     const user = await User.findOne({
//       emailVerificationToken: hashedToken,
//       emailVerificationExpires: { $gt: Date.now() },
//     });

//     if (!user) {
//       return res.status(200).json({
//         success: false,
//         message: "Invalid or expired verification link",
//       });
//     }

//     user.isVerified = true;
//     user.emailVerificationToken = undefined;
//     user.emailVerificationExpires = undefined;

//     await user.save();

//     return res.status(200).json({
//       success: true,
//       message: "Email verified successfully. Please login.",
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       success: false,
//       message: "Verification failed",
//     });
//   }
// };

// /* -------------------------------------------------------------
//     ✅ LOGIN (BLOCK IF NOT VERIFIED)
// ------------------------------------------------------------- */
// module.exports.Login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const user = await User.findOne({ email });
//     if (!user)
//       return res.json({
//         success: false,
//         message: "Incorrect email or password",
//       });

//     if (!user.isVerified)
//       return res.json({
//         success: false,
//         message: "Please verify your email before login",
//       });

//     const auth = await bcrypt.compare(password, user.password);
//     if (!auth)
//       return res.json({
//         success: false,
//         message: "Incorrect email or password",
//       });

//     const token = createSecretToken(user);

//     res.cookie("token", token, {
//       httpOnly: true,
//       sameSite: "Lax",
//       secure: false,
//       maxAge: 3 * 24 * 60 * 60 * 1000,
//     });

//     return res.json({
//       success: true,
//       message: "Login successful",
//       user: user.username,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: "Login failed" });
//   }
// };

// /* -------------------------------------------------------------
//     ✅ FORGOT PASSWORD (UNCHANGED)
// ------------------------------------------------------------- */
// module.exports.ForgotPassword = async (req, res) => {
//   try {
//     const { email } = req.body;

//     const user = await User.findOne({ email });
//     if (!user)
//       return res.json({ success: false, message: "User not found" });

//     const resetToken = crypto.randomBytes(32).toString("hex");
//     const hashedToken = crypto
//       .createHash("sha256")
//       .update(resetToken)
//       .digest("hex");

//     user.resetPasswordToken = hashedToken;
//     user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
//     await user.save();

//     const resetLink = `http://localhost:3000/reset-password/${resetToken}`;

//     const transporter = nodemailer.createTransport({
//       host: "smtp.gmail.com",
//       port: 587,
//       secure: false,
//       auth: {
//         user: process.env.EMAIL,
//         pass: process.env.EMAIL_PASS,
//       },
//     });

//     await transporter.sendMail({
//       from: `"Forest Fire Support" <${process.env.EMAIL}>`,
//       to: user.email,
//       subject: "Password Reset",
//       html: `<a href="${resetLink}">${resetLink}</a>`,
//     });

//     res.json({ success: true, message: "Reset email sent" });
//   } catch (error) {
//     res.status(500).json({ success: false });
//   }
// };

// /* -------------------------------------------------------------
//     ✅ RESET PASSWORD (UNCHANGED)
// ------------------------------------------------------------- */
// module.exports.ResetPassword = async (req, res) => {
//   try {
//     const { token } = req.params;
//     const { password } = req.body;

//     const hashedToken = crypto
//       .createHash("sha256")
//       .update(token)
//       .digest("hex");

//     const user = await User.findOne({
//       resetPasswordToken: hashedToken,
//       resetPasswordExpires: { $gt: Date.now() },
//     });

//     if (!user)
//       return res.json({ success: false, message: "Invalid or expired token" });

//     user.password = await bcrypt.hash(password, 10);
//     user.resetPasswordToken = undefined;
//     user.resetPasswordExpires = undefined;
//     await user.save();

//     res.json({ success: true, message: "Password reset successful" });
//   } catch (error) {
//     res.status(500).json({ success: false });
//   }
// };

// module.exports.CheckAuth = async (req, res) => {
//   try {
//     const token = req.cookies.token;

//     if (!token) {
//       return res.json({ status: false });
//     }

//     const decoded = jwt.verify(token, process.env.TOKEN_KEY);
//     const user = await User.findById(decoded.id).select("-password");

//     if (!user) {
//       return res.json({ status: false });
//     }

//     return res.json({
//       status: true,
//       user: {
//         id: user._id,
//         email: user.email,
//         username: user.username,
//         phoneNumber: user.phoneNumber, // Added to CheckAuth for consistency
//       },
//     });
//   } catch (err) {
//     return res.json({ status: false });
//   }
// };

// module.exports.Logout = (req, res) => {
//   res.clearCookie("token", {
//     httpOnly: true,
//     sameSite: "Lax",
//     secure: false,
//   });

//   return res.json({ success: true, message: "Logged out successfully" });
// };


const User = require("../Models/UserModel");
const bcrypt = require("bcryptjs");
const { createSecretToken } = require("../util/SecretToken");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const https = require("https");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const MAILBOXLAYER_KEY = "d6afc88eedec0185c50f62de2f27c9c1";

/* -------------------------------------------------------------
    ✅ USER COOKIE VERIFY
------------------------------------------------------------- */
module.exports.userVerification = (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.json({ status: false });

    jwt.verify(token, process.env.TOKEN_KEY, async (err, data) => {
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

      const verifyLink = `http://localhost:3000/verify-email/${verifyToken}`;

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
      return res.json({
        success: false,
        message: "Disposable emails not allowed",
      });

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

    const verifyLink = `http://localhost:3000/verify-email/${verifyToken}`;

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

    return res.status(201).json({
      success: true,
      message: "Verification email sent. Please verify before login.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Signup failed" });
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

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
      maxAge: 3 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: "Login successful",
      user: user.username,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Login failed" });
  }
};

/* -------------------------------------------------------------
    ✅ FORGOT PASSWORD
------------------------------------------------------------- */
module.exports.ForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.json({ success: false, message: "User not found" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    const resetLink = `http://localhost:3000/reset-password/${resetToken}`;

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
      subject: "Password Reset",
      html: `<a href="${resetLink}">${resetLink}</a>`,
    });

    res.json({ success: true, message: "Reset email sent" });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

/* -------------------------------------------------------------
    ✅ RESET PASSWORD
------------------------------------------------------------- */
module.exports.ResetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user)
      return res.json({ success: false, message: "Invalid or expired token" });

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ success: true, message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ success: false });
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
    const token = req.cookies.token;

    if (!token) {
      return res.json({ status: false });
    }

    const decoded = jwt.verify(token, process.env.TOKEN_KEY);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.json({ status: false });
    }

    return res.json({
      status: true,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        phoneNumber: user.phoneNumber,
        latitude: user.latitude, // Added
        longitude: user.longitude, // Added
      },
    });
  } catch (err) {
    return res.json({ status: false });
  }
};

module.exports.Logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "Lax",
    secure: false,
  });

  return res.json({ success: true, message: "Logged out successfully" });
};