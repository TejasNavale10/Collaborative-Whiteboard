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
  const [userNames, setUserNames] = useState({});
  const [isConnected, setIsConnected] = useState(socket?.connected);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(5);
  const [tool, setTool] = useState('pen');
  const [userName, setUserName] = useState(
    localStorage.getItem('userName') || `User${Math.floor(Math.random() * 1000)}`
  );

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

    // Join room with username
    socket.emit('join-room', { roomId, userName });

    // Load initial drawing data
    fetch(`${process.env.REACT_APP_SERVER_URL}/api/rooms/${roomId}`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setDrawingData(data.drawingData || []))
      .catch(() => setDrawingData([]));

    // User presence events
    socket.on('user-joined', ({ userId, userName }) => {
      setUsers(prev => [...prev, { id: userId }]);
      setUserColors(prev => ({
        ...prev,
        [userId]: cursorColors[Object.keys(prev).length % cursorColors.length]
      }));
      setUserNames(prev => ({
        ...prev,
        [userId]: userName
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

    socket.on('remote-cursor', ({ userId, x, y, userName }) => {
      setRemoteCursors(prev => ({ 
        ...prev, 
        [userId]: { 
          x, 
          y,
          timestamp: Date.now() 
        } 
      }));
      setUserNames(prev => ({
        ...prev,
        [userId]: userName || prev[userId] || `User${userId.slice(0, 4)}`
      }));
    });

    socket.on('initial-drawing-data', (data) => {
      setDrawingData(data);
    });

    return () => {
      socket.emit('leave-room', roomId);
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('remote-cursor');
      socket.off('initial-drawing-data');
    };
  }, [socket, roomId, userName]);

  // Clean up inactive cursors
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRemoteCursors(prev => {
        const updated = {};
        Object.entries(prev).forEach(([id, cursor]) => {
          if (now - cursor.timestamp < 3000) {
            updated[id] = cursor;
          }
        });
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleClear = () => {
    setDrawingData([]);
    socket.emit('clear-canvas', roomId);
  };

  const handleNameChange = (e) => {
    const newName = e.target.value || `User${Math.floor(Math.random() * 1000)}`;
    setUserName(newName);
    localStorage.setItem('userName', newName);
    socket.emit('update-user-name', { roomId, userName: newName });
  };

  return (
    <WhiteboardContainer>
      <StatusBar>
        <StatusDot $online={isConnected} />
        {isConnected ? 'Connected' : 'Disconnected'}
        <span style={{ marginLeft: 16 }}>Users: {userCount}</span>
        <NameInput
          type="text"
          value={userName}
          onChange={handleNameChange}
          maxLength="20"
          placeholder="Your name"
        />
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
          roomId={roomId}
          initialData={drawingData}
          color={color}
          lineWidth={lineWidth}
          tool={tool}
          onColorChange={setColor}
          onWidthChange={setLineWidth}
          onToolChange={setTool}
          onClear={handleClear}
          userName={userName}
        />
        <UserCursors 
          cursors={remoteCursors} 
          userColors={userColors}
          userNames={userNames}
        />
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

const NameInput = styled.input`
  margin-left: auto;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  max-width: 150px;
`;

const BoardWrapper = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  overflow: auto;
`;

export default Whiteboard;