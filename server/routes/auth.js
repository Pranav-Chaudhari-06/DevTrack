const express    = require('express');
const rateLimit  = require('express-rate-limit');
const router     = express.Router();
const { register, login, refresh, logout } = require('../controllers/authController');

// 10 attempts per 15 min per IP — covers brute-force on login + register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { message: 'Too many attempts from this IP, please try again in 15 minutes' },
});

router.post('/register', authLimiter, register);
router.post('/login',    authLimiter, login);
router.post('/refresh',               refresh);
router.post('/logout',                logout);

module.exports = router;
