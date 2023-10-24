const mongoose = require("mongoose");
const Presentation = require("../model/Presentation"); // Adjust this path
const User = require("../model/User"); // Adjust this path
require("dotenv").config();

mongoose.connect(process.env.MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.once('open', async () => {
  console.log('Connected to the database.');

  try {
    // 1. Retrieve all presentations
    const presentations = await Presentation.find();

    // 2. Loop through each presentation's timeSlots
    for (let presentation of presentations) {
      for (let slot of presentation.timeSlots) {
        // 3. For each timeSlot, loop through its attendees
        for (let attendee of slot.attendees) {
          // 4. Find the corresponding user and update them
          await User.findByIdAndUpdate(attendee._id, {
            bookedAt: attendee.bookedAt,
          });
        }
      }
    }

    console.log('Migration completed.');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error during migration:', error);
    mongoose.connection.close();
  }
});
