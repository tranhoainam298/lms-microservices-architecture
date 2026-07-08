import React, { useState } from 'react';
import { mockAiBotResponses, mockAiSuggestions } from '../data/mockData';

export default function AiSupportPage() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    { sender: 'bot', text: "Welcome. Ask a study question about API gateways, data isolation, or RabbitMQ." }
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
    height: '420px',
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
    <div className="ai-support-page">
      <div className="page-intro">
        <p className="page-kicker">External learning assistance</p>
        <h2 className="page-title">Ask a focused study question</h2>
        <p className="page-description">Use a suggested prompt or write your own question about the architecture concepts in this demo.</p>
      </div>

      <div className="architecture-alert">
        <span className="service-badge">External AI Chatbot System</span>
        <span>Course Service shares learning context with this external system.</span>
        <span className="architecture-alert__detail">Only the external system shown here is used. No internal chatbot components or dedicated data store are part of the architecture.</span>
      </div>

      <div className="suggestion-row" aria-label="Suggested questions">
        {mockAiSuggestions.map(suggestion => (
          <button type="button" className="suggestion-chip" key={suggestion} onClick={() => setQuery(suggestion)}>
            {suggestion}
          </button>
        ))}
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
                aria-label="Study question"
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
          <span className="service-badge">Course Service context</span>
          <h3 style={{ fontSize: '1rem', margin: '1rem 0 0.5rem' }}>Example prompts</h3>
          <p className="text-sm text-secondary-color">
            The mock assistant recognizes these architecture topics:
          </p>
          <ul className="example-prompt-list">
            <li>Explain gateway rate limiting.</li>
            <li>Describe database-per-service isolation.</li>
            <li>Trace a RabbitMQ payment event.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
