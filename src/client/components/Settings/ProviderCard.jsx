import React from 'react';

export default function ProviderCard({
  provider,
  hasKey,
  keyInput,
  showKey,
  saving,
  testing,
  testResult,
  keyPreview,
  onKeyChange,
  onToggleShowKey,
  onSave,
  onRemove,
  onTest,
  onClearTest,
}) {
  const placeholder = hasKey && keyPreview
    ? `${keyPreview} (tersimpan)`
    : hasKey
    ? '•••••••• (tersimpan)'
    : `Masukkan ${provider.label} API key...`;

  return (
    <div className="settings-section provider-card-section">
      <div className="provider-card-header">
        <span className="provider-card-icon">{provider.icon}</span>
        <div style={{ flex: 1 }}>
          <h3>{provider.label}</h3>
          <p>{provider.desc}</p>
        </div>
        {hasKey && <span className="status-dot active" title="Terkonfigurasi" />}
      </div>

      <div className="provider-card-body">
        <div className="key-input-group">
          <input
            type={showKey ? 'text' : 'password'}
            className="key-input"
            placeholder={placeholder}
            value={keyInput}
            onChange={(e) => { onKeyChange(e.target.value); if (onClearTest) onClearTest(); }}
            onKeyDown={(e) => e.key === 'Enter' && onSave()}
          />
          <button
            className="btn-key-toggle"
            onClick={onToggleShowKey}
            title={showKey ? 'Sembunyikan' : 'Lihat'}
          >
            {showKey ? '🙈' : '👁️'}
          </button>
        </div>

        {testResult && (
          <div className={`provider-test-result ${testResult.valid ? 'success' : 'error'}`}>
            <span className="provider-test-icon">{testResult.valid ? '✅' : '❌'}</span>
            <span className="provider-test-text">
              {testResult.valid ? 'Koneksi berhasil! Key valid.' : testResult.error || 'Key tidak valid.'}
            </span>
          </div>
        )}

        <div className="provider-card-actions">
          <button
            className="btn btn-primary btn-sm"
            disabled={saving || !keyInput.trim()}
            onClick={onSave}
          >
            {saving ? '⏳' : '💾'} Simpan
          </button>
          <button
            className="btn btn-secondary btn-sm"
            disabled={testing || !keyInput.trim()}
            onClick={onTest}
          >
            {testing ? '⏳ Testing...' : '🔌 Test'}
          </button>
          <a
            href={provider.getKeyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
          >
            🔑 Dapatkan Key
          </a>
          {hasKey && (
            <button className="btn btn-danger btn-sm" onClick={onRemove}>
              🗑️ Hapus
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
