const mongoose = require("mongoose");
const moment = require('moment');

const TestSlotSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  campus: {
    type: String,
    enum: ["Suji", "Dongtan", "Bundang"],
    required: true,
  },
  capacity: { type: Number, required: true },
  bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }]
});

// Convert start and end times to specific format when saving the document
TestSlotSchema.pre("save", function(next) {
  this.startTime = moment(this.startTime, 'HH:mm').format('HH:mm');
  this.endTime = moment(this.endTime, 'HH:mm').format('HH:mm');
  next();
});

const TestSlot = mongoose.model("TestSlot", TestSlotSchema);
module.exports = TestSlot;
