const router = require("express").Router();
const auth = require("../middleware/auth");
const BookingPriority = require("../model/BookingPriority");

router.get("/", auth, async (req, res) => {
  try {
    const priority = await BookingPriority.findOne();
    res.json(priority);
  } catch (error) {
    res.status(500).send("Error retrieving booking priority times.");
  }
});

router.post("/", async (req, res) => {
  try {
    let priority = await BookingPriority.findOne();
    if (!priority) {
      priority = new BookingPriority();
    }
    priority.priorityStart = req.body.priorityStart;
    priority.priorityEnd = req.body.priorityEnd;
    await priority.save();
    res.json(priority);
  } catch (error) {
    res.status(500).send("Error updating booking priority times.");
  }
});

module.exports = router;
