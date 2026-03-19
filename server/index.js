const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes         = require('./routes/auth');
const projectRoutes      = require('./routes/projects');
const taskRoutes         = require('./routes/tasks');
const notificationRoutes = require('./routes/notifications');
const analyticsRoutes    = require('./routes/analytics');
const socketManager      = require('./socket');

const app        = express();
const httpServer = http.createServer(app);

// ── Socket.io ──────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
socketManager.init(io);

// ── Express middleware ──────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── REST routes ─────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/projects',      projectRoutes);
app.use('/api/tasks',         taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics',    analyticsRoutes);

// Health check
app.get('/', (req, res) => res.json({ message: 'DevTrack API is running' }));

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
