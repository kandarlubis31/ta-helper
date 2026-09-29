import React from 'react';
import { CHAPTER_LABELS, STATUSES } from '../../hooks/useProgress';

export default function ProgressColumn({
  status, items, onEdit, onDelete, onMove,
  isDragOver, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
}) {
  return (
    <div
      className={`progress-column ${status.id}${isDragOver ? ' drag-over' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="progress-column-header">
        <span>{status.icon} {status.label}</span>
        <span className="progress-column-count">{items.length}</span>
      </div>
      <div className="progress-column-body">
        {items.map((item) => (
          <div
            key={item.chapter}
            className="progress-card"
            draggable
            onClick={() => onEdit(item)}
            onDragStart={(e) => onDragStart(e, item.chapter)}
            onDragEnd={onDragEnd}
          >
            <span className="progress-card-grip">⋮⋮</span>
            <div className="progress-card-content">
              <h4>{CHAPTER_LABELS[item.chapter] || item.chapter}: {item.title || '—'}</h4>
              {item.notes && <p>{item.notes.substring(0, 80)}{item.notes.length > 80 ? '…' : ''}</p>}
              <div className="progress-card-meta">
                {new Date(item.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
              </div>
              <div className="progress-card-move">
                {STATUSES.filter(s => s.id !== item.status).map(s => (
                  <button
                    key={s.id}
                    className="progress-move-btn"
                    onClick={(e) => { e.stopPropagation(); onMove(item.chapter, s.id); }}
                    title={`Pindah ke ${s.label}`}
                  >
                    {s.id === 'selesai' ? '✓' : s.id === 'draft' ? '→' : s.id === 'revisi' ? '↻' : '○'}
                    {' '}{s.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              className="progress-card-delete"
              onClick={(e) => onDelete(item, e)}
              title="Hapus item"
              aria-label="Hapus"
            >
              ×
            </button>
          </div>
        ))}
        {items.length === 0 && !isDragOver && (
          <div className="progress-column-empty">
            Seret kartu ke sini
          </div>
        )}
        {items.length === 0 && isDragOver && (
          <div className="progress-column-drop-hint">
            ↓ Lepas di sini
          </div>
        )}
      </div>
    </div>
  );
}
