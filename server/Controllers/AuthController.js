const User = require("../Models/UserModel");
const bcrypt = require("bcryptjs");
const { createSecretToken } = require("../util/SecretToken");
const jwt = require("jsonwebtoken");

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
   ✅ Signup Controller (secure password hashing + cookie setup)
------------------------------------------------------------- */
module.exports.Signup = async (req, res) => {
  try {
    const { email, password, username, createdAt } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({ message: "User already exists", success: false });
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("🧂 Raw password:", password);
    console.log("🔐 Hashed password before save:", hashedPassword);

    // Create new user
    const user = await User.create({
      email,
      password: hashedPassword,
      username,
      createdAt,
    });

    console.log("💾 Saved user password in DB:", user.password);

    const token = createSecretToken(user._id);
    res.cookie("token", token, {
      withCredentials: true,
      httpOnly: false,
    });

    return res.status(201).json({
      message: "User signed up successfully",
      success: true,
      user: user.username,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res
      .status(500)
      .json({ message: "Server error during signup", success: false });
  }
};


/* -------------------------------------------------------------
   ✅ Login Controller (validates email + password)
------------------------------------------------------------- */
module.exports.Login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("📩 Login request:", email, password);

    if (!email || !password) {
      console.log("❌ Missing fields");
      return res.json({ message: "All fields are required", success: false });
    }

    const user = await User.findOne({ email });
    console.log("👤 Found user:", user ? user.email : "No user found");

    if (!user) {
      console.log("❌ User not found");
      return res.json({
        message: "Incorrect email or password",
        success: false,
      });
    }

    const auth = await bcrypt.compare(password, user.password);
    console.log("🔐 Password match:", auth);

    if (!auth) {
      console.log("❌ Password mismatch");
      return res.json({
        message: "Incorrect email or password",
        success: false,
      });
    }

    const token = createSecretToken(user._id);
    console.log("🎫 Token created:", token ? "Yes" : "No");

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
      maxAge: 3 * 24 * 60 * 60 * 1000,
    });

    console.log("🍪 Cookie set successfully");

    return res.status(200).json({
      message: "User logged in successfully",
      success: true,
      user: user.username,
    });
  } catch (error) {
    console.error("🔥 Login error:", error);
    res
      .status(500)
      .json({ message: "Server error during login", success: false });
  }
};
