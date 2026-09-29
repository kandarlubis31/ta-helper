const express = require('express');
const router = express.Router();
const { generateBibliography } = require('../services/citations');

// POST /api/citations/generate — Generate bibliography
router.post('/generate', (req, res) => {
  try {
    const { journalIds, format } = req.body;
    const fmt = format || 'apa';

    if (!['apa', 'ieee'].includes(fmt.toLowerCase())) {
      return res.status(400).json({ error: 'Format tidak dikenal. Pilih: apa atau ieee.' });
    }

    const result = generateBibliography(journalIds || [], fmt);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
