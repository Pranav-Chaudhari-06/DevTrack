/**
 * socket.js — Socket.io manager
 *
 * Responsibilities:
 *  - Authenticate incoming socket connections via JWT
 *  - Maintain a userId → Set<socketId> map so we can reach any online user
 *  - Expose emitToUser() and notifyUser() for use inside controllers
 */

const jwt = require('jsonwebtoken');
const Notification = require('./models/Notification');

let io;

// userId (string) → Set of socket IDs (a user can have multiple browser tabs open)
const userSockets = new Map();

/**
 * Call once from index.js after creating the Socket.io server.
 * Sets up auth middleware and the connection/disconnect lifecycle.
 */
function init(ioInstance) {
  io = ioInstance;

  // Auth middleware — rejects connections without a valid JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const uid = socket.userId;

    // Register this socket under the user's ID
    if (!userSockets.has(uid)) userSockets.set(uid, new Set());
    userSockets.get(uid).add(socket.id);

    socket.on('disconnect', () => {
      const set = userSockets.get(uid);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) userSockets.delete(uid);
      }
    });
  });
}

/** Push a raw socket event to all active sessions of a user. */
function emitToUser(userId, event, data) {
  const sockets = userSockets.get(userId.toString());
  if (sockets && io) {
    sockets.forEach((sid) => io.to(sid).emit(event, data));
  }
}

/**
 * Create a persisted Notification document and push it to the
 * recipient in real time (if they are online).
 *
 * @param {string|ObjectId} recipientId  - MongoDB User _id
 * @param {{ message, type, projectId, taskId }} payload
 */
async function notifyUser(recipientId, { message, type, projectId, taskId }) {
  try {
    const notif = await Notification.create({
      user: recipientId,
      message,
      type,
      projectId,
      taskId,
    });

    emitToUser(recipientId.toString(), 'notification', notif);
    return notif;
  } catch (err) {
    // Notifications are non-critical — log but don't crash the request
    console.error('Failed to create notification:', err.message);
  }
}

module.exports = { init, emitToUser, notifyUser };
