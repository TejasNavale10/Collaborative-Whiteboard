import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { getCoordinates } from '../utils';
import { throttle } from 'lodash';
import { useSocket } from '../contexts/SocketContext';
import simplify from 'simplify-js';

const DrawingCanvas = ({ 
  roomId, 
  initialData, 
  color, 
  lineWidth, 
  tool, 
  onClear, 
  userName,
  userId,
  userColors = {}
}) => {
  const socket = useSocket();
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const lastPointRef = useRef(null);

  // Initialize canvas and context
  useEffect(() => {
    ctxRef.current = canvasRef.current.getContext('2d');
  }, []);

  // Handle clear-canvas events
  useEffect(() => {
    if (!socket) return;
    
    const handleClear = () => {
      ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    };

    socket.on('clear-canvas', handleClear);
    return () => socket.off('clear-canvas', handleClear);
  }, [socket]);

  // Redraw canvas when initialData or userColors changes
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    initialData.forEach(cmd => {
      if (!cmd.data?.points?.length) return;
      
      const strokeColor = cmd.data.color || 
                         userColors[cmd.data.userId] || 
                         (cmd.type === 'erase' ? '#fff' : '#000');
      
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = cmd.data.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      
      const points = cmd.data.points;
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    });
  }, [initialData, userColors]);

  const startDrawing = (e) => {
    const { offsetX, offsetY } = getCoordinates(e, canvasRef.current);
    setDrawing(true);
    setCurrentPath([{ x: offsetX, y: offsetY }]);
    lastPointRef.current = { x: offsetX, y: offsetY };
  };

  const draw = useCallback((e) => {
    if (!drawing) return;
    
    const { offsetX, offsetY } = getCoordinates(e, canvasRef.current);
    const newPoint = { x: offsetX, y: offsetY };
    
    // Draw locally
    const ctx = ctxRef.current;
    ctx.strokeStyle = tool === 'eraser' ? '#fff' : color;
    ctx.lineWidth = tool === 'eraser' ? 20 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(newPoint.x, newPoint.y);
    ctx.stroke();
    
    // Update current path
    setCurrentPath(prev => [...prev, newPoint]);
    lastPointRef.current = newPoint;
  }, [drawing, tool, color, lineWidth]);

  // Fixed throttled drawing function using useMemo
  const throttledDrawEmit = useMemo(() => {
    return throttle((points) => {
      if (!socket || points.length < 2) return;
      
      const simplified = simplify(points, 1.5, true);
      socket.emit('draw-move', {
        roomId,
        color: tool === 'eraser' ? '#fff' : color,
        width: tool === 'eraser' ? 21 : lineWidth,
        points: simplified,
        userName,
        userId
      });
    }, 50);
  }, [socket, roomId, color, lineWidth, tool, userName, userId]);

  const finishDrawing = useCallback(() => {
    if (!drawing) return;
    
    if (currentPath.length > 1) {
      socket.emit('draw', {
        roomId,
        color: tool === 'eraser' ? '#fff' : color,
        width: tool === 'eraser' ? 21 : lineWidth,
        points: currentPath,
        tool,
        userName,
        userId
      });
    }
    
    setDrawing(false);
    setCurrentPath([]);
    lastPointRef.current = null;
  }, [drawing, currentPath, socket, roomId, color, lineWidth, tool, userName, userId]);

  // Handle remote drawing events
  const handleRemoteDraw = useCallback((data) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.strokeStyle = data.color || 
                     userColors[data.userId] || 
                     (data.tool === 'eraser' ? '#fff' : '#000');
    ctx.lineWidth = data.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    
    const points = data.points;
    if (points.length === 1) {
      ctx.arc(points[0].x, points[0].y, data.width/2, 0, Math.PI*2);
      ctx.fill();
    } else {
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    }
  }, [userColors]);

  useEffect(() => {
    if (!socket) return;
    
    socket.on('remote-draw', handleRemoteDraw);
    socket.on('remote-draw-move', handleRemoteDraw);
    
    return () => {
      socket.off('remote-draw', handleRemoteDraw);
      socket.off('remote-draw-move', handleRemoteDraw);
    };
  }, [socket, handleRemoteDraw]);

  // Throttled cursor position updates
  const throttledCursorEmit = useMemo(() => {
    return throttle((roomId, x, y, socket, userName, userId) => {
      if (!socket) return;
      socket.emit('cursor-move', {
        roomId,
        x: Math.round(x),
        y: Math.round(y),
        userName,
        userId
      });
    }, 50);
  }, []);

  // Handle mouse movement with all dependencies properly declared
  const handleMouseMove = useCallback((e) => {
    const { offsetX, offsetY } = getCoordinates(e, canvasRef.current);
    
    throttledCursorEmit(roomId, offsetX, offsetY, socket, userName, userId);
    
    if (drawing) {
      draw(e);
      if (currentPath.length % 3 === 0) {
        throttledDrawEmit(currentPath);
      }
    }
  }, [drawing, currentPath, roomId, socket, userName, userId, draw, throttledCursorEmit, throttledDrawEmit]);

  return (
    <CanvasWrapper>
      <StyledCanvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={handleMouseMove}
        onMouseUp={finishDrawing}
        onMouseLeave={finishDrawing}
        onTouchStart={startDrawing}
        onTouchMove={handleMouseMove}
        onTouchEnd={finishDrawing}
        width={800}
        height={600}
      />
    </CanvasWrapper>
  );
};

const CanvasWrapper = styled.div`
  position: relative;
  width: 800px;
  margin: 0 auto;
`;

const StyledCanvas = styled.canvas`
  border: 2px solid #ccc;
  background: #fff;
  width: 800px;
  height: 600px;
  display: block;
  touch-action: none;
`;

export default DrawingCanvas;