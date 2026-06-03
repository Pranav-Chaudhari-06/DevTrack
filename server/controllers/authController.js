const crypto = require('crypto');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const User         = require('../models/User');
const RefreshToken = require('../models/RefreshToken');

const EMAIL_REGEX    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

const REFRESH_COOKIE = 'devtrack_refresh';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** SHA-256 hash — used to store tokens safely in the DB. */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Issue a short-lived access JWT. */
function signAccess(user) {
  return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: '15m',
  });
}

/** Set the refresh token as an httpOnly cookie on the response. */
function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge:   REFRESH_TTL_MS,
    path:     '/api/auth',
  });
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ message: 'All fields are required' });
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100)
    return res.status(400).json({ message: 'Name must be between 2 and 100 characters' });
  if (!EMAIL_REGEX.test(email))
    return res.status(400).json({ message: 'Invalid email address' });
  if (!PASSWORD_REGEX.test(password))
    return res.status(400).json({
      message: 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character',
    });

  try {
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(409).json({ message: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name:  name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
    });

    // Issue tokens straight away on register — email verification gate added later.
    const accessToken  = signAccess(user);
    const refreshToken = crypto.randomBytes(64).toString('hex');

    await RefreshToken.create({
      userId:    user._id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    });

    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      token: accessToken,
      user:  { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: 'Email and password are required' });

  try {
    const user  = await User.findOne({ email: email.toLowerCase().trim() });
    const match = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !match)
      return res.status(401).json({ message: 'Invalid credentials' });

    const accessToken  = signAccess(user);
    const refreshToken = crypto.randomBytes(64).toString('hex');

    await RefreshToken.create({
      userId:    user._id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    });

    setRefreshCookie(res, refreshToken);

    res.json({
      token: accessToken,
      user:  { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
const refresh = async (req, res) => {
  const incomingToken = req.cookies?.[REFRESH_COOKIE];
  if (!incomingToken)
    return res.status(401).json({ message: 'No refresh token' });

  try {
    const stored = await RefreshToken.findOne({ tokenHash: hashToken(incomingToken) });
    if (!stored || stored.expiresAt < new Date()) {
      res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
      return res.status(401).json({ message: 'Refresh token invalid or expired' });
    }

    const user = await User.findById(stored.userId);
    if (!user) {
      await RefreshToken.deleteOne({ _id: stored._id });
      res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
      return res.status(401).json({ message: 'User not found' });
    }

    // Rotate: delete old refresh token, issue a new one
    await RefreshToken.deleteOne({ _id: stored._id });
    const newRefreshToken = crypto.randomBytes(64).toString('hex');
    await RefreshToken.create({
      userId:    user._id,
      tokenHash: hashToken(newRefreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    });

    setRefreshCookie(res, newRefreshToken);

    res.json({
      token: signAccess(user),
      user:  { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
const logout = async (req, res) => {
  const incomingToken = req.cookies?.[REFRESH_COOKIE];
  if (incomingToken) {
    await RefreshToken.deleteOne({ tokenHash: hashToken(incomingToken) }).catch(() => {});
  }
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  res.json({ message: 'Logged out' });
};

module.exports = { register, login, refresh, logout };
