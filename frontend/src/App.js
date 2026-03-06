import React, { useState } from 'react';
import Chat from './Chat';
import './App.css';

function App() {
  const backgroundColor = "#e3f2fd"; // Very Light Blue
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className={`App ${isDarkMode ? 'dark-mode' : ''}`} style={{ backgroundColor: backgroundColor }}>
      <header className="App-header">
        <h1>AI Web Voice Assistant</h1>
        <button onClick={toggleDarkMode} className="dark-mode-toggle">
          {isDarkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </header>
      <main>
        <Chat />
      </main>
    </div>
  );
}

export default App;