import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import DrawingCanvas from './DrawingCanvas';
import Toolbar from './Toolbar';
import UserCursors from './UserCursors';
import { useSocket } from '../contexts/SocketContext';
import { v4 as uuidv4 } from 'uuid';

const cursorColors = [
  '#FF5252', '#448AFF', '#4CAF50', '#FFB300',
  '#9C27B0', '#00B8D4', '#FF4081', '#795548'
];

const Whiteboard = () => {
  const { roomId } = useParams();
  const socket = useSocket();
  const [drawingData, setDrawingData] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [userColors, setUserColors] = useState({});
  const [userNames, setUserNames] = useState({});
  const [isConnected, setIsConnected] = useState(socket?.connected);
  const [userCount, setUserCount] = useState(1);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(5);
  const [tool, setTool] = useState('pen');
  
  // Generate completely unique ID per session
  const [userId] = useState(() => uuidv4());
  const [userName, setUserName] = useState(() => `User${Math.floor(Math.random() * 1000)}`);

  // Assign color when component mounts
  useEffect(() => {
    const colorIndex = Object.keys(userColors).length % cursorColors.length;
    setUserColors(prev => ({
      ...prev,
      [userId]: cursorColors[colorIndex]
    }));
  }, [userId]);

  // Socket connection handlers
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

  // Main room joining and event handling
  useEffect(() => {
    if (!socket || !roomId) return;

    // Join room with user info
    socket.emit('join-room', {
      roomId,
      userId,
      userName,
      color: userColors[userId] || cursorColors[0]
    });

    // Load initial drawing data
    const loadInitialData = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_SERVER_URL}/api/rooms/${roomId}`);
        if (response.ok) {
          const data = await response.json();
          setDrawingData(data?.drawingData || []);
        }
      } catch (error) {
        setDrawingData([]);
      }
    };
    loadInitialData();

    // Event handlers
    const handleUserJoined = ({ userId, userName, color }) => {
      setUserColors(prev => ({ ...prev, [userId]: color }));
      setUserNames(prev => ({ ...prev, [userId]: userName }));
    };

    const handleUserLeft = (userId) => {
      setRemoteCursors(prev => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });
    };

    const handleRemoteCursor = ({ userId, x, y }) => {
      if (!userId) return;
      
      setRemoteCursors(prev => ({
        ...prev,
        [userId]: {
          x,
          y,
          timestamp: Date.now(),
          userName: userNames[userId] || `User${userId.slice(0, 4)}`,
          color: userColors[userId] || '#000000'
        }
      }));
    };

    const handleInitialData = (data) => setDrawingData(data);
    
    const handleAllUsers = (users) => {
      const colors = {};
      const names = {};
      users.forEach(user => {
        if (!user.userId) return;
        colors[user.userId] = user.color;
        names[user.userId] = user.userName;
      });
      setUserColors(colors);
      setUserNames(names);
    };

    const handleUserCount = (count) => {
      setUserCount(count);
    };

    // Register event listeners
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('remote-cursor', handleRemoteCursor);
    socket.on('initial-drawing-data', handleInitialData);
    socket.on('all-users', handleAllUsers);
    socket.on('user-count', handleUserCount);

    return () => {
      socket.emit('leave-room', { roomId, userId });
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('remote-cursor', handleRemoteCursor);
      socket.off('initial-drawing-data', handleInitialData);
      socket.off('all-users', handleAllUsers);
      socket.off('user-count', handleUserCount);
    };
  }, [socket, roomId, userId, userName, userColors]);

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
    socket.emit('update-user-name', { roomId, userId, userName: newName });
  };

  return (
    <WhiteboardContainer>
      <StatusBar>
        <StatusDot $online={isConnected} />
        {isConnected ? 'Connected' : 'Disconnected'}
        <span>Users: {userCount}</span>
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
          onClear={handleClear}
          userName={userName}
          userId={userId}
          userColors={userColors}
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