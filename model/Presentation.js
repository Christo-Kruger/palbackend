const mongoose = require('mongoose');

const PresentationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    maxAttendees: { type: Number, default: 330 },
    availableSlots: { type: Number, default: 330 },
    attendees: [{
        _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: { type: String, required: true },
        phone: { type: String, required: true },
        campus: { type: String, required: true },
    }]
});

PresentationSchema.methods.addAttendee = async function(attendee) {
    if (this.attendees.length >= this.maxAttendees) {
        throw new Error("Maximum number of attendees reached.");
    }
    this.attendees.push(attendee);
    this.availableSlots -= 1;  // Update the available slots
    await this.save();
};

const Presentation = mongoose.model('Presentation', PresentationSchema);
module.exports = Presentation;
