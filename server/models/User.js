const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  // System-wide default role — used as the pre-fill when inviting this user to a project.
  // The authoritative role for any action is always the per-project role in Project.members.
  role: {
    type: String,
    enum: ['admin', 'developer', 'viewer'],
    default: 'developer',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', userSchema);
