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
    settings: {
      notifications: {
        emailNotifications: { type: Boolean, default: true },
        smsNotifications: { type: Boolean, default: false },
        pushNotifications: { type: Boolean, default: true },
        appointmentReminders: { type: Boolean, default: true },
        clientMessages: { type: Boolean, default: true },
        systemUpdates: { type: Boolean, default: false }
      },
      privacy: {
        profileVisibility: { type: String, default: 'public' },
        showOnlineStatus: { type: Boolean, default: true },
        allowDirectBooking: { type: Boolean, default: true },
        requireApproval: { type: Boolean, default: false }
      },
      availability: {
        workingDays: { type: [String], default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
        workingHours: {
          start: { type: String, default: '09:00' },
          end: { type: String, default: '17:00' }
        },
        timeZone: { type: String, default: 'Asia/Kolkata' },
        bufferTime: { type: Number, default: 15 }
      },
      preferences: {
        language: { type: String, default: 'english' },
        theme: { type: String, default: 'light' },
        autoSave: { type: Boolean, default: true },
        sessionDuration: { type: Number, default: 60 },
        maxDailyAppointments: { type: Number, default: 8 }
      },
      security: {
        twoFactorAuth: { type: Boolean, default: false },
        sessionTimeout: { type: Number, default: 30 },
        loginNotifications: { type: Boolean, default: true }
      }
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Counselor", CounselorSchema);
