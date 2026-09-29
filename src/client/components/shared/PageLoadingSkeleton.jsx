import React from 'react';

// ── Reusable page-level loading skeleton ──────────────────────────
// Props: cardCount — how many card skeletons to render (default 3)
export default function PageLoadingSkeleton({ cardCount = 3 }) {
  return (
    <div className="page-skeleton">
      {/* Page header skeleton */}
      <div className="page-skeleton-header">
        <span className="skeleton-bar skeleton-header-title" />
        <span className="skeleton-bar skeleton-header-action" />
      </div>

      {/* Card skeletons */}
      {Array.from({ length: cardCount }, (_, i) => (
        <div key={i} className="page-skeleton-card">
          <span className="skeleton-bar skeleton-card-line" style={{ width: `${85 - i * 8}%` }} />
          <span className="skeleton-bar skeleton-card-line" style={{ width: `${60 + i * 5}%` }} />
          {i === 0 && <span className="skeleton-bar skeleton-card-line" style={{ width: '45%' }} />}
        </div>
      ))}

      {/* Subtle footer skeleton */}
      <div className="page-skeleton-footer">
        <span className="skeleton-bar skeleton-footer-dot" />
        <span className="skeleton-bar skeleton-footer-dot" />
        <span className="skeleton-bar skeleton-footer-dot" />
      </div>
    </div>
  );
}
