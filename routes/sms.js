const express = require("express");
const router = express.Router();
const { sendSMS } = require("../services/smsService");

router.post("/", async (req, res) => {
  const { phoneNumbers, message } = req.body;
  try {
    const responses = await Promise.all(
      phoneNumbers.map((phone) => sendSMS(phone, message))
    );
    res.json({ messages: responses });
  } catch (error) {
    console.error("Error sending SMS:", error);
    res.status(500).json({ error: "Error sending SMS" });
  }
});

module.exports = router;
