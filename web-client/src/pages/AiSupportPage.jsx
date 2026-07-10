import React, { useState } from 'react';
import { mockAiBotResponses, mockAiLearningContexts, mockAiSuggestions } from '../data/mockData';
import ArchitectureFlow from '../components/ArchitectureFlow';

export default function AiSupportPage() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    { sender: 'bot', text: "Welcome. Ask a study question about API gateways, data isolation, or RabbitMQ." }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const activeContext = mockAiLearningContexts[0];

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

  return (
    <div className="ai-support-page">
      <header className="ai-identity">
        <div className="ai-identity__mark" aria-hidden="true">AI</div>
        <div className="ai-identity__copy">
          <p className="page-kicker">External learning assistance</p>
          <h2 className="page-title">Architecture study assistant</h2>
          <p className="page-description">
            Ask a focused question using the context from your current microservices lesson.
          </p>
        </div>
        <div className="ai-identity__status">
          <span className="status-badge status-badge--success"><i aria-hidden="true" />Available</span>
          <span>Mock response mode</span>
        </div>
      </header>

      <div className="architecture-alert">
        <span className="service-badge">External AI Chatbot System</span>
        <span>Course Service shares learning context with this external system.</span>
        <span className="architecture-alert__detail">No Chatbot Service or Chatbot DB exists.</span>
      </div>

      <ArchitectureFlow
        label="Context handoff"
        ariaLabel="Study context flows from Web Client through API Gateway and Course Service to the External AI Chatbot System"
        steps={['Web Client', 'API Gateway', 'Course Service', 'External AI Chatbot System']}
        compact
      />

      <section className="ai-suggestions" aria-labelledby="suggested-prompts-title">
        <div className="ai-suggestions__heading">
          <h3 id="suggested-prompts-title">Suggested prompts</h3>
          <span>Use the current lesson context</span>
        </div>
        <div className="suggestion-row">
          {mockAiSuggestions.map(suggestion => (
            <button
              type="button"
              className="suggestion-chip"
              key={suggestion}
              onClick={() => setQuery(suggestion)}
              disabled={isTyping}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </section>

      <div className="ai-workspace">
        <section className="chat-shell" aria-labelledby="chat-title">
          <header className="chat-shell__header">
            <div>
              <span className="chat-shell__eyebrow">External assistant</span>
              <h3 id="chat-title">Study conversation</h3>
            </div>
            <span className="service-badge">Course-aware context</span>
          </header>

          <div
            className="chat-log"
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            aria-busy={isTyping}
            aria-label="Conversation with the architecture study assistant"
          >
            {messages.length === 0 ? (
              <div className="chat-empty-state" role="status">
                <strong>Start a study conversation</strong>
                <p>Choose a suggested prompt or ask about the current lesson.</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <article
                  className={`chat-message chat-message--${message.sender}`}
                  key={`${message.sender}-${index}`}
                  aria-label={`${message.sender === 'bot' ? 'Study assistant' : 'You'} said`}
                >
                  <span className="chat-message__author">
                    {message.sender === 'bot' ? 'Study assistant' : 'You'}
                  </span>
                  <p>{message.text}</p>
                </article>
              ))
            )}

            {isTyping && (
              <div className="chat-message chat-message--bot chat-message--typing" role="status">
                <span className="chat-message__author">Study assistant</span>
                <div className="typing-indicator">
                  <span>Preparing a response</span>
                  <i aria-hidden="true" />
                  <i aria-hidden="true" />
                  <i aria-hidden="true" />
                </div>
              </div>
            )}
          </div>

          <form className="chat-composer" onSubmit={handleSend}>
            <label htmlFor="study-question">Ask a study question</label>
            <div className="chat-composer__row">
              <input
                id="study-question"
                type="text"
                className="form-control"
                placeholder="Ask about gateway, isolation, or RabbitMQ..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isTyping}
                aria-describedby="study-question-helper"
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isTyping || !query.trim()}
              >
                {isTyping ? 'Waiting...' : 'Send question'}
              </button>
            </div>
            <p className="field-helper" id="study-question-helper">
              Responses are selected from local mock topics and do not call a live AI model.
            </p>
          </form>
        </section>

        <aside className="ai-context-sidebar" aria-label="Study source and system context">
          <section className="card ai-context-card" aria-labelledby="source-context-title">
            <div className="ai-context-card__heading">
              <span className="service-badge">Source context</span>
              <span>Course Service</span>
            </div>
            <h3 id="source-context-title">Current lesson context</h3>
            <p>{activeContext?.context_text || 'No lesson context is currently available.'}</p>
            <dl className="ai-context-list">
              <div>
                <dt>Course</dt>
                <dd>Introduction to Microservices / #{activeContext?.course_id || 201}</dd>
              </div>
              <div>
                <dt>Lesson</dt>
                <dd>Implementing API Gateways / #{activeContext?.lesson_id || 302}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>Course DB learning context</dd>
              </div>
            </dl>
          </section>

          <section className="card ai-boundary-card" aria-labelledby="ai-boundary-title">
            <span className="status-badge status-badge--neutral"><i aria-hidden="true" />External</span>
            <h3 id="ai-boundary-title">System boundary</h3>
            <p>The assistant shown here represents an External AI Chatbot System.</p>
            <ul className="ai-boundary-list">
              <li>No Chatbot Service</li>
              <li>No Chatbot DB</li>
              <li>No persistent conversation storage</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
