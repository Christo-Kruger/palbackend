require('dotenv').config();
const mongoose = require("mongoose");
const Presentation = require("../model/Presentation"); // Adjust this path
const Child = require("../model/Child"); // Adjust this path
const QRCode = require("qrcode");

const MONGODB_URL = "mongodb+srv://christo:g16k2727@cluster0.dljkmt6.mongodb.net/";

async function generateQRCode(data) {
  const qrCodeString = JSON.stringify(data);
  return await QRCode.toBuffer(qrCodeString);
}

async function fetchChildrenInfo(userId) {
  return await Child.find({ parent: userId });
}

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
          const childrenInfo = await fetchChildrenInfo(attendee._id);

          for (let childInfo of childrenInfo) {
            if (childInfo.ageGroup === presentation.ageGroup) { // Only proceed if ageGroup matches
              const qrData = {
                userId: attendee._id,
                childName: childInfo.name,
                testGrade: childInfo.testGrade,
                startTime: slot.startTime,
                presentationName: presentation.name,
                date: presentation.date,
              };

              const qrCodeBuffer = await generateQRCode(qrData);
              attendee.qrCodeDataURL = qrCodeBuffer; // Assuming each attendee has one QR code field
            }
          }
        }
      }

      await presentation.save();
    }

    console.log("QR codes generated and saved.");
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    mongoose.connection.close();
  }
});
