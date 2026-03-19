const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // The user who receives this notification
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['task_assigned', 'status_changed', 'comment_added'],
    required: true,
  },
  // Store IDs so the frontend can navigate to the right project/task
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
  },
  read: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for fast per-user queries sorted by newest first
notificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
