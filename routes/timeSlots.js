const express = require("express");
const router = express.Router();
const TestSlot = require("../model/TestSlot");
const Group = require("../model/Group")
const auth = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");
const Joi = require("joi");
const mongoose = require("mongoose");


router.post("/", async (req, res) => {
  console.log("Received request body:", req.body);

  // Input Validation using Joi for timeSlotSchema
  const timeSlotSchema = Joi.object({
    startTime: Joi.string()
      .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .required(),
    endTime: Joi.string()
      .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .required(),
    capacity: Joi.number().integer().min(1).required(),
  });

  // Main schema with added group validation
  const schema = Joi.object({
    group: Joi.string().custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.message('Invalid Group ID');
      }
      return value;
    }).required(),
    title: Joi.string().required(),
    date: Joi.date().required(),
    timeSlots: Joi.array().items(timeSlotSchema).required(),
    campus: Joi.string().valid("수지", "동탄", "분당").required(),
    testGrade: Joi.array()
      .items(
        Joi.string().valid(
          "예비 5세",
          "예비 6세",
          "예비 7세",
          "예비 초등 1학년",
          "예비 초등 2학년",
          "예비 초등 3학년",
          "예비 초등 4학년",
          "예비 초등 5학년",
          "예비 초등 6학년",
          "예비 중등 1학년",
          "예비 중등 2학년"
        )
      )
      .required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    console.error("Validation error:", error.details[0].message);
    return res.status(400).send(error.details[0].message);
  }

  const testSlot = new TestSlot(req.body);
  try {
    await testSlot.save();
    console.log("TestSlot saved successfully:", testSlot);
    res.status(201).send(testSlot);
  } catch (error) {
    console.error("Error saving TestSlot:", error);
    res.status(400).json({ error: "Invalid request data." });
  }
});

const { isValidObjectId } = require('mongoose');

router.get("/", async (req, res) => {
  try {
    const {
      group, // Assume groupId is passed as a query parameter
    } = req.query;

    // Validate groupId
    if (!isValidObjectId(group)) {
      return res.status(400).send("Invalid group ID");
    }

    // Check if the group can book and if current date is within the startDate and endDate
    const groupData = await Group.findById(group);
    const currentDate = new Date();
    if (!groupData 
        || !groupData.canBook 
        || currentDate < new Date(groupData.startDate) 
        || currentDate > new Date(groupData.endDate)) {
      return res.status(403).send("This group cannot book at the moment or is out of the booking period.");
    }

    // Query based on the child's groupId
    const query = { group };

    const testSlots = await TestSlot.find(query)
      .select("date timeSlots campus title testGrade group")
      .populate('timeSlots.bookings', '_id')
      .sort({ date: 1 })
      .lean();

    const formattedSlots = testSlots.map((testSlot) => {
      testSlot.timeSlots = testSlot.timeSlots.map((slot) => {
        slot.availableSlots = slot.capacity - slot.bookings.length;
        return slot;
      });
      testSlot.testSlotId = testSlot._id;
      return testSlot;
    });

    res.send(formattedSlots);
  } catch (error) {
    console.error("Error fetching test slots:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/admin", async (req, res) => {
  try {
    const testSlots = await TestSlot.find({});
    console.log(testSlots);

    res.send(testSlots);
  } catch (error) {
    console.error("Error fetching test slots for admin:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/:id", async (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({ error: "Invalid TestSlot ID." });
  }
  try {
    const testSlot = await TestSlot.findById(req.params.id);
    if (!testSlot) {
      return res.status(404).send();
    }
    res.send(testSlot);
  } catch (error) {
    console.error("Error fetching test slot by ID:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.patch("/:id", async (req, res) => {
  const updates = Object.keys(req.body);
  try {
    const testSlot = await TestSlot.findById(req.params.id);
    if (!testSlot) {
      return res.status(404).send();
    }
    updates.forEach((update) => (testSlot[update] = req.body[update]));
    await testSlot.save();
    res.send(testSlot);
  } catch (error) {
    console.error("Error updating test slot:", error);
    res.status(400).send("Invalid Update Data");
  }
});


//Change Test


//Edit a single timeSlot
router.patch("/:testSlotId/timeSlots/:timeSlotId", async (req, res) => {
  const { testSlotId, timeSlotId } = req.params;
  const updates = req.body;

  try {
    const testSlot = await TestSlot.findOne({
      "_id": testSlotId,
      "timeSlots._id": timeSlotId
    });
    
    if (!testSlot) {
      return res.status(404).send();
    }

    const timeSlot = testSlot.timeSlots.id(timeSlotId);
    Object.keys(updates).forEach((key) => {
      timeSlot[key] = updates[key];
    });

    await testSlot.save();

    res.send(timeSlot);
  } catch (error) {
    console.error("Error updating time slot:", error);
    res.status(400).send("Invalid Update Data");
  }
});


router.delete("/:id", async (req, res) => {
  try {
    const testSlot = await TestSlot.findByIdAndDelete(req.params.id);
    if (!testSlot) {
      return res.status(404).send();
    }
    res.send(testSlot);
  } catch (error) {
    console.error("Error deleting test slot:", error);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
