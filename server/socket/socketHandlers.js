const Room = require('../models/Room');
const { saveDrawingCommand } = require('../utils/roomUtils');

module.exports = (io) => {
  const roomUsers = {};

  io.on('connection', (socket) => {
    let currentRoom = null;

    socket.on('join-room', async (roomId) => {
      currentRoom = roomId;
      socket.join(roomId);

      // Track users in room
      if (!roomUsers[roomId]) roomUsers[roomId] = new Set();
      roomUsers[roomId].add(socket.id);

      // Send user count
      io.to(roomId).emit('user-count', roomUsers[roomId].size);

      // Fetch and send initial drawing data
      try {
        const room = await Room.findOne({ roomId });
        socket.emit('initial-drawing-data', room?.drawingData || []);
      } catch (err) {
        socket.emit('initial-drawing-data', []);
      }
    });

    socket.on('leave-room', (roomId) => {
      socket.leave(roomId);
      if (roomUsers[roomId]) {
        roomUsers[roomId].delete(socket.id);
        io.to(roomId).emit('user-left', socket.id);
        io.to(roomId).emit('user-count', roomUsers[roomId].size);
      }
    });

    socket.on('cursor-move', ({ roomId, x, y }) => {
      socket.to(roomId).emit('remote-cursor', { userId: socket.id, x, y });
    });

    // Drawing events
    socket.on('draw-start', async (data) => {
      socket.to(currentRoom).emit('remote-draw-start', data);
      
      await saveDrawingCommand(currentRoom, {
        type: 'stroke',
        data: {
          color: data.color,
          width: data.lineWidth,
          points: [{ x: data.x, y: data.y }]
        },
        timestamp: new Date()
      });
    });
    
    socket.on('draw-move', async (data) => {
      socket.to(currentRoom).emit('remote-draw-move', data);
      
      await saveDrawingCommand(currentRoom, {
        type: 'stroke',
        data: {
          points: [{ x: data.x, y: data.y }]
        },
        timestamp: new Date()
      });
    });
    
    socket.on('draw', (data) => {
      socket.to(data.roomId).emit('remote-draw', data);
      // Optionally save to DB here
    });

    socket.on('clear-canvas', ({ roomId }) => {
      socket.to(roomId).emit('clear-canvas');
      // Optionally clear DB here
    });
    
    socket.on('disconnect', () => {
      if (currentRoom && roomUsers[currentRoom]) {
        roomUsers[currentRoom].delete(socket.id);
        io.to(currentRoom).emit('user-left', socket.id);
        io.to(currentRoom).emit('user-count', roomUsers[currentRoom].size);
      }
    });
  });
};