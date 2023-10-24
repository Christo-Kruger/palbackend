const Group = require('../model/Group'); // Assuming Group.js contains the Group schema
const Child = require('../model/Child'); // Assuming Child.js contains the Child schema
const User = require('../model/User'); // Assuming User.js contains the User schema
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const mongoose = require('mongoose');


// Create a group
router.post('/create', async (req, res) => {
  try {
    const { name, startDate, endDate } = req.body;
    const group = new Group({ name, startDate, endDate });
    await group.save();
    res.status(200).send("Group created");
  } catch(err) {
    res.status(500).send("Error creating group");
  }
});


// Update Group Assignments
// Update Group Assignments
router.patch('/updateGroupAssignments', async (req, res) => {
  try {
    const { childIds, groupName } = req.body;
    let group = await Group.findOne({ name: groupName });

    if (!group) {
      return res.status(404).send("Group not found");
    }

    // Filter out the child IDs that are already in this group
    const filteredChildIds = childIds.filter(id => !group.children.includes(id));

    if (filteredChildIds.length === 0) {
      if (childIds.length === 1) {
        return res.status(400).send("Child is already in this group");

      } else {
        return res.status(400).send("All children are already in this group");
      }
    }

    if (filteredChildIds.length !== childIds.length) {
      if (childIds.length > 1) {
        res.status(200).send("Some children are already in this group");
      }
    }

    // Update Group model
    await Group.findByIdAndUpdate(
      group._id,
      { 
        $push: { 
          children: { $each: filteredChildIds }
        }
      }
    );

    // Update Child model
    await Child.updateMany(
      { _id: { $in: filteredChildIds.map(id => new mongoose.Types.ObjectId(id)) } },
      { $set: { group: group._id } }
    );

    res.status(200).send("Group updated");
  } catch(err) {
    console.error(err);
    res.status(500).send("Error updating group");
  }
});



// Check if parent can book
router.post('/canBook', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId).populate('groups');

    if (!user) {
      return res.status(404).send("User not found");
    }

    let canBook = false;
    const currentDate = new Date();

    for (const group of user.groups) {
      if (group.canBook && (!group.startDate || currentDate >= group.startDate) && (!group.endDate || currentDate <= group.endDate)) {
        canBook = true;
        break;
      }
    }

    if (canBook) {
      res.status(200).send("You can book");
    } else {
      res.status(200).send("You cannot book");
    }
  } catch(err) {
    res.status(500).send("Error checking booking status");
  }
});


//Get Users
router.get('/children', async (req, res) => {
  try {
    console.log("Inside /children route");

    const children = await Child.find()
      .populate({
        path: 'parent',
        select: 'name bookedAt attendedPresentation campus',  // Fields from User (parent)
        model: 'User'
      });

    if (!children || children.length === 0) {
      return res.status(404).send('No children found.');
    }

    // Flatten the array to make it easier to work with on the client-side
    const flatData = [];
    children.forEach(child => {
      if (child.parent) {
        flatData.push({
          id: child._id,
          childName: child.name,
          testGrade: child.testGrade,
          parentName: child.parent.name,
          campus: child.parent.campus,
          bookedAt: child.parent.bookedAt,
          attendedPresentation: child.parent.attendedPresentation,
        });
      } else {
        console.warn(`No parent found for child with ID ${child._id}`);
      }
    });

    res.send(flatData);

  } catch (error) {
    console.log("Caught an error:", error);
    res.status(500).send('Internal Server Error.');
  }
});





// Get specific fields from all groups
router.get('/all', async (req, res) => {
  try {
    const groups = await Group.find({}, 'name canBook startDate endDate'); // Only fetch these fields
    res.status(200).send(groups);
  } catch(err) {
    res.status(500).send("Error fetching groups");
  }
});

//Get Group Names
router.get('/groupNames', async (req, res) => {
  try {
    const groups = await Group.find({}, 'name _id'); // Include _id
    res.status(200).send(groups);
  } catch(err) {
    res.status(500).send("Error fetching groups");
  }
});


// Update canBook
router.patch('/canBook/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { canBook } = req.body;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).send("Group not found");
    }

    group.canBook = canBook;
    await group.save();

    res.status(200).json(group);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error updating canBook");
  }
});


router.delete('/:id', async (req, res) => {
  try {
    const groupId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).send("Invalid group ID");
    }

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).send("Group not found");
    }

    // Remove group association from all children that belong to this group
    await Child.updateMany({ group: groupId }, { $set: { group: null } });

    // Delete the group
    await group.deleteOne();

    res.send(group);
  } catch (error) {
    console.error("Error deleting group:", error);
    res.status(500).send("Error deleting the group.");
  }
});



module.exports = router;
