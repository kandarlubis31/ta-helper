import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const AppContext = createContext(null);

export function useToast() {
  const ctx = useContext(AppContext);
  return ctx?.showToast || (() => {});
}

export function useConfirm() {
  const ctx = useContext(AppContext);
  return ctx?.confirmAsync || (() => Promise.resolve(false));
}

let toastId = 0;

export function AppProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const confirmResolveRef = useRef(null);

  // ── Toast ────────────────────────────────────────────────────────

  const showToast = useCallback((text, type = 'success', duration = 3000) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, text, type, exiting: false }]);
    // Start exit animation 300ms before removal
    const exitDelay = Math.max(duration - 350, 100);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    }, exitDelay);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  }, []);

  // ── Confirm Dialog ───────────────────────────────────────────────

  const confirmAsync = useCallback((message) => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmState({ message });
    });
  }, []);

  const handleConfirm = useCallback((result) => {
    if (confirmResolveRef.current) {
      confirmResolveRef.current(result);
      confirmResolveRef.current = null;
    }
    setConfirmState(null);
  }, []);

  return (
    <AppContext.Provider value={{ showToast, confirmAsync }}>
      {children}

      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}${t.exiting ? ' exiting' : ''}`} onClick={() => removeToast(t.id)}>
            <span className="toast-icon">
              {t.type === 'success' && '✓'}
              {t.type === 'error' && '✗'}
              {t.type === 'info' && '→'}
            </span>
            <span className="toast-text">{t.text}</span>
          </div>
        ))}
      </div>

      {/* Confirm Dialog */}
      {confirmState && (
        <div className="confirm-overlay" onClick={() => handleConfirm(false)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon">?</div>
            <p className="confirm-message">{confirmState.message}</p>
            <div className="confirm-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleConfirm(false)}
              >
                batal
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleConfirm(true)}
              >
                ya, hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
}
