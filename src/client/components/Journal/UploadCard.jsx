import React, { useState, useRef } from 'react';
import { useUpload, useDoiFetch } from '../../hooks/useUpload';

function TagInput({ tags, onChange }) {
  const [input, setInput] = useState('');

  const addTag = (tag) => {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed || trimmed.length < 2) return;
    if (tags.includes(trimmed)) return;
    onChange([...tags, trimmed]);
    setInput('');
  };

  const removeTag = (tag) => {
    onChange(tags.filter(t => t !== tag));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div>
      <div className={`tag-inline-row${tags.length > 0 ? ' has-tags' : ''}`}>
        {tags.map(tag => (
          <span key={tag} className="journal-tag journal-tag-editable" onClick={() => removeTag(tag)} title="Klik untuk hapus">
            {tag} ×
          </span>
        ))}
      </div>
      <div className="tag-input-row">
        <input
          className="tag-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addTag(input)}
          placeholder="tag: ml, ai, hci... (Enter untuk tambah)"
        />
      </div>
    </div>
  );
}

function UploadForm({ onSuccess, tagState }) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const { loading, error, success, handleUpload } = useUpload({ onSuccess });

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) handleUpload(files, tagState.tags);
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) handleUpload(files, tagState.tags);
    e.target.value = '';
  };

  return (
    <>
      <div
        className={`upload-zone ${dragOver ? 'dragover' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleFileDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="upload-icon">📤</div>
        <p>{loading ? '⏳ Memproses...' : 'Klik atau drag & drop PDF di sini (bisa banyak)'}</p>
        <p className="text-xs upload-hint">
          Multiple PDF, max 50MB per file
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden-input"
        onChange={handleFileSelect}
      />
      <TagInput tags={tagState.tags} onChange={(tags) => tagState.setTags(tags)} />
      {error && <div className="error-msg">{error}</div>}
      {success && <div className="success-msg" style={{ whiteSpace: 'pre-line' }}>{success}</div>}
    </>
  );
}

function DoiForm({ onSuccess, tagState }) {
  const [doi, setDoi] = useState('');
  const { loading, error, success, handleDoiFetch } = useDoiFetch({ onSuccess });

  const onSubmit = () => {
    handleDoiFetch(doi, tagState.tags).then(() => setDoi(''));
  };

  return (
    <>
      <div className="doi-input-group">
        <input
          type="text"
          value={doi}
          onChange={(e) => setDoi(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          placeholder="10.1016/j.eswa.2021.114456 atau URL doi.org/..."
          disabled={loading}
        />
        <button
          className="btn btn-primary"
          onClick={onSubmit}
          disabled={loading || !doi.trim()}
        >
          {loading ? '⏳' : 'Fetch'}
        </button>
      </div>
      <TagInput tags={tagState.tags} onChange={(tags) => tagState.setTags(tags)} />
      {error && <div className="error-msg">{error}</div>}
      {success && <div className="success-msg">{success}</div>}
    </>
  );
}

export default function UploadCard({ type, title, icon, description, onSuccess, tagState }) {
  return (
    <div className={type === 'upload' ? 'upload-section' : 'doi-section'}>
      <h3>{icon} {title}</h3>
      <p className="upload-desc">{description}</p>
      {type === 'upload'
        ? <UploadForm onSuccess={onSuccess} tagState={tagState} />
        : <DoiForm onSuccess={onSuccess} tagState={tagState} />
      }
    </div>
  );
}
