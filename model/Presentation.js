const mongoose = require("mongoose");
const moment = require("moment-timezone");

const TimeSlotSchema = new mongoose.Schema({
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  maxAttendees: { type: Number, default: 0 },
  availableSlots: { type: Number, default: 0 },
  attendees: [
    {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      bookedAt: { type: Date },
    },
  ],
});

const PresentationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  date: { type: Date, required: true },
  ageGroup: { type: String, required: true }, // New field
  timeSlots: [TimeSlotSchema],
});

PresentationSchema.methods.addAttendee = async function (slotId, attendee) {
  const slot = this.timeSlots.id(slotId);
  if (slot.attendees.length >= slot.maxAttendees) {
    throw new Error("Maximum number of attendees reached for this slot.");
  }
  attendee.bookedAt = moment().tz("Asia/Seoul").toDate();
  slot.attendees.push(attendee);
  slot.availableSlots -= 1;
  await this.save();
};



const Presentation = mongoose.model("Presentation", PresentationSchema);
module.exports = Presentation;
