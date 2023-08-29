const mongoose = require("mongoose");


const ChildSchema = new mongoose.Schema({
  name: { type: String, required: true },
  previousSchool: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  ageGroup: { type: String },
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
  3: "5 Year Old",
  4: "6 Year Old",
  5: "7 Year Old",
  6: "1st Grade",
  7: "2nd Grade",
  8: "3rd Grade",
  9: "4th Grade",
  10: "5th Grade",
  11: "6th Grade",
  12: "7th Grade",
  13: "8th Grade",
};



const ageGroupMapping = {
  "5 Year Old": "Kids",
  "6 Year Old": "Kids",
  "7 Year Old": "Kids",
  "1st Grade": "Elementary",
  "2nd Grade": "Elementary",
  "3rd Grade": "Elementary",
  "4th Grade": "Elementary",
  "5th Grade": "Elementary",
  "6th Grade": "Elementary",
  "7th Grade": "Elementary",
  "8th Grade": "Elementary",
};

ChildSchema.pre("save", function (next) {
  const currentDate = new Date();
  const ageInYears = currentDate.getFullYear() - this.dateOfBirth.getFullYear() + 1; 

  this.testGrade = ageGradeMapping[ageInYears] || "Age not eligible for testing";
  this.ageGroup = ageGroupMapping[this.testGrade] || "Age not eligible for testing";
  
  next();
});

const Child = mongoose.model("Child", ChildSchema);
module.exports = Child;
