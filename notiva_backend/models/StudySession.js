const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  note_title: { type: String, default: 'General Session' },
  duration_seconds: { type: Number, default: 0 },
  status: { type: String, enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'], default: 'COMPLETED' },
  started_at: { type: Date, default: Date.now },
  completed_at: { type: Date }
});

module.exports = mongoose.model('StudySession', studySessionSchema);
