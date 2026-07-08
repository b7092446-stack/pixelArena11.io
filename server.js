/**
 * PixelArena - Production API Server
 * World's largest 1,000,000 pixel marketplace
 * 1 Pixel = 1 USDT (ERC20)
 * Recipient: 0x98598Caa0F0b67D32503DA73c3719C3514C12643
 */
require('dotenv').config();
const http = require('http');
const app = require('./app');
const logger = require('./utils/logger');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initSocket } = require('./config/socket');
const { startCronJobs } = require('./services/cronService');

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  try {
    // Connect MongoDB
    await connectDB();
    logger.info('MongoDB connected');

    // Connect Redis
    await connectRedis();
    logger.info('Redis connected');

    // HTTP + Socket.IO
    const server = http.createServer(app);
    initSocket(server);
    logger.info('Socket.IO initialized');

    // Start cron jobs (backup, stats, cleanup)
    startCronJobs();

    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`PixelArena API running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      logger.info(`Payment recipient: ${process.env.PAYMENT_RECIPIENT_WALLET}`);
      logger.info(`USDT Contract: ${process.env.USDT_CONTRACT_ADDRESS}`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      logger.warn(`${signal} received, shutting down gracefully`);
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (err) => {
      logger.error('Unhandled Rejection: ' + err.message, err);
      server.close(() => process.exit(1));
    });
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception: ' + err.message, err);
      process.exit(1);
    });

  } catch (err) {
    logger.error('Bootstrap failed: ' + err.message, err);
    process.exit(1);
  }
}

bootstrap();

module.exports = app;
