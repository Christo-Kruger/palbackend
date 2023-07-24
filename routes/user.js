const express = require("express");
const router = express.Router();
const User = require("../model/User");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");
const Booking = require("../model/Booking");
const Child = require("../model/Child");

router.post("/register", async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    const token = jwt.sign(
      { _id: user._id, 
        role: user.role, 
        name: user.name, 
        phone: user.phone,  // add this line
        campus: user.campus // add this line
      },
      process.env.JWT_SECRET
    );
    res.json({ token, role: user.role, name: user.name });
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
  console.log(req.body.email, req.body.password); // Log email and password for verification

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
      phone: user.phone,  // add this line
      campus: user.campus // add this line
    },
    process.env.JWT_SECRET
  );
  console.log(`The user ${user.email} has logged in.`);

  // Include the role, name, phone and campus in the response
  res.send({ token, role: user.role, name: user.name, phone: user.phone, campus: user.campus });
});

router.put("/tests/:id", auth, requireAdmin, async (req, res) => {
  const test = await Test.findOne({ booking: req.params.id });

  if (!test) {
    console.log('Test not found.');
    return res.status(404).send("Test not found.");
  }

  test.passed = req.body.passed;
  test.score = req.body.score;
  await test.save();

  console.log('Test saved!');
  res.send(test);
});

router.post("/booking", auth, async (req, res) => {
  try {
    console.log("Entering booking route");
    const child = new Child(req.body.child);
    await child.save();

    console.log("Child saved");
    const booking = new Booking({
      parent: req.user._id,
      child: child._id,
      date: req.body.date,
      campus: req.body.campus,
    });
    await booking.save();

    console.log("Booking saved");
    const user = await User.findById(req.user._id);
    user.children.push(child);
    await user.save();

    console.log("User saved");
    res.send(booking);
  } catch (err) {
    console.log("Error: ", err);
    res.status(500).send(err);
  }
});

router.get("/bookings", auth, async (req, res) => {
  try {
    console.log("Before finding bookings");
    const bookings = await Booking.find({ parent: req.user._id }).populate(
      "child"
    );
    console.log("After finding bookings");
    res.send(bookings);
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
});

module.exports = router;
