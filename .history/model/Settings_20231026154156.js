//Settings modal

const mongoose = require("mongoose");

const SettingsSchema = new mongoose.Schema({
    testInformation_1:{ type: String},
    testBookingDate: {type: Date},
    bankName: {type: String},
    bankAccountNumber: {type: String},
    bankAccountHolder: {type: String},

}, {
    versionKey: 'version'  // Adding version key for optimistic concurrency control
});


//ageGroup can book

module.exports = mongoose.model('settings', SettingsSchema);



