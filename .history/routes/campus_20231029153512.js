// routes/campus.js
const express = require('express');
const router = express.Router();
const Campus = require('../model/Campus');


// Create a campus
router.post('/create', async (req, res) => {
    try {
        const { name, ageGroups } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).send('Name field must be populated');
        }

        const campus = new Campus({
            name,
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
    try {
        const campuses = await Campus.find().select('name canBook ageGroups'); // fetch only 'name' and 'ageGroups'
        res.status(200).send(campuses);
    } catch (err) {
        console.error("Error:", err);
        res.status(500).send("Error fetching campuses");
    }
});

// Get a campus by ID
router.get('/:campusId', async (req, res) => {
    try {
        const campus = await Campus.findById(req.params.campusId).select('name ageGroups'); // fetch only 'name' and 'ageGroups'
        
        if (!campus) {
            return res.status(400).send('Invalid campus ID.');
        }

        res.status(200).send(campus);
    } catch (err) {
        console.error("Error:", err);
        res.status(500).send("Error fetching campus");
    }
});

// Edit a campus
router.patch('/:campusId', async (req, res) => {
    const { campusId } = req.params;
    const { name, ageGroups, canBook } = req.body; // added ageGroups and canBook
    try {
        const campus = await Campus.findById(campusId).select('name ageGroups canBook'); // fetch only 'name', 'ageGroups', and 'canBook'

        if (!campus) {
            return res.status(404).send("Campus not found");
        }

        // Update the fields if they are provided
        if (name) campus.name = name;
        if (ageGroups) campus.ageGroups = ageGroups;
        if (canBook !== undefined) campus.canBook = canBook; // checking against undefined because canBook can be false

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

//Patch ageGroup can Book

router.patch('/agegroup/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { ageGroup, canBook } = req.body;

        const campus = await Campus.findById(id);
        if (!campus) {
            return res.status(404).send("Campus not found");
        }

        const ageGroupIndex = campus.ageGroups.findIndex((ag) => ag.ageGroup === ageGroup);
        if (ageGroupIndex === -1) {
            return res.status(404).send("Age group not found");
        }

        campus.ageGroups[ageGroupIndex].canBook = canBook;
        await campus.save();

        res.status(200).json(campus);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error updating ageGroup canBook");
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
