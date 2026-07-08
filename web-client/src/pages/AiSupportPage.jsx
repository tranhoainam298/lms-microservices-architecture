import React, { useState } from 'react';
import { mockAiBotResponses } from '../data/mockData';

export default function AiSupportPage() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    { sender: 'bot', text: "Hello! I am your AI Study Assistant. You can ask me questions about 'gateway', 'isolation', or 'rabbitmq' to see my architectural integrations." }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = { sender: 'user', text: query };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setIsTyping(true);

    // Simulate calling the External AI Chatbot System
    setTimeout(() => {
      const lowerQuery = query.toLowerCase();
      let matchedResponse = "I'm sorry, I don't have simulated replies for that keyword. Try asking about 'gateway', 'isolation', or 'rabbitmq'.";
      
      const foundMatch = mockAiBotResponses.find(r => lowerQuery.includes(r.keyword));
      if (foundMatch) {
        matchedResponse = foundMatch.reply;
      }

      setMessages(prev => [...prev, { sender: 'bot', text: matchedResponse }]);
      setIsTyping(false);
    }, 1000);
  };

  const chatContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    height: '500px',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius)',
    backgroundColor: 'var(--bg-secondary)',
    overflow: 'hidden'
  };

  const messageListStyle = {
    flexGrow: 1,
    padding: '1.5rem',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  };

  const getBubbleStyle = (sender) => {
    const isBot = sender === 'bot';
    return {
      alignSelf: isBot ? 'flex-start' : 'flex-end',
      maxWidth: '70%',
      padding: '0.75rem 1rem',
      borderRadius: 'var(--border-radius-sm)',
      backgroundColor: isBot ? 'var(--bg-tertiary)' : 'var(--primary)',
      color: isBot ? 'var(--text-primary)' : '#ffffff',
      fontSize: '0.875rem',
      boxShadow: 'var(--shadow-sm)'
    };
  };

  const inputAreaStyle = {
    display: 'flex',
    padding: '1rem',
    borderTop: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-primary)'
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-title)' }}>AI Study Assistant</h1>
        <p className="text-secondary-color">Interact with our external learning chatbot system.</p>
      </div>

      <div className="architecture-alert">
        <span>🤖</span>
        <span>External System: **AI Chatbot System** (Routed via Course Service. No Chatbot DB exists)</span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Chat box */}
        <div style={{ gridColumn: 'span 2' }}>
          <div style={chatContainerStyle}>
            <div style={messageListStyle}>
              {messages.map((m, idx) => (
                <div key={idx} style={getBubbleStyle(m.sender)}>
                  {m.text}
                </div>
              ))}
              {isTyping && (
                <div style={getBubbleStyle('bot')}>
                  <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>AI chatbot is typing...</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSend} style={inputAreaStyle}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Ask about 'gateway', 'isolation', or 'rabbitmq'..." 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isTyping}
                style={{ borderRadius: 'var(--border-radius-sm) 0 0 var(--border-radius-sm)', borderRight: 'none' }}
              />
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isTyping}
                style={{ borderRadius: '0 var(--border-radius-sm) var(--border-radius-sm) 0' }}
              >
                Send
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar Help */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Help topics</h3>
          <p className="text-sm text-secondary-color">
            This chatbot connects Course Service context (`ai_learning_context`) with the external **AI Chatbot System**. Try querying:
          </p>
          <ul style={{ listStyle: 'square', paddingLeft: '1.25rem', marginTop: '1rem', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>`gateway`</li>
            <li>`isolation`</li>
            <li>`rabbitmq`</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
