const mongoose = require("mongoose");

const BookingPrioritySchema = new mongoose.Schema({
  priorityStart: { type: Date, required: true },
  priorityEnd: { type: Date, required: true },
});

const BookingPriority = mongoose.model("BookingPriority", BookingPrioritySchema);
module.exports = BookingPriority;
