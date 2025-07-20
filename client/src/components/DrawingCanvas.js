import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  onCursorUpdate,
  userName
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

  // Redraw canvas when initialData changes
  useEffect(() => {
    const ctx = ctxRef.current;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    initialData.forEach(cmd => {
      if (!cmd.data?.points?.length) return;
      
      ctx.strokeStyle = cmd.type === 'erase' ? '#fff' : cmd.data.color;
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
  }, [initialData]);

  // Throttled cursor emit function
  const throttledCursorEmit = useCallback(
    throttle((x, y) => {
      if (!socket) return;
      socket.emit('cursor-move', {
        roomId,
        x: Math.round(x),
        y: Math.round(y),
        userName
      });
    }, 50),
    [socket, roomId, userName]
  );

  // Throttled draw emit function
  const throttledDrawEmit = useCallback(
    throttle((points) => {
      if (!socket || points.length < 2) return;
      
      const simplified = simplify(points, 1.5, true);
      socket.emit('draw-move', {
        roomId,
        color: tool === 'eraser' ? '#fff' : color,
        width: tool === 'eraser' ? 21 : lineWidth,
        points: simplified,
        userName
      });
    }, 50),
    [socket, roomId, color, lineWidth, tool, userName]
  );

  const startDrawing = (e) => {
    const { offsetX, offsetY } = getCoordinates(e, canvasRef.current);
    setDrawing(true);
    setCurrentPath([{ x: offsetX, y: offsetY }]);
    lastPointRef.current = { x: offsetX, y: offsetY };
  };

  const draw = (e) => {
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
  };

  const finishDrawing = () => {
    if (!drawing) return;
    
    if (currentPath.length > 1) {
      socket.emit('draw', {
        roomId,
        color: tool === 'eraser' ? '#fff' : color,
        width: tool === 'eraser' ? 21 : lineWidth,
        points: currentPath,
        tool,
        userName
      });
    }
    
    setDrawing(false);
    setCurrentPath([]);
    lastPointRef.current = null;
  };

  // Handle remote drawing events
  useEffect(() => {
    if (!socket) return;
    
    const handleRemoteDraw = (data) => {
      const ctx = ctxRef.current;
      ctx.strokeStyle = data.color;
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
    };

    socket.on('remote-draw', handleRemoteDraw);
    socket.on('remote-draw-move', handleRemoteDraw);
    
    return () => {
      socket.off('remote-draw', handleRemoteDraw);
      socket.off('remote-draw-move', handleRemoteDraw);
    };
  }, [socket]);

  const handleMouseMove = (e) => {
    const { offsetX, offsetY } = getCoordinates(e, canvasRef.current);
    
    // Update cursor position
    throttledCursorEmit(offsetX, offsetY);
    if (onCursorUpdate) onCursorUpdate({ x: offsetX, y: offsetY });
    
    // Handle drawing
    if (drawing) {
      draw(e);
      if (currentPath.length % 3 === 0) {
        throttledDrawEmit(currentPath);
      }
    }
  };

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