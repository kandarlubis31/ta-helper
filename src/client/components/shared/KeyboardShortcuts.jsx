import React from 'react';

const SHORTCUTS = [
  { keys: ['Ctrl', 'Enter'], desc: 'Kirim chat' },
  { keys: ['Shift', 'Enter'], desc: 'Baris baru di chat' },
  { keys: ['Escape'], desc: 'Tutup modal / dialog' },
  { keys: ['?'], desc: 'Tampilkan / sembunyikan shortcut' },
  { keys: ['Ctrl', 'K'], desc: 'Fokus ke input chat' },
];

const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform || '');

export default function KeyboardShortcuts({ onClose }) {
  return (
    <div className="shortcuts-overlay" onClick={onClose}>
      <div className="shortcuts-panel" onClick={e => e.stopPropagation()}>
        <div className="shortcuts-panel-header">
          <h3>⌨️ Keyboard Shortcuts</h3>
          <button className="btn-back" onClick={onClose}>✕ tutup</button>
        </div>
        <div className="shortcuts-list">
          {SHORTCUTS.map((shortcut, i) => (
            <div key={i} className="shortcut-row">
              <span className="shortcut-desc">{shortcut.desc}</span>
              <span className="shortcut-keys">
                {shortcut.keys.map((key, j) => (
                  <React.Fragment key={j}>
                    {j > 0 && <span className="shortcut-plus">+</span>}
                    <kbd className={`shortcut-key${key === '?' ? ' accent' : ''}`}>
                      {key === 'Ctrl' ? (isMac ? '⌘' : 'Ctrl') : key}
                    </kbd>
                  </React.Fragment>
                ))}
              </span>
            </div>
          ))}
        </div>
        <p className="shortcuts-footer">
          Tekan <kbd className="shortcut-key accent">?</kbd> kapan saja untuk lihat shortcut ini
        </p>
      </div>
    </div>
  );
}
