const express = require('express');
const router = express.Router();
const { processChat, clearSummaryCache } = require('../services/agent');
const { getChatHistory, clearChatHistory } = require('../db/queries');

// POST /api/chat — Kirim pesan, terima balasan AI
router.post('/', async (req, res) => {
  try {
    const { message, model, thesisTitle, academicMode, skipHistory } = req.body;
    if (process.env.NODE_ENV === 'development') {
      console.log('📥 Chat:', message.substring(0, 60) + (message.length > 60 ? '…' : ''));
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
    }

    // Check if client wants streaming
    const acceptSSE = req.headers.accept && req.headers.accept.includes('text/event-stream');

    if (acceptSSE) {
      // Server-Sent Events streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        const result = await processChat(message.trim(), (chunk) => {
          res.write(`data: ${JSON.stringify({ delta: chunk.delta, full: chunk.full })}\n\n`);
        }, model || null, thesisTitle || '', academicMode || false, skipHistory || false);
        res.write(`data: ${JSON.stringify({ done: true, result })}\n\n`);
        res.end();
      } catch (err) {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      }
    } else {
      // Regular JSON response
      const result = await processChat(message.trim(), null, model || null, thesisTitle || '', academicMode || false, skipHistory || false);
      res.json(result);
    }
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message || 'Gagal memproses chat.' });
  }
});

// GET /api/chat/history — Ambil chat history
router.get('/history', (req, res) => {
  try {
    const history = getChatHistory(50);
    res.json({ messages: history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/chat/history — Clear chat history
router.delete('/history', (req, res) => {
  try {
    clearChatHistory();
    clearSummaryCache();
    res.json({ message: 'Chat history dihapus.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
