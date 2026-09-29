const { searchSimilar } = require('./vectorStore');
const { getRecentChatMessages, insertChatMessage, getAllProgress, getAllJournals } = require('../db/queries');

const DEBUG = process.env.NODE_ENV !== 'production';

// ── Available Models per Provider ──────────────────────────────────────────

const MODELS = {
  openrouter: [
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'openai/gpt-4.1',
    'anthropic/claude-sonnet-4-20250514',
    'anthropic/claude-3.5-sonnet',
    'google/gemini-2.5-pro',
    'google/gemini-2.0-flash',
    'meta-llama/llama-4-maverick',
    'deepseek/deepseek-chat',
    'deepseek/deepseek-r1',
    'qwen/qwen-3-235b-a22b',
    'mistral/mistral-large',
  ],
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4.1',
    'gpt-4-turbo',
    'o3-mini',
  ],
  anthropic: [
    'claude-sonnet-4-20250514',
    'claude-3-5-sonnet-20241022',
    'claude-3-opus-20240229',
    'claude-3-haiku-20240307',
  ],
};

const DEFAULT_MODEL = {
  openrouter: 'anthropic/claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
};

// ── Provider Detection ─────────────────────────────────────────────────────

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

function hasAnyApiKey() {
  return hasValidKey('anthropic') || hasValidKey('openai') || hasValidKey('openrouter');
}

function getMissingKeys() {
  const missing = [];
  if (!hasValidKey('anthropic') && !hasValidKey('openai') && !hasValidKey('openrouter')) {
    missing.push('Anthropic / OpenAI / OpenRouter API Key');
  }
  return missing;
}

function getAvailableModels() {
  const provider = detectProvider();
  if (!provider) return [];
  return MODELS[provider] || [];
}

function getCurrentConfig() {
  const provider = detectProvider() || 'anthropic';
  return {
    provider,
    model: process.env.LLM_MODEL || DEFAULT_MODEL[provider] || 'gpt-4o',
    availableModels: MODELS[provider] || [],
  };
}

// ── Greeting Detection ─────────────────────────────────────────────────────

function isGreeting(message) {
  const lower = message.trim().toLowerCase();
  const patterns = [
    /^(halo|hai|hi|hey|helo|hello|hallo|hlo|hola|yo|oi|bro|gan|kak|mbak|mas|mbok)[!.]*$/,
    /^(pagi|siang|sore|malam|mlm|pagi pagi|siang siang|sore sore|malam malam)[!.]*$/,
    /^selamat\s?(pagi|siang|sore|malam)[!.]*$/,
    /^(assalamualaikum|assalamu'alaikum|ass|assalam\s?mualaikum|wr\s?wb|wswb)[!.]*$/,
    /^(apa\s?kabar|gimana\s?kabar|gmn\s?kabar|how\s?are\s?you)[!.]*$/,
    /^(permisi|punten)[!.]*$/,
    /^(bantuan|help|tolong|bantu|bantuin|butuh\s?bantuan)[!.]*$/,
  ];
  return patterns.some(p => p.test(lower));
}

// ── No-API-Key Response ────────────────────────────────────────────────────

function noApiKeyResponse(message) {
  const missing = getMissingKeys();
  const missingList = missing.length > 0 ? missing[0] : 'API Key';

  const setupGuide = `
Setup di **Settings** sidebar kiri:

**Butuh API key?**
- OpenRouter: https://openrouter.ai/keys
- Anthropic: https://console.anthropic.com/
- OpenAI: https://platform.openai.com/api-keys`;

  if (isGreeting(message)) {
    return {
      type: 'chat', intent: 'GENERAL',
      message: `**Halo! Aku TARA, asisten riset TA kamu.**

API key belum disetup. Kamu perlu ${missingList} biar aku bisa bantu riset & nulis.

${setupGuide}

Setup dulu, lalu chat lagi ya!`,
      journalRefs: [], relevantJournals: [],
    };
  }

  return {
    type: 'chat', intent: 'GENERAL',
    message: `**API key belum disetup!**

${missingList} belum dikonfigurasi. Tanpa API key, aku gak bisa akses AI.

${setupGuide}

Setup dulu, lalu ulangi pesan kamu.`,
    journalRefs: [], relevantJournals: [],
  };
}

// ── LLM Client ─────────────────────────────────────────────────────────────

function getLLMClient(overrideModel) {
  const provider = detectProvider();
  const model = overrideModel || process.env.LLM_MODEL || (provider ? DEFAULT_MODEL[provider] : 'gpt-4o');

  if (!provider) {
    throw new Error('Tidak ada API key yang terkonfigurasi.');
  }

  // ── OpenRouter (OpenAI-compatible API) ──────────────────────────────────
  if (provider === 'openrouter') {
    const OpenAI = require('openai');
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (DEBUG) console.log(`  🔑 OpenRouter: model=${model}`);
    return {
      type: 'openrouter',
      client: new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey,
        defaultHeaders: {
          'HTTP-Referer': 'https://github.com/tara-ta',
          'X-Title': 'TARA - Tugas Akhir Research Agent',
        },
      }),
      model,
    };
  }

  // ── OpenAI ──────────────────────────────────────────────────────────────
  if (provider === 'openai') {
    const OpenAI = require('openai');
    const apiKey = process.env.OPENAI_API_KEY;
    return {
      type: 'openai',
      client: new OpenAI({ apiKey }),
      model,
    };
  }

  // ── Anthropic ───────────────────────────────────────────────────────────
  const Anthropic = require('@anthropic-ai/sdk');
  const apiKey = process.env.ANTHROPIC_API_KEY;
  return {
    type: 'anthropic',
    client: new Anthropic({ apiKey }),
    model,
  };
}

// ── Intent Detection ──────────────────────────────────────────────────────

function detectIntent(message) {
  const lower = message.toLowerCase();

  if (/tulis|buatkan|generate|tulisan|paragraf|bab|subbab|latar belakang|rumusan|hipotesis/.test(lower)) return 'WRITE';
  if (/cek plagiarisme|cek plag|similarity|kemiripan|cek kesamaan/.test(lower)) return 'PLAGCHECK';
  if (/cari jurnal|search jurnal|temukan jurnal|jurnal tentang|referensi tentang/.test(lower)) return 'SEARCH';
  if (/progres|progress|bab\s*\d|status bab|update bab/.test(lower)) return 'PROGRESS';
  if (/daftar pustaka|bibliography|sitasi|citation|format apa|format ieee/.test(lower)) return 'CITATION';

  return 'GENERAL';
}

// ── Context Builders ──────────────────────────────────────────────────────

function buildJournalContext(journals) {
  if (!journals || journals.length === 0) return 'Belum ada jurnal di repository.';
  return journals.map((j, i) => {
    let authors = '';
    try {
      const parsed = typeof j.authors === 'string' ? JSON.parse(j.authors) : j.authors;
      if (Array.isArray(parsed) && parsed.length > 0) {
        authors = parsed.map(a => `${a.family || a.given || ''}`).filter(Boolean).join(', ');
      }
    } catch {}
    return `${i + 1}. ${j.title} (${authors ? authors + ', ' : ''}${j.year || 'n.d.'}) [ID: ${j.id}]`;
  }).join('\n');
}

function buildProgressContext(progress) {
  if (!progress || progress.length === 0) return 'Belum ada data progres TA.';
  return progress.map(p => {
    const statusMap = { belum: '[Belum]', draft: '[Draft]', revisi: '[Revisi]', selesai: '[Selesai]' };
    return `- ${p.chapter.toUpperCase()}: ${p.title} [${statusMap[p.status] || p.status}]`;
  }).join('\n');
}

// ── Cached static rules ────────────────────────────────────────────────
let _cachedRules = null;

function getRules(thesisTitle) {
  const staticPart = `Kamu adalah TARA, asisten riset TA untuk mahasiswa informatika Indonesia.

ATURAN KETAT:
1. HANYA referensi jurnal dari repository — JANGAN karang sitasi
2. Wajib sitasi [Nama Author, Tahun] — dari repository yang tersedia
3. Bahasa Indonesia akademis, ringkas, langsung ke poin — JANGAN verbose
4. Jika tidak ada jurnal relevan, bilang terus terang, JANGAN ngibul
5. JANGAN bilang "berdasarkan pengetahuan saya" — selalu berdasarkan jurnal
6. JANGAN tambahkan disclaimer, warning, atau catatan kaki — user sudah tahu ini AI
7. JANGAN buang token dengan kalimat tidak berguna

JURNAL DI REPOSITORY:
`;

  if (!thesisTitle) {
    if (!_cachedRules) _cachedRules = staticPart;
    return _cachedRules;
  }

  return `Kamu adalah TARA, asisten riset TA untuk mahasiswa informatika Indonesia.

JUDUL TA: "${thesisTitle}"
Gunakan sebagai KONTEKS UTAMA setiap respons.

ATURAN KETAT:
1. HANYA referensi jurnal dari repository — JANGAN karang sitasi
2. Wajib sitasi [Nama Author, Tahun] — dari repository yang tersedia
3. Bahasa Indonesia akademis, ringkas, langsung ke poin — JANGAN verbose
4. Jika tidak ada jurnal relevan, bilang terus terang, JANGAN ngibul
5. JANGAN bilang "berdasarkan pengetahuan saya" — selalu berdasarkan jurnal
6. JANGAN tambahkan disclaimer, warning, atau catatan kaki — user sudah tahu ini AI
7. JANGAN buang token dengan kalimat tidak berguna

JURNAL DI REPOSITORY:
`;
}

function buildSystemPrompt(journalContext, progressContext, intent, conversationSummary = '', thesisTitle = '') {
  let prompt = getRules(thesisTitle);
  prompt += journalContext;
  prompt += `\n\nPROGRES TA:\n${progressContext}`;

  if (conversationSummary) prompt += `\n\n${conversationSummary}`;
  if (intent === 'WRITE') prompt += '\nUser minta bantuan nulis. Tulis akademis formal dgn sitasi.';
  if (intent === 'SEARCH') prompt += '\nUser cari jurnal. Jelaskan relevansi & alasan.';

  return prompt;
}

// ── Text Compressor (rule-based, no API cost) ────────────────────────────

const FILLER_WORDS = new Set([
  'si', 'nih', 'tuh', 'deh', 'dong', 'kok', 'loh', 'lah', 'kah', 'pun',
  'sih', 'nah', 'eh', 'ih', 'ah', 'oh', 'wah', 'weh', 'lho',
]);

const INTENSIFIERS = new Set([
  'banget', 'sekali', 'sangat', 'lumayan', 'benar-benar', 'betul-betul',
  'sungguh', 'amat', 'terlalu', 'agak', 'cukup', 'begitu',
]);

const SHORTEN_MAP = {
  'yang': 'yg', 'dengan': 'dgn', 'dan': '&', 'atau': '/',
  'untuk': 'utk', 'tidak': 'tdk', 'akan': 'akn', 'sudah': 'sdh',
  'bisa': 'bs', 'karena': 'krn', 'tetapi': 'tpi', 'kalau': 'klo',
  'bagaimana': 'gmn', 'mengenai': 'ttg', 'seperti': 'sprt',
  'dalam': 'dlm', 'kepada': 'kpd', 'daripada': 'drpd',
  'mempunyai': 'punya', 'memiliki': 'punya', 'melakukan': 'lakukan',
  'menggunakan': 'pakai', 'membuat': 'buat', 'mendapatkan': 'dapat',
  'memberikan': 'beri', 'mengatakan': 'bilang', 'mengetahui': 'tau',
  'melihat': 'lihat', 'mencari': 'cari', 'menemukan': 'temukan',
};

const DROP_WORDS = new Set(['adalah', 'ialah', 'yaitu', 'yakni', 'merupakan']);

function compressText(text) {
  if (!text || text.length < 60) return text; // Already short, don't touch

  let words = text.split(/\s+/);

  // Remove filler, intensifier, and copula words
  words = words.filter(w => {
    const clean = w.toLowerCase().replace(/[^a-z]/g, '');
    return !FILLER_WORDS.has(clean) && !INTENSIFIERS.has(clean) && !DROP_WORDS.has(clean);
  });

  // Shorten known words
  words = words.map(w => {
    const clean = w.toLowerCase().replace(/[^a-z]/g, '');
    const suffix = w.match(/[^a-z]+$/)?.[0] || '';
    const prefix = w.match(/^[^a-z]+/)?.[0] || '';
    if (SHORTEN_MAP[clean]) {
      return prefix + SHORTEN_MAP[clean] + suffix;
    }
    return w;
  });

  let result = words.join(' ').replace(/\s+/g, ' ').trim();

  // Guard: if compression removed everything, fall back to truncation
  if (!result || result.length < 10) {
    return text.substring(0, 100) + (text.length > 100 ? '...' : '');
  }

  // If still long, truncate to ~100 chars (split at word boundary)
  if (result.length > 150) {
    result = result.substring(0, 147).replace(/\s+\S*$/, '') + '...';
  }

  return result;
}

// ── Conversation Summarizer (LLM-based, one-time cost for many tokens saved) ─

async function summarizeConversation(oldMessages, llm) {
  if (!oldMessages || oldMessages.length === 0) return '';

  const conversation = oldMessages
    .map(m => `${m.role === 'user' ? 'User' : 'TARA'}: ${compressText(m.content)}`)
    .join('\n');

  const summaryPrompt = `Ringkas percakapan di bawah ini menjadi poin-poin singkat (maks 150 kata). Hanya tulis poin-poinnya, tanpa pembuka/penutup:

${conversation}`;

  try {
    let summary;

    if (llm.type === 'openai' || llm.type === 'openrouter') {
      const resp = await llm.client.chat.completions.create({
        model: llm.model,
        messages: [{ role: 'user', content: summaryPrompt }],
        temperature: 0.3,
        max_tokens: 300,
      });
      summary = resp.choices[0].message.content;
    } else {
      const resp = await llm.client.messages.create({
        model: llm.model,
        max_tokens: 300,
        messages: [{ role: 'user', content: summaryPrompt }],
      });
      summary = resp.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
    }

    return summary ? `**Ringkasan percakapan sebelumnya:**\n${summary.trim()}` : '';
  } catch (err) {
    console.error('Summarization failed:', err.message);
    return ''; // Fallback: no summary, messages will be sent as-is
  }
}

// ── Summary Cache (incremental — only summarizes new old messages) ────────

let cachedSummary = { lastMessageId: 0, text: '', model: '' };

async function getOrUpdateSummary(oldMessages, llm) {
  if (!oldMessages || oldMessages.length === 0) return '';

  const maxId = Math.max(...oldMessages.map(m => m.id));
  const modelKey = llm.model;

  // Cache fully covers all old messages — reuse
  if (    cachedSummary.lastMessageId >= maxId && cachedSummary.text && cachedSummary.model === modelKey) {
    return cachedSummary.text;
  }

  // Determine which messages need summarizing
  let toSummarize;
  let baseSummary = '';

  if (cachedSummary.lastMessageId > 0 && cachedSummary.model === modelKey && cachedSummary.text) {
    // Partial cache: only summarize new old messages beyond lastMessageId
    toSummarize = oldMessages.filter(m => m.id > cachedSummary.lastMessageId);
    baseSummary = cachedSummary.text;
  } else {
    toSummarize = oldMessages;
  }

  if (toSummarize.length === 0) return baseSummary;

  try {
    const newSummary = await summarizeConversation(toSummarize, llm);
    const combined = baseSummary
      ? `${baseSummary}\n\n${newSummary.replace(/📝 \*\*Ringkasan percakapan sebelumnya:\*\*\n?/g, '')}`
      : newSummary;

    cachedSummary = { lastMessageId: maxId, text: combined, model: modelKey };

    // Trim summary if it grows too long (re-compress the whole thing)
    if (combined.length > 800) {
      cachedSummary.text = `**Ringkasan percakapan sebelumnya:**\n${combined.substring(0, 797).replace(/\s+\S*$/, '')}...`;
    }

    return cachedSummary.text;
  } catch (err) {
    console.error('Summarization failed:', err.message);
    // Update lastMessageId even on failure to prevent infinite retries
    cachedSummary = { lastMessageId: maxId, text: baseSummary || '', model: modelKey };
    // Fallback: compressed text
    const fallback = toSummarize.map(m => compressText(m.content)).filter(Boolean).join(' | ');
    const combined = baseSummary
      ? `${baseSummary}\n\n${fallback.substring(0, 300)}`
      : `**Ringkasan percakapan sebelumnya:**\n${fallback.substring(0, 500)}`;
    return combined || baseSummary;
  }
}

// ── Main Chat Processor ────────────────────────────────────────────────────

async function processChat(message, streamCallback = null, overrideModel = null, thesisTitle = '', academicMode = false, skipHistory = false) {
  if (DEBUG) console.log('🔧 [processChat] thesis:', (thesisTitle || '').substring(0, 50));
  const intent = detectIntent(message);
  if (DEBUG) console.log(`  Intent: ${intent}`);

  // === No API key ===
  if (!hasAnyApiKey()) {
    if (!skipHistory) insertChatMessage('user', message, []);

    if (intent === 'PROGRESS') {
      const progress = getAllProgress();
      const resp = {
        type: 'progress_report', intent: 'PROGRESS', progress,
        message: `**Progres TA Kamu**\n\n${buildProgressContext(progress)}\n\n---\nAPI key belum disetup. Buat fitur AI lainnya, setup dulu.\n\nKetik **bantuan** buat panduan.`,
      };
      if (!skipHistory) insertChatMessage('assistant', resp.message, []);
      return resp;
    }
    if (intent === 'CITATION') {
      const format = /ieee/i.test(message) ? 'ieee' : 'apa';
      return {
        type: 'redirect', intent: 'CITATION', format,
        message: `**Citation Generator** bisa tanpa API key! Buka halaman Citation → pilih **${format.toUpperCase()}**.\n\nUntuk fitur AI lainnya, setup API key dulu. Ketik **bantuan**.`,
      };
    }
    if (intent === 'PLAGCHECK') {
      return {
        type: 'redirect', intent: 'PLAGCHECK',
        message: '**Plagiarism Checker** butuh API key untuk embedding. Setup **OPENAI_API_KEY** atau **OPENROUTER_API_KEY** di **Settings**, atau ketik **bantuan**.',
      };
    }

    const resp = noApiKeyResponse(message);
    if (!skipHistory) insertChatMessage('assistant', resp.message, []);
    return resp;
  }

  // === Has API key — normal flow ===
  const allJournals = getAllJournals();
  const progress = getAllProgress();

  let relevantJournals = [];
  let journalRefs = [];

  if (['WRITE', 'SEARCH', 'GENERAL'].includes(intent) && allJournals.length > 0) {
    const similar = await searchSimilar(message, 3);
    journalRefs = similar.map(s => s.journalId);
    relevantJournals = allJournals.filter(j => journalRefs.includes(j.id));
  }

  const journalContext = buildJournalContext(allJournals);
  const progressContext = buildProgressContext(progress);

  // Special intents
  if (intent === 'PLAGCHECK') {
    return { type: 'redirect', intent: 'PLAGCHECK', message: 'Silakan paste teks di halaman Plagiarism Checker, atau: "cek plagiarisme teks ini: [teks]"' };
  }
  if (intent === 'CITATION') {
    const format = /ieee/i.test(message) ? 'ieee' : 'apa';
    return { type: 'redirect', intent: 'CITATION', message: 'Silakan generate daftar pustaka di halaman Citation Generator.', format };
  }
  if (intent === 'PROGRESS') {
    return { type: 'progress_report', intent: 'PROGRESS', progress, message: `Berikut progres TA kamu:\n${buildProgressContext(progress)}` };
  }

  // Build LLM messages with sliding window + summarization for token efficiency
  const MAX_FULL_MESSAGES = 8;   // Last N messages kept in full
  const SUMMARIZE_THRESHOLD = 14; // Summarize if total > this
  const history = getRecentChatMessages(30);

  let conversationSummary = '';
  let messages;
  const llm = getLLMClient(overrideModel); // Single client for both summarization + main chat

  if (history.length > SUMMARIZE_THRESHOLD) {
    // Oldest messages get summarized, last N kept in full (compressed)
    const oldMessages = history.slice(0, history.length - MAX_FULL_MESSAGES);
    const recentMessages = history.slice(-MAX_FULL_MESSAGES);

    conversationSummary = await getOrUpdateSummary(oldMessages, llm);

    messages = recentMessages.map(m => ({ role: m.role, content: compressText(m.content) }));
  } else {
    // All messages get compressed for token efficiency
    messages = history.map(m => ({ role: m.role, content: compressText(m.content) }));
  }

  const systemPrompt = buildSystemPrompt(journalContext, progressContext, intent, conversationSummary, thesisTitle);

  // ── Academic mode: stricter rules, different temperature ─────────
  let finalPrompt = systemPrompt;
  let temperature = 0.7;
  if (academicMode) {
    finalPrompt += `\n\nMODE AKADEMIK — ATURAN TAMBAHAN:\n` +
      `- Bahasa Indonesia FORMAL & BAKU — tidak boleh santai/casual sama sekali\n` +
      `- Struktur jawaban: Pendahuluan → Isi → Kesimpulan (jika relevan)\n` +
      `- Setiap klaim WAJIB disertai sitasi [Author, Tahun] dari jurnal repository\n` +
      `- Hindari pendapat pribadi, spekulasi, atau generalisasi tanpa data\n` +
      `- Gunakan istilah teknis yang tepat, definisikan jika perlu\n` +
      `- Format output rapi: heading markdown untuk bagian, bold untuk istilah kunci\n` +
      `- JANGAN gunakan emoji, slang, singkatan gaul, atau kata seru\n` +
      `- JANGAN tambahkan disclaimer atau peringatan di akhir\n` +
      `- Jika data/referensi kurang, nyatakan keterbatasan secara objektif`;
    temperature = 0.4;
  }

  // Inject thesis title & journal context (compress only user message part)
  let enhancedMessage = compressText(message);
  if (thesisTitle) {
    enhancedMessage = `JUDUL TA: "${thesisTitle}"\n\n${enhancedMessage}`;
  }
  if (relevantJournals.length > 0) {
    enhancedMessage += '\n\nJurnal relevan:\n';
    enhancedMessage += buildJournalContext(relevantJournals);
  }

  if (!skipHistory) insertChatMessage('user', message, journalRefs);
  const llmType = llm.type;

  try {
    let responseText;

    // ── OpenAI-compatible providers (OpenAI + OpenRouter) ─────────────────
    if (llmType === 'openai' || llmType === 'openrouter') {
      if (streamCallback) {
        const stream = await llm.client.chat.completions.create({
          model: llm.model,
          messages: [{ role: 'system', content: finalPrompt }, ...messages, { role: 'user', content: enhancedMessage }],
          temperature,
          max_tokens: academicMode ? 3000 : 2000,
          stream: true,
        });
        let fullText = '';
        for await (const chunk of stream) {
          const delta = chunk.choices?.[0]?.delta?.content || '';
          if (delta) { fullText += delta; streamCallback({ delta, full: fullText }); }
        }
        responseText = fullText;
      } else {
        const response = await llm.client.chat.completions.create({
          model: llm.model,
          messages: [{ role: 'system', content: finalPrompt }, ...messages, { role: 'user', content: enhancedMessage }],
          temperature,
          max_tokens: academicMode ? 3000 : 2000,
        });
        responseText = response.choices[0].message.content;
      }
    } else {
      // ── Anthropic ──────────────────────────────────────────────────────
      if (streamCallback) {
        const stream = llm.client.messages.stream({
          model: llm.model,
          max_tokens: academicMode ? 3000 : 2000,
          temperature,
          system: finalPrompt,
          messages: [...messages, { role: 'user', content: enhancedMessage }],
        });
        let fullText = '';
        stream.on('text', (textDelta) => { fullText += textDelta; streamCallback({ delta: textDelta, full: fullText }); });
        await stream.finalMessage();
        responseText = fullText;
      } else {
        const response = await llm.client.messages.create({
          model: llm.model,
          max_tokens: academicMode ? 3000 : 2000,
          temperature,
          system: finalPrompt,
          messages: [...messages, { role: 'user', content: enhancedMessage }],
        });
        responseText = response.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
      }
    }

    // Always save assistant response — even during regenerate (skipHistory only skips user msg)
    insertChatMessage('assistant', responseText, journalRefs);

    return {
      type: 'chat', intent, message: responseText, journalRefs,
      relevantJournals: relevantJournals.map(j => ({ id: j.id, title: j.title, authors: j.authors, year: j.year })),
    };
  } catch (err) {
    console.error('LLM call error:', err.message);
    const errMsg = err.message.toLowerCase();
    if (errMsg.includes('api key') || errMsg.includes('auth') || errMsg.includes('401') || errMsg.includes('403')) {
      const provider = detectProvider();
      const providerName = provider === 'openrouter' ? 'OpenRouter' : provider === 'openai' ? 'OpenAI' : provider === 'anthropic' ? 'Anthropic' : 'API';
      const keyVar = provider === 'openrouter' ? 'OPENROUTER_API_KEY' : provider === 'openai' ? 'OPENAI_API_KEY' : provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'API key';
      const errorResp = {
        type: 'chat', intent: 'GENERAL',
        message: `**Gagal autentikasi ${providerName}!**\n\nAPI key ${keyVar} tdk valid/expired/kuota habis.\n\n**Perbaiki:**\n1. Buka **Settings** di sidebar\n2. Hapus key error\n3. Dapatkan key baru dari ${provider === 'openrouter' ? 'https://openrouter.ai/keys' : provider === 'openai' ? 'https://platform.openai.com/api-keys' : 'https://console.anthropic.com/'}\n4. Paste & simpan\n\nCek kouta/billing jika masih error.`,
        journalRefs: [], relevantJournals: [],
      };
      insertChatMessage('assistant', errorResp.message, []);
      return errorResp;
    }
    if (errMsg.includes('402') || errMsg.includes('insufficient credits') || errMsg.includes('purchase credits') || errMsg.includes('credit balance')) {
      const provider = detectProvider();
      const providerName = provider === 'openrouter' ? 'OpenRouter' : provider === 'openai' ? 'OpenAI' : provider === 'anthropic' ? 'Anthropic' : 'API';
      const creditsUrl = provider === 'openrouter' ? 'https://openrouter.ai/settings/credits' : provider === 'openai' ? 'https://platform.openai.com/settings/organization/billing' : provider === 'anthropic' ? 'https://console.anthropic.com/settings/billing' : '';
      const errorResp = {
        type: 'chat', intent: 'GENERAL',
        message: `**${providerName} — Kredit tdk mencukupi!**\n\nAkun ${providerName} belum pernah isi kredit.\n\n**Isi ulang:**\n1. Buka billing: [${creditsUrl}](${creditsUrl})\n2. Beli kredit\n3. Coba chat lagi\n\n**Alternatif:**\n- Gunakan model **gratis** (free) di ${providerName}\n- Setup provider lain di **Settings**`,
        journalRefs: [], relevantJournals: [],
      };
      insertChatMessage('assistant', errorResp.message, []);
      return errorResp;
    }
    throw new Error(`Gagal memproses chat: ${err.message}. Periksa API key dan kuota kamu.`);
  }
}

function clearSummaryCache() {
  cachedSummary = { lastMessageId: 0, text: '', model: '' };
}

module.exports = { processChat, detectIntent, getLLMClient, hasAnyApiKey, isGreeting, getAvailableModels, getCurrentConfig, MODELS, DEFAULT_MODEL, clearSummaryCache };
