import React from 'react';

const QUICK_ACTIONS = [
  'Tulis paragraf latar belakang',
  'Cari jurnal tentang machine learning',
  'Cek plagiarisme teks saya',
  'Lihat progres TA',
  'Generate daftar pustaka',
];

export default function ChatEmpty({ onSend, disabled, thesisTitle }) {
  return (
    <div className="chat-empty">
      <div className="chat-empty-avatar">T</div>
      <div className="chat-empty-wordmark">TARA</div>
      <div className="chat-empty-subtitle">Tugas Akhir Research Assistant</div>
      <p className="chat-empty-tagline">
        &ldquo;AI adalah alatmu, bukan penulismu. Lo yang riset, lo yang putuskan, lo yang lulus.&rdquo;
      </p>

      {thesisTitle ? (
        <div className="chat-empty-context">
          <span className="chat-empty-context-label">Topik TA</span>
          <span className="chat-empty-context-title">{thesisTitle}</span>
        </div>
      ) : (
        <p className="chat-empty-desc">
          Asisten riset Tugas Akhir kamu. Aku bisa bantu nulis draft, cari referensi dari jurnal yang
          kamu upload, cek kemiripan teks, dan pantau progres TA kamu.
          <span className="note">&mdash; Aku alat bantu, bukan penulis. Semua keputusan tetap di tangan kamu.</span>
        </p>
      )}

      <div className="chat-empty-actions">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action}
            className="chat-empty-action"
            onClick={() => onSend(action)}
            disabled={disabled}
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}
