const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { checkTaskProjectRole } = require('../middleware/projectRole');
const { updateTask, deleteTask, addComment, getComments } = require('../controllers/taskController');

// Task update/delete
router.patch(  '/:taskId',          auth, checkTaskProjectRole('admin', 'developer'), updateTask);
router.delete( '/:taskId',          auth, checkTaskProjectRole('admin'),              deleteTask);

// Comments — any project member can read or post comments
router.get(    '/:taskId/comments', auth, checkTaskProjectRole(),                     getComments);
router.post(   '/:taskId/comments', auth, checkTaskProjectRole(),                     addComment);

module.exports = router;
