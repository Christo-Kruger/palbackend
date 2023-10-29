// routes/campus.js
const express = require('express');
const router = express.Router();
const Campus = require('../model/Campus');


// Create a campus
router.post('/create', async (req, res) => {
    try {
        const { name, admins, parents, bookings, canBook, ageGroups } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).send('Name field must be populated');
        }

        const campus = new Campus({
            name,
            admins,
            parents,
            bookings,
            canBook,
            ageGroups
        });

        await campus.save();
        res.status(200).send("Campus created");
    } catch(err) {
        console.error("Error:", err);
        res.status(500).send("Error creating campus");
    }
});

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

// Edit a campus
router.patch('/:campusId', async (req, res) => {
    const { campusId } = req.params;
    const { name } = req.body;
    try {
        const campus = await Campus.findById(campusId);
        if (!campus) {
            return res.status(404).send("Campus not found");
        }
        campus.name = name;
        await campus.save();
        res.status(200).json(campus);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error updating campus");
    }
});

// PATCH campus canBook 
router.patch('/canbook/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { canBook } = req.body;

        const campus = await Campus.findById(id);
        if (!campus) {
            return res.status(404).send("Campus not found");
        }

        campus.canBook = canBook;
        await campus.save();

        res.status(200).json(campus);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error updating canBook");
    }
}
);

// Delete a campus
router.delete('/:campusId', async (req, res) => {
    const { campusId } = req.params;
    try {
        const campus = await Campus.findById(campusId);
        if (!campus) {
            return res.status(404).send("Campus not found");
        }
        await campus.deleteOne();
        res.status(200).json(campus);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error deleting campus");
    }
});

module.exports = router;
