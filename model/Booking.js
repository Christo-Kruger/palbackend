const mongoose = require("mongoose");
const Child = require("./Child");

const BookingSchema = new mongoose.Schema({
  child: { type: mongoose.Schema.Types.ObjectId, ref: "Child", required: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  testSlot: { type: mongoose.Schema.Types.ObjectId, ref: "TestSlot", required: true },
  price: Number,
  paid: { type: Boolean, default: false },
});



BookingSchema.pre("save", async function (next) {
  try {
    // Fetch the child object using the ID
    const child = await Child.findById(this.child);
    
    // Check the child's test grade to determine the price
    if (child.testGrade === "5 Year Old") {
      this.price = 10000;
    } else if (
      child.testGrade === "6 Year Old" ||
      child.testGrade === "7 Year Old"
    ) {
      this.price = 15000;
    } else {
      this.price = 20000;
    }

    next();
  } catch (error) {
    next(error);
  }
});

const Booking = mongoose.model("Booking", BookingSchema);
module.exports = Booking;
