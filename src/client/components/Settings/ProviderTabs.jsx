import React from 'react';
import { PROVIDERS } from '../../hooks/useSettings';

export default function ProviderTabs({ selectedProvider, onChange, config }) {
  return (
    <div className="provider-tabs">
      {PROVIDERS.map(p => {
        const isActive = selectedProvider === p.id;
        const isConfigured = config?.[`has_${p.id}`];
        return (
          <button
            key={p.id}
            className={`provider-tab ${isActive ? 'active' : ''} ${isConfigured ? 'configured' : ''}`}
            onClick={() => onChange(p.id)}
          >
            <span className="provider-tab-icon">{p.icon}</span>
            <span className="provider-tab-label">{p.label}</span>
            {isConfigured && <span className="provider-tab-dot" title="Terkonfigurasi" />}
            {p.badge && <span className="provider-tab-badge">{p.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
