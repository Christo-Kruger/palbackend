const express = require("express");
const router = express.Router();
const Booking = require("../model/Booking");
const User = require("../model/User");
const TestSlot = require("../model/TestSlot");
const auth = require("../middleware/auth");
const smsService = require("../services/smsService");
const requireAdmin = require("../middleware/requireAdmin");
const Child = require("../model/Child");
const BookingPriority = require("../model/BookingPriority");
const mongoose = require("mongoose");





router.post("/", auth, async (req, res) => {
  const { testSlotId, childId } = req.body;
  try {
    const parent = await User.findById(req.user._id); // Parent is extracted from the token

        // Check if the child has already been booked for any test slot
        const existingBooking = await Booking.findOne({ child: childId });
        if (existingBooking) {
          return res.status(400).send("Child is already booked for a test slot.");
        }

    const priority = await BookingPriority.findOne();
    const currentTime = new Date();

    // Logging the priority details
    console.log("Priority Start:", priority.priorityStart);
    console.log("Priority End:", priority.priorityEnd);
    console.log("Current Time:", currentTime);

    if (currentTime < priority.priorityStart || (currentTime >= priority.priorityStart && currentTime <= priority.priorityEnd)) {
      if (!parent.attendedPresentation) {
        return res
          .status(403)
          .send(
            "Only parents who attended the presentation can book at this time."
          );
      }
    }

    // Validate that the child belongs to the parent
    console.log("Parent's Children:", parent.children);
    console.log("Requested Child ID:", childId);
    if (!parent.children.includes(childId)) {
      return res.status(403).send("Invalid child.");
    }

    // Find the child
    const child = await Child.findById(childId);
    if (!child) {
      return res.status(404).send("Child not found.");
    }

    const testSlot = await TestSlot.findById(testSlotId);
    console.log("Test Slot Capacity:", testSlot.capacity);
    console.log("Number of Bookings:", testSlot.bookings.length);

    if (testSlot.capacity <= testSlot.bookings.length) {
      return res.status(403).send("This test slot is fully booked.");
    }

    const booking = new Booking({
      child: childId,
      parent: req.user._id,
      testSlot: testSlotId,
      price: req.body.price, // assuming that the price comes in the request body
    });

    await booking.save();

    // Update testSlot's bookings
    testSlot.bookings.push(booking._id);
    await testSlot.save();

    // Send SMS
    const message = `You have successfully booked a test for:
    *${child.name} 
    *${testSlot.campus} campus 
    *${new Date(testSlot.date).toLocaleDateString()}
    *${testSlot.startTime}.
    
    Please arrive 10 minutes before the scheduled time.`;

    try {
      await smsService.sendSMS(parent.phone, message);
    } catch (smsError) {
      console.log("SMS sending failed:", smsError);
      // You can decide what to do when SMS sending fails
    }

    res.status(201).send(booking);

  } catch (error) {
    console.log("Booking error:", error);
    res.status(500).send("Error processing the booking.");
  }
});

// Update confirmed payment if admin
router.patch("/payment/:id",  async (req, res) => {
  console.log("Received request to update booking:", req.params.id);
  try {
    const booking = await Booking.findById(req.params.id);
    console.log("Found booking:", booking);
    if (!booking) {
      return res.status(404).send("Booking not found.");
    }
    booking.paid = true;
    await booking.save();
    console.log("Updated booking:", booking);
    res.send(booking);
  } catch (error) {
    console.log("Error updating booking:", error);
    res.status(500).send("Error updating the booking.");
  }
});

router.get('/child/:childId', async (req, res) => {
  try {
    const bookings = await Booking.find({ childId: req.params.childId });
    if (bookings.length > 0) {
      res.json(bookings);
    } else {
      res.status(404).json({ message: 'No bookings found for this child.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});
router.get("/", async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("child")
      .populate("parent")
      .populate("testSlot");
     
    res.json(bookings);
  
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get("/parent",auth, async (req, res) => {
  try {
    const userId = req.query.userId; // Extract userId from the query parameter
    
    // Validate if the userId matches the authenticated user's ID (this is an extra layer of security)
    if (userId !== req.user._id.toString()) {
      return res.status(403).send("Forbidden: Mismatched user ID");
    }
    
    // Fetch bookings specifically for this user
    const bookings = await Booking.find({ parent: userId })
      .populate("child")
      .populate("parent")
      .populate("testSlot");
    
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
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
          campus,
        },
      },
      {
        $group: {
          _id: "$time",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          time: "$_id",
          count: 1,
          available: { $subtract: [10, "$count"] },
        },
      },
    ]);

    res.json(counts);
  } catch (error) {
    console.log("Error fetching booking counts:", error);
    res.status(500).send("Error fetching booking counts.");
  }
});

router.get("/admin", auth, async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole !== "admin") {
      return res
        .status(403)
        .send("You are not authorized to view all test slots.");
    }

    const { campus, page = 1, limit = 10 } = req.query;
    const query = {};

    if (campus) {
      query.campus = campus;
    }

    // Fetch test slots with populated bookings count
    const testSlots = await TestSlot.find(query)
    
      .populate({
        path: 'bookings',
        select: '_id'  // Only fetch the _id, since we're only interested in the count
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean()  // Convert the mongoose document to a plain JS object
      .exec();

    // Replace bookings array with its length for each slot
    testSlots.forEach(slot => {
      slot.bookings = slot.bookings.length;
    });

    // get total documents in the TestSlot collection
    const count = await TestSlot.countDocuments();

    if (!testSlots.length) {
      return res.status(404).send("Test slots not found.");
    }

    // Return response with test slots, total pages, and current page
    res.json({
      testSlots,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    });

  } catch (error) {
    console.log("Error fetching test slots:", error);
    res.status(500).send("Error fetching the test slots.");
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



// ...

router.delete("/:id", auth, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await Booking.findOneAndDelete({ _id: bookingId });

    if (!booking) {
      return res.status(404).send("Booking not found.");
    }

    if (booking.parent._id.toString() !== req.user._id) {
      return res
        .status(403)
        .send("You are not authorized to delete this booking.");
    }

    res.send(booking);
  } catch (error) {
    console.log("Error deleting booking:", error);
    res.status(500).send("Error deleting the booking.");
  }
});


router.delete("/admin/delete/:id", auth, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await Booking.findOneAndDelete({ _id: bookingId });

    if (!booking) {
      return res.status(404).send("Booking not found.");
    }

    res.send(booking);
  } catch (error) {
    console.log("Error deleting booking:", error);
    res.status(500).send("Error deleting the booking.");
  }
});




module.exports = router;
