const express = require("express");
const router = express.Router();
const User = require("../model/User");
const jwt = require("jsonwebtoken");
const { sendSMS } = require("../services/smsService");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

router.post("/register", async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    const token = jwt.sign(
      {
        _id: user._id,
        role: user.role,
        name: user.name,
        phone: user.phone, // add this line
        campus: user.campus, // add this line
      },
      process.env.JWT_SECRET
    );
    res.json({ token, role: user.role, name: user.name, _id: user._id });
  } catch (err) {
    console.log(err);
    if (err.code === 11000) {
      res.status(400).json({ error: "This email is already registered." });
    } else {
      res
        .status(500)
        .json({ error: "An error occurred while registering the user." });
    }
  }
});

router.post("/login", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  console.log(user); // Log the user returned from the query

  if (!user || !(await user.isValidPassword(req.body.password))) {
    console.log("The user is invalid or the password is incorrect");
    return res.status(400).send("Invalid email or password.");
  }

  const token = jwt.sign(
    {
      _id: user._id,
      role: user.role,
      name: user.name,
      phone: user.phone,
      campus: user.campus,
      attendedPresentation: user.attendedPresentation, // Optionally add this to the JWT payload if needed
      children: user.children,
    },
    process.env.JWT_SECRET
  );

  // Include the role, name, phone, campus, and attendedPresentation in the response
  res.send({
    token,
    role: user.role,
    name: user.name,
    phone: user.phone,
    campus: user.campus,
    attendedPresentation: user.attendedPresentation, // Include this in the response
    children: user.children,
  });
});

router.get("/parentsForAdmin", async (req, res) => {
  // Assuming the admin is authenticated and their ID is available in req.user._id (from JWT decoding)

  // Fetch the admin from the database
  const admin = await User.findById(req.user._id);

  // Check if the user is an admin
  if (admin.role !== "admin") {
    return res.status(403).json({ message: "Not authorized" });
  }

  // Fetch parents based on the admin's campus
  const parents = await User.find({ campus: admin.campus, role: "parent" });

  return res.json(parents);
});

router.post("/password-reset-request", async (req, res) => {
  try {
    const user = await User.findOne({ phone: req.body.phone });
    if (!user) {
      return res
        .status(400)
        .json({ error: "This phone number is not registered." });
    }

    const buffer = crypto.randomBytes(20);
    const token = buffer.toString("hex");

    // you'll need to add resetToken and resetTokenExpires to your User model
    user.resetToken = token;
    user.resetTokenExpires = Date.now() + 3600000; // token is valid for 1 hour

    await user.save();

    // send the SMS here
    const message = `Your password reset code is ${token}. This code will expire in 1 hour.`;
    await sendSMS(user.phone, message);

    res.send("Password reset SMS sent.");
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while processing your request." });
  }
});

router.patch("/:userId/attendedPresentation", async (req, res) => {
  const userId = req.params.userId;
  const { attended } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    user.attendedPresentation = attended;
    await user.save();

    res.status(200).json({ message: "Attendance updated successfully." });
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while updating attendance." });
  }
});

router.post("/password-reset", async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    const user = await User.findOne({
      resetToken,
      resetTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token." });
    }

    // Hash the new password before saving
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    user.resetToken = undefined;
    user.resetTokenExpires = undefined;

    await user.save();

    res.send("Password has been successfully reset.");
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while processing your request." });
  }
});

module.exports = router;
