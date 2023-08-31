const express = require("express");
const router = express.Router();
const Presentation = require("../model/Presentation");
const auth = require("../middleware/auth");
const smsService = require("../services/smsService");
const User = require("../model/User");
const exceljs = require("exceljs");
const moment = require("moment");
const QRCode = require("qrcode");
const mongoose = require("mongoose");

const allowedOrigins = [
  "http://localhost:3000",
  "https://pal-one.vercel.app",
  "https://pal-git-main-christo-kruger.vercel.app",
  "https://pal-n3o2wifbx-christo-kruger.vercel.app",
  "https://pal-2j0q0q0x0-christo-kruger.vercel.app",
];

// Middleware to handle CORS
router.use((req, res, next) => {
  const origin = req.headers.origin;

  // Check if the requesting origin is in the list of allowedOrigins
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  // Set other CORS headers
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  next();
});
// Get all presentations
router.get("/", async (req, res) => {
  try {
    const presentations = await Presentation.find().lean();
    res.json(presentations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/myBookings", auth, async (req, res) => {
  try {
    console.log("User ID:", req.user._id);
    const presentations = await Presentation.find({
      "timeSlots.attendees._id": req.user._id,
    });
    console.log("All Presentations:", presentations);
    const myBookings = presentations.map((presentation) => {
      const myTimeSlot = presentation.timeSlots.find((timeSlot) =>
        timeSlot.attendees.some(
          (attendee) => attendee._id.toString() === req.user._id.toString()
        )
      );
      return {
        ...presentation.toObject(),
        timeSlots: [myTimeSlot],
      };
    });
    console.log("My Bookings:", myBookings);
    res.json(myBookings);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

router.get("/exportToExcel", auth, async (req, res) => {
  try {
    console.log("Start of /exportToExcel");
    console.log("User:", req.user);

    let presentations;

    if (req.user.role === "superadmin") {
      console.log("Fetching presentations for superadmin...");
      presentations = await Presentation.find()
        .populate({
          path: "timeSlots.attendees._id",
          model: "User",
          select: "name email phone campus attendedPresentation children",
          populate: {
            path: "children",
            model: "Child",
          },
        })
        .lean();
    } else if (req.user.role === "admin") {
      console.log("Fetching presentations for admin...");
      presentations = await Presentation.find()
        .populate({
          path: "timeSlots.attendees._id",
          model: "User",
          select: "name email phone campus attendedPresentation children",
          match: { campus: req.user.campus },
          populate: {
            path: "children",
            model: "Child",
          },
        })
        .lean();
    }

    console.log("Fetched presentations:", presentations);

    const dataToExport = [];
    console.log("Transforming data for export...");

    presentations.forEach((presentation) => {
      presentation.timeSlots.forEach((slot) => {
        slot.attendees.forEach((attendee) => {
          if (attendee._id) {
            const childrenNames = attendee._id.children
              .map((child) => child.name)
              .join("; ");
            const childrenPreviousSchools = attendee._id.children
              .map((child) => child.previousSchool)
              .join("; ");
            const childrenDateOfBirths = attendee._id.children
              .map((child) => moment(child.dateOfBirth).format("DD-MM-YYYY"))
              .join("; ");
            const childrenGenders = attendee._id.children
              .map((child) => child.gender)
              .join("; ");
            const childrenTestGrades = attendee._id.children
              .map((child) => child.testGrade)
              .join("; ");

            dataToExport.push([
              presentation.name,
              slot.startTime,
              slot.endTime,
              attendee._id.name,
              attendee._id.email,
              attendee._id.phone,
              attendee._id.campus,
              attendee.bookedAt,

              childrenNames,
              childrenPreviousSchools,
              childrenDateOfBirths,
              childrenGenders,
              childrenTestGrades,
              attendee._id.attendedPresentation,
            ]);
          }
        });
      });
    });

    console.log("Data ready for export:", dataToExport);

    console.log("Generating CSV file...");

    // Create a new workbook and add data to the first worksheet.
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("Attendees Data");

    // Set headers
    worksheet.columns = [
      { header: "Presentation Name", key: "name", width: 25 },
      { header: "Start Time", key: "start", width: 15 },
      { header: "End Time", key: "end", width: 15 },
      { header: "Name", key: "attendeeName", width: 20 },
      { header: "Email", key: "email", width: 25 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Campus", key: "campus", width: 15 },
      { header: "Booked At", key: "booked", width: 15 },

      { header: "Child Name", key: "childName", width: 20 },
      {
        header: "Child Previous School",
        key: "childPreviousSchool",
        width: 25,
      },
      { header: "Child Date Of Birth", key: "childDateOfBirth", width: 15 },
      { header: "Child Gender", key: "childGender", width: 15 },
      { header: "Child Test Grade", key: "childTestGrade", width: 20 },
      { header: "Attended Presentation", key: "attended", width: 20 },
    ];

    // Add rows
    worksheet.addRows(dataToExport);

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="attendees_data.csv"'
    );
    res.type("text/csv");

    // Write CSV to the response
    await workbook.csv.write(res);
    res.status(200).end();
  } catch (error) {
    console.error("Error exporting to CSV:", error);
    res.status(500).send("Internal server error");
  }
});

router.get("/:id/attendeesInTimeSlots", async (req, res) => {
  try {
    const presentation = await Presentation.findById(req.params.id)
      .populate({
        path: "timeSlots.attendees._id",
        model: "User", // Explicitly specify the model
        select: "name email phone campus children", // Add children to the fields you want from User model
      })
      .populate({
        path: "timeSlots.attendees._id.children",
        model: "Child", // Assuming the model name for children is 'Child'
        select: "name previousSchool dateOfBirth gender", // Specify fields you want from Child model
      })
      .lean();

    if (!presentation) {
      return res.status(404).json({ message: "Cannot find presentation" });
    }

    const attendeesInTimeSlots = presentation.timeSlots.map((slot) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
      attendees: slot.attendees.map((attendee) => ({
        _id: attendee._id._id, // _id is nested because of the populated fields
        name: attendee._id.name,
        email: attendee._id.email,
        phone: attendee._id.phone,
        campus: attendee._id.campus,
        children: attendee._id.children, // Add this to get children details
        bookedAt: attendee.bookedAt,
      })),
    }));

    res.json(attendeesInTimeSlots);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/allAttendeesInTimeSlots", auth, async (req, res) => {
  try {
    let presentations;

    const populationOptions = {
      path: "timeSlots.attendees._id",
      model: "User",
      select: "name email phone campus attendedPresentation children", // added children here
    };

    if (req.user.role === "superadmin") {
      presentations = await Presentation.find()
        .populate(populationOptions)
        .lean();
    } else if (req.user.role === "admin") {
      presentations = await Presentation.find()
        .populate({
          ...populationOptions,
          match: { campus: req.user.campus },
        })
        .lean();
    }

    // If the `children` field on the User model is another reference, populate it as well
    if (presentations) {
      for (let presentation of presentations) {
        for (let slot of presentation.timeSlots) {
          for (let attendee of slot.attendees) {
            if (attendee._id && attendee._id.children) {
              // Assuming children is an array of references and you want to get the name and testGrade of each child
              await User.populate(attendee._id, {
                path: "children",
                select: "name testGrade gender",
              });
            }
          }
        }
      }
    }

    const allAttendeesInTimeSlots = presentations.map((presentation) => {
      return {
        presentationName: presentation.name,
        timeSlots: presentation.timeSlots.map((slot) => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
          attendees: slot.attendees
            .map((attendee) => {
              if (!attendee._id) {
                // Handle or skip this attendee. Here, we return null.
                return null;
              }
              return {
                _id: attendee._id._id,
                name: attendee._id.name,
                email: attendee._id.email,
                phone: attendee._id.phone,
                campus: attendee._id.campus,
                bookedAt: attendee.bookedAt,
                attendedPresentation: attendee._id.attendedPresentation,
                children: attendee._id.children, // Adding children data
              };
            })
            .filter(Boolean), // This will remove any null attendees from the array
        })),
      };
    });

    res.json(allAttendeesInTimeSlots);
  } catch (err) {
    console.error("Error processing request:", err);
    res.status(500).json({ message: err.message });
  }
});

router.get("/presentations", async (req, res) => {
  try {
    const presentations = await Presentation.find().populate({
      path: "timeSlots.attendees._id",
      model: "User",
    });

    // Add no-cache headers
    res.set("Cache-Control", "no-store");

    res.json(presentations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.get("/:presentationId/timeSlots", async (req, res) => {
  try {
    const { presentationId } = req.params;
    const presentation = await Presentation.findById(presentationId);
    if (!presentation) {
      return res.status(404).send({ error: "Presentation not found" });
    }
    res.send(presentation.timeSlots);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

router.patch("/:presentationId/changeSlot", async (req, res) => {
  try {
    const { presentationId } = req.params;
    const { userId, oldSlotId, newSlotId } = req.body;

    const presentation = await Presentation.findById(presentationId);
    if (!presentation) {
      return res.status(404).send({ error: "Presentation not found" });
    }

    const oldSlot = presentation.timeSlots.id(oldSlotId);
    if (!oldSlot) {
      return res.status(400).send({ error: "Old slot not found" });
    }

    const oldAttendee = oldSlot.attendees.find(
      (attendee) => attendee._id.toString() === userId.toString()
    );
    if (!oldAttendee) {
      return res.status(400).send({ error: "User not found in old slot" });
    }

    oldSlot.attendees = oldSlot.attendees.filter(
      (attendee) => attendee._id.toString() !== userId.toString()
    );
    oldSlot.availableSlots += 1;

    presentation.markModified("timeSlots");

    const newSlot = presentation.timeSlots.id(newSlotId);
    if (!newSlot) {
      return res.status(400).send({ error: "New slot not found" });
    }
    if (newSlot.attendees.length >= newSlot.maxAttendees) {
      return res
        .status(400)
        .send({ error: "The new slot is already fully booked" });
    }

    const newAttendee = {
      _id: oldAttendee._id,
      bookedAt: oldAttendee.bookedAt,
    };

    newSlot.attendees.push(newAttendee);
    newSlot.availableSlots -= 1;

    presentation.markModified("timeSlots");

    await presentation.save();

    return res.send({ success: "Successfully changed the slot" });
  } catch (error) {
    console.error("Error changing slot:", error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
});

// Get presentations by attendee
router.get("/user/:userId", async (req, res) => {
  try {
    const presentations = await Presentation.find({
      "attendees._id": req.params.userId,
    });
    res.json(presentations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// Get all Presentations if user is admin

router.get("/admin", async (req, res) => {
  try {
    const { campus, name } = req.query;
    const query = {};

    if (campus) {
      query["attendees.campus"] = campus;
    }

    if (name) {
      query["attendees.name"] = name;
    }

    const presentations = await Presentation.find(query).populate({
      path: "timeSlots.attendees._id",
      model: "User",
      select: "name phone campus",
    });

    if (!presentations) {
      return res.status(404).send("Presentations not found.");
    }

    res.send(presentations);
  } catch (error) {
    console.log("Error fetching presentations:", error);
    res.status(500).send("Error fetching the presentations.");
  }
});

// Get one presentation
router.get("/:id", getPresentation, (req, res) => {
  res.json(res.presentation);
});

// Remove attendee

router.delete(
  "/:id/attendees/:attendeeId",
  getPresentation,
  async (req, res) => {
    const { attendeeId } = req.params;
    const { user } = req;
    const { _id } = user;

    try {
      const presentation = await Presentation.findOneAndUpdate(
        { _id: req.params.id },
        { $pull: { attendees: { _id: attendeeId } } },
        { new: true }
      );
      if (!presentation) {
        return res.status(404).json({ message: "Presentation not found" });
      }
      res.json(presentation);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

router.delete(
  "/parent/:id/attendees/:userId",
  getPresentation,
  auth,
  async (req, res) => {
    const { userId } = req.params;

    try {
      const presentation = await Presentation.findOne({ _id: req.params.id });
      if (!presentation) {
        return res.status(404).json({ message: "Presentation not found" });
      }

      presentation.timeSlots.forEach((timeSlot) => {
        timeSlot.attendees = timeSlot.attendees.filter(
          (attendee) => attendee._id.toString() !== userId
        );
      });

      const updatedPresentation = await presentation.save();

      res.json(updatedPresentation);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

router.get("/presentationsWithAttendees", async (req, res) => {
  try {
    const presentations = await Presentation.find()
      .populate("timeSlots.attendees._id") // Populate attendees information
      .lean();
    res.json(presentations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create presentation
router.post("/", async (req, res) => {
  // Ensure timeSlots are provided and are in an array
  if (!req.body.timeSlots || !Array.isArray(req.body.timeSlots)) {
    return res
      .status(400)
      .json({ message: "Time slots data is required and should be an array." });
  }

  const timeSlots = req.body.timeSlots.map((slot) => {
    return {
      startTime: slot.startTime,
      endTime: slot.endTime,
      maxAttendees: slot.maxAttendees, // If maxAttendees not provided, default to 0
      availableSlots: slot.maxAttendees, // availableSlots should initially be the same as maxAttendees
      attendees: [], // start with no attendees
    };
  });

  const presentation = new Presentation({
    name: req.body.name,
    description: req.body.description,
    location: req.body.location,
    date: req.body.date,
    ageGroup: req.body.ageGroup,
    timeSlots: timeSlots,
  });

  try {
    const newPresentation = await presentation.save();
    res.status(201).json(newPresentation);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update presentation
router.put("/:id", getPresentation, async (req, res) => {
  if (req.body.name) {
    res.presentation.name = req.body.name;
  }
  if (req.body.description) {
    res.presentation.description = req.body.description;
  }
  if (req.body.location) {
    res.presentation.location = req.body.location;
  }
  if (req.body.date) {
    res.presentation.date = req.body.date;
  }
  if (req.body.ageGroup) {
    res.presentation.ageGroup = req.body.ageGroup;
  }
  if (req.body.timeSlots) {
    res.presentation.timeSlots = req.body.timeSlots;
  }

  try {
    const updatedPresentation = await res.presentation.save();
    res.json(updatedPresentation);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});


// BOOK PRESENTATION
router.patch("/:id/slots/:slotId/attendees", auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const presentation = await Presentation.findById(req.params.id);
    const timeSlot = presentation.timeSlots.id(req.params.slotId);
    const userIdString = req.user._id.toString();
    const user = await User.findById(req.user._id).populate("children");

    // Check if the user has any children in the same age group
    const childInAgeGroup = user.children.find((child) => {
      return child.ageGroup === presentation.ageGroup;
    });

    if (!childInAgeGroup) {
      return res.status(400).json({
        message:
          "해당 연령의 학생이 확인되지 않습니다. [등록학생정보]에서 생년월일을 확인해주시기 바랍니다.",
      });
    }

    const childName = childInAgeGroup.name;
    const childTestGrade = childInAgeGroup.testGrade;

    // Check if the user has already booked a presentation in the same age group
    const allPresentations = await Presentation.find({
      ageGroup: presentation.ageGroup,
    });

    const isBookedInSameAgeGroup = allPresentations.some((presentation) =>
      presentation.timeSlots.some((timeSlot) =>
        timeSlot.attendees
          .map((attendee) => attendee._id.toString())
          .includes(userIdString)
      )
    );

    if (isBookedInSameAgeGroup) {
      return res.status(400).json({
        message:
          "이 연령대의 프레젠테이션을 이미 예약하셨습니다. 다시 예약하실 수 없습니다.",
      });
    }

    // Check if the time slot is full
    if (timeSlot.attendees.length >= timeSlot.maxAttendees) {
      return res.status(400).json({
        message: "This time slot is already fully booked.",
      });
    }

    // Add the user to the time slot
    timeSlot.attendees.push({ _id: req.user._id, bookedAt: Date.now() });
    timeSlot.availableSlots -= 1;
    await presentation.save({ session });

    // Update the user's QR code
    const attendeeName = user.name;
    const attendeePhone = user.phone;
    const timeSlotStartTime = timeSlot.startTime;
    const userID = user._id;

    const qrCodeData = `${attendeeName},${attendeePhone},${timeSlotStartTime}, ${userID}`;
    const qrCodeDataURL = await QRCode.toDataURL(qrCodeData);
    const qrCodeBinaryData = Buffer.from(qrCodeDataURL.split(",")[1], "base64");

    user.qrCodeDataURL = qrCodeBinaryData;
    await user.save({ session });

    // Send the booking confirmation SMS
    const message = `안녕하세요. ${user.name},

    예약하신 설명회 일정 확인부탁드립니다.
    '${presentation.name}'.
    
    Details:
    ■ 날짜: ${new Date(presentation.date).toLocaleDateString()}
    ■ 시간: ${timeSlot.startTime} - ${timeSlot.endTime}
    ■ 장소: ${presentation.location}

    ■ 참석가능인원: 1명 (참석 인원이 제한되어 학부모 1명만 입장이 가능합니다.★유아 동반 불가★)

    ※ 유의사항 
    ★설명회 참석시간은 등록순번과 관계가 없습니다. 

감사합니다.`;

    await smsService.sendSMS(user.phone, message);

    // Commit the transaction and end the session
    await session.commitTransaction();
    session.endSession();
    res.json(timeSlot);
  } catch (err) {
    // Abort the transaction and end the session
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: err.message });
  }
});

// Replace attendees list
router.put("/:id/attendees", getPresentation, async (req, res) => {
  if (req.body.attendees) {
    res.presentation.attendees = req.body.attendees;
  }
  try {
    const updatedPresentation = await res.presentation.save();
    res.json(updatedPresentation);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete presentation if admin
router.delete("/:id", async (req, res) => {
  try {
    const presentationId = req.params.id;
    const presentation = await Presentation.findById(presentationId);

    if (!presentation) {
      return res.status(404).send("Booking not found.");
    }

    await presentation.deleteOne();

    res.send(presentation);
  } catch (error) {
    console.log("Error deleting booking:", error);
    res.status(500).send("Error deleting the booking.");
  }
});

// Middleware for getting a presentation by ID
async function getPresentation(req, res, next) {
  try {
    const presentation = await Presentation.findById(req.params.id);
    if (!presentation) {
      return res.status(404).json({ message: "Cannot find presentation" });
    }
    res.presentation = presentation;
    next();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = router;
