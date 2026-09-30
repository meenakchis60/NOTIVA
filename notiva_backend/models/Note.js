const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  file_type: { type: String, default: 'pdf' },
  file_size: { type: String, default: '1.2 MB' },
  url: { type: String, default: '#' },
  uploaded_at: { type: Date, default: Date.now }
});

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, default: '' },
  notebook: { type: mongoose.Schema.Types.ObjectId, ref: 'Notebook' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  is_pinned: { type: Boolean, default: false },
  is_starred: { type: Boolean, default: false },
  is_archived: { type: Boolean, default: false },
  is_study_material: { type: Boolean, default: false },
  difficulty: { type: String, default: 'BEGINNER' },
  attachments: [attachmentSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Note', noteSchema);
