const mongoose = require("mongoose");
const Child = require("./Child");

const priceMap = {
    "예비 5세": 15000,
    "예비 6세": 15000,
    "예비 7세": 15000,
    default: 20000
};

const BookingSchema = new mongoose.Schema({
    child: { type: mongoose.Schema.Types.ObjectId, ref: "Child", required: true, autopopulate: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, autopopulate: true },
    testSlot: { type: mongoose.Schema.Types.ObjectId, ref: "TestSlot", required: true, autopopulate: true },
    price: Number,
    paid: { type: Boolean, default: false },
    bookingDate: { type: Date, default: Date.now },  // New field
    qrCodeDataURL: { type: Buffer },
}, {
    versionKey: 'version'  // Adding version key for optimistic concurrency control
});

BookingSchema.plugin(require('mongoose-autopopulate'));

BookingSchema.post("findOneAndDelete", async function (doc) {
    if (doc) {
        const TestSlot = require('./TestSlot');
        await TestSlot.updateOne(
            { _id: doc.testSlot },
            { $pull: { bookings: doc._id } }
        );
    }
});

BookingSchema.pre("save", async function (next) {
    const child = await Child.findById(this.child);
    this.price = priceMap[child.testGrade] || priceMap.default;
    next();
});

// Indexes
BookingSchema.index({ testSlot: 1, child: 1, parent: 1 });
BookingSchema.index({ bookingDate: -1 });  // Index for booking date, -1 indicates descending order

const Booking = mongoose.model("Booking", BookingSchema);
module.exports = Booking;
