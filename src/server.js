/**
 * OCP Investment Platform
 * Node.js + Express + MongoDB Atlas + Socket.IO
 */

require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');
const mongoose = require('mongoose');

const connectDB = require('./config/database');
const { initSocket } = require('./config/socket');
const notificationService = require('./services/notificationService');
const logger = require('./utils/logger');
const { apiLimiter } = require('./middleware/rateLimiter');
const { error } = require('./utils/response');
const { protectAdmin } = require('./middleware/auth');

// ── Routes ────────────────────────────────────────────────────
const authRoutes         = require('./routes/auth');
const userRoutes         = require('./routes/user');
const walletRoutes       = require('./routes/wallet');
const rechargeRoutes     = require('./routes/recharge');
const withdrawalRoutes   = require('./routes/withdrawal');
const productRoutes      = require('./routes/product');
const investmentRoutes   = require('./routes/investment');
const teamRoutes         = require('./routes/team');
const notificationRoutes = require('./routes/notification');
const adminRoutes        = require('./routes/admin');
const announcementRoutes      = require('./routes/Announcement');
const announcementAdminRoutes = require('./routes/adminAnnouncement');

const app = express();
const server = http.createServer(app);

// ── Socket.IO ─────────────────────────────────────────────────
const io = initSocket(server);
notificationService.setIO(io);

// ── Global Middleware ─────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use('/api', apiLimiter);

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  status: 'ok',
  uptime: process.uptime(),
  db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  timestamp: new Date().toISOString(),
}));

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/user',          userRoutes);
app.use('/api/wallets',       walletRoutes);
app.use('/api/recharge',      rechargeRoutes);
app.use('/api/withdrawal',    withdrawalRoutes);
app.use('/api/products',      productRoutes);
app.use('/api/investments',   investmentRoutes);
app.use('/api/team',          teamRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin',         adminRoutes);
// User route (requires protect middleware — already applied in the route file)
app.use('/api/announcements', announcementRoutes);

// Admin route — mount INSIDE your existing admin router or directly:
app.use('/api/admin/announcements', protectAdmin, announcementAdminRoutes);

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => error(res, `Route ${req.method} ${req.path} not found`, 404));

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { err: err.message, stack: err.stack });
  error(res, process.env.NODE_ENV === 'production' ? 'Server error' : err.message, 500);
});

// ── Scheduled Jobs ────────────────────────────────────────────
const { run: dailyIncomeRun } = require('./jobs/dailyIncomeJob');
const { run: expireRun }      = require('./jobs/expireInvestmentsJob');

// Daily income: every day at 00:05 AM
cron.schedule('5 0 * * *', async () => {
  logger.info('Cron: running dailyIncomeJob');
  await dailyIncomeRun().catch(e => logger.error('dailyIncomeJob error', { e }));
}, { timezone: 'Africa/Kigali' });

// Expire check: every hour
cron.schedule('0 * * * *', async () => {
  await expireRun().catch(e => logger.error('expireJob error', { e }));
}, { timezone: 'Africa/Kigali' });

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    logger.info(`OCP Backend running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    logger.info(`Socket.IO ready | Health: http://localhost:${PORT}/health`);
  });
});

// ── Graceful shutdown ─────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', { reason });
});
