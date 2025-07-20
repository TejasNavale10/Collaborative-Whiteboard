import React from 'react';
import styled from 'styled-components';

const UserCursors = ({ cursors, userColors }) => (
  <>
    {Object.entries(cursors).map(([userId, pos]) => (
      <div
        key={userId}
        style={{
          position: 'absolute',
          left: pos.x,
          top: pos.y,
          pointerEvents: 'none',
          zIndex: 10,
          color: userColors[userId] || '#000',
          fontWeight: 'bold'
        }}
      >
        <svg width="18" height="18">
          <circle cx="9" cy="9" r="7" fill={userColors[userId] || '#000'} />
        </svg>
      </div>
    ))}
  </>
);

export default UserCursors;