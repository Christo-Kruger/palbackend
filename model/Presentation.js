const mongoose = require('mongoose');

const PresentationSchema = new mongoose.Schema({
    name: { type: String, require: true},
    description: { type: String, require: true},
    location: { type: String, require: true },
    date: { type: Date, require: true},
    time: {type: String, require: true},
    attendees:  [{
        _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: { type: String, require: true},
        phone: { type: String, require: true},
        campus: { type: String, require: true},
    }]
});


const Presentation = mongoose.model('Presentation', PresentationSchema);
module.exports = Presentation;
