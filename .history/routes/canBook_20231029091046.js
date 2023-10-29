const router = require("express").Router();
const auth = require("../middleware/auth");
const CanBook = require("../model/CanBook");


  
//Get all canBook age groups
router.get("/", async (req, res) => {
  const canBook = await CanBook.find();
  res.json(canBook);
});

const validateTestGrade = (ageGroup) => {
    // Your validation logic here
    return true;
  };
  
// Get CanBook entry that matches child's testGrade
router.get("/:testGrade", async (req, res) => {
    const { testGrade } = req.params;
  
    if (!validateTestGrade(testGrade)) {  // Assume you have a validation function for testGrade
      return res.status(400).json({ message: 'Invalid test grade.' });
    }
  
    try {
      const canBook = await CanBook.findOne({ ageGroup: testGrade });
      if (canBook) {
        return res.status(200).json(canBook);
      } else {
        return res.status(404).json({ message: 'No record found for this test grade.' });
      }
    } catch (error) {
      console.error("Database error:", error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  });
  

//Delete canBook age group
router.delete("/:id", async (req, res) => {
  const canBook = await CanBook.findByIdAndDelete(req.params.id);
  res.json(canBook);
});

//Update canBook age group
router.put("/:id", async (req, res) => {
  const canBook = await CanBook.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true }
  );
  res.json(canBook);
});

module.exports = router;
