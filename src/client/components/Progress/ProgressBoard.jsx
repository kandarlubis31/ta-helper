import React from 'react';
import { useProgress, STATUSES } from '../../hooks/useProgress';
import { useConfirm } from '../../contexts/AppContext';
import ProgressColumn from './ProgressColumn';
import ProgressModal from './ProgressModal';
import PageLoadingSkeleton from '../shared/PageLoadingSkeleton';

export default function ProgressBoard({ onTabChange }) {
  const confirmAsync = useConfirm();
  const {
    progress, loading, error, editing, editForm, saving,
    setEditForm, setEditing,
    handleEdit, handleSave, handleAddNew, handleDelete, getChapterLabel,
    isNewItem, dragOver,
    handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop,
    handleMove,
    getStats, aiSummary, summaryLoading, handleAiSummary,
  } = useProgress();

  if (loading) return <PageLoadingSkeleton cardCount={4} />;

  const stats = getStats();

  return (
    <div className="progress-board">
      <div className="page-header">
        <h2>📊 Progres TA</h2>
        <div className="page-header-right">
          <button className="btn btn-primary btn-sm" onClick={handleAddNew}>
            + Tambah
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleAiSummary} disabled={summaryLoading || progress.length === 0}>
            {summaryLoading ? '⏳ Analisis...' : '🤖 Analisis AI'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => onTabChange('citations')}>
            📝 Daftar Pustaka
          </button>
        </div>
      </div>

      {/* Dashboard Stats */}
      {progress.length > 0 && (
        <div className="progress-dashboard">
          <div className="progress-dash-stat">
            <span className="progress-dash-value">{stats.pct}%</span>
            <span className="progress-dash-label">selesai</span>
          </div>
          <div className="progress-dash-bar">
            <div className="progress-dash-fill" style={{ width: `${stats.pct}%` }} />
          </div>
          <div className="progress-dash-stat">
            <span className="progress-dash-value">{stats.done}</span>
            <span className="progress-dash-label">● selesai</span>
          </div>
          <div className="progress-dash-stat">
            <span className="progress-dash-value">{stats.inProgress}</span>
            <span className="progress-dash-label">◑ proses</span>
          </div>
          <div className="progress-dash-stat">
            <span className="progress-dash-value">{stats.notStarted}</span>
            <span className="progress-dash-label">○ belum</span>
          </div>
        </div>
      )}

      {/* AI Summary Panel */}
      {aiSummary && (
        <div className="progress-ai-summary">
          <div className="progress-ai-summary-header">
            <span>🤖 Analisis AI</span>
            <button className="btn-icon" onClick={() => handleAiSummary()} disabled={summaryLoading} title="Refresh analisis">
              ↻
            </button>
          </div>
          <div
            className="progress-ai-summary-body"
            dangerouslySetInnerHTML={{ __html: formatAiSummary(aiSummary) }}
          />
        </div>
      )}

      {error && <div className="error-msg">{error}</div>}

      <div className="progress-columns">
        {STATUSES.map((status) => (
          <ProgressColumn
            key={status.id}
            status={status}
            items={progress.filter(p => p.status === status.id)}
            onEdit={handleEdit}
            onDelete={(item, e) => handleDelete(item, e, confirmAsync)}
            onMove={handleMove}
            isDragOver={dragOver === status.id}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, status.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status.id)}
          />
        ))}
      </div>

      {editing && (
        <ProgressModal
          editing={editing}
          editForm={editForm}
          saving={saving}
          isNew={isNewItem}
          onClose={() => setEditing(null)}
          onChange={setEditForm}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// Simple text→HTML for AI summary (paragraphs only)
function formatAiSummary(text) {
  if (!text) return '';
  const normalized = text.replace(/\r\n/g, '\n');
  return normalized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br />')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/((?:<li>.*<\/li>[\r\n]?)+)/g, '<ul>$1</ul>')
    .replace(/^(?!<)/, '<p>')
    + '</p>';
}
