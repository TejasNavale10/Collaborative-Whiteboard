// Helper function to get coordinates from mouse/touch event
export const getCoordinates = (e, canvas) => {
  const rect = canvas.getBoundingClientRect();
  
  if (e.touches) {
    return {
      offsetX: e.touches[0].clientX - rect.left,
      offsetY: e.touches[0].clientY - rect.top
    };
  }
  
  return {
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top
  };
};

// Function to redraw canvas from saved data
export const redrawCanvas = (ctx, drawingData) => {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  
  drawingData.forEach(command => {
    if (command.type === 'stroke') {
      drawStroke(ctx, command.data);
    } else if (command.type === 'clear') {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  });
};

const drawStroke = (ctx, path) => {
  ctx.beginPath();
  ctx.strokeStyle = path.color || '#000000';
  ctx.lineWidth = path.width || 5;
  ctx.lineCap = 'round';
  
  path.points.forEach((point, i) => {
    if (i === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  
  ctx.stroke();
  ctx.closePath();
};

// Generate a simple room code
export const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};