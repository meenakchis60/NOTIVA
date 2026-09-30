const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Note = require('./models/Note');
const Semester = require('./models/Semester');
const Subject = require('./models/Subject');
const Notebook = require('./models/Notebook');
const Group = require('./models/Group');
const StudySession = require('./models/StudySession');

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'notiva_secret_jwt_key_2026';

// Auth Middleware with graceful local fallback
const authMiddleware = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (err) {
      // Token invalid/expired - continue to local dev fallback
    }
  }

  // Fallback for seamless local development: use active user from MongoDB
  try {
    const user = await User.findOne();
    if (user) {
      req.user = { id: user._id };
      return next();
    }
  } catch (err) {}

  res.status(401).json({ detail: 'Authentication required' });
};

// ==========================================
// 1. AUTH ROUTES
// ==========================================

app.post('/api/auth/register/', async (req, res) => {
  try {
    const { email, password, first_name, last_name, username } = req.body;
    const userEmail = (email || username || '').toLowerCase().trim();
    if (!userEmail) return res.status(400).json({ email: ['Email is required.'] });

    const existing = await User.findOne({ email: userEmail });
    if (existing) return res.status(400).json({ email: ['A user with this email already exists.'] });

    const hashedPassword = await bcrypt.hash(password || 'Password123!', 10);
    const user = new User({
      email: userEmail,
      password: hashedPassword,
      firstName: first_name || 'Meenakchi',
      lastName: last_name || 'S'
    });
    await user.save();

    const access = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    const refresh = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      access,
      refresh,
      user: {
        id: user._id,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        username: user.email
      },
      message: 'Registration successful.'
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ detail: 'Server error during registration' });
  }
});

app.post('/api/auth/login/', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const loginIdentifier = (email || username || '').toLowerCase().trim();

    let user = await User.findOne({ email: loginIdentifier });
    if (!user) {
      // In dev mode, if the user doesn't exist, create it so they can always log in!
      const hashedPassword = await bcrypt.hash(password || 'Password123!', 10);
      user = new User({
        email: loginIdentifier,
        password: hashedPassword,
        firstName: loginIdentifier.split('@')[0] || 'Student',
        lastName: ''
      });
      await user.save();
    } else if (password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ detail: 'Invalid credentials. Please check your password.' });
      }
    }

    const access = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    const refresh = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      access,
      refresh,
      user: {
        id: user._id,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        username: user.email
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ detail: 'Server error during login' });
  }
});

app.get('/api/auth/me/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ detail: 'User not found' });
    res.json({
      id: user._id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      username: user.email
    });
  } catch (err) {
    res.status(500).json({ detail: 'Server error' });
  }
});

app.get('/api/auth/profile/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      data: {
        id: user?._id,
        display_name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Meenakchi S',
        bio: 'Computer Science Student | NOTIVA Workspace',
        theme_preference: 'SYSTEM'
      }
    });
  } catch (err) {
    res.status(500).json({ detail: 'Server error' });
  }
});

app.patch('/api/auth/profile/', authMiddleware, async (req, res) => {
  try {
    if (req.body.display_name) {
      const parts = req.body.display_name.split(' ');
      await User.findByIdAndUpdate(req.user.id, {
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' ') || ''
      });
    }
    res.json({ data: req.body });
  } catch (err) {
    res.status(500).json({ detail: 'Failed to update profile' });
  }
});

app.post('/api/auth/token/refresh/', (req, res) => {
  try {
    const { refresh } = req.body;
    const decoded = jwt.verify(refresh, JWT_SECRET);
    const access = jwt.sign({ id: decoded.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ access });
  } catch (err) {
    res.status(401).json({ detail: 'Invalid refresh token' });
  }
});

app.post('/api/auth/logout/', (req, res) => {
  res.json({ message: 'Logged out successfully.' });
});

app.post('/api/auth/change-password/', authMiddleware, async (req, res) => {
  try {
    if (req.body.new_password) {
      const hashed = await bcrypt.hash(req.body.new_password, 10);
      await User.findByIdAndUpdate(req.user.id, { password: hashed });
    }
    res.json({ detail: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ detail: 'Error changing password' });
  }
});

app.post('/api/auth/profile/image/', authMiddleware, (req, res) => {
  res.json({ data: { profile_image: '' } });
});

// ==========================================
// 2. ACADEMICS ROUTES (Semester -> Subject -> Notebook)
// ==========================================

// Semesters
app.get('/api/academics/semesters/', authMiddleware, async (req, res) => {
  try {
    const semesters = await Semester.find({ user: req.user.id }).sort({ createdAt: 1 });
    const mapped = semesters.map(s => ({
      id: s._id,
      name: s.name,
      created_at: s.createdAt
    }));
    res.json({
      count: mapped.length,
      results: mapped,
      data: {
        results: mapped
      }
    });
  } catch (err) {
    res.status(500).json({ detail: 'Server error' });
  }
});

app.post('/api/academics/semesters/', authMiddleware, async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ name: ['Semester name is required.'] });
    const sem = new Semester({ name: req.body.name, user: req.user.id });
    await sem.save();
    res.status(201).json({ id: sem._id, name: sem.name, data: { id: sem._id, name: sem.name } });
  } catch (err) {
    res.status(500).json({ detail: 'Server error' });
  }
});

app.delete('/api/academics/semesters/:id/', authMiddleware, async (req, res) => {
  try {
    const semId = req.params.id;
    if (mongoose.Types.ObjectId.isValid(semId)) {
      // Find all subjects for this semester
      const subjects = await Subject.find({ semester: semId });
      const subIds = subjects.map(s => s._id);
      // Delete notebooks, subjects, and semester
      await Notebook.deleteMany({ subject: { $in: subIds } });
      await Subject.deleteMany({ semester: semId });
      await Semester.findByIdAndDelete(semId);
    }
    res.json({ detail: 'Semester and related subjects/notebooks deleted.' });
  } catch (err) {
    res.status(500).json({ detail: 'Server error' });
  }
});

// Subjects
app.get('/api/academics/subjects/', authMiddleware, async (req, res) => {
  try {
    const filter = { user: req.user.id };
    if (req.query.semester_id && mongoose.Types.ObjectId.isValid(req.query.semester_id)) {
      filter.semester = req.query.semester_id;
    }
    const subjects = await Subject.find(filter).sort({ createdAt: 1 });
    const mapped = subjects.map(s => ({
      id: s._id,
      name: s.name,
      semester_id: s.semester,
      created_at: s.createdAt
    }));
    res.json({
      count: mapped.length,
      results: mapped,
      data: {
        results: mapped
      }
    });
  } catch (err) {
    res.status(500).json({ detail: 'Server error' });
  }
});

app.post('/api/academics/subjects/', authMiddleware, async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ name: ['Subject name is required.'] });
    const sub = new Subject({
      name: req.body.name,
      semester: req.body.semester,
      user: req.user.id
    });
    await sub.save();
    res.status(201).json({ id: sub._id, name: sub.name, semester_id: sub.semester, data: { id: sub._id, name: sub.name, semester_id: sub.semester } });
  } catch (err) {
    res.status(500).json({ detail: 'Server error' });
  }
});

app.delete('/api/academics/subjects/:id/', authMiddleware, async (req, res) => {
  try {
    const subId = req.params.id;
    if (mongoose.Types.ObjectId.isValid(subId)) {
      await Notebook.deleteMany({ subject: subId });
      await Subject.findByIdAndDelete(subId);
    }
    res.json({ detail: 'Subject and related notebooks deleted.' });
  } catch (err) {
    res.status(500).json({ detail: 'Server error' });
  }
});

// Notebooks
app.get('/api/academics/notebooks/', authMiddleware, async (req, res) => {
  try {
    const filter = { user: req.user.id };
    if (req.query.subject_id && mongoose.Types.ObjectId.isValid(req.query.subject_id)) {
      filter.subject = req.query.subject_id;
    }
    const notebooks = await Notebook.find(filter).sort({ createdAt: 1 });
    const mapped = notebooks.map(n => ({
      id: n._id,
      name: n.name,
      subject_id: n.subject,
      created_at: n.createdAt
    }));
    res.json({
      count: mapped.length,
      results: mapped,
      data: {
        results: mapped
      }
    });
  } catch (err) {
    res.status(500).json({ detail: 'Server error' });
  }
});

app.post('/api/academics/notebooks/', authMiddleware, async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ name: ['Notebook name is required.'] });
    const nb = new Notebook({
      name: req.body.name,
      subject: req.body.subject,
      user: req.user.id
    });
    await nb.save();
    res.status(201).json({ id: nb._id, name: nb.name, subject_id: nb.subject, data: { id: nb._id, name: nb.name, subject_id: nb.subject } });
  } catch (err) {
    res.status(500).json({ detail: 'Server error' });
  }
});

app.delete('/api/academics/notebooks/:id/', authMiddleware, async (req, res) => {
  try {
    const nbId = req.params.id;
    if (mongoose.Types.ObjectId.isValid(nbId)) {
      await Notebook.findByIdAndDelete(nbId);
    }
    res.json({ detail: 'Notebook deleted.' });
  } catch (err) {
    res.status(500).json({ detail: 'Server error' });
  }
});

// ==========================================
// 3. NOTES ROUTES (Full CRUD + Filters + Actions)
// ==========================================

app.get('/api/notes/', authMiddleware, async (req, res) => {
  try {
    const filter = { user: req.user.id };

    if (req.query.deleted === 'true') {
      filter.is_archived = true;
    } else {
      filter.is_archived = { $ne: true };
    }

    if (req.query.pinned === 'true') filter.is_pinned = true;
    if (req.query.starred === 'true') filter.is_starred = true;

    // Cascading filter support on backend
    if (req.query.notebook_id && mongoose.Types.ObjectId.isValid(req.query.notebook_id)) {
      filter.notebook = req.query.notebook_id;
    } else if (req.query.subject_id && mongoose.Types.ObjectId.isValid(req.query.subject_id)) {
      const nbs = await Notebook.find({ subject: req.query.subject_id });
      filter.notebook = { $in: nbs.map(nb => nb._id) };
    } else if (req.query.semester_id && mongoose.Types.ObjectId.isValid(req.query.semester_id)) {
      const subs = await Subject.find({ semester: req.query.semester_id });
      const nbs = await Notebook.find({ subject: { $in: subs.map(s => s._id) } });
      filter.notebook = { $in: nbs.map(nb => nb._id) };
    }

    if (req.query.difficulty) filter.difficulty = req.query.difficulty;

    const notes = await Note.find(filter)
      .populate({
        path: 'notebook',
        select: 'name subject',
        populate: {
          path: 'subject',
          select: 'name semester',
          populate: {
            path: 'semester',
            select: 'name'
          }
        }
      })
      .sort({ updatedAt: -1, createdAt: -1 });

    const mapped = notes.map(n => ({
      id: n._id,
      title: n.title,
      content: n.content,
      notebook_id: n.notebook ? n.notebook._id : null,
      notebook_name: n.notebook ? n.notebook.name : 'General Notebook',
      subject_id: n.notebook && n.notebook.subject ? n.notebook.subject._id : null,
      subject_name: n.notebook && n.notebook.subject ? n.notebook.subject.name : null,
      semester_id: n.notebook && n.notebook.subject && n.notebook.subject.semester ? n.notebook.subject.semester._id : null,
      semester_name: n.notebook && n.notebook.subject && n.notebook.subject.semester ? n.notebook.subject.semester.name : null,
      is_pinned: Boolean(n.is_pinned),
      is_starred: Boolean(n.is_starred),
      is_archived: Boolean(n.is_archived),
      is_study_material: Boolean(n.is_study_material),
      difficulty: n.difficulty || 'BEGINNER',
      study_status: n.difficulty === 'ADVANCED' ? 'IN_PROGRESS' : 'MASTERED',
      attachments: (n.attachments || []).map(a => ({
        id: a._id,
        name: a.name,
        file_type: a.file_type || 'pdf',
        file_size: a.file_size || '1.2 MB',
        url: a.url || '#',
        uploaded_at: a.uploaded_at || a.createdAt
      })),
      deleted_at: n.updatedAt,
      created_at: n.createdAt,
      updated_at: n.updatedAt
    }));

    res.json({
      count: mapped.length,
      results: mapped,
      data: {
        results: mapped
      }
    });
  } catch (err) {
    console.error('Fetch notes error:', err);
    res.status(500).json({ detail: 'Server error fetching notes' });
  }
});

app.post('/api/notes/', authMiddleware, async (req, res) => {
  try {
    if (!req.body.title) return res.status(400).json({ title: ['Title is required.'] });

    let notebookId = req.body.notebook;
    if (!notebookId || !mongoose.Types.ObjectId.isValid(notebookId)) {
      notebookId = null;
    }

    const note = new Note({
      title: req.body.title,
      content: req.body.content || '',
      notebook: notebookId || null,
      user: req.user.id,
      is_study_material: Boolean(req.body.is_study_material),
      difficulty: req.body.difficulty || 'BEGINNER'
    });
    await note.save();

    const payload = {
      id: note._id,
      title: note.title,
      content: note.content,
      notebook_id: note.notebook ? note.notebook : null,
      is_pinned: Boolean(note.is_pinned),
      is_starred: Boolean(note.is_starred),
      is_archived: Boolean(note.is_archived),
      is_study_material: Boolean(note.is_study_material),
      difficulty: note.difficulty || 'BEGINNER',
      attachments: (note.attachments || []).map(a => ({
        id: a._id,
        name: a.name,
        file_type: a.file_type || 'pdf',
        file_size: a.file_size || '1.2 MB',
        url: a.url || '#',
        uploaded_at: a.uploaded_at || a.createdAt
      })),
      created_at: note.createdAt,
      updated_at: note.updatedAt
    };

    res.status(201).json({
      ...payload,
      data: payload
    });
  } catch (err) {
    console.error('Create note error:', err);
    res.status(500).json({ detail: 'Server error creating note' });
  }
});

app.get('/api/notes/:id/', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ detail: 'Note not found' });
    }
    const note = await Note.findOne({ _id: id, user: req.user.id })
      .populate({
        path: 'notebook',
        select: 'name subject',
        populate: {
          path: 'subject',
          select: 'name semester',
          populate: {
            path: 'semester',
            select: 'name'
          }
        }
      });
    if (!note) return res.status(404).json({ detail: 'Note not found' });

    const payload = {
      id: note._id,
      title: note.title,
      content: note.content,
      notebook_id: note.notebook ? note.notebook._id : null,
      notebook_name: note.notebook ? note.notebook.name : 'General Notebook',
      subject_id: note.notebook && note.notebook.subject ? note.notebook.subject._id : null,
      subject_name: note.notebook && note.notebook.subject ? note.notebook.subject.name : null,
      semester_id: note.notebook && note.notebook.subject && note.notebook.subject.semester ? note.notebook.subject.semester._id : null,
      semester_name: note.notebook && note.notebook.subject && note.notebook.subject.semester ? note.notebook.subject.semester.name : null,
      is_pinned: Boolean(note.is_pinned),
      is_starred: Boolean(note.is_starred),
      is_archived: Boolean(note.is_archived),
      is_study_material: Boolean(note.is_study_material),
      difficulty: note.difficulty || 'BEGINNER',
      study_status: note.difficulty === 'ADVANCED' ? 'IN_PROGRESS' : 'MASTERED',
      attachments: (note.attachments || []).map(a => ({
        id: a._id,
        name: a.name,
        file_type: a.file_type || 'pdf',
        file_size: a.file_size || '1.2 MB',
        url: a.url || '#',
        uploaded_at: a.uploaded_at || a.createdAt
      })),
      created_at: note.createdAt,
      updated_at: note.updatedAt
    };

    res.json({
      ...payload,
      data: payload
    });
  } catch (err) {
    console.error('Fetch note error:', err);
    res.status(500).json({ detail: 'Server error' });
  }
});

app.put('/api/notes/:id/', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ detail: 'Note not found' });
    const note = await Note.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!note) return res.status(404).json({ detail: 'Note not found' });
    const payload = { id: note._id, ...note.toObject() };
    res.json({ ...payload, data: payload });
  } catch (err) {
    res.status(500).json({ detail: 'Server error' });
  }
});

app.patch('/api/notes/:id/', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ detail: 'Note not found' });
    const note = await Note.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!note) return res.status(404).json({ detail: 'Note not found' });
    const payload = { id: note._id, ...note.toObject() };
    res.json({ ...payload, data: payload });
  } catch (err) {
    res.status(500).json({ detail: 'Server error' });
  }
});

// Attachment endpoints
app.get('/api/notes/:id/attachments/', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ detail: 'Note not found' });
    const note = await Note.findOne({ _id: id, user: req.user.id });
    if (!note) return res.status(404).json({ detail: 'Note not found' });
    const attachments = (note.attachments || []).map(a => ({
      id: a._id,
      name: a.name,
      file_type: a.file_type || 'pdf',
      file_size: a.file_size || '1.2 MB',
      url: a.url || '#',
      uploaded_at: a.uploaded_at || a.createdAt
    }));
    res.json({ count: attachments.length, results: attachments, data: { results: attachments } });
  } catch (err) {
    res.status(500).json({ detail: 'Server error' });
  }
});

app.post('/api/notes/:id/attachments/', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ detail: 'Note not found' });
    const note = await Note.findOne({ _id: id, user: req.user.id });
    if (!note) return res.status(404).json({ detail: 'Note not found' });

    const fileName = req.body.name || req.body.filename || 'Study_Document.pdf';
    let fileType = 'pdf';
    if (fileName.includes('.')) {
      fileType = fileName.split('.').pop().toLowerCase();
    }

    const newAtt = {
      name: fileName,
      file_type: req.body.file_type || fileType,
      file_size: req.body.file_size || '1.5 MB',
      url: req.body.url || '#',
      uploaded_at: new Date()
    };
    note.attachments.push(newAtt);
    note.updatedAt = new Date();
    await note.save();

    const created = note.attachments[note.attachments.length - 1];
    const payload = {
      id: created._id,
      name: created.name,
      file_type: created.file_type,
      file_size: created.file_size,
      url: created.url,
      uploaded_at: created.uploaded_at
    };
    res.status(201).json({ ...payload, data: payload });
  } catch (err) {
    console.error('Add attachment error:', err);
    res.status(500).json({ detail: 'Server error adding attachment' });
  }
});

app.delete('/api/notes/:id/attachments/:attId/', authMiddleware, async (req, res) => {
  try {
    const { id, attId } = req.params;
    const note = await Note.findOne({ _id: id, user: req.user.id });
    if (!note) return res.status(404).json({ detail: 'Note not found' });
    note.attachments = note.attachments.filter(a => a._id.toString() !== attId);
    await note.save();
    res.json({ detail: 'Attachment removed' });
  } catch (err) {
    res.status(500).json({ detail: 'Server error' });
  }
});

app.delete('/api/attachments/:id/', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await Note.updateOne(
      { user: req.user.id, 'attachments._id': id },
      { $pull: { attachments: { _id: id } } }
    );
    res.json({ detail: 'Attachment removed' });
  } catch (err) {
    res.status(500).json({ detail: 'Server error' });
  }
});

// Soft delete (move to trash)
app.delete('/api/notes/:id/', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (mongoose.Types.ObjectId.isValid(id)) {
      await Note.findOneAndUpdate({ _id: id, user: req.user.id }, { is_archived: true, updatedAt: new Date() });
    }
    res.json({ detail: 'Note moved to trash' });
  } catch (err) {
    res.status(500).json({ detail: 'Server error' });
  }
});

// Restore from trash
app.post('/api/notes/:id/restore/', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (mongoose.Types.ObjectId.isValid(id)) {
      await Note.findOneAndUpdate({ _id: id, user: req.user.id }, { is_archived: false, updatedAt: new Date() });
    }
    res.json({ detail: 'Note restored' });
  } catch (err) {
    res.status(500).json({ detail: 'Server error' });
  }
});

// Permanent delete
app.delete('/api/notes/:id/permanent/', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (mongoose.Types.ObjectId.isValid(id)) {
      await Note.findOneAndDelete({ _id: id, user: req.user.id });
    }
    res.json({ detail: 'Note permanently deleted' });
  } catch (err) {
    res.status(500).json({ detail: 'Server error' });
  }
});

// Pin / Unpin
app.post('/api/notes/:id/pin/', authMiddleware, async (req, res) => {
  await Note.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { is_pinned: true });
  res.json({ detail: 'Pinned' });
});

app.post('/api/notes/:id/unpin/', authMiddleware, async (req, res) => {
  await Note.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { is_pinned: false });
  res.json({ detail: 'Unpinned' });
});

// Star / Unstar
app.post('/api/notes/:id/star/', authMiddleware, async (req, res) => {
  await Note.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { is_starred: true });
  res.json({ detail: 'Starred' });
});

app.post('/api/notes/:id/unstar/', authMiddleware, async (req, res) => {
  await Note.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { is_starred: false });
  res.json({ detail: 'Unstarred' });
});

// ==========================================
// 4. STUDY SESSIONS, GOALS & REMINDERS
// ==========================================

app.get('/api/study/sessions/', authMiddleware, async (req, res) => {
  try {
    const sessions = await StudySession.find({ user: req.user.id }).sort({ started_at: -1 });
    res.json({
      data: {
        results: sessions.map(s => ({
          id: s._id,
          note_title: s.note_title,
          duration_seconds: s.duration_seconds,
          status: s.status,
          started_at: s.started_at
        }))
      }
    });
  } catch (err) {
    res.status(500).json({ detail: 'Server error' });
  }
});

app.post('/api/study/sessions/', authMiddleware, async (req, res) => {
  try {
    const session = new StudySession({
      user: req.user.id,
      note_title: req.body.note_title || 'Unit 1 Big Data Analysis',
      status: 'ACTIVE',
      started_at: new Date()
    });
    await session.save();
    res.status(201).json({ data: { id: session._id, started_at: session.started_at, status: session.status } });
  } catch (err) {
    res.status(500).json({ detail: 'Server error' });
  }
});

app.post('/api/study/sessions/:id/complete/', authMiddleware, async (req, res) => {
  try {
    await StudySession.findByIdAndUpdate(req.params.id, {
      status: 'COMPLETED',
      completed_at: new Date(),
      duration_seconds: 1800
    });
    res.json({ detail: 'Session completed' });
  } catch (err) {
    res.status(500).json({ detail: 'Server error' });
  }
});

app.post('/api/study/sessions/:id/cancel/', authMiddleware, async (req, res) => {
  try {
    await StudySession.findByIdAndUpdate(req.params.id, {
      status: 'CANCELLED',
      completed_at: new Date()
    });
    res.json({ detail: 'Session cancelled' });
  } catch (err) {
    res.status(500).json({ detail: 'Server error' });
  }
});

app.get('/api/study/goals/', authMiddleware, (req, res) => {
  res.json({
    data: {
      results: [
        { id: 'g1', title: 'Daily Study Focus', goal_type: 'MINUTES', current_value: 50, target_value: 60 },
        { id: 'g2', title: 'Unit 1 Practice Exercises', goal_type: 'SESSIONS', current_value: 3, target_value: 4 }
      ]
    }
  });
});

app.get('/api/study/reminders/', authMiddleware, (req, res) => {
  res.json({ data: { results: [] } });
});

// ==========================================
// 5. COLLAB / STUDY GROUPS
// ==========================================

app.get('/api/collab/groups/', authMiddleware, async (req, res) => {
  try {
    const groups = await Group.find().sort({ createdAt: -1 });
    res.json({
      data: {
        results: groups.map(g => ({
          id: g._id,
          name: g.name,
          role: g.role || 'admin',
          description: g.description
        }))
      }
    });
  } catch (err) {
    res.status(500).json({ detail: 'Server error' });
  }
});

app.post('/api/collab/groups/', authMiddleware, async (req, res) => {
  try {
    const group = new Group({
      name: req.body.name || 'New Study Group',
      description: req.body.description || 'Collaborative study space',
      role: 'admin',
      members: [req.user.id]
    });
    await group.save();
    res.status(201).json({ data: { id: group._id, name: group.name, role: 'admin' } });
  } catch (err) {
    res.status(500).json({ detail: 'Server error' });
  }
});

// ==========================================
// 6. DASHBOARD STATS & ACTIVITY
// ==========================================

app.get('/api/dashboard/stats/', authMiddleware, async (req, res) => {
  try {
    const total_notes = await Note.countDocuments({ user: req.user.id, is_archived: { $ne: true } });
    const total_semesters = await Semester.countDocuments({ user: req.user.id });
    const total_subjects = await Subject.countDocuments({ user: req.user.id });
    const total_groups = await Group.countDocuments();

    res.json({
      data: {
        total_semesters: total_semesters || 0,
        total_subjects: total_subjects || 0,
        total_notes: total_notes || 0,
        total_groups: total_groups || 0
      }
    });
  } catch (err) {
    res.json({ data: { total_semesters: 0, total_subjects: 0, total_notes: 0, total_groups: 0 } });
  }
});

app.get('/api/dashboard/activity/', authMiddleware, (req, res) => {
  res.json({
    data: [
      { id: 'act1', action_type: 'CREATED', description: 'Created note: Unit 1 Big Data Architecture', timestamp: new Date(Date.now() - 3600000).toISOString() },
      { id: 'act2', action_type: 'UPDATED', description: 'Added Subject: Big Data Analysis', timestamp: new Date(Date.now() - 7200000).toISOString() },
      { id: 'act3', action_type: 'CREATED', description: 'Completed a 30-minute focus study session', timestamp: new Date(Date.now() - 10800000).toISOString() }
    ]
  });
});

// Database Connection & Server Listen
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/notiva';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB: ' + MONGO_URI);
    app.listen(PORT, () => {
      console.log(`NOTIVA Express/MongoDB Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });
