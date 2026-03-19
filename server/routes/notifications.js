const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getNotifications, markAsRead, markAllRead } = require('../controllers/notificationController');

router.get('/',                auth, getNotifications);
router.patch('/read-all',      auth, markAllRead);
router.patch('/:id/read',      auth, markAsRead);

module.exports = router;
