const http      = require('http');
const mongoose  = require('mongoose');
const { Server } = require('socket.io');
require('dotenv').config();

const logger = require('./lib/logger');

// ── Validate required environment variables on startup ───────────────────────
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length) {
  logger.fatal({ missing }, 'Missing required environment variables');
  process.exit(1);
}

const buildApp      = require('./app');
const socketManager = require('./socket');

const app        = buildApp();
const httpServer = http.createServer(app);

// Mirror app.js's allowed-origins parsing so Socket.io shares the same policy.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
});
socketManager.init(io);

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    logger.info('Connected to MongoDB');
    httpServer.listen(PORT, () => logger.info({ port: PORT }, 'Server listening'));
  })
  .catch((err) => {
    logger.fatal({ err }, 'MongoDB connection error');
    process.exit(1);
  });

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.fatal({ port: PORT }, 'Port already in use — kill the other process first');
    process.exit(1);
  }
  throw err;
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  httpServer.close(() => {
    mongoose.connection.close(false, () => process.exit(0));
  });
});
