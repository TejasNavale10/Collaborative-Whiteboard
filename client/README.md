# Collaborative Whiteboard

A real-time collaborative whiteboard application built with MERN stack and Socket.io.

## Features
- Real-time drawing synchronization
- Multiple users in the same room
- Simple room code system
- Basic drawing tools (pen, colors, stroke width)
- Cursor tracking

## Installation

### Backend
1. Navigate to `server/` folder
2. Install dependencies: `npm install`
3. Start MongoDB service
4. Create `.env` file with your configuration
5. Run server: `npm start`

### Frontend
1. Navigate to `client/` folder
2. Install dependencies: `npm install`
3. Create `.env` file with `REACT_APP_SERVER_URL`
4. Run client: `npm start`

## Deployment
1. Build frontend: `npm run build`
2. Configure production environment variables
3. Use PM2 or similar to run backend in production
4. Set up reverse proxy (Nginx recommended)