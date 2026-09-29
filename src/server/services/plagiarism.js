const { getEmbeddings } = require('./embeddings');
const { searchAllChunks } = require('./vectorStore');

/**
 * Split text into sentences.
 */
function splitSentences(text) {
  if (!text) return [];
  // Match sentences ending with . ! ? followed by space or end
  const sentences = text.match(/[^.!?\n]+[.!?]+[\])'"`’”]*/g) || [];
  if (sentences.length === 0 && text.trim()) {
    return [text.trim()];
  }
  return sentences.map(s => s.trim()).filter(s => s.length > 5);
}

/**
 * Calculate cosine similarity between two vectors.
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Check plagiarism of input text against journal repository.
 */
async function checkPlagiarism(text, { getJournalById }) {
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return { overallScore: 0, results: [], message: 'Tidak ada kalimat yang terdeteksi. Pastikan teks diakhiri tanda baca (. ! ?).' };
  }

  // Batch get embeddings for ALL sentences at once
  let sentenceEmbeddings;
  try {
    sentenceEmbeddings = await getEmbeddings(sentences);
  } catch (embedErr) {
    // Embedding failure (e.g., no API key, insufficient credits)
    throw new Error(`Gagal generate embedding: ${embedErr.message}`);
  }

  if (!sentenceEmbeddings || sentenceEmbeddings.length === 0) {
    return { overallScore: 0, results: [], message: 'Gagal memproses teks. Cek API key embedding di Settings.' };
  }

  const results = [];
  let totalScore = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const vector = sentenceEmbeddings[i];

    if (!vector) {
      results.push({
        sentenceIndex: i, sentence, score: 0, status: 'aman',
        journalId: null, journalTitle: null, snippet: null,
      });
      continue;
    }

    try {
      const matches = await searchAllChunks(vector, 0.70, 5);

      if (matches.length > 0) {
        const best = matches[0];
        let journal = null;
        try {
          journal = getJournalById(best.item.metadata.journalId);
        } catch {}

        const similarity = best.score;
        const status = similarity > 0.85 ? 'tinggi' : similarity > 0.70 ? 'sedang' : 'aman';

        results.push({
          sentenceIndex: i,
          sentence,
          score: similarity,
          status,
          journalId: best.item.metadata.journalId,
          journalTitle: journal ? journal.title : 'Unknown',
          snippet: best.item.metadata.text,
        });

        totalScore += similarity;
      } else {
        results.push({
          sentenceIndex: i,
          sentence,
          score: 0,
          status: 'aman',
          journalId: null,
          journalTitle: null,
          snippet: null,
        });
      }
    } catch (searchErr) {
      console.error(`  ⚠️ Search error for sentence ${i}:`, searchErr.message);
      results.push({
        sentenceIndex: i,
        sentence,
        score: 0,
        status: 'aman',
        journalId: null,
        journalTitle: null,
        snippet: null,
      });
    }
  }

  const overallScore = sentences.length > 0
    ? Math.round((totalScore / sentences.length) * 100)
    : 0;

  return { overallScore, results };
}

module.exports = { checkPlagiarism, splitSentences, cosineSimilarity };
