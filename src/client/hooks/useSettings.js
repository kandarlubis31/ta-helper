import { useState, useEffect, useCallback, useRef } from 'react';

export const PROVIDERS = [
  {
    id: 'openrouter',
    label: 'OpenRouter',
    icon: '🌐',
    desc: 'Satu key akses Claude, GPT, Gemini, DeepSeek & 200+ model',
    getKeyUrl: 'https://openrouter.ai/keys',
    badge: 'Rekomendasi',
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    icon: '🧠',
    desc: 'Claude Sonnet, Opus, Haiku',
    getKeyUrl: 'https://console.anthropic.com/',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    icon: '🤖',
    desc: 'GPT-4o, GPT-4.1, o3-mini — juga buat embedding',
    getKeyUrl: 'https://platform.openai.com/api-keys',
  },
];

export function useSettings() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [selectedProvider, setSelectedProvider] = useState('openrouter');
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);

  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { ok: true } | { ok: false, error: string }
  const [keyPreview, setKeyPreview] = useState('');

  // Update keyPreview when config changes
  useEffect(() => {
    if (config) {
      const previewMap = {
        openrouter: config.openrouter_preview,
        anthropic: config.anthropic_preview,
        openai: config.openai_preview,
      };
      setKeyPreview(previewMap[selectedProvider] || '');
    }
  }, [config, selectedProvider]);

  const initialConfigLoaded = useRef(false);
  const configRef = useRef(config);
  const retryTimerRef = useRef(null);
  const mountedRef = useRef(true);
  configRef.current = config;
  const prevProviderRef = useRef(selectedProvider);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  // ── Fetch config with retry (backend may take a moment to start) ──

  const fetchConfig = useCallback(async (attempt = 0) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1500; // ms

    try {
      const res = await fetch('/api/config');
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      if (!mountedRef.current) return;
      setConfig(data);
      if (data.model) setSelectedModel(data.model);
      if (data.activeProviders?.length > 0) {
        setSelectedProvider(data.activeProviders[0]);
      }
      setLoading(false);
    } catch (err) {
      const isNetworkError = err.message.includes('Failed to fetch')
        || err.message.includes('NetworkError')
        || err.message.includes('Unexpected end of JSON');

      if (isNetworkError && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY * (attempt + 1);
        console.log(`  ⏳ Config fetch retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms…`);
        retryTimerRef.current = setTimeout(() => fetchConfig(attempt + 1), delay);
      } else {
        if (!mountedRef.current) return;
        setMessage({
          text: isNetworkError
            ? 'Server belum siap — pastikan backend berjalan di port 3000'
            : 'Gagal memuat konfigurasi: ' + err.message,
          type: 'error',
        });
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  // ── Fetch models ────────────────────────────────────────────────

  const fetchModels = useCallback(async (provider) => {
    setModelsLoading(true);
    setModels([]);
    try {
      const res = await fetch(`/api/config/models?provider=${provider}`);
      const data = await res.json();
      const modelList = data.models?.[provider] || [];
      setModels(modelList);
    } catch (err) {
      console.error('Failed to fetch models:', err);
    } finally {
      setModelsLoading(false);
    }
  }, []);

  // ── Effect: Fetch models on mount & provider switch ─────────────
  useEffect(() => {
    if (!config) return;

    const isFirstLoad = !initialConfigLoaded.current;
    initialConfigLoaded.current = true;

    // Skip only if NOT first load AND provider hasn't changed
    if (!isFirstLoad && prevProviderRef.current === selectedProvider) return;

    prevProviderRef.current = selectedProvider;

    if (config[`has_${selectedProvider}`]) {
      fetchModels(selectedProvider);
    } else {
      setModels([]);
    }
  }, [config, selectedProvider, fetchModels]);



  // ── Test API key ─────────────────────────────────────────────────

  const handleTest = async () => {
    if (!keyInput.trim()) return;
    setTesting(true);
    setTestResult(null);
    const p = selectedProvider;

    try {
      const res = await fetch('/api/config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: p, key: keyInput.trim() }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ valid: false, error: 'Gagal terhubung ke server.' });
    } finally {
      setTesting(false);
    }
  };

  // ── Save key ────────────────────────────────────────────────────

  // Not wrapped in useCallback — needs fresh selectedProvider & keyInput
  const handleSave = async () => {
    if (!keyInput.trim()) return;
    setSaving(true);
    setMessage({ text: '', type: '' });

    const p = selectedProvider;
    const body = {};
    if (p === 'openrouter') body.openrouter_key = keyInput.trim();
    else if (p === 'anthropic') body.anthropic_key = keyInput.trim();
    else if (p === 'openai') body.openai_key = keyInput.trim();

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setConfig(prev => ({ ...prev, ...data }));
      setKeyInput('');
      setShowKey(false);
      setMessage({
        text: `✅ ${PROVIDERS.find(pr => pr.id === p)?.label} key tersimpan!`,
        type: 'success',
      });
      fetchModels(p);
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    } catch (err) {
      setMessage({ text: '❌ Gagal menyimpan: ' + err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // ── Remove key ──────────────────────────────────────────────────

  // Not wrapped in useCallback — needs fresh selectedProvider
  const handleRemove = async () => {
    const p = selectedProvider;
    if (!confirm(`Hapus API key ${PROVIDERS.find(pr => pr.id === p)?.label}?`)) return;

    try {
      const res = await fetch(`/api/config/${p}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setConfig(prev => ({ ...prev, ...data }));
      setModels([]);
      setMessage({
        text: `🗑️ ${PROVIDERS.find(pr => pr.id === p)?.label} key dihapus.`,
        type: 'success',
      });
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    } catch (err) {
      setMessage({ text: '❌ Gagal menghapus: ' + err.message, type: 'error' });
    }
  };

  // ── Select model ────────────────────────────────────────────────

  const handleModelSelect = async (modelId) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSelectedModel(modelId);
      setConfig(prev => ({ ...prev, model: modelId }));
      setMessage({ text: `✅ Model: ${modelId}`, type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (err) {
      setMessage({ text: '❌ Gagal ubah model: ' + err.message, type: 'error' });
    }
  };

  const currentProvider = PROVIDERS.find(p => p.id === selectedProvider);
  const hasKey = config?.[`has_${selectedProvider}`];
  const hasAnyKeys = config?.hasKeys;

  return {
    config, loading, saving, message, setMessage,
    selectedProvider, setSelectedProvider,
    keyInput, setKeyInput, showKey, setShowKey,
    models, modelsLoading, selectedModel,
    fetchModels, handleSave, handleRemove, handleModelSelect,
    currentProvider, hasKey, hasAnyKeys,
    testing, testResult, handleTest, setTestResult,
    keyPreview,
  };
}
