const mongoose = require("mongoose");
const Presentation = require("../model/Presentation"); // Adjust this path

const MONGODB_URL = "mongodb+srv://christo:g16k2727@cluster0.dljkmt6.mongodb.net/";

mongoose.connect(MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.once('open', async () => {
  console.log('Connected to the database.');

  try {
    const result = await Presentation.updateMany(
      {},
      { $set: { "timeSlots.$[].attendees.$[].attended": false } }
    );
    console.log(`Modified ${result.nModified} existing presentations.`);
    mongoose.connection.close();
  } catch (error) {
    console.error("An error occurred:", error);
    mongoose.connection.close();
  }
});
