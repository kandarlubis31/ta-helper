import React from 'react';

export default function PlagSentenceList({ results }) {
  if (results.length === 0) return null;

  return (
    <>
      <h3 className="plag-section-title">Per Kalimat</h3>

      {results.map((r) => (
        <div key={r.sentenceIndex} className={`plag-sentence ${r.status}`}>
          <div className="plag-sentence-text">{r.sentence}</div>
          <div className="plag-sentence-meta">
            <span>{Math.round(r.score * 100)}% similarity</span>
            <span>•</span>
            <span>{r.status === 'tinggi' ? '🔴 Bahaya' : r.status === 'sedang' ? '🟡 Perhatian' : '🟢 Aman'}</span>
          </div>
          {r.journalTitle && (
            <div className="plag-sentence-match">
              📚 Mirip dengan: <strong>{r.journalTitle}</strong>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
