const Notification = require('../models/Notification');
const logger = require('../utils/logger');

// Will be set by server.js once socket.io is ready
let io = null;

const setIO = (socketIO) => { io = socketIO; };

/**
 * Create a notification and emit it over Socket.IO if user is online.
 */
const send = async (userId, type, title, body) => {
  try {
    const notification = await Notification.create({ userId, type, title, body });

    // Real-time push if socket server is available
    if (io) {
      io.to(`user:${userId}`).emit('notification', {
        _id: notification._id,
        type,
        title,
        body,
        isRead: false,
        createdAt: notification.createdAt,
      });
    }

    return notification;
  } catch (err) {
    logger.error('Failed to send notification', { userId, title, err: err.message });
  }
};

module.exports = { send, setIO };
