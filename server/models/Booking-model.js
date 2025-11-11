const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, index: true },
    counselorName: { type: String, required: true },
    counselorEmail: { type: String },
    sessionType: {
      type: String,
      enum: ["chat", "call", "video"],
      default: "video",
    },
    date: { type: String, required: true },
    time: { type: String, required: true },
    notes: { type: String },
    // payment + lifecycle
    status: {
      type: String,
      enum: [
        "pending_payment",
        "paid_pending_counselor",
        "confirmed",
        "in_session",
        "completed",
        "cancelled",
        "no_show",
      ],
      default: "pending_payment",
      index: true,
    },
    price: { type: Number, default: 0 }, // in smallest currency unit? We will store in major (e.g., INR)
    currency: { type: String, default: "INR" },
    checkoutSessionId: { type: String, index: true },
    // session join info (set on payment confirmation)
    roomId: { type: String },
    joinUrl: { type: String },
    // scheduling info
    scheduledAt: { type: Date },
    durationMinutes: { type: Number, default: 30 },
    // session timing tracking
    sessionStartTime: { type: Date },
    sessionEndTime: { type: Date },
    lastJoinRequestTime: { type: Date },
    joinAcceptedTime: { type: Date },
    // connection tracking
    userConnected: { type: Boolean, default: false },
    counselorConnected: { type: Boolean, default: false },
    lastUserActivity: { type: Date },
    lastCounselorActivity: { type: Date },
    // optional feedback from user after completion
    feedbackRating: { type: Number, min: 1, max: 5 },
    feedbackComment: { type: String },

    // suicide risk scoring (in-house model)
    riskLabel: { type: String, enum: ["SAFE","AMBIGUOUS","RISK_LOW","RISK_HIGH"], default: "SAFE", index: true },
    riskScore: { type: Number, default: 0 },
    riskModelVersion: { type: String },
    riskEvaluatedAt: { type: Date },

    // Has this booking's price already been credited to counselor earnings?
    earningsCredited: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", BookingSchema);
