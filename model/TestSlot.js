const mongoose = require("mongoose");
const moment = require("moment");


// TimeSlot schema
const TimeSlotSchema = new mongoose.Schema({
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  capacity: { type: Number, required: true },
  bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: "Booking" }],
  status: {
    type: String,
    enum: ["Available", "Fully Booked", "Closed"],
    default: "Available",
  },
});

TimeSlotSchema.pre("validate", function (next) {
  if (moment(this.endTime, "HH:mm").isBefore(moment(this.startTime, "HH:mm"))) {
    next(new Error("End time must be after start time."));
  } else {
    next();
  }
});

TimeSlotSchema.pre("save", function (next) {
  if (this.bookings.length >= this.capacity) {
    this.status = "Fully Booked";
  } else {
    this.status = "Available";
  }
  this.startTime = moment(this.startTime, "HH:mm").format("HH:mm");
  this.endTime = moment(this.endTime, "HH:mm").format("HH:mm");
  next();
});

// TestSlot schema
const TestSlotSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
    
    title: { type: String, required: true },
    date: { type: Date, required: true },
    timeSlots: [TimeSlotSchema],
    campus: {
      type: String,
      enum: ["수지", "동탄", "분당"],
      required: true,
    },
    testGrade: [
      {
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
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    versionKey: "version", // adding version key for concurrency handling
  }
  
);

TestSlotSchema.index({ date: 1 }); // adding index on date

TestSlotSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    const Booking = require("./Booking");
    for (let slot of doc.timeSlots) {
      await Booking.deleteMany({ testSlot: slot._id });
    }
  }
});

const TestSlot = mongoose.model("TestSlot", TestSlotSchema);
module.exports = TestSlot;
