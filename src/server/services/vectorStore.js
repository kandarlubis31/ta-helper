const { LocalIndex } = require('vectra');
const path = require('path');
const { getEmbeddings } = require('./embeddings');

const DEBUG = process.env.NODE_ENV !== 'production';

let index = null;

async function initVectorStore(dataDir) {
  const vectorPath = path.join(dataDir, 'vectors');
  index = new LocalIndex(path.resolve(vectorPath));
  if (!await index.isIndexCreated()) {
    await index.createIndex();
    if (DEBUG) console.log('  ✓ Vectra index created');
  } else {
    if (DEBUG) console.log('  ✓ Vectra index loaded');
  }
  return index;
}

function getIndex() {
  if (!index) throw new Error('Vector store belum diinisialisasi.');
  return index;
}

/**
 * Chunk text into paragraphs (approx 500-1000 chars each)
 */
function chunkText(text, maxChunkSize = 1000) {
  if (!text) return [];

  // Split by double newline (paragraphs) first
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 50);

  const chunks = [];
  for (const para of paragraphs) {
    if (para.length <= maxChunkSize) {
      chunks.push(para.trim());
    } else {
      // Further split long paragraphs by sentences
      const sentences = para.match(/[^.!?]+[.!?]+[\])'"`’”]*/g) || [para];
      let currentChunk = '';
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence;
        } else {
          currentChunk += ' ' + sentence;
        }
      }
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
      }
    }
  }

  return chunks;
}

/**
 * Index a journal's full text into Vectra
 */
async function indexJournal(journalId, fullText) {
  const idx = getIndex();
  const chunks = chunkText(fullText);

  if (chunks.length === 0) return 0;

  // Batch embed chunks (5 at a time to respect API rate limits)
  const BATCH_SIZE = 5;
  let indexedCount = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const embeddings = await getEmbeddings(batch);

    const items = batch.map((text, j) => ({
      id: `${journalId}-chunk-${i + j}`,
      vector: embeddings[j],
      metadata: {
        journalId,
        chunkIndex: i + j,
        text: text.substring(0, 500),
      },
    }));

    for (const item of items) {
      await idx.insertItem(item);
    }
    indexedCount += items.length;

    if (DEBUG) console.log(`  📝 Indexed ${indexedCount}/${chunks.length} chunks for journal ${journalId}`);
  }

  return indexedCount;
}

/**
 * Semantic search across indexed journals
 */
async function searchSimilar(query, topK = 3) {
  const idx = getIndex();

  let queryVector;
  try {
    const vectors = await getEmbeddings([query]);
    queryVector = vectors[0];
  } catch (embedErr) {
    console.error('  ⚠️ searchSimilar: embedding failed:', embedErr.message);
    return []; // Gracefully return empty results
  }

  if (!queryVector) return [];

  let results;
  try {
    results = await idx.queryItems(queryVector, topK + 5);
  } catch (queryErr) {
    console.error('  ⚠️ searchSimilar: query failed:', queryErr.message);
    return [];
  }

  // Deduplicate by journalId, keep best match per journal
  const seen = new Set();
  const deduped = [];
  for (const r of results) {
    const jid = r.item.metadata.journalId;
    if (!seen.has(jid) && deduped.length < topK) {
      seen.add(jid);
      deduped.push({
        journalId: jid,
        score: r.score,
        snippet: r.item.metadata.text,
      });
    }
  }

  return deduped;
}

/**
 * Search all chunks for plagiarism check (returns all matches above threshold)
 */
async function searchAllChunks(queryVector, minScore = 0.70, maxResults = 20) {
  const idx = getIndex();
  const results = await idx.queryItems(queryVector, maxResults);
  return results.filter(r => r.score >= minScore);
}

/**
 * Delete all chunks for a journal
 */
async function deleteJournalVectors(journalId) {
  const idx = getIndex();
  try {
    // Vectra v0.8+ supports listItems returning an async iterable
    const items = idx.listItems();
    const toDelete = [];

    if (items && typeof items[Symbol.asyncIterator] === 'function') {
      for await (const item of items) {
        if (item.metadata?.journalId === journalId) {
          toDelete.push(item.id);
        }
      }
    }

    if (toDelete.length > 0) {
      await Promise.all(toDelete.map(id => idx.deleteItem(id)));
    }
    if (DEBUG) console.log(`  🗑  Deleted ${toDelete.length} vectors for journal ${journalId}`);
    return toDelete.length;
  } catch (e) {
    console.warn(`⚠️  Warning: couldn't delete vectors for ${journalId}:`, e.message);
    return 0;
  }
}

module.exports = {
  initVectorStore,
  getIndex,
  chunkText,
  indexJournal,
  searchSimilar,
  searchAllChunks,
  deleteJournalVectors,
};
