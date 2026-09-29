const express = require('express');
const router = express.Router();
const queries = require('../db/queries');

// GET /api/progress — Get all progress
router.get('/', (req, res) => {
  try {
    const progress = queries.getAllProgress();
    res.json({ progress });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/progress — Update or create progress
router.post('/', (req, res) => {
  try {
    const { chapter, title, status, notes, action } = req.body;

    // ── Delete item ──────────────────────────────────────────
    if (action === 'delete') {
      if (!chapter) {
        return res.status(400).json({ error: 'Chapter wajib diisi.' });
      }
      queries.deleteProgress(chapter);
      const updatedProgress = queries.getAllProgress();
      return res.json({ success: true, progress: updatedProgress });
    }

    // ── Create new item ──────────────────────────────────────────
    if (action === 'create') {
      if (!chapter || !title) {
        return res.status(400).json({ error: 'Chapter dan judul wajib diisi.' });
      }
      // Check for duplicate
      const existing = queries.getAllProgress().find(p => p.chapter === chapter);
      if (existing) {
        return res.status(409).json({ error: `Chapter "${chapter}" sudah ada. Gunakan chapter lain atau edit yang sudah ada.` });
      }
      queries.insertProgress(chapter, title, status || 'belum', notes || '');
      const updatedProgress = queries.getAllProgress();
      return res.json({ success: true, progress: updatedProgress });
    }

    // ── Quick status change (drag-drop) ──────────────────────────
    if (action === 'move') {
      if (!chapter || !status) {
        return res.status(400).json({ error: 'Chapter dan status wajib diisi.' });
      }
      const validStatus = ['belum', 'draft', 'revisi', 'selesai'];
      if (!validStatus.includes(status)) {
        return res.status(400).json({ error: `Status tidak valid: ${status}` });
      }
      queries.updateProgress(chapter, { status });
      const updatedProgress = queries.getAllProgress();
      return res.json({ success: true, progress: updatedProgress });
    }

    // ── Full update (modal save) ─────────────────────────────────
    if (!chapter) {
      return res.status(400).json({ error: 'Chapter wajib diisi.' });
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (status !== undefined) {
      const validStatus = ['belum', 'draft', 'revisi', 'selesai'];
      if (!validStatus.includes(status)) {
        return res.status(400).json({ error: `Status tidak valid. Pilih: ${validStatus.join(', ')}` });
      }
      updates.status = status;
    }
    if (notes !== undefined) updates.notes = notes;

    queries.updateProgress(chapter, updates);

    const updatedProgress = queries.getAllProgress();
    res.json({ success: true, progress: updatedProgress });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
