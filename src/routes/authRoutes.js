const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

function createToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, interests } = req.body;
    const user = await User.create({
      name,
      email,
      password,
      interests,
      role: "user"
    });

    const safeUser = await User.findById(user._id).select("-password");
    res.status(201).json({
      token: createToken(user),
      user: safeUser
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({
      token: createToken(user),
      user: await User.findById(user._id).select("-password")
    });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", authenticate, (req, res) => {
  res.json({ message: "Logged out" });
});

module.exports = router;
