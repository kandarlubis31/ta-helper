import React, { useEffect, useState, useRef } from 'react';

export default function SettingsToast({ message, onDismiss }) {
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef(null);
  const animRef = useRef(null);
  const dismissRef = useRef(null);
  const msgText = message?.text;

  useEffect(() => {
    if (!msgText) return;
    setExiting(false);
    setProgress(100);

    // Animate progress bar over 4s
    const duration = 4000;
    const start = Date.now();
    animRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
    }, 30);

    // Auto-dismiss after duration
    timerRef.current = setTimeout(() => {
      setExiting(true);
      clearInterval(animRef.current);
      dismissRef.current = setTimeout(() => {
        if (onDismiss) onDismiss();
      }, 250);
    }, duration);

    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(dismissRef.current);
      clearInterval(animRef.current);
    };
  }, [msgText, onDismiss]);

  if (!message?.text) return null;

  const type = message.type || 'info';
  const icons = { success: '✓', error: '✗', info: '→' };
  const icon = icons[type] || '→';

  return (
    <div className={`settings-toast ${type}${exiting ? ' exiting' : ''}`}>
      <span className="settings-toast-icon">{icon}</span>
      <span className="settings-toast-text">{message.text}</span>
      <div className="settings-toast-progress" style={{ width: `${progress}%` }} />
    </div>
  );
}
