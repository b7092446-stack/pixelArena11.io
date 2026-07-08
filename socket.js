const { Server } = require('socket.io');
const logger = require('../utils/logger');
let io;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: [
        process.env.FRONTEND_URL,
        'https://pixelarena.com',
        'http://localhost:3000',
        'http://localhost:8080'
      ].filter(Boolean),
      credentials: true
    },
    transports: ['websocket','polling'],
    pingInterval: 25000,
    pingTimeout: 20000
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('join:canvas', ({ team }) => {
      if(team) socket.join(`canvas:${team}`);
    });

    socket.on('pixel:hover', (data) => {
      socket.broadcast.emit('pixel:hover', data);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

function emitPixelSold(payload) {
  try { getIO().emit('pixel:sold', payload); } catch(e){}
  try { getIO().to(`canvas:${payload.team}`).emit('pixel:sold', payload); } catch(e){}
}

module.exports = { initSocket, getIO, emitPixelSold };
