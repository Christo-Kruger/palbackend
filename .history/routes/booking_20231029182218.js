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
const Group = require("../model/Group");
const QRCode = require("qrcode");

router.post("/", auth, async (req, res) => {
  try {
    await handleBookingRequest(req, res);
  } catch (error) {
    console.error("Booking error:", error);
    res.status(500).send("Error processing the booking.");
  }
});

const handleBookingRequest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { testSlotId, timeSlotId, childId } = req.body;
    const parent = await User.findById(req.user._id);
    if (!parent) throw new Error("Parent not found");

    const existingBooking = await Booking.findOne({ child: childId });
    if (existingBooking) {
      throw new Error("Child is already booked for a test slot.");
    }

    await checkBookingPriority(parent);
    validateChildBelongsToParent(childId, parent.children);

    const child = await Child.findById(childId);
    if (!child) throw new Error("Child not found.");

    const group = await Group.findById(child.group);
    if (!group) throw new Error("Group not found.");

    const currentTime = new Date();
    const withinGroupDate =
      currentTime >= new Date(group.startDate) &&
      currentTime <= new Date(group.endDate);

    if (!withinGroupDate || !group.canBook) {
      await checkBookingPriority(parent);
    }

    const testSlot = await TestSlot.findOne({
      _id: testSlotId,
      "timeSlots._id": timeSlotId,
    }).session(session);

    if (!testSlot) {
      throw new Error("Test Slot not found.");
    }

    const timeSlot = testSlot.timeSlots.id(timeSlotId);
    if (
      !timeSlot ||
      timeSlot.status === "Fully Booked" ||
      timeSlot.bookings.length >= timeSlot.capacity
    ) {
      throw new Error("Time Slot is fully booked or not found.");
    }

    const bookingDetails = {
      childName: child.name,
      parentName: parent.name,
      testSlot: testSlotId,
      timeSlot: timeSlotId,
    };

    const qrCodeDataURL = await QRCode.toDataURL(
      JSON.stringify(bookingDetails)
    );

    const newBooking = new Booking({
      child: childId,
      parent: parent._id, // Add this line
      testSlot: testSlotId,
      timeSlot: timeSlotId,
      qrCodeDataURL: Buffer.from(qrCodeDataURL),
    });

    await newBooking.save({ session });

    timeSlot.bookings.push(newBooking._id);
    if (timeSlot.bookings.length >= timeSlot.capacity) {
      timeSlot.status = "Fully Booked";
    }
    await testSlot.save({ session });

    const smsSuccess = await sendBookingConfirmationSMS(
      parent,
      child,
      testSlot,
      timeSlot.startTime
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).send({ booking: newBooking, smsSent: smsSuccess });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Booking error:", error);
    res.status(500).send(error.message || "Error processing the booking.");
  }
};

const checkBookingPriority = async (parent) => {
  const priority = await BookingPriority.findOne();
  const currentTime = new Date();

  if (
    currentTime < priority.priorityStart ||
    currentTime <= priority.priorityEnd
  ) {
    if (!parent.attendedPresentation) {
      throw {
        status: 403,
        message:
          "Only parents who attended the presentation can book at this time.",
      };
    }
  }
};

const validateChildBelongsToParent = (childId, parentChildren) => {
  if (!parentChildren.includes(childId)) {
    throw {
      status: 403,
      message: "Invalid child.",
    };
  }
};

const sendBookingConfirmationSMS = async (
  parent,
  child,
  testSlot,
  startTime
) => {
  const message = `테스트 예약이 성공적으로 완료되었습니다:
  * ${child.name}
  * ${testSlot.campus} 캠퍼스 
  * ${new Date(testSlot.date).toLocaleDateString()}
  * ${startTime}.
  
  예약 시간 10분 전에 도착해 주세요.`;

  try {
    await smsService.sendSMS(parent.phone, message);
    return true;
  } catch (smsError) {
    console.error("SMS sending failed:", smsError);
    return false;
  }
};

router.get("/child/:childId", async (req, res) => {
  try {
    const bookings = await Booking.find({ childId: req.params.childId });
    if (bookings.length > 0) {
      res.json(bookings);
    } else {
      res
        .status(200)
        .json({ message: "No bookings found for this child.", bookings: [] });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

router.get("/", async (req, res) => {
  try {
    let bookings = await Booking.find()
      .populate({
        path: "testSlot",
        populate: {
          path: "timeSlots",
        },
      })
      .populate({
        path: "child",
        populate: {
          path: "group", // Populate the group object
        },
      })
      .populate("parent");

    // Filtering the timeSlots based on the booking
    bookings = bookings.map((booking) => {
      if (booking.testSlot && booking.testSlot.timeSlots) {
        const matchedTimeSlot = booking.testSlot.timeSlots.find(
          (timeSlot) => timeSlot.bookings.includes(booking._id.toString())
        );

        // Assign the matched time slot
        booking.testSlot.timeSlots = matchedTimeSlot ? [matchedTimeSlot] : [];
      }
      return booking;
    });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});




router.get("/parent", auth, async (req, res) => {
  try {
    const userId = req.query.userId;
    if (userId !== req.user._id.toString()) {
      return res.status(403).send("Forbidden: Mismatched user ID");
    }
    const bookings = await Booking.find({ parent: userId })
      .populate("child")
      .populate("parent")
      .populate("testSlot");

    if (bookings.length === 0) {
      return res.json([]); // Return an empty array if no bookings are found
    }

    // Post-process to include only the relevant timeSlots and convert Buffer to base64
    const processedBookings = bookings.map((booking) => {
      let relevantTimeSlot = null;

      if (booking.testSlot && Array.isArray(booking.testSlot.timeSlots)) {
        relevantTimeSlot = booking.testSlot.timeSlots.find(
          (timeSlot) =>
            Array.isArray(timeSlot.bookings) &&
            timeSlot.bookings.some(
              (bookingId) => bookingId.toString() === booking._id.toString()
            )
        );
      }

    

      return {
        ...booking._doc,
        testSlot: {
          ...booking.testSlot?._doc,
          timeSlots: relevantTimeSlot ? [relevantTimeSlot] : [],
        },

        

    res.json(processedBookings);
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
        path: "bookings",
        select: "_id", // Only fetch the _id, since we're only interested in the count
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean() // Convert the mongoose document to a plain JS object
      .exec();

    // Replace bookings array with its length for each slot
    testSlots.forEach((slot) => {
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
//UPDATE TEST BOOKING (Parent)
router.patch("/:bookingId", auth, async (req, res) => {
  if (!req.body || !req.body.timeSlotId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!req.body.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { testSlotId, timeSlotId } = req.body;
    let oldTimeSlot = req.body.oldTimeSlot;
    const parent = await User.findById(req.body.user);
    const bookingId = req.params.bookingId;

    const existingBooking = await Booking.findById(bookingId).populate("child");

    if (!existingBooking) {
      throw new Error("Booking not found.");
    }

    const child = existingBooking.child;
    const oldTestSlotId = existingBooking.testSlot._id;
    let oldTimeSlotId = new mongoose.Types.ObjectId(oldTimeSlot);

    console.log("Old Test Slot ID...:", oldTestSlotId); // Debug line
    console.log("Old Time Slot ID:", oldTimeSlotId); // Debug line
    console.log("Booking ID", bookingId);

    const oldTestSlot = await TestSlot.findById(oldTestSlotId).session(session);

    console.log("Old Test Slot:", oldTestSlot); // Debug line

    if (oldTestSlot) {
      oldTimeSlot = oldTestSlot.timeSlots.id(oldTimeSlotId);
      console.log("Old Time Slot:", oldTimeSlot); // Debug line
    }

    if (!oldTimeSlot) {
      throw new Error("Old Time Slot not found.");
    }

    oldTimeSlot.bookings = oldTimeSlot.bookings.filter(
      (booking) => !booking.equals(existingBooking._id)
    );

    if (!existingBooking.parent._id.equals(parent._id)) {
      throw new Error("You do not have permission to update this booking.");
    }

    let newTestSlot = null;

    if (testSlotId && testSlotId !== existingBooking.testSlot._id.toString()) {
      newTestSlot = await TestSlot.findOne({
        _id: testSlotId,
        "timeSlots._id": timeSlotId,
      }).session(session);

      if (!newTestSlot) {
        throw new Error("New Test Slot not found.");
      }
    } else {
      newTestSlot = await TestSlot.findById(
        existingBooking.testSlot._id
      ).session(session);
    }

    const newTimeSlot = newTestSlot.timeSlots.id(timeSlotId);
    if (
      !newTimeSlot ||
      newTimeSlot.status === "Fully Booked" ||
      newTimeSlot.bookings.length >= newTimeSlot.capacity
    ) {
      throw new Error("New Time Slot is fully booked or not found.");
    }

    const newBookingDetails = {
      childName: child.name,
      parentName: parent.name,
      testSlot: testSlotId || existingBooking.testSlot._id,
      timeSlot: timeSlotId,
    };

    const newQRCodeDataURL = await QRCode.toDataURL(
      JSON.stringify(newBookingDetails)
    );

    existingBooking.testSlot = testSlotId || existingBooking.testSlot._id;
    existingBooking.timeSlot = oldTestSlotId;
    existingBooking.qrCodeDataURL = Buffer.from(newQRCodeDataURL);

    await existingBooking.save({ session });

    newTimeSlot.bookings.push(existingBooking._id);
    if (newTimeSlot.bookings.length >= newTimeSlot.capacity) {
      newTimeSlot.status = "Fully Booked";
    }

    await oldTestSlot.save({ session });
    await newTestSlot.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).send({ booking: existingBooking });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).send(error.message || "Error updating the booking.");
  }
});

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

    // Directly pull the booking ID from the appropriate TimeSlot in TestSlot
    await TestSlot.updateMany(
      { "timeSlots.bookings": bookingId },
      { $pull: { "timeSlots.$.bookings": bookingId } }
    );

    res.send(booking);
  } catch (error) {
    console.log("Error deleting booking:", error);
    res.status(500).send("Error deleting the booking.");
  }
});

router.get("/qr/:id", async function (req, res) {
  try {
    const bookingId = req.params.id;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).send("Booking not found.");
    }

    // Convert the Base64 string to a buffer.
    const qrCodeBuffer = Buffer.from(
      booking.qrCodeDataURL.buffer.toString("base64"),
      "base64"
    );

    // Set headers to indicate you're sending an image.
    res.writeHead(200, {
      "Content-Type": "image/png", // or 'image/jpeg' or the appropriate image type depending on your QR code format.
      "Content-Length": qrCodeBuffer.length,
    });

    // Send the image.
    res.end(qrCodeBuffer);
  } catch (error) {
    console.log("Error fetching QR code:", error);
    res.status(500).send("Error fetching QR code.");
  }
});

router.delete("/admin/delete/:id", async (req, res) => {
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
