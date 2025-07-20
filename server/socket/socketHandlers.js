const Room = require('../models/Room');
const { saveDrawingCommand } = require('../utils/roomUtils');

module.exports = (io) => {
  const rooms = new Map(); // roomId -> Map(userId -> userData)

  io.on('connection', (socket) => {
    let currentRoom = null;
    let currentUserId = null;

    socket.on('join-room', async ({ roomId, userId, userName, color }) => {
      currentRoom = roomId;
      currentUserId = userId;

      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
      }

      const roomUsers = rooms.get(roomId);
      
      // Assign a color if none was provided
      const userColor = color || getRandomColor();
      
      const userData = { 
        userId, 
        userName: userName || `User${Math.floor(Math.random() * 1000)}`,
        color: userColor
      };
      
      roomUsers.set(userId, userData);
      socket.join(roomId);

      // Send all existing users to the new user
      socket.emit('all-users', Array.from(roomUsers.values()));

      // Notify others about new user
      socket.to(roomId).emit('user-joined', userData);
      
      // Update user count for all
      io.to(roomId).emit('user-count', roomUsers.size);

      // Send initial data
      try {
        const room = await Room.findOne({ roomId });
        socket.emit('initial-drawing-data', room?.drawingData || []);
      } catch (err) {
        socket.emit('initial-drawing-data', []);
      }
    });

    socket.on('update-user-name', ({ roomId, userId, userName }) => {
      if (rooms.get(roomId)?.has(userId)) {
        const userData = rooms.get(roomId).get(userId);
        userData.userName = userName;
        socket.to(roomId).emit('user-joined', userData);
      }
    });

    socket.on('cursor-move', ({ roomId, userId, x, y }) => {
      if (!userId || !rooms.get(roomId)?.has(userId)) return;
      socket.to(roomId).emit('remote-cursor', { userId, x, y });
    });

    socket.on('draw', async (data) => {
      if (!rooms.get(data.roomId)?.has(data.userId)) return;
      
      socket.to(data.roomId).emit('remote-draw', data);
      await saveDrawingCommand(data.roomId, {
        type: data.tool === 'eraser' ? 'erase' : 'stroke',
        data: {
          color: data.color || rooms.get(data.roomId).get(data.userId).color,
          width: data.width,
          points: data.points,
          userId: data.userId,
          userName: data.userName
        },
        timestamp: new Date()
      });
    });

    socket.on('draw-move', (data) => {
      if (!rooms.get(data.roomId)?.has(data.userId)) return;
      socket.to(data.roomId).emit('remote-draw-move', data);
    });

    socket.on('clear-canvas', async ({ roomId }) => {
      socket.to(roomId).emit('clear-canvas');
      await Room.updateOne({ roomId }, { $set: { drawingData: [] } });
    });

    socket.on('disconnect', () => {
      if (currentRoom && rooms.has(currentRoom)) {
        const roomUsers = rooms.get(currentRoom);
        if (roomUsers.has(currentUserId)) {
          roomUsers.delete(currentUserId);
          
          io.to(currentRoom).emit('user-left', currentUserId);
          io.to(currentRoom).emit('user-count', roomUsers.size);

          // Clean up empty rooms
          if (roomUsers.size === 0) {
            rooms.delete(currentRoom);
          }
        }
      }
    });

    function getRandomColor() {
      const colors = [
        '#FF5252', '#448AFF', '#4CAF50', '#FFB300',
        '#9C27B0', '#00B8D4', '#FF4081', '#795548'
      ];
      return colors[Math.floor(Math.random() * colors.length)];
    }
  });
};