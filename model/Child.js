// model/Child.js
const mongoose = require('mongoose');

const ChildSchema = new mongoose.Schema({
    name: { type: String, required: true },
    age: { type: Number, required: true },
    previousSchool: { type: String, required: true },
});

const Child = mongoose.model('Child', ChildSchema);
module.exports = Child;
