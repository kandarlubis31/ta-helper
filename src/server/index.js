require('dotenv').config();

const DEBUG = process.env.NODE_ENV !== 'production';

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./db/schema');
const { initVectorStore } = require('./services/vectorStore');

const chatRouter = require('./routes/chat');
const journalsRouter = require('./routes/journals');
const plagcheckRouter = require('./routes/plagcheck');
const progressRouter = require('./routes/progress');
const citationsRouter = require('./routes/citations');
const configRouter = require('./routes/config');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || './data';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/chat', chatRouter);
app.use('/api/journals', journalsRouter);
app.use('/api/plagcheck', plagcheckRouter);
app.use('/api/progress', progressRouter);
app.use('/api/citations', citationsRouter);
app.use('/api/config', configRouter);

// Serve static frontend build in production
const distPath = path.join(__dirname, '../../dist');
const fs = require('fs');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Load config from SQLite into process.env (overrides .env if present)
function loadConfigFromDB() {
  const { getDatabase } = require('./db/schema');
  try {
    const db = getDatabase();

    // Clear ALL known provider keys from env first — don't trust stale .env values
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const rows = db.prepare('SELECT key, value FROM config').all();
    for (const { key, value } of rows) {
      if (value) {
        process.env[key] = value;
        if (DEBUG) console.log(`  📋 config: ${key} loaded from database`);
      }
    }
  } catch (e) {
    // DB not yet initialized — ignore
  }
}

async function start() {
  try {
    console.log('🔧 Initializing database...');
    initDatabase(DATA_DIR);

    if (DEBUG) console.log('🔧 Loading config from database...');
    loadConfigFromDB();

    if (DEBUG) console.log('🔧 Initializing vector store...');
    await initVectorStore(DATA_DIR);

    app.listen(PORT, () => {
      console.log(`🚀 TARA server: http://localhost:${PORT} — ${path.resolve(DATA_DIR)}`);
    });
  } catch (err) {
    console.error('❌ Gagal start server:', err.message);
    process.exit(1);
  }
}

start();
