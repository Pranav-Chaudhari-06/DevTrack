const crypto   = require('crypto');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const mongoose = require('mongoose');
const User         = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');

// Request bodies are validated upstream by zod schemas wired in routes/auth.js.

const REFRESH_COOKIE = 'devtrack_refresh';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Per-account login throttle: after MAX_FAILED_ATTEMPTS consecutive wrong
// passwords, lock the account for LOCKOUT_MS.
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS          = 30 * 60 * 1000; // 30 min

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
  // name/email/password are already trimmed + validated by the zod schema.
  const { name, email, password } = req.body;
  const normalisedEmail = email.toLowerCase();

  try {
    const existing = await User.findOne({ email: normalisedEmail });
    if (existing) return res.status(409).json({ message: 'Email already in use' });

    // Generate email verification token (raw sent in email, hashed stored in DB)
    const verificationToken       = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash   = hashToken(verificationToken);
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const hashed = await bcrypt.hash(password, 10);
    await User.create({
      name,
      email: normalisedEmail,
      password: hashed,
      emailVerified:           false,
      verificationToken:       verificationTokenHash,
      verificationTokenExpiry,
    });

    // Send verification email — if SMTP delivery fails, fall back to logging the URL
    // so the account can still be verified manually in development.
    const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
    try {
      await sendVerificationEmail(normalisedEmail, name, verificationToken);
    } catch (emailErr) {
      console.warn('[register] Email delivery failed — verify manually via this URL:');
      console.warn(verifyUrl);
    }

    res.status(201).json({
      message: 'Account created! Please check your email to verify your account before signing in.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    // Reject unknown email without any DB write — preserves enumeration
    // resistance and avoids racking up a lockout on a non-existent account.
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // Account locked? Tell the user when they can try again.
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const minutes = Math.ceil((user.lockoutUntil - new Date()) / 60000);
      return res.status(429).json({
        message: `Account temporarily locked due to repeated failed logins. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockoutUntil        = new Date(Date.now() + LOCKOUT_MS);
        user.failedLoginAttempts = 0;
      }
      await user.save();
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.emailVerified)
      return res.status(403).json({ message: 'Please verify your email before signing in.' });

    // Successful login — clear any partial failure state.
    if (user.failedLoginAttempts || user.lockoutUntil) {
      user.failedLoginAttempts = 0;
      user.lockoutUntil        = null;
      await user.save();
    }

    // Issue tokens — fresh familyId starts a new lineage of refresh tokens
    // for this login. Every rotation keeps the same familyId so reuse
    // detection can nuke the whole tree if a stolen token is ever replayed.
    const accessToken  = signAccess(user);
    const refreshToken = crypto.randomBytes(64).toString('hex');

    await RefreshToken.create({
      userId:    user._id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      familyId:  new mongoose.Types.ObjectId(),
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

    // Reuse detection: a token that was already rotated is being replayed.
    // Treat the whole family as compromised — nuke every descendant so the
    // attacker and the legitimate user are both forced to re-authenticate.
    if (stored.revoked) {
      if (stored.familyId) {
        await RefreshToken.deleteMany({ familyId: stored.familyId });
      } else {
        await RefreshToken.deleteOne({ _id: stored._id });
      }
      res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
      return res.status(401).json({ message: 'Refresh token reuse detected — please sign in again' });
    }

    const user = await User.findById(stored.userId);
    if (!user) {
      await RefreshToken.deleteOne({ _id: stored._id });
      res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
      return res.status(401).json({ message: 'User not found' });
    }

    // Rotate: mark the old token revoked (so a future replay trips
    // reuse-detection) and issue a new one in the same family.
    stored.revoked = true;
    await stored.save();

    const newRefreshToken = crypto.randomBytes(64).toString('hex');
    await RefreshToken.create({
      userId:    user._id,
      tokenHash: hashToken(newRefreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      // Pre-existing tokens issued before this commit have no familyId; mint
      // one so future reuse detection on their descendants works correctly.
      familyId:  stored.familyId || new mongoose.Types.ObjectId(),
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

// ── GET /api/auth/verify-email?token=xxx ──────────────────────────────────────
const verifyEmail = async (req, res) => {
  const { token } = req.query;

  try {
    const user = await User.findOne({
      verificationToken:       hashToken(token),
      verificationTokenExpiry: { $gt: new Date() },
    });

    if (!user)
      return res.status(400).json({ message: 'Verification link is invalid or has expired.' });

    user.emailVerified           = true;
    user.verificationToken       = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    res.json({ message: 'Email verified! You can now sign in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  // Always return the same message to prevent email enumeration
  const SAFE_RESPONSE = { message: 'If an account with that email exists, a reset link has been sent.' };

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json(SAFE_RESPONSE);

    const resetToken       = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken       = hashToken(resetToken);
    user.passwordResetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await user.save();

    await sendPasswordResetEmail(user.email, user.name, resetToken);

    res.json(SAFE_RESPONSE);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── POST /api/auth/reset-password ────────────────────────────────────────────
const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  try {
    const user = await User.findOne({
      passwordResetToken:       hashToken(token),
      passwordResetTokenExpiry: { $gt: new Date() },
    });

    if (!user)
      return res.status(400).json({ message: 'Reset link is invalid or has expired.' });

    user.password                 = await bcrypt.hash(password, 10);
    user.passwordResetToken       = undefined;
    user.passwordResetTokenExpiry = undefined;
    // Clear any account lockout: a user who completed the email-token flow
    // has proven enough to sign in fresh.
    user.failedLoginAttempts      = 0;
    user.lockoutUntil             = null;
    await user.save();

    // Invalidate all existing refresh tokens for this user
    await RefreshToken.deleteMany({ userId: user._id });

    res.json({ message: 'Password updated successfully. You can now sign in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { register, login, refresh, logout, verifyEmail, forgotPassword, resetPassword };
