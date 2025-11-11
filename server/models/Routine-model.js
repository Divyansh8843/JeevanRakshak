const mongoose = require('mongoose');

const RoutineSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, index: true },
    period: { type: String, enum: ['daily', 'weekly'], required: true },
    data: { type: Object, required: true },
    // indicates whether the risk was produced by ML service or server fallback
    riskSource: { type: String, enum: ['ml', 'fallback'], default: 'ml' },
    // legacy risk for backward compatibility with existing UI
    risk: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
    // in-house ML fields
    riskLabel: { type: String, enum: ['SAFE','AMBIGUOUS','RISK_LOW','RISK_HIGH'], default: 'SAFE', index: true },
    riskScore: { type: Number, default: 0 },
    riskModelVersion: { type: String },
    riskEvaluatedAt: { type: Date },
    tips: { type: [String], default: [] },
    // which engine generated tips for this routine (ml deterministic or gemini)
    tipsEngine: { type: String, enum: ['ml','gemini'], default: 'ml' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Routine', RoutineSchema);
