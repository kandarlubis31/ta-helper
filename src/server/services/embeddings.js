const OpenAI = require('openai');

let openaiClient = null;
let cachedClientKey = '';
let cachedClientBase = '';

function getOpenAIClient() {
  const openaiKey = process.env.OPENAI_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  // Auto-detect: if user has OpenRouter but no OpenAI, use OpenRouter for embeddings
  const embedProvider = process.env.EMBEDDING_PROVIDER
    || (openrouterKey && !openaiKey ? 'openrouter' : 'openai');

  const currentKey = openaiKey || (embedProvider === 'openrouter' ? openrouterKey : null);
  const currentBase = embedProvider === 'openrouter' ? 'https://openrouter.ai/api/v1' : undefined;

  // Re-use cached client if config hasn't changed
  if (openaiClient && cachedClientKey === currentKey && cachedClientBase === currentBase) {
    return openaiClient;
  }

  if (openaiKey) {
    openaiClient = new OpenAI({ apiKey: openaiKey });
    cachedClientKey = openaiKey;
    cachedClientBase = '';
    return openaiClient;
  }

  // Fallback: use OpenRouter for embeddings (supports text-embedding-3-small etc.)
  if (openrouterKey) {
    openaiClient = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: openrouterKey,
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/tara-ta',
        'X-Title': 'TARA - Tugas Akhir Research Agent',
      },
    });
    cachedClientKey = openrouterKey;
    cachedClientBase = 'https://openrouter.ai/api/v1';
    return openaiClient;
  }

  throw new Error(
    'Tidak ada API key untuk embedding. ' +
    'Set OPENAI_API_KEY di .env — atau pakai OpenRouter otomatis kalau OPENROUTER_API_KEY ada. ' +
    'Embedding diperlukan untuk upload jurnal & plagiarism check.'
  );
}

/**
 * Get embeddings for an array of texts.
 * Batches into groups of 20 to respect API limits.
 */
async function getEmbeddings(texts) {
  if (!Array.isArray(texts) || texts.length === 0) return [];

  try {
    const oai = getOpenAIClient();
    const model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';

    const allEmbeddings = [];
    const BATCH = 20;

    for (let i = 0; i < texts.length; i += BATCH) {
      const batch = texts.slice(i, i + BATCH).map(t => t.replace(/\n/g, ' ').trim());
      const response = await oai.embeddings.create({
        model,
        input: batch,
      });
      for (const item of response.data) {
        allEmbeddings.push(item.embedding);
      }
    }

    return allEmbeddings;
  } catch (err) {
    const errMsg = err.message.toLowerCase();
    if (errMsg.includes('api key') || errMsg.includes('auth') || errMsg.includes('401') || errMsg.includes('403')) {
      throw new Error(
        'API key embedding tidak valid. ' +
        'Cek OPENAI_API_KEY di Settings atau set EMBEDDING_PROVIDER=openrouter ' +
        'kalau mau pake OpenRouter untuk embedding.'
      );
    }
    if (errMsg.includes('402') || errMsg.includes('insufficient credits')) {
      throw new Error('Kredit embedding tidak mencukupi. Isi ulang di dashboard provider.');
    }
    throw new Error(`Gagal generate embedding: ${err.message}`);
  }
}

/**
 * Get embedding for a single text.
 */
async function getSingleEmbedding(text) {
  const embeddings = await getEmbeddings([text]);
  return embeddings[0];
}

module.exports = { getEmbeddings, getSingleEmbedding };
