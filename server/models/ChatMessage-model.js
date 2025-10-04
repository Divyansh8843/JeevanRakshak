const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, index: true },
    senderId: { type: String }, // googleId or counselorEmail
    senderRole: { type: String, enum: ['student', 'counselor'], required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
