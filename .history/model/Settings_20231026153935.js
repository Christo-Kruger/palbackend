//Settings modal

const mongoose = require("mongoose");

const SettingsSchema = new mongoose.Schema({
    testInformation_1:{ type: String},
    testBookingDate: {type: Date},
    bankName: {type: String},
    bankAccountNumber: {type: String},
    bankAccountHolder: {type: String},
    testGrade:[{
        :{
            "예비 5세,  type: Boolean, default:false
        }

    }]


}, {
    versionKey: 'version'  // Adding version key for optimistic concurrency control
});
module.exports = mongoose.model('settings', SettingsSchema);



