const http         = require('http');
const express      = require('express');
const mongoose     = require('mongoose');
const cors         = require('cors');
const helmet       = require('helmet');
const cookieParser = require('cookie-parser');
const { Server }   = require('socket.io');
require('dotenv').config();

// ── Validate required environment variables on startup ───────────────────────
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const authRoutes         = require('./routes/auth');
const projectRoutes      = require('./routes/projects');
const taskRoutes         = require('./routes/tasks');
const notificationRoutes = require('./routes/notifications');
const analyticsRoutes    = require('./routes/analytics');
const socketManager      = require('./socket');

const app        = express();
const httpServer = http.createServer(app);

// ── Allowed origins (comma-separated in env) ─────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

// ── Socket.io ──────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
});
socketManager.init(io);

// Trust the first proxy hop (Render/Vercel/Fly/Nginx) so express-rate-limit
// reads the real client IP from X-Forwarded-For instead of treating every
// request as coming from the proxy.
app.set('trust proxy', 1);

// ── Express middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// ── REST routes ─────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/projects',      projectRoutes);
app.use('/api/tasks',         taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics',    analyticsRoutes);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  if (dbState === 1) return res.json({ status: 'healthy' });
  res.status(503).json({ status: 'unhealthy', db: dbState });
});

app.get('/', (req, res) => res.json({ message: 'DevTrack API is running' }));

// ── Central error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Unhandled error:`, err);
  res.status(500).json({ message: 'An unexpected error occurred' });
});

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Kill the other process first:\n  Run: netstat -ano | findstr :${PORT}\n  Then: taskkill /PID <pid> /F`);
    process.exit(1);
  }
  throw err;
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('SIGTERM received — shutting down gracefully');
  httpServer.close(() => {
    mongoose.connection.close(false, () => process.exit(0));
  });
});
