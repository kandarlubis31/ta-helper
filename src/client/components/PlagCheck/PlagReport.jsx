import React, { useCallback } from 'react';
import { usePlagCheck } from '../../hooks/usePlagCheck';
import { useToast } from '../../contexts/AppContext';
import PlagSummary from './PlagSummary';
import PlagSentenceList from './PlagSentenceList';

export default function PlagReport() {
  const { text, setText, result, loading, error, handleCheck, getScoreColor } = usePlagCheck();
  const showToast = useToast();

  const handleCopy = useCallback(async () => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast('Teks disalin', 'success');
    } catch {
      // Fallback for older browsers
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Teks disalin', 'success');
      } catch {
        showToast('Gagal menyalin teks', 'error');
      }
    }
  }, [text, showToast]);

  const handleClear = useCallback(() => {
    setText('');
  }, [setText]);

  return (
    <div className="plag-report">
      <div className="page-header">
        <h2>🔍 Cek Plagiarisme</h2>
        <span className="page-subtitle">
          Cek kemiripan teks dengan koleksi jurnal di repository
        </span>
      </div>

      <div className="plag-input">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste teks yang ingin dicek plagiarismenya di sini..."
          disabled={loading}
        />
        <div className="plag-actions">
          <div className="plag-counter">
            <span className="plag-counter-item">
              {text.length.toLocaleString()} karakter
            </span>
            <span className="plag-counter-sep">/</span>
            <span className="plag-counter-item">
              {text.trim() ? text.trim().split(/\s+/).length : 0} kata
            </span>
            <span className="plag-counter-sep">/</span>
            <span className="plag-counter-item">
              {text.trim().split(/[.!?]+/).filter(s => s.trim().length > 0).length} kalimat
            </span>
          </div>
          <div className="plag-actions-right">
            <button
              className="btn btn-sm btn-secondary plag-action-btn"
              onClick={handleCopy}
              disabled={!text.trim()}
              title="Salin teks"
            >
              📋 Salin
            </button>
            <button
              className="btn btn-sm btn-secondary plag-action-btn"
              onClick={handleClear}
              disabled={!text.trim()}
              title="Hapus teks"
            >
              ✕ Hapus
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCheck}
              disabled={loading || text.trim().length < 20}
            >
              {loading ? '⏳ Mengecek...' : '🔍 Cek Plagiarisme'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {!result && !loading && !error && (
        <div className="page-empty plag-empty-wrap">
          <div className="page-empty-icon">🔎</div>
          <div className="page-empty-title">Belum ada hasil</div>
          <div className="page-empty-desc">
            Paste atau tulis teks minimal 20 karakter, lalu klik <strong>Cek Plagiarisme</strong> untuk membandingkan dengan jurnal di repository kamu.
          </div>
        </div>
      )}

      {result && (
        <div className="plag-results">
          {result.message && !result.results?.length && (
            <div className="empty-state plag-result-msg">{result.message}</div>
          )}

          <PlagSummary result={result} getScoreColor={getScoreColor} />

          <PlagSentenceList results={result.results} />

          {result.results.length === 0 && !result.message && (
            <div className="empty-state">
              Tidak ada kalimat terdeteksi. Pastikan teks diakhiri tanda baca (. ! ?).
            </div>
          )}
        </div>
      )}
    </div>
  );
}
