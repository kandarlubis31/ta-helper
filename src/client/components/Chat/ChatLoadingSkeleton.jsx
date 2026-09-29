import React from 'react';

// ── Skeleton placeholder while chat history loads ──────────────────
export default function ChatLoadingSkeleton() {
  // Generate 3 fake message skeletons
  const skeletons = [
    { role: 'user', lines: 1 },
    { role: 'assistant', lines: 4 },
    { role: 'assistant', lines: 2 },
  ];

  // Deterministic widths — no flicker on re-render
  const lineWidths = [
    [82],          // user: 1 line
    [92, 75, 88, 55],  // assistant #1: 4 lines
    [68, 45],      // assistant #2: 2 lines
  ];

  return (
    <>
      {skeletons.map((skel, i) => (
        <div key={i} className={`message skeleton ${skel.role}`}>
          <div className="message-header">
            <span className="skeleton-bar skeleton-label" />
          </div>
          <div className="message-body">
            {Array.from({ length: skel.lines }, (_, j) => (
              <span
                key={j}
                className="skeleton-bar skeleton-line"
                style={{ width: `${lineWidths[i][j]}%` }}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
