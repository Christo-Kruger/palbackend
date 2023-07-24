// model/Campus.js
const mongoose = require('mongoose');

const CampusSchema = new mongoose.Schema({
    name: { type: String, required: true },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }],
    bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
});

const Campus = mongoose.model('Campus', CampusSchema);
module.exports = Campus;
