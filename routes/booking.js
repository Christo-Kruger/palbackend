const express = require("express");
const router = express.Router();
const Booking = require("../model/Booking");
const User = require("../model/User");
const auth = require("../middleware/auth");
const smsService = require('../services/smsService');
const requireAdmin = require('../middleware/requireAdmin');

router.post("/", auth, async (req, res) => {
  try {
    const parent = await User.findById(req.user._id); // Parent is extracted from the token

    // Combine date and time into a single Date object
    const bookingDate = new Date(req.body.date);
    const bookingTime = req.body.time.split(":").map(Number);
    bookingDate.setHours(bookingTime[0], bookingTime[1]);

    // Validate booking time
    const bookingHour = bookingDate.getHours();
    if (bookingHour < 14 || bookingHour > 22) {
      return res
        .status(400)
        .send("Booking can only be made between 2:30pm and 10pm.");
    }

    // Validate campus
    const validCampuses = ["Suji", "Dongtan", "Bundang"];
    if (!validCampuses.includes(req.body.campus)) {
      return res.status(400).send("Invalid campus.");
    }

    if (!parent) {
      return res.status(400).send("Invalid parent.");
    }

    const booking = new Booking({
      child: {
        name: req.body.child.name,
        previousSchool: req.body.child.previousSchool,
        age: req.body.child.age,
        gender: req.body.child.gender,
      },
      parent: {
        _id: parent._id,
        name: parent.name,
        phone: parent.phone,
      },
      campus: req.body.campus,
      date: bookingDate,
      time: req.body.time,
    });

    await booking.save();

    // Send SMS
    const message = `You have successfully booked a test for ${req.body.child.name} at ${req.body.campus} campus on ${bookingDate} at ${req.body.time}.`;
    try {
      await smsService.sendSMS(parent.phone, message);
    } catch (smsError) {
      console.log("SMS sending failed:", smsError);
      // You can decide what to do when SMS sending fails
    }

    res.send(booking);
  } catch (error) {
    console.log("Booking error:", error);
    if (error.message === "Booking limit for this slot at this campus has been reached") {
      return res.status(400).send("Booking limit for this slot at this campus has been reached");
    }
    res.status(500).send("Error processing the booking.");
  }
});

// Update confirmed payment if admin
router.patch("/payment/:id", auth, requireAdmin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).send("Booking not found.");
    }
    booking.confirmed = true;
    await booking.save();
    res.send(booking);
  } catch (error) {
    console.log("Error updating booking:", error);
    res.status(500).send("Error updating the booking.");
  }
});



router.get("/", auth, async (req, res) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).send("Missing user id.");
    }

    const bookings = await Booking.find({ "parent._id": userId });

    if (!bookings) {
      return res.status(404).send("Bookings not found for this user.");
    }

    res.send(bookings);
  } catch (error) {
    console.log("Error fetching bookings:", error);
    res.status(500).send("Error fetching the bookings.");
  }
});

// Get Booking Count

router.get("/count", async (req, res) => {
  try {
    const { date, campus } = req.query;

    // Validate the input...
    
    const counts = await Booking.aggregate([
      { 
        $match: { 
          date: new Date(date), 
          campus 
        } 
      },
      { 
        $group: {
          _id: "$time",
          count: { $sum: 1 },
        }
      },
      { 
        $project: { 
          _id: 0, 
          time: "$_id", 
          count: 1,
          available: { $subtract: [10, "$count"] }
        } 
      },
    ]);

    res.json(counts);
  } catch (error) {
    console.log("Error fetching booking counts:", error);
    res.status(500).send("Error fetching booking counts.");
  }
});


// Get all bookings if user is admin
router.get("/admin", auth, async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).send("You are not authorized to view all bookings.");
    }

    const { campus, childName } = req.query;
    const query = {};

    if (campus) {
      query.campus = campus;
    }

    if (childName) {
      query['child.name'] = childName;
    }

    const bookings = await Booking.find(query);

    if (!bookings) {
      return res.status(404).send("Bookings not found.");
    }

    res.send(bookings);
  } catch (error) {
    console.log("Error fetching bookings:", error);
    res.status(500).send("Error fetching the bookings.");
  }
});


router.patch("/:id", auth, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).send("Booking not found.");
    }

    if (booking.parent._id.toString() !== req.user._id) {
      return res
        .status(403)
        .send("You are not authorized to update this booking.");
    }

    const bookingDate = new Date(req.body.date);
    const bookingTime = req.body.time.split(":").map(Number);
    bookingDate.setHours(bookingTime[0], bookingTime[1]);

    // Validate booking time
    const bookingHour = bookingDate.getHours();
    if (bookingHour < 14 || bookingHour > 22) {
      return res
        .status(400)
        .send("Booking can only be made between 2:30pm and 10pm.");
    }

    // Validate campus
    const validCampuses = ["Suji", "Dongtan", "Bundang"];
    if (!validCampuses.includes(req.body.campus)) {
      return res.status(400).send("Invalid campus.");
    }

    booking.child.name = req.body.child.name;
    booking.child.previousSchool = req.body.child.previousSchool;
    booking.child.age = req.body.child.age;
    booking.campus = req.body.campus;
    booking.date = bookingDate;
    booking.time = req.body.time;

    await booking.save();

    res.send(booking);
  } catch (error) {
    console.log("Error updating booking:", error);
    res.status(500).send("Error updating the booking.");
  }
});



router.delete("/:id", auth, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).send("Booking not found.");
    }

    if (booking.parent._id.toString() !== req.user._id) {
      return res
        .status(403)
        .send("You are not authorized to delete this booking.");
    }

    await booking.deleteOne(); // Use deleteOne() method instead of delete()

    res.send(booking);
  } catch (error) {
    console.log("Error deleting booking:", error);
    res.status(500).send("Error deleting the booking.");
  }
});

//Delete if Admin
router.delete("/admin/delete/:id", auth, requireAdmin, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).send("Booking not found.");
    }

    await booking.deleteOne();

    res.send(booking);
  } catch (error) {
    console.log("Error deleting booking:", error);
    res.status(500).send("Error deleting the booking.");
  }
});

module.exports = router;
