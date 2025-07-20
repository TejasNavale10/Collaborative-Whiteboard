import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { getCoordinates, redrawCanvas } from '../utils';
import { throttle } from 'lodash'; 
import { useSocket } from '../contexts/SocketContext'; // or wherever your hook is

const DrawingCanvas = ({ roomId, initialData, color, lineWidth, tool, onColorChange, onWidthChange, onToolChange, onClear, onCursorUpdate }) => {
  const socket = useSocket();
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);

  // Listen for clear-canvas event
  useEffect(() => {
    if (!socket) return;
    socket.on('clear-canvas', () => {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    });
    return () => socket.off('clear-canvas');
  }, [socket]);

  // Redraw on initialData change
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw all strokes, then all erases
    initialData.forEach(cmd => {
      if (cmd.type === 'stroke' && cmd.data?.points?.length > 1) {
        ctx.strokeStyle = cmd.data.color;
        ctx.lineWidth = cmd.data.width;
        ctx.beginPath();
        ctx.moveTo(cmd.data.points[0].x, cmd.data.points[0].y);
        for (let i = 1; i < cmd.data.points.length; i++) {
          ctx.lineTo(cmd.data.points[i].x, cmd.data.points[i].y);
        }
        ctx.stroke();
      }
    });
    // Then draw all erases on top
    initialData.forEach(cmd => {
      if (cmd.type === 'erase' && cmd.data?.points?.length > 1) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = cmd.data.width;
        ctx.beginPath();
        ctx.moveTo(cmd.data.points[0].x, cmd.data.points[0].y);
        for (let i = 1; i < cmd.data.points.length; i++) {
          ctx.lineTo(cmd.data.points[i].x, cmd.data.points[i].y);
        }
        ctx.stroke();
      }
    });
  }, [initialData]);

  const startDrawing = (e) => {
    setDrawing(true);
    const { offsetX, offsetY } = getCoordinates(e, canvasRef.current);
    setCurrentPath([{ x: offsetX, y: offsetY }]);
  };

  const draw = (e) => {
    if (!drawing) return;
    const { offsetX, offsetY } = getCoordinates(e, canvasRef.current);
    setCurrentPath((prev) => {
      const newPath = [...prev, { x: offsetX, y: offsetY }];
      // Emit incremental updates for live sync
      if (socket && newPath.length % 3 === 0) {
        // every 3 points
        socket.emit('draw-move', {
          roomId,
          color,
          width: lineWidth,
          points: newPath.slice(-3),
        });
      }
      return newPath;
    });
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = tool === 'eraser' ? '#fff' : color;
    ctx.lineWidth = tool === 'eraser' ? 20 : lineWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const points = [...currentPath, { x: offsetX, y: offsetY }];
    for (let i = 1; i < points.length; i++) {
      ctx.moveTo(points[i - 1].x, points[i - 1].y);
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  };

  const finishDrawing = () => {
    if (currentPath.length > 1) {
      socket.emit('draw', {
        roomId,
        color: tool === 'eraser' ? '#fff' : color,
        width: tool === 'eraser' ? 21 : lineWidth,
        points: currentPath,
        tool, // 'pen' or 'eraser'
      });
    }
    setDrawing(false);
    setCurrentPath([]);
  };

  // Listen for remote draw events
  useEffect(() => {
    if (!socket) return;
    socket.on('remote-draw', (data) => {
      const ctx = canvasRef.current.getContext('2d');
      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const points = data.points;
      for (let i = 1; i < points.length; i++) {
        ctx.moveTo(points[i - 1].x, points[i - 1].y);
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    });
    return () => socket.off('remote-draw');
  }, [socket]);

  // Listen for remote incremental draw events
  useEffect(() => {
    if (!socket) return;
    socket.on('remote-draw-move', (data) => {
      const ctx = canvasRef.current.getContext('2d');
      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const points = data.points;
      for (let i = 1; i < points.length; i++) {
        ctx.moveTo(points[i - 1].x, points[i - 1].y);
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    });
    return () => socket.off('remote-draw-move');
  }, [socket]);

  const throttledCursorEmit = useRef(
    throttle((roomId, x, y) => {
      socket.emit('cursor-move', { roomId, x, y });
    }, 16)
  ).current;

  // Send cursor position on mouse move
  const handleMouseMove = (e) => {
    if (!socket) return;
    const { offsetX, offsetY } = getCoordinates(e, canvasRef.current);
    throttledCursorEmit(roomId, offsetX, offsetY);
    if (drawing) draw(e);
    if (onCursorUpdate) onCursorUpdate({ x: offsetX, y: offsetY });
  };

  // Toolbar handlers
  const handleColorChange = (newColor) => onColorChange(newColor);
  const handleWidthChange = (w) => onWidthChange(w);
  const handleClear = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    socket.emit('clear-canvas', { roomId });
  };

  return (
    <CanvasWrapper>
      <StyledCanvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={handleMouseMove}
        onMouseUp={finishDrawing}
        onMouseLeave={finishDrawing}
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
`;

export default DrawingCanvas;