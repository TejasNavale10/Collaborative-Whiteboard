import React from 'react';
import { SocketProvider } from './contexts/SocketContext';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RoomJoin from './components/RoomJoin';
import Whiteboard from './components/Whiteboard';
import { GlobalStyles } from './styles/globalStyles';

function App() {
  return (
    <SocketProvider>
      <GlobalStyles />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RoomJoin />} />
          <Route path="/whiteboard/:roomId" element={<Whiteboard />} />
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}

export default App;