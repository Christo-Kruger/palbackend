const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const morgan = require("morgan");

const app = express();

app.use(express.json());
var allowedOrigins = [
  "http://localhost:3000",
  "https://jlee-reserve.vercel.app",
  "https://jlee-christo-kruger.vercel.app",
  "https://jlee-christo-kruger.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        var msg =
          "The CORS policy for this site does not " +
          "allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
  })
);
app.set("etag", false); // in your main server file where you define your app

app.use(morgan("combined"));

mongoose
  .connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB", err));

// Routes
const userRoutes = require("./routes/user");
const bookingRoutes = require("./routes/booking");
const campusRoutes = require("./routes/campus");
const childRoutes = require("./routes/child");
const presentationRoute = require("./routes/presentation");
const smsRoute = require("./routes/sms");
const timeSlots = require("./routes/timeSlots");
const priorityBooking = require("./routes/bookingPriority");
const qr = require("./routes/qrscanner");

app.use("/api/users", userRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/campuses", campusRoutes);
app.use("/api/child", childRoutes);
app.use("/api/presentations", presentationRoute);
app.use("/api/sms", smsRoute);
app.use("/api/timeSlots", timeSlots);
app.use("/api/bookingPriority", priorityBooking);
app.use("/api/qr", qr);

const port = process.env.PORT || 9001;
app.listen(port, () => console.log(`Server started on port ${port}`));
