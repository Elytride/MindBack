import React, { useState, useEffect, useRef } from 'react';
import './SettingsMenu.css';

function SettingsMenu({ onClose, geminiApiKey, onApiKeyChange }) { // Added props
  const apiKeyInputRef = useRef(null);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Load API key from local storage when the component mounts
    const storedApiKey = localStorage.getItem('geminiApiKey');
    if (storedApiKey) {
      onApiKeyChange(storedApiKey); // Update parent state
    }
  }, [onApiKeyChange]); // Dependency on onApiKeyChange

  useEffect(() => {
    if (showSavedMessage) {
      setIsFadingOut(false); // Ensure not fading out when shown
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true); // Start fading out after 1 second
      }, 1000);

      const hideTimer = setTimeout(() => {
        setShowSavedMessage(false); // Hide completely after 1.5 seconds
        setIsFadingOut(false); // Reset fading state
      }, 1500);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [showSavedMessage]);

  const handleInputChange = (event) => {
    onApiKeyChange(event.target.value); // Update parent state
  };

  const handleSave = () => {
    // Save API key to local storage
    localStorage.setItem('geminiApiKey', geminiApiKey); // Use prop
    setShowSavedMessage(true);
  };

  const handleClearApiKey = () => {
    onApiKeyChange(''); // Update parent state
    localStorage.removeItem('geminiApiKey'); // Also clear from local storage
  };

  return (
    <div className="settings-popup-overlay">
      <div className="settings-popup-content">
        <h2>Settings</h2>
        <div>
          <div>
            Gemini API Key:
          </div>
          <div className="api-key-input-container">
            <input
              type="password"
              ref={apiKeyInputRef}
              value={geminiApiKey} // Use prop
              onChange={handleInputChange}
            />
            {geminiApiKey && ( // Only show the clear button if the input is not empty
              <button className="clear-api-key-button" onClick={handleClearApiKey}>
                X
              </button>
            )}
          </div>
        </div>
        <div className="settings-buttons">
          <button onClick={handleSave}>Save</button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
      {showSavedMessage && (
        <div className={`saved-message ${isFadingOut ? 'fade-out' : ''}`}>
          Saved!
        </div>
      )}
    </div>
  );
}

export default SettingsMenu;
