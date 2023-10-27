const router = require("express").Router();
const auth = require("../middleware/auth");
const CanBook = require("../model/CanBook");

//Create canBook age group for CanBookSchema

router.post("/", async (req, res) => {
  try {
    const { ageGroup, canBook } = req.body;

    // validation

    if (!ageGroup || !canBook)
      return res.status(400).json({ msg: "Not all fields have been entered." });
    const newCanBook = new CanBook({
      ageGroup,
      canBook,
    });
    const savedCanBook = await newCanBook.save();
    res.json(savedCanBook);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//Get all canBook age groups
router.get("/", async (req, res) => {
  const canBook = await CanBook.find();
  res.json(canBook);
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
