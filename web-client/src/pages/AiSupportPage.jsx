import React, { useState } from 'react';

export default function AiSupportPage() {
  const [query, setQuery] = useState('');
  const [messages] = useState([]);
  const [isTyping] = useState(false);
  const [notice, setNotice] = useState('');
  const activeContext = null;
  const suggestions = [];

  const handleSend = (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setNotice('Open an enrolled lesson to ask AI about its learning content.');
    setQuery('');
  };

  return (
    <div className="ai-support-page">
      <header className="ai-identity">
        <div className="ai-identity__mark" aria-hidden="true">AI</div>
        <div className="ai-identity__copy">
          <p className="page-kicker">Learning assistance</p>
          <h2 className="page-title">Study assistant</h2>
          <p className="page-description">
            Ask a focused question using the context from your current lesson.
          </p>
        </div>
        <div className="ai-identity__status">
          <span className="status-badge status-badge--success"><i aria-hidden="true" />Available</span>
          <span>Study support</span>
        </div>
      </header>

      <section className="ai-suggestions" aria-labelledby="suggested-prompts-title">
        <div className="ai-suggestions__heading">
          <h3 id="suggested-prompts-title">Suggested prompts</h3>
          <span>Use the current lesson context</span>
        </div>
        <div className="suggestion-row">
          {suggestions.map(suggestion => (
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
            aria-label="Conversation with the study assistant"
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
                placeholder="Ask about this lesson or a difficult concept..."
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
              AI questions are available from an unlocked lesson.
            </p>
            {notice && <p className="form-alert form-alert--warning" role="status">{notice}</p>}
          </form>
        </section>

        <aside className="ai-context-sidebar" aria-label="Current study context">
          <section className="card ai-context-card" aria-labelledby="source-context-title">
            <div className="ai-context-card__heading">
              <span className="service-badge">Source context</span>
              <span>Current lesson</span>
            </div>
            <h3 id="source-context-title">Current lesson context</h3>
            <p>{activeContext?.context_text || 'No lesson context is currently available.'}</p>
            <dl className="ai-context-list">
              <div>
                <dt>Course</dt>
                <dd>Current course / #{activeContext?.course_id || 201}</dd>
              </div>
              <div>
                <dt>Lesson</dt>
                <dd>Current lesson / #{activeContext?.lesson_id || 302}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>Your learning activity</dd>
              </div>
            </dl>
          </section>

        </aside>
      </div>
    </div>
  );
}
