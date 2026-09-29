import React, { useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import ProviderTabs from './ProviderTabs';
import ProviderCard from './ProviderCard';
import ModelList from './ModelList';
import SetupGuide from './SetupGuide';
import SettingsToast from './SettingsToast';
import PageLoadingSkeleton from '../shared/PageLoadingSkeleton';

function AccordionSection({ title, icon, badge, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="settings-section collapsible">
      <button
        className={`settings-accordion-toggle${open ? ' open' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <span>{icon} {title}</span>
        {badge && (
          <span className={`settings-badge ${badge.active ? 'settings-badge-active' : 'settings-badge-inactive'}`}>
            {badge.text}
          </span>
        )}
        <span className="accordion-arrow">▶</span>
      </button>
      <div className={`settings-accordion-body${open ? ' open' : ''}`}>
        {children}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const {
    config, loading, saving, message, setMessage,
    selectedProvider, setSelectedProvider,
    keyInput, setKeyInput, showKey, setShowKey,
    models, modelsLoading, selectedModel,
    fetchModels, handleSave, handleRemove, handleModelSelect,
    currentProvider, hasKey, hasAnyKeys,
    testing, testResult, handleTest, setTestResult,
    keyPreview,
  } = useSettings();

  if (loading) {
    return (
      <div className="settings-page">
        <PageLoadingSkeleton cardCount={3} />
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h2>⚙️ Settings</h2>
        <p className="page-desc">Pilih provider, masukkan API key, pilih model</p>
      </div>

      <SettingsToast message={message} onDismiss={() => setMessage({ text: '', type: '' })} />

      <ProviderTabs
        selectedProvider={selectedProvider}
        onChange={setSelectedProvider}
        config={config}
      />

      <AccordionSection
        title={currentProvider.label}
        icon={currentProvider.icon}
        badge={hasKey ? { text: '✓ terkonfigurasi', active: true } : { text: 'belum setup', active: false }}
        defaultOpen={true}
      >
        <ProviderCard
          provider={currentProvider}
          hasKey={hasKey}
          keyInput={keyInput}
          showKey={showKey}
          saving={saving}
          testing={testing}
          testResult={testResult}
          keyPreview={keyPreview}
          onKeyChange={setKeyInput}
          onToggleShowKey={() => setShowKey(!showKey)}
          onSave={handleSave}
          onRemove={handleRemove}
          onTest={handleTest}
          onClearTest={() => setTestResult(null)}
        />
      </AccordionSection>

      {hasKey && (
        <AccordionSection
          title={`Model ${currentProvider.label}`}
          icon="🧠"
          badge={selectedModel ? { text: `${selectedModel.substring(0, 20)}...`, active: true } : null}
          defaultOpen={true}
        >
          <ModelList
            provider={currentProvider}
            models={models}
            loading={modelsLoading}
            selectedModel={selectedModel}
            onModelSelect={handleModelSelect}
            onRefresh={() => fetchModels(selectedProvider)}
          />
        </AccordionSection>
      )}

      {!hasAnyKeys && (
        <div className="settings-section">
          <SetupGuide />
        </div>
      )}
    </div>
  );
}
