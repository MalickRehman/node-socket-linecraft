import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from 'dotenv';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import messageRoutes from './routes/message.routes.js';
import opportunityRoutes from './routes/opportunity.routes.js';
import eventRoutes from './routes/event.routes.js';
import feedRoutes from './routes/feed.routes.js';
import chatRoutes from './routes/chat.routes.js';

import { errorHandler } from './middlewares/error.middleware.js';
import { setupSwagger } from './config/swagger.js';

// Load environment variables
config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Setup Swagger documentation first
setupSwagger(app);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/chat', chatRoutes); // Assuming chat routes are similar to feed routes

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Already setup above

// Error handling middleware
app.use(errorHandler);

let io;

// Socket.io setup will be initialized in server.js
const setupSocketIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        process.env.CLIENT_URL,
        'http://localhost:3000',
        'http://192.168.18.28:3000',
      ].filter(Boolean),
      methods: ['GET', 'POST'],
      credentials: false,
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
  });

  // Store connected users for more efficient notifications
  const connectedUsers = new Map();

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('setUserId', (userId) => {
      // Store the user ID in the socket
      socket.userId = userId;
      console.log(`User ${userId} connected with socket ${socket.id}`);

      // Add socket to user's connections
      if (!connectedUsers.has(userId)) {
        connectedUsers.set(userId, new Set());
      }
      connectedUsers.get(userId).add(socket.id);
    });

    // Handle global chat messages
    socket.on('globalMessage', (message) => {
      const msg = {
        senderId: socket.userId || 'unknown',
        text: message,
        time: new Date().toLocaleTimeString(),
      };
      socket.broadcast.emit('globalMessage', msg);
    });

    // Handle joining specific event/opportunity rooms
    socket.on('joinRoom', (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.userId || socket.id} joined room ${roomId}`);
    });

    // Handle event-specific messages
    socket.on('eventMessage', ({ roomId, message }) => {
      const msg = {
        senderId: socket.userId || 'unknown',
        text: message,
        time: new Date().toLocaleTimeString(),
      };
      io.to(roomId).emit('eventMessage', { roomId, msg });
    });

    // // Handle private messages
    // socket.on('privateMessage', ({ recipientId, message }) => {
    //   console.log('message', message);
    //   console.log('recipientId', recipientId);
    //   const recipientConnections = connectedUsers.get(recipientId);
    //   console.log('recpient', recipientConnections);
    //   if (recipientConnections) {
    //     recipientConnections.forEach((socketId) => {
    //       io.to(socketId).emit('privateMessage', message);
    //     });
    //   }
    // });
    socket.on('privateMessage', ({ recipientId, message }) => {
      const recipientConnections = connectedUsers.get(recipientId);
      const msg = {
        senderId: socket.userId || 'unknown',
        text: message,
        time: new Date().toLocaleTimeString(),
      };

      if (recipientConnections) {
        recipientConnections.forEach((socketId) => {
          io.to(socketId).emit('privateMessage', msg);
        });
      } else {
        console.log(`User ${recipientId} is not connected.`);
      }
    });
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);

      // Remove from connected users
      if (socket.userId) {
        const userConnections = connectedUsers.get(socket.userId);
        if (userConnections) {
          userConnections.delete(socket.id);

          // Clean up if no connections left
          if (userConnections.size === 0) {
            connectedUsers.delete(socket.userId);
          }
        }
      }
    });
  });

  // Add helper method to emit to a specific user
  io.emitToUser = (userId, event, data) => {
    try {
      const userConnections = connectedUsers.get(userId);
      console.log({ userConnections });
      if (userConnections) {
        userConnections.forEach((socketId) => {
          io.to(socketId).emit(event, data);
        });
        return true;
      }
      return false;
    } catch (error) {
      console.log('Error occurred while emitting to user: ', error);
      return false;
    }
  };

  return io;
};

export { setupSocketIO, io };
export default app;
