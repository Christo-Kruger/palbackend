const router = require("express").Router();
const auth = require("../middleware/auth");
const CanBook = require("../m")

//Create canBook age group for CanBookSchema

router.post("/", auth, async (req, res) => {



