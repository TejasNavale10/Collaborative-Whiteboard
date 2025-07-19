import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { generateRoomCode } from '../utils';

const RoomJoin = () => {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    const code = roomId.trim() || generateRoomCode();
    navigate(`/whiteboard/${code}`);
  };

  return (
    <JoinWrapper>
      <JoinForm onSubmit={handleJoin}>
        <Title>Collaborative Whiteboard</Title>
        <Input
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="Enter room code or leave empty for new room"
          autoFocus
        />
        <JoinButton type="submit">Join Room</JoinButton>
      </JoinForm>
    </JoinWrapper>
  );
};

const JoinWrapper = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
`;

const JoinForm = styled.form`
  background: #fff;
  padding: 32px 28px;
  border-radius: 12px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 320px;
`;

const Title = styled.h1`
  font-size: 2rem;
  margin-bottom: 24px;
  color: #222;
  font-weight: 700;
`;

const Input = styled.input`
  font-size: 1.1rem;
  padding: 12px 16px;
  border: 1px solid #dbe2ef;
  border-radius: 6px;
  margin-bottom: 18px;
  width: 100%;
  text-align: center;
`;

const JoinButton = styled.button`
  background: #4a6bff;
  color: #fff;
  font-size: 1.1rem;
  padding: 10px 0;
  border: none;
  border-radius: 6px;
  width: 100%;
  font-weight: 600;
  transition: background 0.2s;
  &:hover {
    background: #3956d6;
  }
`;

export default RoomJoin;