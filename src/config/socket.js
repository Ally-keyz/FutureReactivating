const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // JWT auth middleware for every socket connection
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = String(payload.sub);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: user ${socket.userId} (${socket.id})`);

    // Each user joins their own private room
    socket.join(`user:${socket.userId}`);

    // Emit live unread count on connect
    socket.on('notifications:unread_count', async () => {
      try {
        const Notification = require('../models/Notification');
        const count = await Notification.countDocuments({ userId: socket.userId, isRead: false });
        socket.emit('notifications:unread_count', { count });
      } catch {}
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: user ${socket.userId} — ${reason}`);
    });
  });

  logger.info('Socket.IO initialized');
  return io;
};

const getIO = () => io;

module.exports = { initSocket, getIO };
