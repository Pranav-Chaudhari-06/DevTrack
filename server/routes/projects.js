const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { checkProjectRole } = require('../middleware/projectRole');

const {
  createProject,
  getProjects,
  getProjectById,
  deleteProject,
  getMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
} = require('../controllers/projectController');

const { createTask, getTasksByProject } = require('../controllers/taskController');

// ── Project CRUD ──────────────────────────────────────────────────────────────
// Any authenticated user can create a project (they become its admin automatically)
router.post('/',   auth, createProject);
router.get('/',    auth, getProjects);

// Any project member can read; only admin can delete
router.get(   '/:id', auth, checkProjectRole(),          getProjectById);
router.delete('/:id', auth, checkProjectRole('admin'),   deleteProject);

// ── Member management (admin only) ───────────────────────────────────────────
router.get(    '/:id/members',          auth, checkProjectRole(),         getMembers);
router.post(   '/:id/members',          auth, checkProjectRole('admin'),  inviteMember);
router.patch(  '/:id/members/:userId',  auth, checkProjectRole('admin'),  updateMemberRole);
router.delete( '/:id/members/:userId',  auth, checkProjectRole('admin'),  removeMember);

// ── Tasks nested under a project ─────────────────────────────────────────────
// Viewers cannot create tasks
router.post('/:id/tasks', auth, checkProjectRole('admin', 'developer'), createTask);
// Any project member can read tasks
router.get( '/:id/tasks', auth, checkProjectRole(),                      getTasksByProject);

module.exports = router;
