const mongoose = require("mongoose");

const ChildSchema = new mongoose.Schema({
  name: { type: String, required: true },
  previousSchool: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  ageGroup: { type: String },
  gender: { type: String, enum: ["male", "female"] },
  testGrade: {
    type: String,
    enum: [
      "Age not eligible for testing",
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
  updatedAt: { type: Date },
});

const ageGradeMapping = {
  2023: "Age not eligible for testing",
  2022: "Age not eligible for testing",
  2021: "Age not eligible for testing",
  2020: "5 Year Old",
  2019: "6 Year Old",
  2018: "7 Year Old",
  2017: "1st Grade",
  2016: "2nd Grade",
  2015: "3rd Grade",
  2014: "4th Grade",
  2013: "5th Grade",
  2012: "6th Grade",
  2011: "7th Grade",
  2010: "8th Grade",
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

ChildSchema.methods.updateChildFields = function () {
  const yearOfBirth = this.dateOfBirth.getFullYear();
  this.testGrade = ageGradeMapping[yearOfBirth] || "Age not eligible for testing";
  this.ageGroup = ageGroupMapping[this.testGrade] || "Age not eligible for testing";
};

ChildSchema.pre("save", function (next) {
  this.updateChildFields();
  next();
});

ChildSchema.pre("findOneAndUpdate", async function (next) {
  const docToUpdate = await this.model.findOne(this.getQuery());
  docToUpdate.updateChildFields();
  docToUpdate.updatedAt = new Date();
  await docToUpdate.save();
  next();
});

ChildSchema.post("findOneAndUpdate", async function () {
  await this.model.findOneAndUpdate({ _id: this._conditions._id }, { $set: { updatedAt: new Date() } });
});

const Child = mongoose.model("Child", ChildSchema);
module.exports = Child;
