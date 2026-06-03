const axios = require('axios');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const { notifyUser } = require('../socket');

/**
 * Resolve an assignedTo input from a request body into { id, name } pairs the
 * Task should be stored with. Validates the user is a member of the project
 * so a task can't be assigned to a stranger.
 *
 * Returns:
 *   undefined  -> request did not include assignedTo (caller leaves field alone)
 *   { id: null, name: null }       -> caller wants to clear the assignee
 *   { id, name }                   -> resolved member
 *   { error: '...' }               -> validation failure to return as 400
 */
async function resolveAssignee(rawAssignedTo, projectId) {
  if (rawAssignedTo === undefined) return undefined;
  if (rawAssignedTo === null || rawAssignedTo === '') {
    return { id: null, name: null };
  }
  if (!mongoose.Types.ObjectId.isValid(rawAssignedTo)) {
    return { error: 'assignedTo must be a valid user id' };
  }
  const project = await Project.findById(projectId).select('members.user');
  if (!project) return { error: 'Project not found' };
  const isMember = project.members.some(
    (m) => m.user.toString() === rawAssignedTo.toString()
  );
  if (!isMember) {
    return { error: 'Assignee is not a member of this project' };
  }
  const user = await User.findById(rawAssignedTo).select('name');
  if (!user) return { error: 'Assignee not found' };
  return { id: user._id, name: user.name };
}

// POST /api/projects/:id/tasks   [admin, developer]
const createTask = async (req, res) => {
  const { title, description, type, priority, status, assignedTo } = req.body;
  const projectId = req.params.id;

  if (!title) return res.status(400).json({ message: 'Task title is required' });

  try {
    const assignee = await resolveAssignee(assignedTo, projectId);
    if (assignee?.error) return res.status(400).json({ message: assignee.error });

    const taskData = {
      title,
      description,
      type: type || 'task',
      priority: priority || 'medium',
      status: status || 'open',
      assignedTo:   assignee?.id   ?? null,
      assigneeName: assignee?.name ?? null,
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
    if (assignee?.id && assignee.id.toString() !== req.user.id) {
      await notifyUser(assignee.id, {
        message: `You were assigned a new ${task.type}: "${task.title}"`,
        type: 'task_assigned',
        projectId: projectId,
        taskId: task._id,
      });
    }

    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/projects/:id/tasks   [any role]
const getTasksByProject = async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/tasks/:taskId   [admin, developer]
const updateTask = async (req, res) => {
  try {
    // Developer restriction — can only update tasks assigned to them
    if (req.projectRole === 'developer') {
      const assignedId = req.taskDoc.assignedTo?.toString();
      if (!assignedId || assignedId !== req.user.id) {
        return res.status(403).json({
          message: 'Developers can only update tasks assigned to them',
        });
      }
    }

    const previousStatus     = req.taskDoc.status;
    const previousAssigneeId = req.taskDoc.assignedTo?.toString() || null;

    // Build the update object — stamp resolvedAt for analytics
    const updates = { ...req.body };

    // Resolve a reassignment, if requested
    if (req.body.assignedTo !== undefined) {
      const assignee = await resolveAssignee(req.body.assignedTo, req.taskDoc.project);
      if (assignee?.error) return res.status(400).json({ message: assignee.error });
      updates.assignedTo   = assignee.id;
      updates.assigneeName = assignee.name;
    }

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
      const assigneeId = task.assignedTo.toString();
      if (assigneeId !== req.user.id) {
        const statusLabel = { 'open': 'Open', 'in-progress': 'In Progress', 'resolved': 'Resolved' };
        await notifyUser(task.assignedTo, {
          message: `Task "${task.title}" was moved to ${statusLabel[task.status] || task.status}`,
          type: 'status_changed',
          projectId: task.project,
          taskId: task._id,
        });
      }
    }

    // ── Notify on reassignment ────────────────────────────────────────────
    const newAssigneeId = task.assignedTo?.toString() || null;
    if (newAssigneeId && newAssigneeId !== previousAssigneeId && newAssigneeId !== req.user.id) {
      await notifyUser(task.assignedTo, {
        message: `You were assigned a ${task.type}: "${task.title}"`,
        type: 'task_assigned',
        projectId: task.project,
        taskId: task._id,
      });
    }

    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/tasks/:taskId   [admin only]
const deleteTask = async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.taskId);
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/tasks/:taskId/comments   [any project member]
const addComment = async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ message: 'Comment text is required' });

  try {
    const author = await User.findById(req.user.id);

    // Construct the comment with its _id up front so we can return *this* comment
    // — using comments[length-1] races with concurrent $pushes from other requests.
    const newComment = {
      _id:        new mongoose.Types.ObjectId(),
      author:     req.user.id,
      authorName: author.name,
      text:       text.trim(),
      createdAt:  new Date(),
    };

    const task = await Task.findByIdAndUpdate(
      req.params.taskId,
      { $push: { comments: newComment } },
      { new: false }
    );

    if (!task) return res.status(404).json({ message: 'Task not found' });

    // ── Notify assignee of new comment ────────────────────────────────────
    if (task.assignedTo && task.assignedTo.toString() !== req.user.id) {
      const preview = text.length > 60 ? text.slice(0, 60) + '…' : text;
      await notifyUser(task.assignedTo, {
        message: `${author.name} commented on "${task.title}": ${preview}`,
        type: 'comment_added',
        projectId: task.project,
        taskId: task._id,
      });
    }

    res.status(201).json(newComment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/tasks/:taskId/comments   [any project member]
const getComments = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId).select('comments');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task.comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createTask, getTasksByProject, updateTask, deleteTask, addComment, getComments };
