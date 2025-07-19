import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }

  body {
    background-color: #f5f5f5;
    color: #333;
  }

  button {
    cursor: pointer;
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    background-color: #4a6bff;
    color: white;
    font-weight: 500;
    transition: background-color 0.2s;

    &:hover {
      background-color: #3a5bef;
    }
  }

  input {
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 16px;
    width: 100%;
    max-width: 300px;
  }
`;