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
// ==========================================
// SUPABASE DATABASE KEEP-ALIVE PING
// ==========================================
async function keepSupabaseAlive() {
    try {
        // Query 1 row using Prisma (or Supabase client) to generate DB traffic
        await prisma.bloom_beads_orders.findFirst({
            select: { id: true }
        });
        console.log('⚡ Supabase keep-alive ping successful at:', new Date().toISOString());
    } catch (err) {
        console.error('⚠️ Keep-alive ping error:', err.message || err);
    }
}

// Ping Supabase once when the server boots up
keepSupabaseAlive();

// Repeat the ping every 3 days (in milliseconds)
const THREE_DAYS_IN_MS = 3 * 24 * 60 * 60 * 1000;
setInterval(keepSupabaseAlive, THREE_DAYS_IN_MS);

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const authRoutes = require('./routes/auth'); // assuming auth routes are placed there

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS Configuration
const allowedOrigins = [
    'http://localhost:5173',
    'https://skyten-dashboard.vercel.app'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());

// Mount routes
app.use('/api/auth', authRoutes);

