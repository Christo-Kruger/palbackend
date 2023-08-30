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
  testGrade: {
    type: String,
    enum: [
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
      "예비 중등 2학년",
    ],
  },
  capacity: { type: Number, required: true },
  bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }]
}, {
  toJSON: { virtuals: true },   // include virtuals when document is converted to JSON
  toObject: { virtuals: true }  // include virtuals when document is converted to an object
});

// Virtual property to get the count of bookings
TestSlotSchema.virtual('booked').get(function() {
  return this.bookings.length;
});

// Convert start and end times to specific format when saving the document
TestSlotSchema.pre("save", function(next) {
  this.startTime = moment(this.startTime, 'HH:mm').format('HH:mm');
  this.endTime = moment(this.endTime, 'HH:mm').format('HH:mm');
  next();
});

const TestSlot = mongoose.model("TestSlot", TestSlotSchema);
module.exports = TestSlot;
