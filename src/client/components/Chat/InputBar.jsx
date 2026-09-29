import React, { useState, useRef, useEffect } from 'react';

export default function InputBar({ onSend, disabled, isStreaming }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 300) + 'px';
  };

  const handleClearText = () => {
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    autoResize();
  };

  const hasText = text.trim().length > 0;
  const charCount = text.length;
  const showCharCount = charCount > 500;

  return (
    <div className="chat-input-line">
      <span className={`chat-input-caret ${disabled ? 'disabled' : ''}`}>›</span>
      <textarea
        ref={textareaRef}
        className="chat-input-field"
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Ketik pesan untuk TARA..."
        disabled={disabled}
        rows={1}
        autoFocus
      />
      {showCharCount && (
        <span className="chat-input-charcount">{charCount}</span>
      )}
      <button
        className={`chat-input-send-btn ${hasText ? 'active' : ''} ${isStreaming ? 'sending' : ''}`}
        onClick={handleSend}
        disabled={disabled || !hasText}
        title="Kirim pesan"
        aria-label="Kirim"
      >
        <span className={`send-arrow-wrap ${hasText ? 'right' : 'left'}`}>
          <span className="send-arrow-icon">
            {isStreaming ? (
              <span className="send-stop-icon">■</span>
            ) : (
              <span className="send-arrow-icon-inner">{hasText ? '→' : '←'}</span>
            )}
          </span>
        </span>
      </button>
      <button
        className="chat-input-clear-btn"
        onClick={handleClearText}
        disabled={disabled || !text.trim()}
        title="Hapus teks"
        aria-label="Hapus teks"
      >
        ✕
      </button>
    </div>
  );
}
