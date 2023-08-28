// routes/child.js
const express = require('express');
const router = express.Router();
const Child = require('../model/Child');
const auth = require('../middleware/auth');
const User = require('../model/User');

router.get('/', auth, async (req, res) => {
  try {
      const userId = req.user._id;  // Assuming 'auth' middleware adds user info to req
      const user = await User.findById(userId).populate('children');  // Using 'populate' to get the child details
      if (!user || !user.children) {
          return res.status(404).send('No children found for this user.');
      }
      res.send(user.children);
  } catch (error) {
      res.status(500).send('Internal Server Error.');
  }
});

router.get('/children', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate('children');
    if (!user || !user.children) {
        return res.status(404).send('No children found for this user.');
    }
    res.send(user.children);
  } catch (error) {
    res.status(500).send('Internal Server Error.');
  }
});



router.patch('/:childId', async (req, res) => {
  try {
      const child = await Child.findByIdAndUpdate(req.params.childId, req.body, { new: true });

      if (child) {
          res.json(child);
      } else {
          res.status(404).send({ message: 'Child not found' });
      }
  } catch (error) {
      res.status(500).send({ message: 'Error updating child details' });
  }
});

router.patch('/parent/:childId', async (req, res) => {
  try {
    const loggedInUserId = req.user._id; // Assuming you have the user object after authentication
    const childId = req.params.childId;
    const child = await Child.findById(childId);

    if (!child) {
      return res.status(404).send({ message: 'Child not found' });
    }

    // Check if the child is associated with the logged-in user
    if (!child.parent.equals(loggedInUserId)) {
      return res.status(403).send({ message: 'Access denied' });
    }

    // Update the child's details
    child.set(req.body); // Assuming req.body contains the updated child details
    const updatedChild = await child.save();
    res.json(updatedChild);
  } catch (error) {
    res.status(500).send({ message: 'Error updating child details' });
  }
});


//Create a child

// POST route to create a new child
router.post("/", auth, async (req, res) => {
    try {
      // Extract the data from the request body
      const { name, previousSchool, dateOfBirth,gender } = req.body;
      const parent = req.user._id; // the id of the parent (User)
  
      // Create a new child instance
      const child = new Child({
        name: name,
        previousSchool: previousSchool,
        dateOfBirth: dateOfBirth,
        gender: gender,
        parent: parent,
      });
  
      // Save the child to the database
      await child.save();
  
      // Find the parent user and add the child's ID
      const user = await User.findById(parent);
      if (user) {
        user.children.push(child._id);  // Here, the child's ID is added to the parent model
        await user.save();
      }

      // Return the created child in the response
      res.status(201).json(child);
    } catch (error) {
      console.log("Error creating child:", error);
      res.status(500).send("Error creating the child.");
    }
});

  
module.exports = router;
