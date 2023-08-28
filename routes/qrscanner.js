const express = require("express");
const router = express.Router();
const User = require("../model/User");



router.patch("/:userId/attendedPresentation", async (req, res) => {
    console.log(req.params, req.body);
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
  

  module.exports = router;