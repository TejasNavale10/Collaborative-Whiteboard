require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const socketio = require('socket.io');
const http = require('http');
const cors = require('cors');
const roomRoutes = require('./routes/rooms');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/rooms', roomRoutes);

// Socket.io
require('./socket/socketHandlers')(io);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});