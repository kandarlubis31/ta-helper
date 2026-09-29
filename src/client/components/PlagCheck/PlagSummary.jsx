import React from 'react';

export default function PlagSummary({ result, getScoreColor }) {
  return (
    <div className="plag-summary">
      <div className="plag-score-card">
        <div className={`plag-score ${getScoreColor(result.overallScore)}`}>
          {result.overallScore}%
        </div>
        <div className="plag-score-label">Overall Similarity</div>
      </div>
      <div className="plag-score-card">
        <div className="plag-stats">
          <div className="plag-stat">
            <div className="plag-stat-value tinggi">{result.summary?.tinggi || 0}</div>
            <div className="plag-stat-label">Tinggi (&gt;85%)</div>
          </div>
          <div className="plag-stat">
            <div className="plag-stat-value sedang">{result.summary?.sedang || 0}</div>
            <div className="plag-stat-label">Sedang (70-85%)</div>
          </div>
          <div className="plag-stat">
            <div className="plag-stat-value aman">{result.summary?.aman || 0}</div>
            <div className="plag-stat-label">Aman (&lt;70%)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
