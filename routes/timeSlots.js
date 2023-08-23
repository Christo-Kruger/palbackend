const express = require('express');
const router = express.Router();
const TestSlot = require('../model/TestSlot');
const auth = require('../middleware/auth'); // Assuming you have an auth middleware for protected routes
const requireAdmin = require('../middleware/requireAdmin'); // Assuming you have a middleware to ensure only admins can modify test slots

router.post('/', auth,  async (req, res) => {
  console.log('Received request body:', req.body);
  const testSlot = new TestSlot(req.body);
  try {
    await testSlot.save();
    res.status(201).send(testSlot);
  } catch (error) {
    res.status(400).json({ error: 'Invalid request data.' });
  }
});

router.get('/', async (req, res) => {
  try {
    let testSlots = await TestSlot.find({
      date: { $gte: new Date() }, // Only return future test slots
      // the $expr line is not needed for this version since you'll compute available slots on the frontend
    });

    // Assuming bookings is an array on each test slot document, calculate available slots for each test slot
    testSlots = testSlots.map(slot => {
      slot = slot.toObject(); // Convert the document to a plain JS object
      slot.availableSlots = slot.capacity - slot.bookings.length;
      return slot;
    });

    res.send(testSlots);
  } catch (error) {
    console.error("Error fetching test slots:", error);
    res.status(500).send();
  }
});


router.get('/admin', async (req, res) => {
  try {
    const testSlots = await TestSlot.find({
      
      $expr: { $lt: [ { $size: "$bookings" }, "$capacity" ] } // Only return test slots that are not fully booked
    });
    res.send(testSlots);
  } catch (error) {
    res.status(500).send();
  }
});

// GET route to retrieve a test slot by id
router.get('/:id', async (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({ error: 'Invalid TestSlot ID.' });
  }
  try {
    const testSlot = await TestSlot.findById(req.params.id);
    if (!testSlot) {
      return res.status(404).send();
    }
    res.send(testSlot);
  } catch (error) {
    res.status(500).send();
  }
});

// PATCH route to update a test slot
router.patch('/:id', async (req, res) => {
  const updates = Object.keys(req.body);
  try {
    const testSlot = await TestSlot.findById(req.params.id);
    if (!testSlot) {
      return res.status(404).send();
    }
    updates.forEach((update) => testSlot[update] = req.body[update]);
    await testSlot.save();
    res.send(testSlot);
  } catch (error) {
    res.status(400).send(error);
  }
});

// DELETE route to delete a test slot
router.delete('/:id', async (req, res) => {
  try {
    const testSlot = await TestSlot.findByIdAndDelete(req.params.id);
    if (!testSlot) {
      return res.status(404).send();
    }
    res.send(testSlot);
  } catch (error) {
    res.status(500).send();
  }
});

module.exports = router;
