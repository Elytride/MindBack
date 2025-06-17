import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import CustomYearDropdown from './CustomYearDropdown'; // Import the custom dropdown
import './CustomYearDropdown.css'; // Import its styles
import './ConversationInterface.css'; // Import styles for ConversationInterface
// Removed ParticipantDropdown import
  // Removed ParticipantDropdown.css import

// Removed the simulated AI response function

// Helper function to format message text with bold and italic
const formatMessageText = (text) => {
  let formattedText = text;

  // Replace bold: **text** with <strong>text</strong>
  formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Replace italic: *text* with <em>text</em>
  formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');

  return formattedText;
};

function TypingIndicator() {
  const [displayText, setDisplayText] = useState('typing.');

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayText(prevText => {
        if (prevText === 'typing.') {
          return 'typing..';
        } else if (prevText === 'typing..') {
          return 'typing...';
        } else {
          return 'typing.';
        }
      });
    }, 300); // Adjust interval for desired animation speed

    return () => clearInterval(interval); // Clean up the interval on component unmount
  }, []);

  return (
    <div className="message message-ai typing-indicator">
      {displayText}
    </div>
  );
}

function ConversationInterface({
  tabs,                 // Array of tab objects { id, year, messages, isTyping }
  activeTabId,          // ID of the active tab
  onSwitchTab,          // Function to switch active tab (tabId) => {}
  onCloseTab,           // Function to close a tab (tabId) => {}
  onAddTab,             // Function to add a new tab () => {}
  onUpdateTabMessages,  // Function to update messages for a tab (tabId, newMessages) => {}
  onUpdateTabYear,      // Function to update the year for a specific tab (tabId, newYear) => {} // Re-enable prop
  onUpdateTabTypingState, // Function to update the typing state for a specific tab (tabId, isTyping) => {}
  maxTabs,              // Maximum number of tabs allowed
  selectedUserNames,    // Receive the selectedUserNames prop for the active tab
  availableYears,       // Receive the availableYears prop
  geminiApiKey,         // Receive the geminiApiKey prop
}) {
  const [inputValue, setInputValue] = useState('');
  const [isSessionReady, setIsSessionReady] = useState(false); // New state for session readiness
  const messagesEndRef = useRef(null);

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  // Reset session readiness when active tab changes
  useEffect(() => {
      setIsSessionReady(false);
  }, [activeTabId]);

  // Removed Effect to fetch participants

  // Effect to start chat session when a tab becomes active and is ready
  useEffect(() => {
      console.log('ConversationInterface useEffect triggered:', {
          activeTabId,
          activeTabYear: activeTab?.year,
          selectedUserNames: selectedUserNames,
          hasSelectedUserNames: selectedUserNames && Object.keys(selectedUserNames).length > 0,
          messagesLength: activeTab?.messages.length
      });
      const startChatSession = async () => {
          if (!activeTab) return;

          // If the tab has no messages and has a year, attempt to start a new session
          if (activeTab.messages.length === 0 && activeTab.year) {
              console.log(`Attempting to start chat session for year ${activeTab.year}`);
              onUpdateTabTypingState(activeTab.id, true); // Indicate loading

              try {
                  if (!geminiApiKey) { // Use the prop
                      throw new Error('Gemini API Key not provided. Please go to settings to set it.');
                  }

                  const response = await fetch('http://127.0.0.1:5000/api/start_chat', {
                      method: 'POST',
                      headers: {
                          'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ year: activeTab.year, apiKey: geminiApiKey }), // Use the prop
                  });

                  const data = await response.json();

                  if (response.ok) {
                      console.log('Chat session started:', data.message);
                      setIsSessionReady(true); // Set session as ready
                  } else {
                      console.error('Failed to start chat session:', data.error);
                      // Display an error message in the chat or as an alert
                      const errorMessage = {
                          id: Date.now(),
                          text: `Error: Could not start chat session for ${activeTab.year}. ${data.error}`,
                          sender: 'system',
                          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      };
                      onUpdateTabMessages(activeTab.id, [errorMessage]);
                  }
              } catch (error) {
                  console.error('Network error starting chat session:', error);
                   const errorMessage = {
                          id: Date.now(),
                          text: `Error: Network error starting chat session for ${activeTab.year}. ${error}`,
                          sender: 'system',
                          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      };
                      onUpdateTabMessages(activeTab.id, [errorMessage]);
              } finally {
                  onUpdateTabTypingState(activeTab.id, false); // Stop loading indicator
              }
          } else if (activeTab.messages.length > 0) {
              // If tab already has messages, assume session is ready
              setIsSessionReady(true);
          }
      };

      // Attempt to start chat if the tab has no messages and a year, or if it already has messages
      if ((activeTab?.messages.length === 0 && activeTab?.year) || (activeTab?.messages.length > 0)) {
          startChatSession();
      }


  }, [activeTabId, activeTab?.year, activeTab?.messages.length]); // Re-run when active tab, its year, or messages change


  // Scroll to bottom when messages change
  // Use useLayoutEffect to ensure scrolling happens after DOM updates
  useLayoutEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [activeTab?.messages]); // Trigger scroll when active tab's messages change

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !activeTab) return;

    const userMessage = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Add user message immediately
    const messagesAfterUser = [...activeTab.messages, userMessage];
    onUpdateTabMessages(activeTab.id, messagesAfterUser);

    setInputValue('');
    onUpdateTabTypingState(activeTab.id, true); // Indicate typing for this tab

    const controller = new AbortController();
    const signal = controller.signal;
    const timeoutDuration = 50000; // 100 * (1 - temperature) seconds based on backend .env

    const timeoutId = setTimeout(() => {
        controller.abort();
    }, timeoutDuration);

    try {
        // Send message to backend API with timeout
        const fetchPromise = fetch('http://127.0.0.1:5000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                year: activeTab.year, // Send the year to identify the session
                message: userMessage.text,
            }),
            signal: signal // Link the fetch request to the abort signal
        });

        const response = await Promise.race([
            fetchPromise,
            new Promise((_, reject) =>
                signal.addEventListener('abort', () => reject(new Error('Request timed out')), { once: true })
            )
        ]);

        clearTimeout(timeoutId); // Clear the timeout if fetch completes

        const data = await response.json();

        if (response.ok) {
            // Add AI response to messages
            const aiResponse = {
                id: Date.now() + 1, // Simple unique ID
                text: data.response,
                sender: 'ai',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            onUpdateTabMessages(activeTab.id, [...messagesAfterUser, aiResponse]);
        } else {
            console.error('Error sending message:', data.error);
             const errorMessage = {
                id: Date.now() + 1,
                text: `Error: Could not get response. ${data.error}`,
                sender: 'system',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            onUpdateTabMessages(activeTab.id, [...messagesAfterUser, errorMessage]);
        }
    } catch (error) {
        clearTimeout(timeoutId); // Ensure timeout is cleared on error as well
        if (error.name === 'AbortError' || error.message === 'Request timed out') {
            console.error('Message request timed out:', error);
            const errorMessage = {
                id: Date.now() + 1,
                text: `Error: Request timed out. Please try again.`,
                sender: 'system',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            onUpdateTabMessages(activeTab.id, [...messagesAfterUser, errorMessage]);
        } else {
            console.error('Network error sending message:', error);
             const errorMessage = {
                id: Date.now() + 1,
                text: `Error: Network error sending message. ${error}`,
                sender: 'system',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            onUpdateTabMessages(activeTab.id, [...messagesAfterUser, errorMessage]);
        }
    } finally {
        onUpdateTabTypingState(activeTab.id, false); // Stop typing indicator for this tab
    }
  };

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSendMessage();
    }
  };

  // Handler for changing the year within the active tab
  const handleTabYearChange = (event) => {
    if (activeTab) {
      const newYear = parseInt(event.target.value);
      onUpdateTabYear(activeTab.id, newYear); // Call parent handler
    }
  };


  // Render placeholder if no active tab
  if (!activeTab) {
    // Placeholder message for when no tab is selected
    return (
      <div className="placeholder-content">
        <h2>welcome to mindback</h2>
        <p>Upload data and get started</p>
      </div>
    );
  }

  return (
    <div className="conversation-interface">
      {/* Tab Bar */}
      <div className="tab-bar">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
            onClick={() => onSwitchTab(tab.id)}
          >
            {/* Simple display for now, maybe add dropdown later */}
            <span>Chat ({tab.year})</span>
            <button
              className="close-tab-btn"
              onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id); }} // Prevent tab switch on close click
            >
              ×
            </button>
          </div>
        ))}
        {tabs.length < maxTabs && (
          <button className="add-tab-btn" onClick={() => onAddTab()}>+</button>
        )}
      </div>

      {/* Conversation Header (Persona based on active tab's year) */}
      <div className="conversation-header">
         {/* Back button might be less relevant now with tabs */}
         {/* <button onClick={onBack} className="back-btn">← Back</button> */}
         <div className="past-persona">
           <div className="persona-avatar">{activeTab.year.toString().slice(-2)}</div>
           <div className="persona-info">
             {/* Display selected user names */}
             {selectedUserNames && Object.keys(selectedUserNames).length > 0 && (
                 <p className="selected-users">
                     {Object.entries(selectedUserNames)
                         .map(([source, name]) => `${name} (${activeTab.year})`)
                         .join(', ')}
                 </p>
             )}
           </div>
         </div>
         {/* Custom Year Selector Dropdown */}
         {/* Keep the year dropdown for changing the year of the active tab */}
         <CustomYearDropdown
            selectedYear={activeTab.year}
            years={availableYears} // Use the availableYears prop
            onYearSelect={(newYear) => onUpdateTabYear(activeTab.id, newYear)}
         />
         {/* Removed Participant Selector Dropdown */}
      </div>

      {/* Messages Area */}
      <div className="conversation-messages" ref={messagesEndRef}>
        {activeTab.messages.map((msg) => (
          <div key={msg.id} className={`message message-${msg.sender} message-fade-up`}>
            <span dangerouslySetInnerHTML={{ __html: formatMessageText(msg.text) }} />
            <span className={`message-time message-time-${msg.sender}`}>{msg.timestamp}</span>
          </div>
        ))}
        {activeTab.isTyping && <TypingIndicator />}
      </div>

      {/* Input Area */}
      <div className="conversation-input">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={`Ask your ${activeTab.year} self...`}
          disabled={!isSessionReady || activeTab.id !== activeTabId || tabs.some(tab => tab.isTyping)}
        />
        <button onClick={handleSendMessage} className="send-btn" disabled={!isSessionReady || activeTab.id !== activeTabId || tabs.some(tab => tab.isTyping) || !inputValue.trim()}>
          ➤
        </button>
      </div>
    </div>
  );
}

export default ConversationInterface;
