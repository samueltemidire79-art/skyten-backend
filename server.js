const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');

const PORT = process.env.PORT || 5000;

// Create HTTP Server
const server = http.createServer(app);

// Initialize Socket.io with allowed CORS origins
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://skyten-dashboard.vercel.app'
    ],
    credentials: true
  }
});

// Map to store online users in memory (userId -> socketId)
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log(`⚡ Socket connected: ${socket.id}`);

  // 1. Listen for user login/identification
  socket.on('user_connected', (userId) => {
    onlineUsers.set(userId, socket.id);
    // Broadcast updated list of online user IDs to all clients
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });

  // 2. Handle disconnect
  socket.on('disconnect', () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    // Broadcast updated active list when someone leaves
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});