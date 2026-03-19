const axios = require('axios');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const { notifyUser } = require('../socket');

/**
 * Given an assignedTo string (name or email), find the matching User document.
 * Returns null if not found or if the string is empty.
 */
async function findAssignee(assignedTo) {
  if (!assignedTo) return null;
  const val = assignedTo.toLowerCase().trim();
  return User.findOne({
    $or: [
      { email: val },
      { name: { $regex: new RegExp(`^${val}$`, 'i') } },
    ],
  });
}

// POST /api/projects/:id/tasks   [admin, developer]
const createTask = async (req, res) => {
  const { title, description, type, priority, status, assignedTo } = req.body;
  const projectId = req.params.id;

  if (!title) return res.status(400).json({ message: 'Task title is required' });

  try {
    const taskData = {
      title,
      description,
      type: type || 'task',
      priority: priority || 'medium',
      status: status || 'open',
      assignedTo,
      project: projectId,
    };

    // Bug analysis via Django microservice
    if (type === 'bug' && (title || description)) {
      try {
        const bugServiceUrl = process.env.BUG_SERVICE_URL || 'http://localhost:8000';
        const analysisRes = await axios.post(`${bugServiceUrl}/api/analyze`, {
          title: title || '',
          description: description || '',
        });
        taskData.analysis = analysisRes.data;

        const severityToPriority = { critical: 'high', high: 'high', medium: 'medium', low: 'low' };
        if (!priority && analysisRes.data.severity) {
          taskData.priority = severityToPriority[analysisRes.data.severity] || 'medium';
        }
      } catch (bugErr) {
        console.warn('Bug analysis service unavailable:', bugErr.message);
      }
    }

    const task = await Task.create(taskData);

    // ── Notify assignee ───────────────────────────────────────────────────
    if (assignedTo) {
      const assignee = await findAssignee(assignedTo);
      if (assignee && assignee._id.toString() !== req.user.id) {
        await notifyUser(assignee._id, {
          message: `You were assigned a new ${task.type}: "${task.title}"`,
          type: 'task_assigned',
          projectId: projectId,
          taskId: task._id,
        });
      }
    }

    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/projects/:id/tasks   [any role]
const getTasksByProject = async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// PATCH /api/tasks/:taskId   [admin, developer]
const updateTask = async (req, res) => {
  try {
    // Developer restriction — can only update tasks assigned to them
    if (req.projectRole === 'developer') {
      const currentUser = await User.findById(req.user.id);
      const assignedTo  = req.taskDoc.assignedTo?.toLowerCase().trim();
      const userEmail   = currentUser.email.toLowerCase();
      const userName    = currentUser.name.toLowerCase();

      if (!assignedTo || (assignedTo !== userEmail && assignedTo !== userName)) {
        return res.status(403).json({
          message: 'Developers can only update tasks assigned to them',
        });
      }
    }

    const previousStatus   = req.taskDoc.status;
    const previousAssignee = req.taskDoc.assignedTo;

    // Build the update object — stamp resolvedAt for analytics
    const updates = { ...req.body };
    if (req.body.status === 'resolved' && !req.taskDoc.resolvedAt) {
      updates.resolvedAt = new Date();
    } else if (req.body.status && req.body.status !== 'resolved') {
      updates.resolvedAt = null; // clear when task is reopened
    }

    const task = await Task.findByIdAndUpdate(req.params.taskId, updates, {
      new: true,
      runValidators: true,
    });

    // ── Notify on status change ───────────────────────────────────────────
    if (req.body.status && req.body.status !== previousStatus && task.assignedTo) {
      const assignee = await findAssignee(task.assignedTo);
      if (assignee && assignee._id.toString() !== req.user.id) {
        const statusLabel = { 'open': 'Open', 'in-progress': 'In Progress', 'resolved': 'Resolved' };
        await notifyUser(assignee._id, {
          message: `Task "${task.title}" was moved to ${statusLabel[task.status] || task.status}`,
          type: 'status_changed',
          projectId: task.project,
          taskId: task._id,
        });
      }
    }

    // ── Notify on reassignment ────────────────────────────────────────────
    if (
      req.body.assignedTo &&
      req.body.assignedTo !== previousAssignee
    ) {
      const newAssignee = await findAssignee(req.body.assignedTo);
      if (newAssignee && newAssignee._id.toString() !== req.user.id) {
        await notifyUser(newAssignee._id, {
          message: `You were assigned a ${task.type}: "${task.title}"`,
          type: 'task_assigned',
          projectId: task.project,
          taskId: task._id,
        });
      }
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// DELETE /api/tasks/:taskId   [admin only]
const deleteTask = async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.taskId);
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// POST /api/tasks/:taskId/comments   [any project member]
const addComment = async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ message: 'Comment text is required' });

  try {
    const author = await User.findById(req.user.id);

    const task = await Task.findByIdAndUpdate(
      req.params.taskId,
      {
        $push: {
          comments: {
            author: req.user.id,
            authorName: author.name,
            text: text.trim(),
          },
        },
      },
      { new: true }
    );

    if (!task) return res.status(404).json({ message: 'Task not found' });

    const newComment = task.comments[task.comments.length - 1];

    // ── Notify assignee of new comment ────────────────────────────────────
    if (task.assignedTo) {
      const assignee = await findAssignee(task.assignedTo);
      if (assignee && assignee._id.toString() !== req.user.id) {
        const preview = text.length > 60 ? text.slice(0, 60) + '…' : text;
        await notifyUser(assignee._id, {
          message: `${author.name} commented on "${task.title}": ${preview}`,
          type: 'comment_added',
          projectId: task.project,
          taskId: task._id,
        });
      }
    }

    res.status(201).json(newComment);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /api/tasks/:taskId/comments   [any project member]
const getComments = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId).select('comments');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task.comments);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { createTask, getTasksByProject, updateTask, deleteTask, addComment, getComments };
