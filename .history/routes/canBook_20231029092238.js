const router = require("express").Router();
const Campus = require("../model/Campus");

const validTestGrades = [
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
  "예비 중등 2학년"
];

const validateTestGrade = (testGrade) => {
  return validTestGrades.includes(testGrade);
};

router.get("/:campusName/:testGrade", async (req, res) => {
  const { campusName, testGrade } = req.params;

  if (!validateTestGrade(testGrade)) {
    return res.status(400).json({ message: "Invalid test grade." });
  }

  try {
    const campus = await Campus.findOne({ name: campusName });
    if (!campus || !campus.canBook) {
      return res.status(404).json({ message: "Booking not allowed for this campus." });
    }

    const ageGroup = campus.ageGroups.find((ag) => ag.ageGroup === testGrade);

    if (ageGroup && ageGroup.canBook) {
      return res.status(200).json({ canBook: true });
    } else {
      return res.status(404).json({ canBook: false, message: "Booking not allowed for this age group within the campus." });
    }
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;

