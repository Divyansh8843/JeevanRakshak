const mongoose = require('mongoose');

const ChatRequestSchema = new mongoose.Schema(
  {
    requesterGoogleId: { type: String, required: true, index: true },
    counselorEmail: { type: String, required: true, index: true },
    sessionType: { type: String, enum: ['chat','call','video'], default: 'chat' },
    date: { type: String },
    time: { type: String },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending', index: true },
    roomId: { type: String, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatRequest', ChatRequestSchema);
