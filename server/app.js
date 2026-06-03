/**
 * server/app.js — Express application factory.
 *
 * Returns a configured express app with all middleware, routes, and the
 * central error handler wired up. No network listening, no mongoose
 * connect, no Socket.io: those are bootstrap concerns owned by index.js.
 *
 * Split out so supertest can drive HTTP against the app in tests without
 * opening a port or talking to a real database.
 */

const express        = require('express');
const mongoose       = require('mongoose');
const cors           = require('cors');
const helmet         = require('helmet');
const cookieParser   = require('cookie-parser');
const mongoSanitize  = require('express-mongo-sanitize');
const pinoHttp       = require('pino-http');

const logger             = require('./lib/logger');
const authRoutes         = require('./routes/auth');
const projectRoutes      = require('./routes/projects');
const taskRoutes         = require('./routes/tasks');
const notificationRoutes = require('./routes/notifications');
const analyticsRoutes    = require('./routes/analytics');

function buildApp() {
  const app = express();

  // Allowed origins (comma-separated in env)
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim());

  // Trust the first proxy hop (Render/Vercel/Fly/Nginx) so express-rate-limit
  // reads the real client IP from X-Forwarded-For.
  app.set('trust proxy', 1);

  // ── Middleware ────────────────────────────────────────────────────────────
  app.use(pinoHttp({ logger }));
  app.use(helmet());
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(mongoSanitize());

  // ── REST routes ───────────────────────────────────────────────────────────
  app.use('/api/auth',          authRoutes);
  app.use('/api/projects',      projectRoutes);
  app.use('/api/tasks',         taskRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/analytics',    analyticsRoutes);

  // ── Health check ──────────────────────────────────────────────────────────
  app.get('/health', (req, res) => {
    const dbState = mongoose.connection.readyState; // 1 = connected
    if (dbState === 1) return res.json({ status: 'healthy' });
    res.status(503).json({ status: 'unhealthy', db: dbState });
  });

  app.get('/', (req, res) => res.json({ message: 'DevTrack API is running' }));

  // ── Central error handler ─────────────────────────────────────────────────
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    (req.log || logger).error({ err }, 'Unhandled error');
    res.status(500).json({ message: 'An unexpected error occurred' });
  });

  return app;
}

module.exports = buildApp;
