const express = require("express");
const router = express.Router();
const { sendSMS } = require('../services/smsService');

router.post('/', async (req, res) => {
  const { phoneNumber, message } = req.body;
  try {
    const response = await sendSMS(phoneNumber, message);
    res.json(response);
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ error: 'Error sending SMS' });
  }
});

module.exports = router;
