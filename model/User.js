const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Child = require("./Child")

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: {type: String, required: true, unique: true  },
  role: { type: String, enum: ["parent", "admin", "superadmin"], default: "parent" },
  campus: { type: String, enum: ['수지', '동탄', '분당'], required: true },
  children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Child' }],
  attendedPresentation: { type: Boolean, default: false },
  resetToken: { type: String },
  resetTokenExpires: { type: Date },
  qrCodeDataURL: { type: Buffer }

});

// Hash the password before saving the user
UserSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) {
      return next();
    }
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(this.password, salt);
    this.password = hashedPassword;
    next();
  } catch (error) {
    return next(error);
  }
});

// Method to compare passwords
UserSchema.methods.isValidPassword = async function (password) {
  try {
    return await bcrypt.compare(password, this.password);
  } catch (error) {
    throw new Error(error);
  }
};

const User = mongoose.model("User", UserSchema);
module.exports = User;
