import React, { useCallback } from 'react';
import { useCitations } from '../../hooks/useCitations';
import { useToast } from '../../contexts/AppContext';

export default function CitationGenerator({ onBack }) {
  const {
    format, setFormat,
    result, loading, error,
    handleGenerate, handleReset,
  } = useCitations();
  const showToast = useToast();

  const handleCopy = useCallback(async () => {
    if (!result) return;
    const text = result.entries.map(e => e.citation).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      showToast('Sitasi disalin', 'success');
    } catch {
      showToast('Gagal menyalin', 'error');
    }
  }, [result, showToast]);

  return (
    <div className="citation-page">
      <div className="page-header">
        <button className="btn-back" onClick={onBack}>← Kembali</button>
        <h2>📝 Daftar Pustaka</h2>
        <div className="citation-header-actions">
          {result && (
            <button className="btn btn-sm btn-secondary" onClick={handleReset} title="Reset">
              ✕ Reset
            </button>
          )}
        </div>
      </div>

      <div className="citation-controls">
        <div className="format-selector">
          <button
            className={`format-btn ${format === 'apa' ? 'active' : ''}`}
            onClick={() => setFormat('apa')}
          >
            APA 7th
          </button>
          <button
            className={`format-btn ${format === 'ieee' ? 'active' : ''}`}
            onClick={() => setFormat('ieee')}
          >
            IEEE
          </button>
        </div>
        <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
          {loading ? '⏳ Generating...' : 'Generate'}
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {!result && !loading && !error && (
        <div className="page-empty">
          <div className="page-empty-icon">📝</div>
          <div className="page-empty-title">Generate sitasi</div>
          <div className="page-empty-desc">
            Pilih format (APA 7th atau IEEE), lalu klik <strong>Generate</strong> untuk membuat daftar pustaka otomatis dari semua jurnal di repository kamu.
          </div>
        </div>
      )}

      {result && (
        <div className="citation-result">
          <div className="citation-meta">
            <span>Format: {result.format}</span>
            <span>{result.count} referensi</span>
            <button className="btn btn-secondary" onClick={handleCopy}>📋 Copy Semua</button>
          </div>
          <div className="citation-list">
            {result.entries.map((entry) => (
              <div key={entry.id} className="citation-entry">
                <div className="citation-text">{entry.citation}</div>
              </div>
            ))}
          </div>
          {result.count === 0 && (
            <div className="page-empty">
              <div className="page-empty-icon">📭</div>
              <div className="page-empty-title">Belum ada jurnal</div>
              <div className="page-empty-desc">
                Upload jurnal dulu di tab 📚 Jurnal sebelum generate daftar pustaka.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
