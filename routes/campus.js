// routes/campus.js
const express = require('express');
const router = express.Router();
const Campus = require('../model/Campus');

// Get all campuses
router.get('/', async (req, res) => {
    const campuses = await Campus.find();
    res.send(campuses);
});

// Get a campus
router.get('/:campusId', async (req, res) => {
    const campus = await Campus.findById(req.params.campusId);
    if (!campus) {
        return res.status(400).send('Invalid campus ID.');
    }
    res.send(campus);
});

module.exports = router;
