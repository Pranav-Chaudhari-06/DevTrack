const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { checkProjectRole } = require('../middleware/projectRole');
const { getAnalytics } = require('../controllers/analyticsController');

// Any project member can view analytics
router.get('/:id', auth, checkProjectRole(), getAnalytics);

module.exports = router;
