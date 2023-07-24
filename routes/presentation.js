const express = require("express");
const router = express.Router();
const Presentation = require("../model/Presentation");
const auth = require("../middleware/auth");
const smsService = require("../services/smsService");
const requireAdmin = require("../middleware/requireAdmin");

// Get all presentations
router.get("/", async (req, res) => {
  try {
    const presentations = await Presentation.find();
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
router.get("/admin", auth, async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole !== "admin") {
      return res
        .status(403)
        .send("You are not authorized to view all presentations.");
    }

    const { campus, name } = req.query;
    const query = {};

    if (campus) {
      query["attendees.campus"] = campus;
    }

    if (name) {
      query["attendees.name"] = name;
    }

    const presentations = await Presentation.find(query);

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

router.patch("/:id/attendees", getPresentation, auth, async (req, res) => {
  console.log("Received PATCH request:", req.body);

  const { attendee } = req.body;

  if (!attendee) {
    console.log("Missing attendee data");
    return res.status(400).json({ message: "Missing attendee data" });
  }

  const userId = attendee._id;
  const userName = attendee.name;
  const userPhone = attendee.phone;
  const userCampus = attendee.campus;

  if (userId) {
    // Check if the user is already an attendee
    if (
      !res.presentation.attendees.some(
        (attendee) => attendee._id.toString() === userId.toString()
      )
    ) {
      res.presentation.attendees.push({
        _id: userId,
        name: userName,
        phone: userPhone,
        campus: userCampus,
      });
    } else {
      console.log("User has already booked this presentation");
      return res
        .status(400)
        .json({ message: "User has already booked this presentation" });
    }
  }

  try {
    const updatedPresentation = await res.presentation.save();
    console.log("Updated presentation:", updatedPresentation);

    // Send SMS to attendee
    const message = `Hello ${userName},

    You have successfully booked the presentation:
    '${updatedPresentation.name}'.
    
    Details:
    - Description: ${updatedPresentation.description}
    - Location: ${updatedPresentation.location}
    - Date: ${new Date(updatedPresentation.date).toLocaleDateString()}
    - Time: ${updatedPresentation.time}
    
    Looking forward to seeing you there!`;

    await smsService.sendSMS(userPhone, message);

    res.json(updatedPresentation);
  } catch (err) {
    console.error("Error saving the presentation:", err.message);
    res.status(400).json({ message: err.message });
  }
});

// Remove attendee

router.delete("/:id/attendees/:attendeeId", getPresentation, auth, requireAdmin, async (req, res) => {
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
});


// Create presentation
router.post("/", auth, async (req, res) => {
  const presentation = new Presentation({
    name: req.body.name,
    description: req.body.description,
    location: req.body.location,
    date: req.body.date,
    time: req.body.time,
    attendees: [],
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

router.post("/:id/attendees", getPresentation, auth, async (req, res) => {
  const newAttendee = {
    _id: req.user._id,
    name: req.user.name,
    phone: req.user.phone,
    campus: req.user.campus,
  };

  res.presentation.attendees.push(newAttendee); // Add the new attendee to the existing array

  try {
    const updatedPresentation = await res.presentation.save();

    // Send SMS
    const message = `You have successfully booked a presentation. Details: ${res.presentation.name} at ${res.presentation.location} on ${res.presentation.date} at ${res.presentation.time}.`;

    try {
      await smsService.sendSMS(newAttendee.phone, message);
    } catch (err) {
      console.error("Error sending SMS:", err);
      // You can decide whether you want to return a response here or let it continue
      // return res.status(500).json({ message: "Failed to send SMS." });
    }

    res.json(updatedPresentation);
  } catch (err) {
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
router.delete("/admin/delete/:id", auth, requireAdmin, async (req, res) => {
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
