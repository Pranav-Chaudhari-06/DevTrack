const Project = require('../models/Project');
const Task = require('../models/Task');

/**
 * checkProjectRole(...allowedRoles)
 *
 * Middleware for routes that have :id as the project ID.
 * - Verifies the authenticated user is a member of the project.
 * - If allowedRoles is non-empty, rejects users whose project-role is not listed.
 * - Attaches req.projectRole and req.project for downstream use.
 *
 * Pass no roles to allow any project member (read-access guard).
 */
const checkProjectRole = (...allowedRoles) =>
  async (req, res, next) => {
    try {
      const project = await Project.findById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const member = project.members.find(
        (m) => m.user.toString() === req.user.id
      );

      if (!member) {
        return res.status(403).json({ message: 'You are not a member of this project' });
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(member.role)) {
        return res.status(403).json({
          message: `Insufficient permissions. Required: ${allowedRoles.join(' or ')}. Your role: ${member.role}`,
        });
      }

      req.projectRole = member.role;
      req.project = project;
      next();
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  };

/**
 * checkTaskProjectRole(...allowedRoles)
 *
 * Middleware for routes that have :taskId.
 * Looks up the task → then its project → then the user's role in that project.
 * Attaches req.projectRole, req.project, and req.taskDoc.
 */
const checkTaskProjectRole = (...allowedRoles) =>
  async (req, res, next) => {
    try {
      const task = await Task.findById(req.params.taskId);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      const project = await Project.findById(task.project);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const member = project.members.find(
        (m) => m.user.toString() === req.user.id
      );

      if (!member) {
        return res.status(403).json({ message: 'You are not a member of this project' });
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(member.role)) {
        return res.status(403).json({
          message: `Insufficient permissions. Required: ${allowedRoles.join(' or ')}. Your role: ${member.role}`,
        });
      }

      req.projectRole = member.role;
      req.project = project;
      req.taskDoc = task;
      next();
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  };

module.exports = { checkProjectRole, checkTaskProjectRole };
