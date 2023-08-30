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
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  updatedAt: { type: Date },
});

const ageGradeMapping = {
  2023: "Age not eligible for testing",
  2022: "Age not eligible for testing",
  2021: "Age not eligible for testing",
  2020: "예비 5세",
  2019: "예비 6세",
  2018: "예비 7세",
  2017: "예비 초등 1학년",
  2016: "예비 초등 2학년",
  2015: "예비 초등 3학년",
  2014: "예비 초등 4학년",
  2013: "예비 초등 5학년",
  2012: "예비 초등 6학년",
  2011: "예비 중등 1학년",
  2010: "예비 중등 2학년",
};

const ageGroupMapping = {
  "Age not eligible for testing": "Not Eligible",
  "예비 5세": "Kids",
  "예비 6세": "Kids",
  "예비 7세": "Kids",
  "예비 초등 1학년": "Elementary",
  "예비 초등 2학년": "Elementary",
  "예비 초등 3학년": "Elementary",
  "예비 초등 4학년": "Elementary",
  "예비 초등 5학년": "Elementary",
  "예비 초등 6학년": "Elementary",
  "예비 중등 1학년": "Middle School",
  "예비 중등 2학년": "Middle School",
};

ChildSchema.methods.updateChildFields = function () {
  const yearOfBirth = this.dateOfBirth.getFullYear();
  this.testGrade =
    ageGradeMapping[yearOfBirth] || "Age not eligible for testing";
  this.ageGroup =
    ageGroupMapping[this.testGrade] || "Age not eligible for testing";
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
  await this.model.findOneAndUpdate(
    { _id: this._conditions._id },
    { $set: { updatedAt: new Date() } }
  );
});

const Child = mongoose.model("Child", ChildSchema);
module.exports = Child;
