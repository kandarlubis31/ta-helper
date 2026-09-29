import React from 'react';
import { useJournals } from '../../hooks/useJournals';
import { useConfirm } from '../../contexts/AppContext';
import JournalToolbar from './JournalToolbar';
import JournalCard from './JournalCard';

export default function JournalList() {
  const confirmAsync = useConfirm();
  const {
    journals, loading, error, selected, deleting,
    toggleSelect, toggleSelectAll, handleDeleteSelected, handleDeleteSingle, clearSelection,
    allTags, activeTag, setActiveTag,
    handleUpdateTags,
  } = useJournals();

  if (loading) return <div className="loading-msg">Memuat jurnal...</div>;
  if (error && journals.length === 0) return <div className="error-msg">{error}</div>;

  return (
    <div className="journal-list">
      <JournalToolbar
        journalCount={journals.length}
        selectedCount={selected.size}
        deleting={deleting}
        onDeleteSelected={() => handleDeleteSelected(confirmAsync)}
        onClearSelection={clearSelection}
        tags={allTags}
        activeTag={activeTag}
        onFilterTag={setActiveTag}
      />

      {error && <div className="error-msg">{error}</div>}

      {journals.length === 0 && !activeTag ? (
        <div className="page-empty">
          <div className="page-empty-icon">📄</div>
          <div className="page-empty-title">Repository kosong</div>
          <div className="page-empty-desc">
            Upload file PDF jurnal atau fetch metadata lewat DOI untuk mulai membangun repository referensi kamu.
          </div>
        </div>
      ) : journals.length === 0 && activeTag ? (
        <div className="page-empty">
          <div className="page-empty-icon">🏷️</div>
          <div className="page-empty-title">Tag "{activeTag}" kosong</div>
          <div className="page-empty-desc">
            Tidak ada jurnal dengan tag <strong>{activeTag}</strong>. Coba filter lain atau upload jurnal baru dengan tag ini.
          </div>
          <button className="btn btn-secondary btn-sm page-empty-action" onClick={() => setActiveTag(null)}>
            ✕ Hapus filter
          </button>
        </div>
      ) : (
        <>
          <div className="journal-select-all">
            <label className="journal-checkbox-label">
              <input
                type="checkbox"
                className="journal-checkbox"
                checked={selected.size === journals.length && journals.length > 0}
                onChange={toggleSelectAll}
              />
              <span>{selected.size === journals.length ? '✕ Clear all' : '☑ All'}</span>
            </label>
          </div>

          {journals.map((j) => (
            <JournalCard
              key={j.id}
              journal={j}
              isSelected={selected.has(j.id)}
              onToggleSelect={toggleSelect}
              onDelete={(id, title) => handleDeleteSingle(id, title, confirmAsync)}
              onUpdateTags={handleUpdateTags}
            />
          ))}
        </>
      )}
    </div>
  );
}
