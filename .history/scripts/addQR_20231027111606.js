require('dotenv').config();
const mongoose = require("mongoose");
const Presentation = require("../model/Presentation"); // Adjust this path

const MONGODB_URL = "mongodb+srv://christo:g16k2727@cluster0.dljkmt6.mongodb.net/";

mongoose.connect(MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.once("open", async () => {
  console.log("Connected to the database.");

  try {
    const presentations = await Presentation.find();

    for (let presentation of presentations) {
      for (let slot of presentation.timeSlots) {
        for (let attendee of slot.attendees) {
          // Setting QR code data to null for each attendee
          attendee.qrCodeDataURL = null;
        }
      }

      // Save the changes to the database
      await presentation.save();
    }

    console.log("QR codes removed from database.");
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    mongoose.connection.close();
  }
});
