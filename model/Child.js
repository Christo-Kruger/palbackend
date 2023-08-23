const mongoose = require("mongoose");

const ChildSchema = new mongoose.Schema({
  name: { type: String, required: true },
  previousSchool: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  gender:{ type: String, enum:[
    "male",
    "female"
  ]},
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
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

const ageGradeMapping = {
  5: "5 Year Old",
  6: "6 Year Old",
  7: "7 Year Old",
  8: "1st Grade",
  9: "2nd Grade",
  10: "3rd Grade",
  11: "4th Grade",
  12: "5th Grade",
  13: "6th Grade",
  14: "7th Grade",
  15: "8th Grade",
};

ChildSchema.pre("save", function (next) {
  const currentDate = new Date();
  const ageInYears = currentDate.getFullYear() - this.dateOfBirth.getFullYear() + 1; 

  this.testGrade = ageGradeMapping[ageInYears] || "Age not eligible for testing";
  
  next();
});

const Child = mongoose.model("Child", ChildSchema);
module.exports = Child;
