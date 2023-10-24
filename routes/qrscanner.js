const express = require("express");
const router = express.Router();
const User = require("../model/User");
const Presentation = require("../model/Presentation");
const moment = require("moment-timezone");

router.patch("/validateAndUpdateAttendance", async (req, res) => {
    const { userId } = req.body;
  
    try {
      const user = await User.findById(userId);
  
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }
  
      const currentTime = moment().tz("Asia/Seoul");
  
      const presentation = await Presentation.findOne({
        "timeSlots.attendees._id": userId,
        "timeSlots.startTime": { $lte: currentTime.toDate() },
        "timeSlots.endTime": { $gte: currentTime.toDate() },
      });
  
      if (!presentation) {
        return res.status(400).json({ error: "Wrong presentation." });  // <-- Changed this line
      }
  
      user.attendedPresentation = true;
      await user.save();
  
      res.status(200).json({ message: "Attendance validated and updated successfully." });
    } catch (error) {
      console.error("Error during validation and update:", error);
      res.status(500).json({
        error: "An error occurred while validating and updating attendance.",
      });
    }
  });
  

module.exports = router;