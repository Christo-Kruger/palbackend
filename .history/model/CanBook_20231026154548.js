// CanBook Model
const mongoose = require("mongoose");

const CanBookSchema = new mongoose.Schema({
  ageGroup: { type: String },
  canBook: { type: Boolean },
});

module.exports = mongoose.model("canBook", CanBookSchema);