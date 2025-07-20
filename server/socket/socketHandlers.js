// const Room = require('../models/Room');
// const { saveDrawingCommand } = require('../utils/roomUtils');

// module.exports = (io) => {
//   const roomUsers = {};

//   io.on('connection', (socket) => {
//     let currentRoom = null;

//     socket.on('join-room', async (roomId) => {
//       currentRoom = roomId;
//       socket.join(roomId);

//       // Track users in room
//       if (!roomUsers[roomId]) roomUsers[roomId] = new Set();
//       roomUsers[roomId].add(socket.id);

//       // Send user count
//       io.to(roomId).emit('user-count', roomUsers[roomId].size);

//       // Fetch and send initial drawing data
//       try {
//         const room = await Room.findOne({ roomId });
//         socket.emit('initial-drawing-data', room?.drawingData || []);
//       } catch (err) {
//         socket.emit('initial-drawing-data', []);
//       }
//     });

//     socket.on('leave-room', (roomId) => {
//       socket.leave(roomId);
//       if (roomUsers[roomId]) {
//         roomUsers[roomId].delete(socket.id);
//         io.to(roomId).emit('user-left', socket.id);
//         io.to(roomId).emit('user-count', roomUsers[roomId].size);
//       }
//     });

//     socket.on('cursor-move', ({ roomId, x, y }) => {
//       socket.to(roomId).emit('remote-cursor', { userId: socket.id, x, y });
//     });

//     // Drawing events
//     socket.on('draw-start', async (data) => {
//       socket.to(currentRoom).emit('remote-draw-start', data);
      
//       await saveDrawingCommand(currentRoom, {
//         type: 'stroke',
//         data: {
//           color: data.color,
//           width: data.lineWidth,
//           points: [{ x: data.x, y: data.y }]
//         },
//         timestamp: new Date()
//       });
//     });
    
//     socket.on('draw-move', async (data) => {
//       socket.to(currentRoom).emit('remote-draw-move', data);
      
//       await saveDrawingCommand(currentRoom, {
//         type: 'stroke',
//         data: {
//           points: [{ x: data.x, y: data.y }]
//         },
//         timestamp: new Date()
//       });
//     });
    
//     socket.on('draw', async (data) => {
//       socket.to(data.roomId).emit('remote-draw', data);
//       // Save the full stroke (all points)
//       await saveDrawingCommand(data.roomId, {
//         type: data.tool === 'eraser' ? 'erase' : 'stroke',
//         data: {
//           color: data.color,
//           width: data.width,
//           points: data.points
//         },
//         timestamp: new Date()
//       });
//     });

//     socket.on('clear-canvas', async ({ roomId }) => {
//       socket.to(roomId).emit('clear-canvas');
//       // Clear DB
//       await Room.updateOne({ roomId }, { $set: { drawingData: [] } });
//     });
    
//     socket.on('disconnect', () => {
//       if (currentRoom && roomUsers[currentRoom]) {
//         roomUsers[currentRoom].delete(socket.id);
//         io.to(currentRoom).emit('user-count', roomUsers[currentRoom].size);
//       }
//     });
//   });
// };

const Room = require('../models/Room');
const { saveDrawingCommand } = require('../utils/roomUtils');

module.exports = (io) => {
  const roomUsers = {};

  io.on('connection', (socket) => {
    let currentRoom = null;
    let currentUserName = `User${socket.id.slice(0, 4)}`;

    socket.on('join-room', async ({ roomId, userName }) => {
      currentRoom = roomId;
      currentUserName = userName || currentUserName;
      socket.join(roomId);

      if (!roomUsers[roomId]) roomUsers[roomId] = new Set();
      roomUsers[roomId].add(socket.id);

      // Notify others
      socket.to(roomId).emit('user-joined', { 
        userId: socket.id, 
        userName: currentUserName 
      });

      // Send user count
      io.to(roomId).emit('user-count', roomUsers[roomId].size);

      // Send initial data
      try {
        const room = await Room.findOne({ roomId });
        socket.emit('initial-drawing-data', room?.drawingData || []);
      } catch (err) {
        socket.emit('initial-drawing-data', []);
      }
    });

    socket.on('update-user-name', ({ roomId, userName }) => {
      currentUserName = userName;
      socket.to(roomId).emit('user-joined', {
        userId: socket.id,
        userName: currentUserName
      });
    });

    socket.on('cursor-move', ({ roomId, x, y, userName }) => {
      const lastPos = socket.lastCursorPos || { x: 0, y: 0 };
      const distance = Math.sqrt(
        Math.pow(x - lastPos.x, 2) + Math.pow(y - lastPos.y, 2)
      );
      
      if (distance > 5 || !socket.lastCursorPos) {
        socket.lastCursorPos = { x, y };
        socket.to(roomId).emit('remote-cursor', { 
          userId: socket.id, 
          x, 
          y,
          userName: userName || currentUserName
        });
      }
    });

    socket.on('draw', async (data) => {
      socket.to(data.roomId).emit('remote-draw', data);
      await saveDrawingCommand(data.roomId, {
        type: data.tool === 'eraser' ? 'erase' : 'stroke',
        data: {
          color: data.color,
          width: data.width,
          points: data.points,
          userName: data.userName
        },
        timestamp: new Date()
      });
    });

    socket.on('draw-move', (data) => {
      socket.to(data.roomId).emit('remote-draw-move', data);
    });

    socket.on('clear-canvas', async ({ roomId }) => {
      socket.to(roomId).emit('clear-canvas');
      await Room.updateOne({ roomId }, { $set: { drawingData: [] } });
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