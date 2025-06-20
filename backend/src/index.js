// index.js
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // In production, replace with specific origin
    methods: ["GET", "POST"]
  }
});

const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Home route
app.get('/', (req, res) => {
  res.send('Hello, Express!');
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Start the server
httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
