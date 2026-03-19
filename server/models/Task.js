const mongoose = require('mongoose');

// Embedded comment subdocument
const commentSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  authorName: { type: String },   // denormalised so we don't need a populate on every read
  text: {
    type: String,
    required: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    enum: ['task', 'bug'],
    default: 'task',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved'],
    default: 'open',
  },
  assignedTo: {
    type: String,
    trim: true,
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  // Analysis result from Django bug-service (only populated for bugs)
  analysis: {
    severity: { type: String },
    suggested_tags: [{ type: String }],
    summary: { type: String },
  },
  // Embedded comments thread
  comments: [commentSchema],
  // Stamped when status transitions to 'resolved'; cleared when reopened.
  // Used for average resolution time analytics.
  resolvedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Task', taskSchema);
