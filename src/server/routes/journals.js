const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { extractPdfText } = require('../services/pdfParser');
const { fetchByDoi } = require('../services/doiFetcher');
const { indexJournal, deleteJournalVectors } = require('../services/vectorStore');
const queries = require('../db/queries');

const DATA_DIR = process.env.DATA_DIR || './data';
const DEBUG = process.env.NODE_ENV !== 'production';

// Multer setup for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const pdfDir = path.join(DATA_DIR, 'pdfs');
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
    cb(null, pdfDir);
  },
  filename: (req, file, cb) => {
    const id = uuidv4();
    cb(null, `${id}.pdf`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Hanya file PDF yang diterima.'));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

// ── Helper: process a single PDF file (used by both single and multi upload) ──

async function processPdfFile(filePath, originalName, tags = '') {
  const journalId = uuidv4();

  if (DEBUG) console.log(`📄 Parsing PDF: ${originalName}`);
  const { text, numPages, metadata } = await extractPdfText(filePath);

  if (!text || text.trim().length < 50) {
    try { fs.unlinkSync(filePath); } catch {}
    return { error: 'PDF tidak mengandung teks (mungkin scan tanpa OCR).', originalName };
  }

  const filename = path.parse(originalName).name;
  const title = (metadata && metadata.Title && metadata.Title !== 'undefined')
    ? metadata.Title : filename;
  const authorRaw = (metadata && metadata.Author && metadata.Author !== 'undefined')
    ? metadata.Author : 'Unknown';

  queries.insertJournal({
    id: journalId,
    title,
    authors: JSON.stringify([{ given: '', family: authorRaw }]),
    year: (metadata && metadata.CreationDate)
      ? new Date(metadata.CreationDate).getFullYear()
      : new Date().getFullYear(),
    doi: null,
    source: 'upload',
    file_path: filePath,
    abstract: text.substring(0, 1000),
    full_text: text,
    tags,
  });

  let chunkCount = 0;
  try {
    chunkCount = await indexJournal(journalId, text);
  } catch (embedErr) {
    console.error('  ⚠️ Embedding error (journal tetap tersimpan):', embedErr.message);
  }

  return {
    journal: {
      id: journalId,
      title,
      authors: authorRaw,
      numPages,
      chunks: chunkCount,
      warning: chunkCount === 0 ? 'Tersimpan tapi gagal diindeks (cek API key embedding).' : undefined,
    },
    originalName,
  };
}

// POST /api/journals/upload — Upload PDF (single or multiple)
router.post('/upload', upload.array('files', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Minimal 1 file PDF wajib diupload.' });
    }

    // Parse tags from form data
    let tags = '';
    try { if (req.body.tags) tags = req.body.tags; } catch {}

    const results = [];
    const errors = [];

    for (const file of req.files) {
      try {
        const result = await processPdfFile(file.path, file.originalname, tags);
        if (result.error) {
          errors.push({ file: file.originalname, error: result.error });
        } else {
          results.push(result);
          if (DEBUG) console.log(`  ✓ ${file.originalname} → ${result.journal.title} (${result.journal.numPages}h, ${result.journal.chunks} chunks)`);
        }
      } catch (fileErr) {
        // Clean up on error
        if (file.path && fs.existsSync(file.path)) {
          try { fs.unlinkSync(file.path); } catch {}
        }
        errors.push({ file: file.originalname, error: fileErr.message });
      }
    }

    res.json({
      success: true,
      total: req.files.length,
      succeeded: results.length,
      failed: errors.length,
      journals: results.map(r => r.journal),
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('Upload error:', err);
    // Clean up all files on catastrophic error
    if (req.files) {
      for (const file of req.files) {
        if (file.path && fs.existsSync(file.path)) {
          try { fs.unlinkSync(file.path); } catch {}
        }
      }
    }
    res.status(500).json({ error: err.message || 'Gagal upload jurnal. Cek API key embedding di Settings.' });
  }
});



// POST /api/journals/doi — Fetch by DOI
router.post('/doi', async (req, res) => {
  try {
    const { doi } = req.body;
    if (!doi) return res.status(400).json({ error: 'DOI wajib diisi.' });

    const dataDir = process.env.DATA_DIR || './data';
    const result = await fetchByDoi(doi, dataDir);

    const journalId = uuidv4();
    const tags = Array.isArray(req.body.tags) ? JSON.stringify(req.body.tags) : '';
    queries.insertJournal({
      id: journalId,
      title: result.title,
      authors: result.authors,
      year: result.year,
      doi: result.doi,
      source: 'doi',
      file_path: result.pdfPath,
      abstract: result.abstract,
      full_text: result.fullText,
      tags,
    });

    // Index in Vectra
    if (result.fullText && result.fullText.length > 100) {
      await indexJournal(journalId, result.fullText);
    }

    res.json({
      success: true,
      journal: {
        id: journalId,
        title: result.title,
        year: result.year,
        doi: result.doi,
        hasPdf: !!result.pdfPath,
      },
    });
  } catch (err) {
    console.error('DOI fetch error:', err);
    const errMsg = err.message || '';
    if (errMsg.includes('DOI tidak ditemukan') || errMsg.includes('not found') || errMsg.includes('404')) {
      return res.status(404).json({
        error: 'DOI tidak ditemukan. Periksa kembali nomor DOI kamu.\n\nFormat yang benar: 10.1016/j.eswa.2021.114456',
      });
    }
    if (errMsg.includes('timeout') || errMsg.includes('ETIMEDOUT') || errMsg.includes('ECONNREFUSED')) {
      return res.status(503).json({
        error: 'Gagal terhubung ke CrossRef/Unpaywall. Cek koneksi internet dan coba lagi.',
      });
    }
    res.status(500).json({ error: errMsg || 'Gagal fetch DOI. Coba lagi nanti.' });
  }
});

// GET /api/journals — List all journals
router.get('/', (req, res) => {
  try {
    const journals = queries.getAllJournals();
    res.json({ journals, count: journals.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/journals/:id — Get one journal
router.get('/:id', (req, res) => {
  try {
    const journal = queries.getJournalById(req.params.id);
    if (!journal) return res.status(404).json({ error: 'Jurnal tidak ditemukan.' });
    res.json({ journal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/journals/:id/tags — Update journal tags
router.patch('/:id/tags', async (req, res) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;
    const journal = queries.getJournalById(id);
    if (!journal) return res.status(404).json({ error: 'Jurnal tidak ditemukan.' });

    const tagsStr = Array.isArray(tags) ? JSON.stringify(tags) : (tags || '');
    queries.updateJournalTags(id, tagsStr);

    const updated = queries.getJournalById(id);
    res.json({ success: true, journal: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/journals/:id — Delete journal + vectors
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const journal = queries.getJournalById(id);
    if (!journal) return res.status(404).json({ error: 'Jurnal tidak ditemukan.' });

    // Delete vectors
    await deleteJournalVectors(id);

    // Delete file if exists
    if (journal.file_path && fs.existsSync(journal.file_path)) {
      fs.unlinkSync(journal.file_path);
    }

    // Delete from DB
    queries.deleteJournal(id);

    res.json({ success: true, message: `Jurnal "${journal.title}" dihapus.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
