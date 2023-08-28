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
      "5 Year Old",
      "6 Year Old",
      "7 Year Old",
      "1st Grade",
      "2nd Grade",
      "3rd Grade",
      "4th Grade",
      "5th Grade",
      "6th Grade",
      "7th Grade",
      "8th Grade",
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
