import React from 'react';
import { STATUSES, CHAPTER_LABELS } from '../../hooks/useProgress';

const ALL_CHAPTERS = ['bab1','bab2','bab3','bab4','bab5','bab6','bab7','bab8','bab9','bab10'];

export default function ProgressModal({ editing, editForm, saving, isNew, onClose, onChange, onSave }) {
  const chapterLabel = CHAPTER_LABELS[editForm.chapter] || editForm.chapter;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isNew ? '+ Tambah Item Baru' : `Edit ${CHAPTER_LABELS[editing.chapter] || editing.chapter}`}</h3>

        {isNew && (
          <>
            <label>Bab</label>
            <select
              value={editForm.chapter}
              onChange={(e) => onChange({ ...editForm, chapter: e.target.value })}
            >
              {ALL_CHAPTERS.map(ch => (
                <option key={ch} value={ch}>{CHAPTER_LABELS[ch] || ch}</option>
              ))}
            </select>
          </>
        )}

        <label>Judul</label>
        <input
          type="text"
          value={editForm.title}
          onChange={(e) => onChange({ ...editForm, title: e.target.value })}
          placeholder={`Judul ${chapterLabel}`}
          autoFocus
        />

        <label>Status</label>
        <select
          value={editForm.status}
          onChange={(e) => onChange({ ...editForm, status: e.target.value })}
        >
          {STATUSES.map(s => (
            <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
          ))}
        </select>

        <label>Catatan</label>
        <textarea
          value={editForm.notes}
          onChange={(e) => onChange({ ...editForm, notes: e.target.value })}
          placeholder="Catatan tambahan (opsional)..."
        />

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Batal
          </button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving || !editForm.title.trim()}>
            {saving ? '⏳ Menyimpan...' : isNew ? '+ Tambah' : '💾 Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}
