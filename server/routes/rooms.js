const express = require('express');
const router = express.Router();
const Room = require('../models/Room');

// Join or create room
router.post('/join', async (req, res) => {
  try {
    const { roomId } = req.body;
    let room = await Room.findOne({ roomId });
    
    if (!room) {
      room = new Room({ roomId });
      await room.save();
    }
    
    res.json({ roomId: room.roomId, drawingData: room.drawingData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get room info
router.get('/:roomId', async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) {
      return res.json({ drawingData: [] });
    }
    res.json({ drawingData: room.drawingData });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;