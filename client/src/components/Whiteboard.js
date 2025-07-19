import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import DrawingCanvas from './DrawingCanvas';
import Toolbar from './Toolbar';
import UserCursors from './UserCursors';
import { useSocket } from '../contexts/SocketContext';

const cursorColors = [
  '#448AFF', '#FF5252', '#4CAF50', '#FFB300', '#9C27B0', '#00B8D4', '#FF4081'
];

const Whiteboard = () => {
  const { roomId } = useParams();
  const socket = useSocket();
  const [users, setUsers] = useState([]);
  const [drawingData, setDrawingData] = useState([]);
  const [userCount, setUserCount] = useState(1);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [userColors, setUserColors] = useState({});
  const [isConnected, setIsConnected] = useState(socket?.connected);
  const [cursorTimestamps, setCursorTimestamps] = useState({});
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(5);
  const [tool, setTool] = useState('pen');

  useEffect(() => {
    if (!socket) return;
    const handleUserCount = (count) => setUserCount(count);
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('user-count', handleUserCount);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('user-count', handleUserCount);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !roomId) return;

    // Join room
    socket.emit('join-room', roomId);

    // Load initial drawing data
    fetch(`${process.env.REACT_APP_SERVER_URL}/api/rooms/${roomId}`)
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => {
        setDrawingData(data.drawingData || []);
      })
      .catch(err => {
        setDrawingData([]); // fallback to empty
        console.error('Failed to fetch room data:', err);
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

  const handleClear = () => {
    // Clear local drawing data
    setDrawingData([]);
    // Emit clear event to server
    socket.emit('clear-canvas', roomId);
  };

  return (
    <WhiteboardContainer>
      <StatusBar>
        <StatusDot $online={isConnected} />
        {isConnected ? 'Connected' : 'Disconnected'}
        <span style={{ marginLeft: 16 }}>Active users: {userCount}</span>
      </StatusBar>
      <Toolbar
        color={color}
        lineWidth={lineWidth}
        tool={tool}
        onColorChange={setColor}
        onWidthChange={setLineWidth}
        onToolChange={setTool}
        onClear={handleClear}
      />
      <BoardWrapper>
        <DrawingCanvas
          socket={socket}
          roomId={roomId}
          initialData={drawingData}
          color={color}
          lineWidth={lineWidth}
          tool={tool}
          onColorChange={setColor}
          onWidthChange={setLineWidth}
          onToolChange={setTool}
          onClear={handleClear}
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