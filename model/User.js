const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Child = require("./Child");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  masterPassword: { type: String, default: '8899' },  // Set the default value
  phone: {type: String, required: true, unique: true  },
  role: { type: String, enum: ["parent", "admin", "superadmin"], default: "parent" },
  campus: { type: String, enum: ['수지', '동탄', '분당'], required: true },
  children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Child' }],
  attendedPresentation: { type: Boolean, default: false },
  resetToken: { type: String },
  resetTokenExpires: { type: Date },
  qrCodeDataURL: { type: Buffer },
});

UserSchema.pre("save", async function (next) {
  try {
    // Hashing regular password
    if (this.isModified("password")) {
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(this.password, salt);
      this.password = hashedPassword;
    }
    
    // Always hash the master password, even if it hasn't been modified
    // (because it could be the default value)
    const saltForMaster = await bcrypt.genSalt();
    const hashedMasterPassword = await bcrypt.hash(this.masterPassword, saltForMaster);
    this.masterPassword = hashedMasterPassword;
    
    next();
  } catch (error) {
    return next(error);
  }
});

// Method to compare regular passwords
UserSchema.methods.isValidPassword = async function (password) {
  try {
    return await bcrypt.compare(password, this.password);
  } catch (error) {
    throw new Error(error);
  }
};

// Method to compare master passwords
UserSchema.methods.isValidMasterPassword = async function (masterPassword) {
  try {
    return await bcrypt.compare(masterPassword, this.masterPassword);
  } catch (error) {
    throw new Error(error);
  }
};

const User = mongoose.model("User", UserSchema);
module.exports = User;
