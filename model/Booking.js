const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  child: {
    name: { type: String, required: true },
    previousSchool: { type: String, required: true },
    age: {
      type: String,
      required: true,
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
    gender: {
      type: String,
      enum: ["Male", "Female"],
    },
  },
  parent: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true },
    phone: { type: String, required: true },
  },
  campus: {
    type: String,
    enum: ["Suji", "Dongtan", "Bundang"],
    required: true,
  },
  date: { type: Date, required: true },
  time: {
    type: String,
    enum: [
      "14:30",
      "15:30",
      "16:30",
      "17:30",
      "18:30",
      "19:30",
      "20:30",
      "21:30",
    ],
    required: true,
  },
  confirmed: { type: Boolean, default: false },
  passed: { type: Boolean, default: false },
  price: { type: Number },
});

BookingSchema.pre("save", async function (next) {
  try {
    if (this.child.age === "5 Year Old") {
      this.price = 10000;
    } else if (
      this.child.age === "6 Year Old" ||
      this.child.age === "7 Year Old"
    ) {
      this.price = 15000;
    } else {
      this.price = 20000;
    }

    if (this.isNew) { // only check for booking limit if the document is new
      const dateStart = new Date(this.date);
      const dateEnd = new Date(this.date);
      dateStart.setHours(0,0,0,0);
      dateEnd.setHours(23,59,59,999);

      const bookingOnSameDateAndCampus = await mongoose.model("Booking").countDocuments({
        date: {
          $gte: dateStart,
          $lte: dateEnd,
        },
        time: this.time,
        campus: this.campus,
      });

      if (bookingOnSameDateAndCampus >= 6) {
        throw new Error("Booking limit for this slot at this campus has been reached");
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});


const Booking = mongoose.model("Booking", BookingSchema);
module.exports = Booking;
