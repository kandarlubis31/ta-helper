import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { formatModelName } from '../../utils/modelUtils';

const FAVORITES_KEY = 'tara_favorite_models';

function getFavorites() {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'));
  } catch { return new Set(); }
}

function saveFavorites(favorites) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
}

function ModelItem({ model, currentProvider, isSelected, isFocused, onSelect, isFavorite, onToggleFavorite }) {
  const modelId = String(model.id || '');
  const modelName = model.name || modelId;
  const isFree = model.pricing && model.pricing.prompt === 0 && model.pricing.completion === 0;
  const desc = model.description || '';
  const itemRef = useRef(null);

  useEffect(() => {
    if (isFocused && itemRef.current) {
      itemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isFocused]);

  return (
    <button
      ref={itemRef}
      className={`model-item ${isSelected ? 'selected' : ''} ${isFree ? 'model-free' : ''} ${isFavorite ? 'model-fav' : ''} ${isFocused ? 'focused' : ''}`}
      onClick={() => onSelect(modelId)}
    >
      <div className="model-item-main">
        <span className="model-provider-tag">{currentProvider.icon}</span>
        <div className="model-item-info">
          <div className="model-item-header">
            <span className="model-name">{formatModelName(modelId, modelName)}</span>
            {isFree && <span className="model-free-badge">FREE</span>}
            {isFavorite && <span className="model-fav-badge">⭐</span>}
          </div>
          {desc && <span className="model-description">{desc.substring(0, 100)}</span>}
          <div className="model-item-meta">
            {model.pricing && (
              <span className="model-pricing">
                💰 ${model.pricing.prompt.toFixed(4)} in / ${model.pricing.completion.toFixed(4)} out per token
              </span>
            )}
            {model.context_length > 0 && (
              <span className="model-context">📐 {Math.round(model.context_length / 1000)}k ctx</span>
            )}
          </div>
        </div>
        <div className="model-item-actions">
          {isSelected && <span className="model-check">✅</span>}
          <span
            className={`model-fav-toggle ${isFavorite ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(modelId); }}
            title={isFavorite ? 'Hapus dari favorit' : 'Tambah ke favorit'}
          >
            {isFavorite ? '★' : '☆'}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function ModelList({
  provider,
  models,
  loading,
  selectedModel,
  onModelSelect,
  onRefresh,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState(getFavorites);

  const toggleFavorite = (modelId) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(modelId)) next.delete(modelId);
      else next.add(modelId);
      saveFavorites(next);
      return next;
    });
  };

  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return models;
    const q = searchQuery.toLowerCase();
    return models.filter(m => {
      const id = (m.id || '').toLowerCase();
      const name = (m.name || '').toLowerCase();
      const desc = (m.description || '').toLowerCase();
      return id.includes(q) || name.includes(q) || desc.includes(q);
    });
  }, [models, searchQuery]);

  // Sort: favorites first, then rest
  const sortedModels = useMemo(() => {
    return [...filteredModels].sort((a, b) => {
      const aFav = favorites.has(String(a.id)) ? 0 : 1;
      const bFav = favorites.has(String(b.id)) ? 0 : 1;
      return aFav - bFav;
    });
  }, [filteredModels, favorites]);

  if (loading) {
    return (
      <div className="model-list-skeleton">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="model-skeleton-item">
            <span className="skeleton-bar model-skeleton-icon" />
            <div className="model-skeleton-info">
              <span className="skeleton-bar model-skeleton-name" />
              <span className="skeleton-bar model-skeleton-desc" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="empty-state">
        {provider.id === 'openrouter'
          ? 'Tekan "Refresh" untuk mengambil model dari OpenRouter.'
          : `Belum ada model. Pastikan API key ${provider.label} sudah tersimpan.`}
      </div>
    );
  }

  const favCount = favorites.size > 0 ? models.filter(m => favorites.has(String(m.id))).length : 0;

  // ── Keyboard navigation ────────────────────────────────────────

  const [focusIdx, setFocusIdx] = useState(-1);
  const listRef = useRef(null);

  const handleKeyDown = useCallback((e) => {
    if (sortedModels.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIdx(prev => Math.min(prev + 1, sortedModels.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && focusIdx >= 0 && focusIdx < sortedModels.length) {
      e.preventDefault();
      const modelId = String(sortedModels[focusIdx].id || '');
      onModelSelect(modelId);
    }
  }, [sortedModels, focusIdx, onModelSelect]);

  // Reset focus when search changes
  useEffect(() => { setFocusIdx(-1); }, [searchQuery]);

  return (
    <div onKeyDown={handleKeyDown} tabIndex={0} style={{ outline: 'none' }}>
      {/* Toolbar: Refresh + Search */}
      <div className="model-list-top">
        {provider.id === 'openrouter' && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? '⏳ Fetching...' : '🔄 Refresh'}
          </button>
        )}
        <div className="model-search-box flex-1">
          <input
            type="text"
            className="model-search-input"
            placeholder="🔍 Cari model... (nama, id, atau deskripsi)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {sortedModels.length === 0 ? (
        <div className="model-search-empty">
          Tidak ada model yang cocok dengan "{searchQuery}"
        </div>
      ) : (
        <div className="model-list" ref={listRef}>
          {favCount > 0 && searchQuery === '' && (
            <div className="model-group">
              <div className="model-group-label">
                <span>⭐ Favorit</span>
                <span className="model-group-count">{favCount}</span>
              </div>
              {sortedModels.filter(m => favorites.has(String(m.id))).map((m, mi) => {
                const globalIdx = mi;
                return (
                  <ModelItem
                    key={m.id}
                    model={m}
                    currentProvider={provider}
                    isSelected={selectedModel === String(m.id || '')}
                    isFocused={focusIdx === globalIdx}
                    onSelect={onModelSelect}
                    isFavorite={true}
                    onToggleFavorite={toggleFavorite}
                  />
                );
              })}
            </div>
          )}
          {sortedModels.filter(m => !favorites.has(String(m.id))).length > 0 && (
            <div className="model-group">
              {favCount > 0 && searchQuery === '' && (
                <div className="model-group-label">
                  <span>📋 Semua Model</span>
                  <span className="model-group-count">
                    {sortedModels.filter(m => !favorites.has(String(m.id))).length}
                  </span>
                </div>
              )}
              {sortedModels.filter(m => !favorites.has(String(m.id))).map((m, mi) => {
                const globalIdx = (favCount > 0 && searchQuery === '' ? favCount : 0) + mi;
                return (
                  <ModelItem
                    key={m.id}
                    model={m}
                    currentProvider={provider}
                    isSelected={selectedModel === String(m.id || '')}
                    isFocused={focusIdx === globalIdx}
                    onSelect={onModelSelect}
                    isFavorite={favorites.has(String(m.id))}
                    onToggleFavorite={toggleFavorite}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
