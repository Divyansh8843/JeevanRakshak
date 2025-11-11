// MongoDB connection utility
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Allow a sensible default for local development when MONGO_URI is not set
    const uri =
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/jeevanrakshak";
    // Connect with recommended options for modern drivers
    await mongoose.connect(uri, {
      // useNewUrlParser, useUnifiedTopology are defaults in mongoose v6+
    });
    console.log("MongoDB connected:", uri);
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

module.exports = connectDB;
