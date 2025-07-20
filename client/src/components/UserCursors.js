import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

const CursorContainer = styled.div`
  position: absolute;
  left: ${props => props.x}px;
  top: ${props => props.y}px;
  pointer-events: none;
  z-index: 1000;
  transition: 
    transform 0.15s ease-out,
    opacity 0.3s ease;
  transform: translate(0, 0);
  will-change: transform;
  opacity: ${props => props.active ? 1 : 0.5};
`;

const CursorSvg = ({ color, name }) => (
  <>
    <svg width="24" height="24" viewBox="0 0 24 24">
      <path
        d="M12 2L2 22L5 22L8 14L14 14L12 2Z"
        fill={color}
        stroke="#fff"
        strokeWidth="1"
      />
    </svg>
    <NameTag color={color}>
      {name}
    </NameTag>
  </>
);

const NameTag = styled.div`
  position: absolute;
  top: 24px;
  left: 0;
  background: ${props => props.color};
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
`;

const UserCursors = ({ cursors, userColors, userNames }) => {
  const [activeCursors, setActiveCursors] = useState({});

  useEffect(() => {
    const timeouts = {};
    
    Object.keys(cursors).forEach(userId => {
      clearTimeout(timeouts[userId]);
      setActiveCursors(prev => ({ ...prev, [userId]: true }));
      
      timeouts[userId] = setTimeout(() => {
        setActiveCursors(prev => ({ ...prev, [userId]: false }));
      }, 2000);
    });

    return () => {
      Object.values(timeouts).forEach(clearTimeout);
    };
  }, [cursors]);

  return (
    <>
      {Object.entries(cursors).map(([userId, cursor]) => (
        <CursorContainer
          key={userId}
          x={cursor.x}
          y={cursor.y}
          active={activeCursors[userId]}
        >
          <CursorSvg 
            color={userColors[userId] || '#000'} 
            name={cursor.userName || `User${userId.slice(0, 4)}`}
          />
        </CursorContainer>
      ))}
    </>
  );
};

export default UserCursors;