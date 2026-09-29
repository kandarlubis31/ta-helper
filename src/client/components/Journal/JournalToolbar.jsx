import React from 'react';

export default function JournalToolbar({ journalCount, selectedCount, deleting, onDeleteSelected, onClearSelection, tags, activeTag, onFilterTag }) {
  const allTags = [...tags].sort();
  const showFilter = allTags.length > 0;

  return (
    <>
      {showFilter && (
        <div className="journal-filter-bar">
          <span className="journal-filter-label">Filter:</span>
          <button
            className={`journal-filter-chip clear${!activeTag ? ' active' : ''}`}
            onClick={() => onFilterTag(null)}
          >
            semua
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              className={`journal-filter-chip${activeTag === tag ? ' active' : ''}`}
              onClick={() => onFilterTag(tag === activeTag ? null : tag)}
            >
              {tag}
            </button>
          ))}
          <span className="journal-filter-count">{journalCount} jurnal</span>
        </div>
      )}
      <div className="journal-list-toolbar">
        <span className="text-sm">
          {!showFilter && <>{journalCount} jurnal</>}
          {selectedCount > 0 && ` · ${selectedCount} terpilih`}
        </span>
        <div className="journal-toolbar-actions">
          {selectedCount > 0 && (
            <>
              <button
                className="btn btn-danger btn-sm"
                onClick={onDeleteSelected}
                disabled={deleting}
              >
                {deleting ? '⏳' : '🗑'} Hapus ({selectedCount})
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={onClearSelection}
              >
                ✕ Batal
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
