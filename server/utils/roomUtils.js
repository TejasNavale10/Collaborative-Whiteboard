const Room = require('../models/Room');

// Clean up old rooms (inactive for more than 24 hours)
const cleanOldRooms = async () => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  try {
    const result = await Room.deleteMany({
      lastActivity: { $lt: twentyFourHoursAgo }
    });
    
    console.log(`Cleaned up ${result.deletedCount} old rooms`);
  } catch (error) {
    console.error('Error cleaning old rooms:', error);
  }
};

// Save drawing command to database
const saveDrawingCommand = async (roomId, command) => {
  try {
    await Room.updateOne(
      { roomId },
      { 
        $push: { drawingData: command },
        $set: { lastActivity: new Date() }
      },
      { upsert: true }
    );
  } catch (error) {
    console.error('Error saving drawing command:', error);
  }
};

// Get active rooms count
const getActiveRoomsCount = async () => {
  try {
    return await Room.countDocuments({
      lastActivity: { $gt: new Date(Date.now() - 30 * 60 * 1000) }
    });
  } catch (error) {
    console.error('Error getting active rooms count:', error);
    return 0;
  }
};

module.exports = {
  cleanOldRooms,
  saveDrawingCommand,
  getActiveRoomsCount
};