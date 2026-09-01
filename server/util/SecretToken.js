require("dotenv").config();
const jwt = require("jsonwebtoken");

module.exports.createSecretToken = (user) => {
  const secretKey = process.env.TOKEN_KEY || "mySuperStrongSecretKey123";
  return jwt.sign(
    {
      id: user._id,
      isVerified: user.isVerified,
    },
    secretKey,
    {
      expiresIn: 3 * 24 * 60 * 60,
    }
  );
};

