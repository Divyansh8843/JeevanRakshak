const mongoose = require('mongoose');

const RoutineSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, index: true },
    period: { type: String, enum: ['daily', 'weekly'], required: true },
    data: { type: Object, required: true },
    risk: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
    tips: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Routine', RoutineSchema);
