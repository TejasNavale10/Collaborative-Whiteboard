import React from 'react';
import styled from 'styled-components';

const colors = ['#000000', '#ff0000', '#0000ff', '#00ff00'];

const Toolbar = ({ color, lineWidth, tool, onColorChange, onWidthChange, onToolChange, onClear }) => (
  <ToolbarContainer>
    <ColorPicker>
      {colors.map((c) => (
        <ColorOption
          key={c}
          color={c}
          active={color === c && tool === 'pen'}
          onClick={() => { onColorChange(c); onToolChange('pen'); }}
          title={c}
        />
      ))}
    </ColorPicker>
    <WidthSlider
      type="range"
      min="1"
      max="20"
      value={lineWidth}
      onChange={(e) => onWidthChange(Number(e.target.value))}
      title="Stroke width"
    />
    <ToolButton
      active={tool === 'eraser'}
      onClick={() => onToolChange('eraser')}
      title="Eraser"
    >🧹</ToolButton>
    <ClearButton onClick={onClear} title="Clear canvas">🗑</ClearButton>
  </ToolbarContainer>
);

const ToolbarContainer = styled.div`
  position: absolute;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255,255,255,0.92);
  border-radius: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 8px 20px;
  z-index: 10;
  @media (max-width: 700px) {
    top: 8px;
    gap: 10px;
    padding: 6px 10px;
  }
`;

const ColorPicker = styled.div`
  display: flex;
  gap: 8px;
`;

const ColorOption = styled.button`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid ${({ active }) => (active ? '#333' : '#fff')};
  background: ${({ color }) => color};
  cursor: pointer;
  outline: none;
`;

const WidthSlider = styled.input`
  width: 70px;
`;

const ToolButton = styled.button`
  background: ${({ active }) => (active ? '#eee' : 'none')};
  color: #333;
  border: none;
  font-size: 1.2rem;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  &:hover {
    background: #e0e0e0;
  }
`;

const ClearButton = styled.button`
  background: none;
  color: #ff5252;
  border: none;
  font-size: 1.2rem;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  &:hover {
    background: #ffeaea;
  }
`;

export default Toolbar;