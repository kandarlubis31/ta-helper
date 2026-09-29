import React, { useState, useRef, useEffect } from 'react';
import { parseTags } from '../../utils/tagUtils';
import { useToast } from '../../contexts/AppContext';

function parseAuthors(authors) {
  try {
    const parsed = typeof authors === 'string' ? JSON.parse(authors) : authors;
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(a => a.family || a.given || '').filter(Boolean).join(', ').substring(0, 60);
    }
  } catch { /* ignore */ }
  return null;
}

export default function JournalCard({ journal, isSelected, onToggleSelect, onDelete, onUpdateTags }) {
  const showToast = useToast();
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const [tags, setTags] = useState(() => parseTags(journal.tags));
  const inputRef = useRef(null);
  const blurTimerRef = useRef(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, []);

  const originalTags = parseTags(journal.tags);

  const startEdit = () => {
    setTags(originalTags);
    setInput('');
    cancelRef.current = false;
    setEditing(true);
  };

  const addTag = (tag) => {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed || trimmed.length < 2) return;
    if (tags.includes(trimmed)) return;
    setTags(prev => [...prev, trimmed]);
    setInput('');
  };

  const removeTag = (tag) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === 'Escape') {
      cancel();
    }
  };

  const doSave = async (currentTags) => {
    const same = currentTags.length === originalTags.length &&
      currentTags.every((t, i) => t === originalTags[i]);
    if (same) return;

    try {
      await onUpdateTags(journal.id, currentTags);
      showToast('Tag diperbarui', 'success');
    } catch {
      setTags(originalTags);
      showToast('Gagal memperbarui tag', 'error');
    }
  };

  const save = () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    cancelRef.current = false;
    // Flush any pending input text before saving
    const currentTags = input.trim()
      ? [...tags, input.trim().toLowerCase()]
      : [...tags];
    setTags(currentTags);
    setInput('');
    setEditing(false);
    doSave(currentTags);
  };

  const cancel = () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    cancelRef.current = true;
    setEditing(false);
    setTags(originalTags);
    setInput('');
  };

  const handleBlur = () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    blurTimerRef.current = setTimeout(() => {
      if (cancelRef.current) return;
      if (editing) {
        save();
      }
    }, 200);
  };

  const handleFocus = () => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
  };

  return (
    <div className={`journal-card ${isSelected ? 'selected' : ''}`}>
      <div className="journal-card-header">
        <label className="journal-checkbox-label" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            className="journal-checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(journal.id)}
          />
        </label>
        <div className="journal-card-body">
          <div className="journal-card-title">{journal.title}</div>
          <div className="journal-card-meta">
            {journal.authors && <span>✍️ {parseAuthors(journal.authors)}</span>}
            {journal.year && <span>📅 {journal.year}</span>}
            {journal.doi && <span>🔗 {journal.doi}</span>}
          </div>
          {editing ? (
            <div className="journal-tags-editor" onBlur={handleBlur} onFocus={handleFocus}>
              <div className="journal-tags">
                {tags.map(tag => (
                  <span key={tag} className="journal-tag journal-tag-editable" onClick={() => removeTag(tag)} title="Klik untuk hapus">
                    {tag} ×
                  </span>
                ))}
                <input
                  ref={inputRef}
                  className="journal-tag-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={tags.length === 0 ? 'ketik tag, Enter...' : 'tambah tag...'}
                  size={Math.max(input.length || 10, 10)}
                />
              </div>
              <div className="journal-tags-actions">
                <button className="btn btn-xs" onClick={save}>simpan</button>
                <button className="btn btn-xs btn-secondary" onClick={cancel}>batal</button>
              </div>
            </div>
          ) : (
            <div className="journal-tags" onClick={startEdit}>
              {tags.length > 0 ? tags.map(tag => (
                <span key={tag} className="journal-tag">{tag}</span>
              )) : (
                <span className="journal-tag journal-tag-add" title="Klik untuk tambah tag">+ tambah tag</span>
              )}
            </div>
          )}
        </div>
        <div className="journal-card-actions">
          <span className={`journal-badge-source ${journal.source}`}>
            {journal.source === 'upload' ? 'PDF' : 'DOI'}
          </span>
          <button
            className="btn-icon"
            onClick={() => onDelete(journal.id, journal.title)}
            title="Hapus jurnal"
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  );
}
