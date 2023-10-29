const mongoose = require("mongoose");



const AgeGroupSchema = new mongoose.Schema({
  ageGroup: { type: String },
  canBook: { type: Boolean },
});


const CampusSchema = new mongoose.Schema({
  name: { type: String, enum: ['수지', '동탄', '분당'], required: true },
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  parents: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: "Booking" }],
  canBook: {
    type: Boolean,
    default: false,
  },
  ageGroups: [AgeGroupS],
});

const Campus = mongoose.model("Campus", CampusSchema);
module.exports = Campus;
