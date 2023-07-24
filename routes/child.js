// routes/child.js
const express = require('express');
const router = express.Router();
const Child = require('../model/Child');
const auth = require('../middleware/auth');

// Get a child
router.get('/:childId', auth, async (req, res) => {
    const child = await Child.findById(req.params.childId);
    if (!child) {
        return res.status(400).send('Invalid child ID.');
    }

    // Check if the requesting user is a parent and if they are the parent of this child
    if (req.user.role === 'parent' && !req.user.children.includes(req.params.childId)) {
        return res.status(403).send('Access denied. You are not authorized to view this child data.');
    }
    res.send(child);
});

module.exports = router;
