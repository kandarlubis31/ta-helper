const express = require('express');
const router = express.Router();
const { setConfig, getConfig } = require('../db/queries');
const { MODELS, DEFAULT_MODEL } = require('../services/agent');

const DEBUG = process.env.NODE_ENV !== 'production';

// ── Model Cache Helpers (DB-backed, 1-hour TTL) ──────────────────────────

const MODELS_CACHE_KEY = 'openrouter_models_cache';
const MODELS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCachedModels() {
  try {
    const raw = getConfig(MODELS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < MODELS_CACHE_TTL) {
      return parsed.models;
    }
    return null; // Expired
  } catch { return null; }
}

function setCachedModels(models) {
  try {
    setConfig(MODELS_CACHE_KEY, JSON.stringify({ models, timestamp: Date.now() }));
  } catch (e) {
    console.warn('  ⚠️ Failed to cache models:', e.message);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function isValidKey(provider, key) {
  if (!key || typeof key !== 'string' || key.length < 8) return false;
  if (provider === 'openrouter') return /^sk-or-v1-[a-zA-Z0-9]{20,}/.test(key);
  if (provider === 'anthropic') return /^sk-ant-api\d{2}-[a-zA-Z0-9_-]{40,}/.test(key);
  if (provider === 'openai') return /^sk-(?:proj-)?[a-zA-Z0-9]{20,}/.test(key);
  return false;
}

function hasValidKey(provider) {
  const envKey = provider === 'openrouter' ? 'OPENROUTER_API_KEY'
    : provider === 'anthropic' ? 'ANTHROPIC_API_KEY'
    : 'OPENAI_API_KEY';
  return isValidKey(provider, process.env[envKey]);
}

function detectProvider() {
  if (hasValidKey('openrouter')) return 'openrouter';
  if (hasValidKey('openai') && process.env.LLM_PROVIDER === 'openai') return 'openai';
  if (hasValidKey('anthropic')) return 'anthropic';
  if (hasValidKey('openai')) return 'openai';
  return null;
}

function getActiveProviders() {
  const providers = [];
  if (hasValidKey('openrouter')) providers.push('openrouter');
  if (hasValidKey('anthropic')) providers.push('anthropic');
  if (hasValidKey('openai')) providers.push('openai');
  return providers;
}

function getHasFlags() {
  return {
    has_openrouter: hasValidKey('openrouter'),
    has_anthropic: hasValidKey('anthropic'),
    has_openai: hasValidKey('openai'),
  };
}

// ── Key Preview ──────────────────────────────────────────────────────────

function keyPreview(provider) {
  const envKey = provider === 'openrouter' ? 'OPENROUTER_API_KEY'
    : provider === 'anthropic' ? 'ANTHROPIC_API_KEY'
    : 'OPENAI_API_KEY';
  const key = process.env[envKey];
  if (!key || key.length < 8) return null;
  const first4 = key.substring(0, 4);
  const last4 = key.substring(key.length - 4);
  return `${first4}...${last4}`;
}

function getKeyPreviews() {
  return {
    openrouter_preview: keyPreview('openrouter'),
    anthropic_preview: keyPreview('anthropic'),
    openai_preview: keyPreview('openai'),
  };
}

// ── Fetch OpenRouter models dynamically ────────────────────────────────────

async function fetchOpenRouterModels(forceRefresh = false) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  // Try cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = getCachedModels();
    if (cached) {
      if (DEBUG) console.log(`  📦 OpenRouter models: ${cached.length} from cache`);
      return cached;
    }
  } else {
    if (DEBUG) console.log('  🔄 Force refresh: skipping cache');
  }

  try {
    // 10-second timeout — Node fetch has no default timeout!
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`  OpenRouter API returned ${res.status}`);
      return null;
    }
    const json = await res.json();

    // Include ALL models from OpenRouter (no modality filter — many free/multimodal models
    // have modality='multimodal' or no architecture field, and they should still appear).
    // Sort: free models first, then by context length descending.
    const chatModels = (json.data || [])
      .map(m => ({
        id: m.id,
        name: m.name || m.id,
        description: m.description || '',
        context_length: m.context_length || 0,
        pricing: m.pricing ? {
          prompt: parseFloat(m.pricing.prompt) || 0,
          completion: parseFloat(m.pricing.completion) || 0,
        } : null,
      }))
      .sort((a, b) => {
        // Free models first
        const aFree = a.pricing && (!a.pricing.prompt || a.pricing.prompt === 0);
        const bFree = b.pricing && (!b.pricing.prompt || b.pricing.prompt === 0);
        if (aFree && !bFree) return -1;
        if (!aFree && bFree) return 1;
        // Then sort by context length descending
        return b.context_length - a.context_length;
      });

    if (chatModels.length > 0) {
      setCachedModels(chatModels);
      if (DEBUG) console.log(`  📡 OpenRouter models: ${chatModels.length} from API (cached)`);
    }
    return chatModels.length > 0 ? chatModels : null;
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('  OpenRouter API timed out after 10s');
    } else {
      console.error('  OpenRouter fetch error:', err.message);
    }
    return null;
  }
}

// ── GET /api/config — provider info + what keys are configured ────────────

router.get('/', (req, res) => {
  try {
    const provider = detectProvider();
    const activeProviders = getActiveProviders();
    const model = process.env.LLM_MODEL || (provider && DEFAULT_MODEL ? DEFAULT_MODEL[provider] || '' : '');

    res.json({
      provider: provider || 'none',
      model,
      hasKeys: activeProviders.length > 0,
      activeProviders,
      ...getHasFlags(),
      ...getKeyPreviews(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/config/models — models list (dynamic for OpenRouter) ──────────

// ── POST /api/config/test — test an API key without saving ────────────────

router.post('/test', async (req, res) => {
  try {
    const { provider, key } = req.body;
    const validProviders = ['openrouter', 'anthropic', 'openai'];

    if (!validProviders.includes(provider)) {
      return res.status(400).json({ valid: false, error: `Provider tidak valid: ${provider}` });
    }

    if (!isValidKey(provider, key)) {
      return res.status(400).json({ valid: false, error: 'Format API key tidak valid.' });
    }

    // Try a real API call to verify the key
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      let testUrl, testHeaders;
      if (provider === 'openrouter') {
        testUrl = 'https://openrouter.ai/api/v1/models';
        testHeaders = { Authorization: `Bearer ${key}` };
      } else if (provider === 'anthropic') {
        testUrl = 'https://api.anthropic.com/v1/messages';
        testHeaders = { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' };
        // Can't do a simple GET, try a minimal POST that will fail with auth error if key is invalid
        // Send a deliberately incomplete request — 400 = key valid, 401/403 = invalid
        const testRes = await fetch(testUrl, {
          method: 'POST',
          headers: testHeaders,
          body: JSON.stringify({ model: 'claude-3-haiku-20240307', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        // 200 or 400 means key is valid (400 = bad request, not auth error)
        if (testRes.status === 401 || testRes.status === 403) {
          return res.json({ valid: false, error: `Key ditolak (HTTP ${testRes.status}). Periksa kembali API key.` });
        }
        return res.json({ valid: true });
      } else if (provider === 'openai') {
        testUrl = 'https://api.openai.com/v1/models';
        testHeaders = { Authorization: `Bearer ${key}` };
      } else {
        clearTimeout(timeout);
        return res.json({ valid: true });
      }

      const testRes = await fetch(testUrl, {
        headers: testHeaders,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (testRes.ok) {
        return res.json({ valid: true });
      } else {
        return res.json({ valid: false, error: `Key ditolak (HTTP ${testRes.status}). Periksa kembali API key.` });
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return res.json({ valid: false, error: 'Timeout — server provider tidak merespon.' });
      }
      return res.json({ valid: false, error: `Gagal terhubung: ${err.message}` });
    }
  } catch (err) {
    res.status(500).json({ valid: false, error: err.message });
  }
});

// ── GET /api/config/models — models list (dynamic for OpenRouter) ──────────

router.get('/models', async (req, res) => {
  try {
    const requestedProvider = req.query.provider || null;
    const forceRefresh = req.query.refresh === 'true';
    const allModels = {};

    // If force refresh, clear the DB cache for OpenRouter
    if (forceRefresh) {
      try { setConfig(MODELS_CACHE_KEY, ''); } catch {}
    }

    // Helper: normalize string[] or object[] → safe { id, name, ... }[]
    const normalize = (list) => {
      if (!list || !Array.isArray(list)) return [];
      return list.map(m => {
        try {
          if (typeof m === 'string') return { id: m, name: m };
          if (m && typeof m === 'object') {
            const id = m.id || '';
            const name = m.name || id;
            return { ...m, id, name };
          }
          return { id: String(m || ''), name: String(m || '') };
        } catch (e) {
          console.error('  normalize: failed on item', typeof m, e.message);
          return { id: 'unknown', name: 'Unknown' };
        }
      });
    };

    // Helper: fetch models for a single provider
    const fetchForProvider = async (provider) => {
      if (provider === 'openrouter' && process.env.OPENROUTER_API_KEY) {
        try {
          const dynamic = await fetchOpenRouterModels(forceRefresh);
          const hasDynamicModels = dynamic && Array.isArray(dynamic) && dynamic.length > 0;
          if (DEBUG) console.log(`  📡 OpenRouter models: ${hasDynamicModels ? dynamic.length + ' from API' : 'using fallback list'}`);
          return normalize(hasDynamicModels ? dynamic : MODELS.openrouter);
        } catch (e) {
          console.error('  OpenRouter fetch error:', e.message);
          return normalize(MODELS.openrouter);
        }
      }
      if (provider === 'openai' && process.env.OPENAI_API_KEY) {
        return normalize(MODELS.openai);
      }
      if (provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
        return normalize(MODELS.anthropic);
      }
      return [];
    };

    // If specific provider requested, only fetch that one
    if (requestedProvider) {
      allModels[requestedProvider] = await fetchForProvider(requestedProvider);
    } else {
      // Fetch all configured providers
      if (process.env.OPENROUTER_API_KEY) allModels.openrouter = await fetchForProvider('openrouter');
      if (process.env.OPENAI_API_KEY) allModels.openai = await fetchForProvider('openai');
      if (process.env.ANTHROPIC_API_KEY) allModels.anthropic = await fetchForProvider('anthropic');
    }

    res.json({ models: allModels });
  } catch (err) {
    console.error('❌ GET /api/config/models CRASH:', err.message, err.stack);
    res.status(500).json({ error: err.message, models: {} });
  }
});

// ── POST /api/config — save API key(s) + model ────────────────────────────

router.post('/', async (req, res) => {
  try {
    const { openrouter_key, anthropic_key, openai_key, model } = req.body;
    const updated = [];

    // Save OpenRouter key
    if (openrouter_key !== undefined) {
      if (openrouter_key) {
        setConfig('OPENROUTER_API_KEY', openrouter_key);
        process.env.OPENROUTER_API_KEY = openrouter_key;
        updated.push('openrouter');
      } else {
        setConfig('OPENROUTER_API_KEY', '');
        delete process.env.OPENROUTER_API_KEY;
      }
    }

    // Save Anthropic key
    if (anthropic_key !== undefined) {
      if (anthropic_key) {
        setConfig('ANTHROPIC_API_KEY', anthropic_key);
        process.env.ANTHROPIC_API_KEY = anthropic_key;
        updated.push('anthropic');
      } else {
        setConfig('ANTHROPIC_API_KEY', '');
        delete process.env.ANTHROPIC_API_KEY;
      }
    }

    // Save OpenAI key
    if (openai_key !== undefined) {
      if (openai_key) {
        setConfig('OPENAI_API_KEY', openai_key);
        process.env.OPENAI_API_KEY = openai_key;
        updated.push('openai');
      } else {
        setConfig('OPENAI_API_KEY', '');
        delete process.env.OPENAI_API_KEY;
      }
    }

    // Save model preference
    if (model !== undefined) {
      setConfig('LLM_MODEL', model);
      process.env.LLM_MODEL = model;
    }

    // Save provider preference based on which key was updated
    if (updated.length === 1) {
      const provider = updated[0];
      setConfig('LLM_PROVIDER', provider);
      process.env.LLM_PROVIDER = provider;
    } else if (updated.includes('openrouter')) {
      // If multiple keys, prefer openrouter
      setConfig('LLM_PROVIDER', 'openrouter');
      process.env.LLM_PROVIDER = 'openrouter';
    }

    const provider = detectProvider();
    const activeProviders = getActiveProviders();
    const currentModel = process.env.LLM_MODEL || (provider && DEFAULT_MODEL ? DEFAULT_MODEL[provider] || '' : '');

    res.json({
      success: true,
      updated,
      provider: provider || 'none',
      model: currentModel,
      activeProviders,
      ...getHasFlags(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/config/:provider — remove a provider's API key ─────────────

router.delete('/:provider', (req, res) => {
  try {
    const { provider } = req.params;
    const validProviders = ['openrouter', 'anthropic', 'openai'];

    if (!validProviders.includes(provider)) {
      return res.status(400).json({ error: `Provider tidak valid: ${provider}. Pilih: ${validProviders.join(', ')}` });
    }

    const envKey = provider === 'openrouter' ? 'OPENROUTER_API_KEY'
      : provider === 'anthropic' ? 'ANTHROPIC_API_KEY'
      : 'OPENAI_API_KEY';

    setConfig(envKey, '');
    delete process.env[envKey];

    // Clear cached models if removing OpenRouter key
    if (provider === 'openrouter') {
      try { setConfig(MODELS_CACHE_KEY, ''); } catch {}
    }

    // Also clear LLM_PROVIDER if it matched the removed provider
    if (process.env.LLM_PROVIDER === provider) {
      delete process.env.LLM_PROVIDER;
      setConfig('LLM_PROVIDER', '');
    }

    const activeProviders = getActiveProviders();
    const newProvider = detectProvider();

    // Reset model to new provider's default
    if (newProvider && DEFAULT_MODEL && DEFAULT_MODEL[newProvider]) {
      process.env.LLM_MODEL = DEFAULT_MODEL[newProvider];
      setConfig('LLM_MODEL', DEFAULT_MODEL[newProvider]);
    }

    res.json({
      success: true,
      removed: provider,
      provider: newProvider || 'none',
      model: process.env.LLM_MODEL || (newProvider && DEFAULT_MODEL ? DEFAULT_MODEL[newProvider] || '' : ''),
      activeProviders,
      ...getHasFlags(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
