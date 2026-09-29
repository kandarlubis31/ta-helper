import React, { useState, useEffect, useRef } from 'react';

export default function ScrollToBottom({ visible, onClick }) {
  const [appear, setAppear] = useState(false);
  const prevVisible = useRef(visible);

  useEffect(() => {
    if (visible && !prevVisible.current) {
      setAppear(true);
      const t = setTimeout(() => setAppear(false), 500);
      return () => clearTimeout(t);
    }
    prevVisible.current = visible;
  }, [visible]);

  return (
    <button
      className={`scroll-to-bottom${visible ? ' visible' : ''}${appear ? ' appear' : ''}`}
      onClick={onClick}
      title="Scroll ke bawah"
      aria-label="Scroll ke bawah"
    >
      ↓
    </button>
  );
}
