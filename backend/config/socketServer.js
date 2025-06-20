// socketServer.js
// TODO: Initialize and export Socket.IO server here.
import { Server } from 'socket.io';
import { logger } from '../utils/logger.js'; // Assuming you have a structured logger

/**
 * A holder object for the global Socket.IO server instance.
 * This allows us to export the instance before it's initialized
 * and use it consistently across the application.
 *
 * @type {{io: Server|null}}
 */
export const socketServer = {
  io: null,
};

/**
 * Initializes the Socket.IO server, attaches it to the provided HTTP server,
 * and configures it with CORS and basic event listeners.
 *
 * @param {import('http').Server} httpServer - The Node.js HTTP server instance.
 * @returns {Server} The configured Socket.IO server instance.
 */
export const initSocketServer = (httpServer) => {
  // Retrieve the frontend URL from environment variables for CORS configuration.
  // Fallback to a common local development URL if not specified.
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!frontendUrl) {
    logger.warn('FRONTEND_URL environment variable not set. CORS might block frontend connections.');
  }

  const io = new Server(httpServer, {
    cors: {
      origin: "*", // Allow all origins for development; restrict in production
      methods: ['GET', 'POST'],
      // credentials: true // Uncomment if you need to handle cookies or sessions
    },
  });

  // Attach the initialized server to our exported holder object.
  // Now, any module importing `socketServer` will have access to this instance.
  socketServer.io = io;

  // Set up a global listener for new client connections.
  io.on('connection', (socket) => {
    // Log the connection for debugging purposes.
    logger.info(`New client connected: ${socket.id}`);

    // Set up a listener for when this specific client disconnects.
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });

    // You can add other global socket event listeners here if needed.
    // For example, a heartbeat or a join-room event.
    // socket.on('join_disaster_room', (disasterId) => {
    //   socket.join(`disaster-${disasterId}`);
    //   logger.info(`Client ${socket.id} joined room for disaster ${disasterId}`);
    // });
  });

  logger.info('Socket.IO server initialized and attached to HTTP server.');

  return io;
};