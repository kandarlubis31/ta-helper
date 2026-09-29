import React from 'react';

export default function ThinkingIndicator() {
  return (
    <div className="thinking-indicator">
      <div className="message-header">
        <span className="message-pilcrow">{'\u00b6'}</span>
        <span className="message-label">tara</span>
        <span className="thinking-dots-inline">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
        </span>
      </div>
      <div className="thinking-status">
        <span className="thinking-status-text">berfikir</span>
        <span className="thinking-status-dot">.</span>
        <span className="thinking-status-dot">.</span>
        <span className="thinking-status-dot">.</span>
      </div>
    </div>
  );
}
