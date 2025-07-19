import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import DrawingCanvas from './DrawingCanvas';
import Toolbar from './Toolbar';
import UserCursors from './UserCursors';

const cursorColors = [
  '#448AFF', '#FF5252', '#4CAF50', '#FFB300', '#9C27B0', '#00B8D4', '#FF4081'
];

const Whiteboard = ({ socket }) => {
  const { roomId } = useParams();
  const [users, setUsers] = useState([]);
  const [drawingData, setDrawingData] = useState([]);
  const [userCount, setUserCount] = useState(1);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [userColors, setUserColors] = useState({});
  const [isConnected, setIsConnected] = useState(socket?.connected);
  const [cursorTimestamps, setCursorTimestamps] = useState({});

  useEffect(() => {
    if (!socket) return;
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !roomId) return;

    // Join room
    socket.emit('join-room', roomId);

    // Load initial drawing data
    fetch(`/api/rooms/${roomId}`)
      .then(res => res.json())
      .then(data => {
        if (data.drawingData) {
          setDrawingData(data.drawingData);
        }
      });

    // User presence events
    socket.on('user-joined', (userId) => {
      setUsers(prev => [...prev, { id: userId }]);
      setUserColors(prev => ({
        ...prev,
        [userId]: cursorColors[Object.keys(prev).length % cursorColors.length]
      }));
    });

    socket.on('user-left', (userId) => {
      setUsers(prev => prev.filter(user => user.id !== userId));
      setRemoteCursors(prev => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });
    });

    socket.on('user-count', (count) => setUserCount(count));
    socket.on('remote-cursor', ({ userId, x, y }) => {
      setRemoteCursors(prev => ({ ...prev, [userId]: { x, y } }));
      setCursorTimestamps(prev => ({ ...prev, [userId]: Date.now() }));
    });

    return () => {
      socket.emit('leave-room', roomId);
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('user-count');
      socket.off('remote-cursor');
    };
  }, [socket, roomId]);

  // Periodically clean up inactive cursors
  useEffect(() => {
    const interval = setInterval(() => {
      setRemoteCursors(prev => {
        const now = Date.now();
        const updated = {};
        Object.entries(prev).forEach(([id, pos]) => {
          if (cursorTimestamps[id] && now - cursorTimestamps[id] < 5000) {
            updated[id] = pos;
          }
        });
        return updated;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [cursorTimestamps]);

  return (
    <WhiteboardContainer>
      <StatusBar>
        <StatusDot $online={isConnected} />
        {isConnected ? 'Connected' : 'Disconnected'}
        <span style={{ marginLeft: 16 }}>Active users: {userCount}</span>
      </StatusBar>
      <Toolbar socket={socket} roomId={roomId} />
      <BoardWrapper>
        <DrawingCanvas 
          socket={socket} 
          roomId={roomId} 
          initialData={drawingData}
        />
        <UserCursors cursors={remoteCursors} userColors={userColors} />
      </BoardWrapper>
    </WhiteboardContainer>
  );
};

const WhiteboardContainer = styled.div`
  min-height: 100vh;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
`;

const StatusBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-weight: 500;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  min-height: 40px;
`;

const StatusDot = styled.span`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $online }) => ($online ? '#4caf50' : '#f44336')};
  margin-right: 6px;
`;

const BoardWrapper = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  overflow: auto;
  @media (max-width: 900px) {
    align-items: flex-start;
    padding-top: 40px;
  }
`;

// In DrawingCanvas.js, ensure the canvas is responsive:
const CanvasWrapper = styled.div`
  position: relative;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  @media (max-width: 900px) {
    max-width: 100vw;
  }
`;

const StyledCanvas = styled.canvas`
  border: 2px solid #ccc;
  background: #fff;
  width: 100%;
  height: 60vh;
  min-height: 320px;
  max-height: 80vh;
  display: block;
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
`;

export default Whiteboard;