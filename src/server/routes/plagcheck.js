const express = require('express');
const router = express.Router();
const { checkPlagiarism } = require('../services/plagiarism');
const queries = require('../db/queries');

// POST /api/plagcheck — Check plagiarism
router.post('/', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length < 20) {
      return res.status(400).json({ error: 'Teks minimal 20 karakter untuk dicek plagiarisme.' });
    }

    const allJournals = queries.getAllJournals();
    if (allJournals.length === 0) {
      return res.status(400).json({ error: 'Belum ada jurnal di repository. Upload jurnal dulu sebelum cek plagiarisme.' });
    }

    // Check if vector store has indexed items (simplified — just check if any non-empty vector file exists)
    const { getIndex } = require('../services/vectorStore');
    try {
      const idx = getIndex();
      let hasItems = false;
      const items = idx.listItems();
      if (items && typeof items[Symbol.asyncIterator] === 'function') {
        for await (const _ of items) { hasItems = true; break; }
      }
      if (!hasItems && allJournals.length > 0) {
        return res.status(400).json({
          error: 'Jurnal belum diindeks ke vector store. ' +
            'Coba upload ulang jurnal atau periksa API key embedding di Settings.',
        });
      }
    } catch {}

    const result = await checkPlagiarism(text.trim(), {
      getJournalById: queries.getJournalById,
    });

    // Add summary stats
    const tinggiCount = result.results.filter(r => r.status === 'tinggi').length;
    const sedangCount = result.results.filter(r => r.status === 'sedang').length;
    const amanCount = result.results.filter(r => r.status === 'aman').length;

    res.json({
      ...result,
      summary: {
        totalSentences: result.results.length,
        message: result.message || undefined,
        tinggi: tinggiCount,
        sedang: sedangCount,
        aman: amanCount,
      },
    });
  } catch (err) {
    console.error('Plagiarism check error:', err);
    const errMsg = err.message || '';
    if (errMsg.includes('API key') || errMsg.includes('OPENAI_API_KEY') || errMsg.includes('embedding')) {
      return res.status(400).json({
        error: '❌ ' + errMsg + '\n\n🔧 Setup: Buka tab Settings → pastikan OPENAI_API_KEY atau set EMBEDDING_PROVIDER=openrouter.',
      });
    }
    res.status(500).json({
      error: errMsg || 'Gagal cek plagiarisme. Cek API key embedding di Settings.',
    });
  }
});

module.exports = router;
