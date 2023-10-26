const mongoose = require("mongoose");
const Presentation = require("../model/Presentation"); // Adjust this path
const QRCode = require("qrcode");
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

          // Check if attendee already has a QR code
          if (!attendee.qrCodeDataURL) {

            const qrData = {
              userId: attendee._id,
              startTime: slot.startTime,
              presentationName: presentation.name,
              date: presentation.date,
            };

            const qrCodeString = JSON.stringify(qrData);

            // Generate QR code as a Buffer
            const qrCodeBuffer = await QRCode.toBuffer(qrCodeString);

            attendee.qrCodeDataURL = qrCodeBuffer; // Store Buffer in attendee document
          }
        }
      }

      await presentation.save();
    }

    console.log("QR codes generated and saved.");
    mongoose.connection.close();
  } catch (error) {
    console.error("An error occurred:", error);
    mongoose.connection.close();
  }
});
