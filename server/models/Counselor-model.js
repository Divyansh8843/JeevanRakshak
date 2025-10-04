const mongoose = require("mongoose");

const CounselorSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    title: { type: String, default: "Counselor" },
    bio: { type: String, default: "" },
    // default price if specific session type price is not set
    price: { type: Number, default: 1200 }, // major currency units
    prices: {
      chat: { type: Number },
      call: { type: Number },
      video: { type: Number },
    },
    currency: { type: String, default: "INR" },
    specializations: { type: [String], default: [] },
    languages: { type: [String], default: ["English"] },
    sessionTypes: {
      type: [String],
      default: ["Video Call", "Phone Call", "Chat"],
    },
    rating: { type: Number, default: 4.8 },
    reviews: { type: Number, default: 0 },
    image: { type: String },
    availability: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    // Earnings tracking
    earnings: {
      total: { type: Number, default: 0 },
      thisMonth: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now }
    },
    completedSessions: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Counselor", CounselorSchema);
