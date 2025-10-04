const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, index: true },
    counselorName: { type: String, required: true },
    counselorEmail: { type: String },
    sessionType: { type: String, enum: ['chat','call','video'], default: 'video' },
    date: { type: String, required: true },
    time: { type: String, required: true },
    notes: { type: String },
    // payment + lifecycle
    status: {
      type: String,
      enum: ['pending_payment', 'paid_pending_counselor', 'confirmed', 'in_session', 'completed', 'cancelled'],
      default: 'pending_payment',
      index: true,
    },
    price: { type: Number, default: 0 }, // in smallest currency unit? We will store in major (e.g., INR)
    currency: { type: String, default: 'INR' },
    checkoutSessionId: { type: String, index: true },
    // session join info (set on payment confirmation)
    roomId: { type: String },
    joinUrl: { type: String },
    // scheduling info
    scheduledAt: { type: Date },
    durationMinutes: { type: Number, default: 30 },
    // optional feedback from user after completion
    feedbackRating: { type: Number, min: 1, max: 5 },
    feedbackComment: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', BookingSchema);
