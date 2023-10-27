require('dotenv').config();
const mongoose = require("mongoose");
const Presentation = require("../model/Presentation"); // Adjust this path
const Child = require("../model/Child"); // Adjust this path
const QRCode = require("qrcode");

const MONGODB_URL = process.env.MONGODB_URL || "your_default_mongodb_url_here";

async function generateQRCode(data) {
  const qrCodeString = JSON.stringify(data);
  return await QRCode.toBuffer(qrCodeString);
}

async function fetchChildInfo(userId) {
  // Assuming the Child model has a field named 'parent' that stores the parent userID
  const child = await Child.findOne({ parent: userId });
  return child ? { name: child.name, testGrade: child.testGrade } : {};
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
          if (!attendee.qrCodeDataURL) {
            const childInfo = await fetchChildInfo(attendee._id);

            const qrData = {
              userId: attendee._id,
              childName: childInfo.name,
              testGrade: childInfo.testGrade,
              startTime: slot.startTime,
              presentationName: presentation.name,
              date: presentation.date,
            };

            const qrCodeBuffer = await generateQRCode(qrData);
            attendee.qrCodeDataURL = qrCodeBuffer;
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
