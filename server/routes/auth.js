const express    = require('express');
const rateLimit  = require('express-rate-limit');
const router     = express.Router();
const {
  register, login, refresh, logout,
  verifyEmail, forgotPassword, resetPassword,
} = require('../controllers/authController');
const validate = require('../middleware/validate');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailQuerySchema,
} = require('../schemas/auth');

// 10 attempts per 15 min per IP — covers brute-force on login + register.
// Skipped in tests so the suite isn't tripping over its own shared IP.
const skipInTest  = () => process.env.NODE_ENV === 'test';
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders:   false,
  skip:            skipInTest,
  message: { message: 'Too many attempts from this IP, please try again in 15 minutes' },
});

// Tighter limit for password reset to prevent email flooding.
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders:   false,
  skip:            skipInTest,
  message: { message: 'Too many reset requests, please try again in an hour' },
});

router.post('/register',        authLimiter,  validate(registerSchema),                  register);
router.post('/login',           authLimiter,  validate(loginSchema),                     login);
router.post('/refresh',                                                                  refresh);
router.post('/logout',                                                                   logout);
router.get ('/verify-email',                  validate(verifyEmailQuerySchema, 'query'), verifyEmail);
router.post('/forgot-password', resetLimiter, validate(forgotPasswordSchema),            forgotPassword);
router.post('/reset-password',  resetLimiter, validate(resetPasswordSchema),             resetPassword);

module.exports = router;
