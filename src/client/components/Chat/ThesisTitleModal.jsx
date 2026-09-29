import React, { useState } from 'react';

export default function ThesisTitleModal({ onConfirm, onSkip }) {
  const [title, setTitle] = useState('');
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    // Animate out before confirming
    onConfirm(trimmed);
  };

  const handleSkipClick = () => {
    if (title.trim()) {
      onConfirm(title.trim());
      return;
    }
    setShowSkipConfirm(true);
  };

  const handleReallySkip = () => {
    onSkip();
  };

  return (
    <div className="thesis-modal-overlay">
      <div className="thesis-modal" onClick={(e) => e.stopPropagation()}>
        <div className="thesis-modal-brand">
          <div className="thesis-modal-avatar">T</div>
          <span className="thesis-modal-wordmark">TARA</span>
        </div>

        <h2 className="thesis-modal-title">Selamat datang di TARA</h2>
        <p className="thesis-modal-desc">
          Asisten riset Tugas Akhir kamu. Tulis judul TA biar TARA bisa ngasih respons yang lebih
          presisi dan kontekstual — makin jelas judulmu, makin cerdas bantuannya.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="thesis-modal-input-group">
            <span className="thesis-modal-prompt">&gt;</span>
            <input
              className="thesis-modal-input"
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setShowSkipConfirm(false); }}
              placeholder="cth: Analisis Sentimen Ulasan Aplikasi menggunakan BERT..."
              autoFocus
              maxLength={200}
            />
          </div>

          <div className="thesis-modal-char-count">
            {title.length}/200
          </div>

          <div className="thesis-modal-actions">
            {showSkipConfirm ? (
              <div className="thesis-modal-skip-confirm">
                <span>Yakin skip? AI bakal kurang kontekstual.</span>
                <div className="thesis-modal-skip-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowSkipConfirm(false)}
                  >
                    batal
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={handleReallySkip}
                  >
                    ya, skip
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="thesis-modal-skip-btn"
                  onClick={handleSkipClick}
                >
                  {title.trim() ? 'lanjut' : 'skip dulu'}
                </button>
                <button
                  type="submit"
                  className="thesis-modal-submit-btn"
                  disabled={!title.trim()}
                >
                  Mulai Konsultasi &rarr;
                </button>
              </>
            )}
          </div>
        </form>

        <div className="thesis-modal-footer">
          <span className="thesis-modal-footer-text">
            bisa diubah nanti di pengaturan &middot; semua keputusan tetap di tangan kamu
          </span>
        </div>
      </div>
    </div>
  );
}
