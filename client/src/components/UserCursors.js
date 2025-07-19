import React from 'react';
import styled from 'styled-components';

const UserCursors = ({ cursors, userColors }) => (
  <CursorsContainer>
    {Object.entries(cursors).map(([id, cursor]) => (
      <Cursor
        key={id}
        style={{
          left: `${cursor.x}px`,
          top: `${cursor.y}px`,
          backgroundColor: userColors?.[id] || '#448AFF'
        }}
      />
    ))}
  </CursorsContainer>
);

const CursorsContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
`;

const Cursor = styled.div`
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 2px #333;
  transform: translate(-50%, -50%);
  pointer-events: none;
  transition: left 0.12s linear, top 0.12s linear; // <--- Add smooth animation
`;

export default UserCursors;