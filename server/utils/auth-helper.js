const jwt = require("jsonwebtoken");
const User = require("../models/User-model");

const JWT_SECRET = process.env.JWT_SECRET || "change_me";

exports.getCurrentUser = async (req) => {
  try {
    let token = null;

    // Check Authorization header first (Bearer token) - PREFERRED
    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.auth_token) {
      // Fallback to cookie
      token = req.cookies.auth_token;
    }

    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ googleId: decoded.googleId });
    return user || null;
  } catch (_) {
    return null;
  }
};
