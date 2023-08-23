const express = require("express");
const router = express.Router();
const Presentation = require("../model/Presentation");
const auth = require("../middleware/auth");
const smsService = require("../services/smsService");
const User = require("../model/User");
const exceljs = require('exceljs');
const fs = require("fs");

// Get all presentations
router.get("/", async (req, res) => {
  try {
    const presentations = await Presentation.find().lean();
    res.json(presentations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/exportToExcel", auth, async (req, res) => {
  try {
    console.log('Start of /exportToExcel');
    console.log('User:', req.user);

    let presentations;

    if (req.user.role === "superadmin") {
      console.log('Fetching presentations for superadmin...');
      presentations = await Presentation.find()
        .populate({
          path: 'timeSlots.attendees._id',
          model: 'User',
          select: 'name email phone campus attendedPresentation'
        })
        .lean();
    } else if (req.user.role === "admin") {
      console.log('Fetching presentations for admin...');
      presentations = await Presentation.find()
        .populate({
          path: 'timeSlots.attendees._id',
          model: 'User',
          select: 'name email phone campus attendedPresentation',
          match: { campus: req.user.campus }
        })
        .lean();
    }

    console.log('Fetched presentations:', presentations);

    const dataToExport = [];
    console.log('Transforming data for export...');

    presentations.forEach(presentation => {
      presentation.timeSlots.forEach(slot => {
        slot.attendees.forEach(attendee => {
          if (attendee._id) {
            dataToExport.push([
              presentation.name,
              slot.startTime,
              slot.endTime,
              attendee._id.name,
              attendee._id.email,
              attendee._id.phone,
              attendee._id.campus,
              attendee.bookedAt,
              attendee._id.attendedPresentation
            ]);
          }
        });
      });
    });

    console.log('Data ready for export:', dataToExport);

    console.log('Generating CSV file...');

    // Create a new workbook and add data to the first worksheet.
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("Attendees Data");

    // Set headers
    worksheet.columns = [
      { header: 'Presentation Name', key: 'name', width: 25 },
      { header: 'Start Time', key: 'start', width: 15 },
      { header: 'End Time', key: 'end', width: 15 },
      { header: 'Name', key: 'attendeeName', width: 20 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Campus', key: 'campus', width: 15 },
      { header: 'Booked At', key: 'booked', width: 15 },
      { header: 'Attended Presentation', key: 'attended', width: 20 }
    ];

    // Add rows
    worksheet.addRows(dataToExport);

    res.setHeader('Content-Disposition', 'attachment; filename="attendees_data.csv"');
    res.type('text/csv');

    // Write CSV to the response
    await workbook.csv.write(res);
    res.status(200).end();
    
  }  catch (error) {
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
        select: "name email phone campus", // Select fields you want from User model
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

    if (req.user.role === "superadmin") {
      presentations = await Presentation.find()
        .populate({
          path: "timeSlots.attendees._id",
          model: "User",
          select: "name email phone campus attendedPresentation",
        })
        .lean();
    } else if (req.user.role === "admin") {
      presentations = await Presentation.find()
        .populate({
          path: "timeSlots.attendees._id",
          model: "User",
          select: "name email phone campus attendedPresentation",
          match: { campus: req.user.campus },
        })
        .lean();
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
  if (req.body.time) {
    res.presentation.time = req.body.time;
  }
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

// Add attendee to presentation
router.patch("/:id/slots/:slotId/attendees", auth, async (req, res) => {
  try {
    const presentation = await Presentation.findById(req.params.id);
    const timeSlot = presentation.timeSlots.id(req.params.slotId);

    // Convert req.user._id to string
    const userIdString = req.user._id.toString();

    // Check if user is already booked in any slot of this presentation
    const isBookedInCurrentPresentation = presentation.timeSlots.some(
      (timeSlot) =>
        timeSlot.attendees
          .map((attendee) => attendee._id.toString())
          .includes(userIdString)
    );

    if (isBookedInCurrentPresentation) {
      return res
        .status(400)
        .json({
          message: "You've already booked a time slot in this presentation.",
        });
    }
    // Check if user has booked ANY presentation
    const allPresentations = await Presentation.find();
    const isBookedInAnyPresentation = allPresentations.some((presentation) =>
      presentation.timeSlots.some((timeSlot) =>
        timeSlot.attendees
          .map((attendee) => attendee._id.toString())
          .includes(userIdString)
      )
    );
    if (isBookedInAnyPresentation) {
      return res
        .status(400)
        .json({
          message:
            "You've already booked a presentation. You can't book again.",
        });
    }
    if (timeSlot.attendees.length >= timeSlot.maxAttendees) {
      return res
        .status(400)
        .json({ message: "You've already booked this time slot." });
    }

    // Push attendee object to the array
    timeSlot.attendees.push({ _id: req.user._id, bookedAt: Date.now() });
    timeSlot.availableSlots -= 1; // Decrease available slots
    await presentation.save();

    // Fetch user info
    const user = await User.findById(req.user._id);

    // Send SMS to attendee
    const message = `Hello ${user.name},

    You have successfully booked the presentation:
    '${presentation.name}'.
    
    Details:
    - Description: ${presentation.description}
    - Location: ${presentation.location}
    - Date: ${new Date(presentation.date).toLocaleDateString()}
    - Time Slot: ${timeSlot.startTime} - ${timeSlot.endTime}
    
    Looking forward to seeing you there!`;

    await smsService.sendSMS(user.phone, message);

    res.json(timeSlot);
  } catch (err) {
    console.error("Error saving the presentation:", err.message);
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
          select: "name email phone campus attendedPresentation",
        })
        .lean();
    } else if (req.user.role === "admin") {
      console.log("Fetching presentations for admin...");
      presentations = await Presentation.find()
        .populate({
          path: "timeSlots.attendees._id",
          model: "User",
          select: "name email phone campus attendedPresentation",
          match: { campus: req.user.campus },
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
            dataToExport.push({
              "Presentation Name": presentation.name,
              "Start Time": slot.startTime,
              "End Time": slot.endTime,
              Name: attendee._id.name,
              Email: attendee._id.email,
              Phone: attendee._id.phone,
              Campus: attendee._id.campus,
              "Booked At": attendee.bookedAt,
              "Attended Presentation": attendee._id.attendedPresentation,
            });
          }
        });
      });
    });

    console.log("Data ready for export:", dataToExport);

    console.log("Generating Excel file...");
    // Create a new workbook and add data to the first worksheet.
    const ws = xlsx.utils.json_to_sheet(dataToExport);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Attendees Data");

    // Create the Excel file buffer.
    const excelBuffer = xlsx.write(wb, { type: "buffer" });
    console.log("Excel file generated");

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="attendees_data.xlsx"'
    );
    res.type(".xlsx");
    res.send(excelBuffer);
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    res.status(500).send("Internal server error");
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
