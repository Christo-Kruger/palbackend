const router = require("express").Router();




const validateTestGrade = (ageGroup) => {
  // Your validation logic here
  return true;
};

// Get age group's 'canBook' property that matches child's testGrade within a specific campus
router.get("/:campusName/:testGrade", async (req, res) => {
  const { campusName, testGrade } = req.params;

  if (!validateTestGrade(testGrade)) {
    return res.status(400).json({ message: "Invalid test grade." });
  }

  try {
    const campus = await Campus.findOne({ name: campusName });
    if (!campus) {
      return res.status(404).json({ message: "Campus not found." });
    }

    const ageGroup = campus.ageGroups.find((ag) => ag.ageGroup === testGrade);
    if (ageGroup) {
      return res.status(200).json({ canBook: ageGroup.canBook });
    } else {
      return res
        .status(404)
        .json({
          message: "No record found for this test grade within the campus.",
        });
    }
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
