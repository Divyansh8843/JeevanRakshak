const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  picture: { type: String },
  phone: { type: String },
  parentPhone: { type: String },
  age: { type: Number },
  bio: { type: String },
  parentEmail: { type: String },
  isCounselor: { type: Boolean, default: false },
});

module.exports = mongoose.model("User", UserSchema);
