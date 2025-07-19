import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './contexts/SocketContext';
import RoomJoin from './components/RoomJoin';
import Whiteboard from './components/Whiteboard';
import GlobalStyles from './styles/globalStyles';

function App() {
  return (
    <SocketProvider>
      <GlobalStyles />
      <Router>
        <Routes>
          <Route path="/" element={<RoomJoin />} />
          <Route path="/whiteboard/:roomId" element={<Whiteboard />} />
        </Routes>
      </Router>
    </SocketProvider>
  );
}

export default App;