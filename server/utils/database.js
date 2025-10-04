// MongoDB connection utility
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Deprecated options removed per MongoDB Node.js Driver >= 4.0
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

module.exports = connectDB;
