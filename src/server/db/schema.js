const Database = require('better-sqlite3');
const path = require('path');

let db = null;

function initDatabase(dataDir) {
  const dbPath = path.join(dataDir, 'tara.db');
  db = new Database(dbPath);

  // Enable WAL mode for better concurrent performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS journals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      authors TEXT,
      year INTEGER,
      doi TEXT,
      source TEXT,
      file_path TEXT,
      abstract TEXT,
      full_text TEXT,
      tags TEXT DEFAULT '',
      indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      journal_refs TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter TEXT NOT NULL UNIQUE,
      title TEXT,
      status TEXT DEFAULT 'belum',
      notes TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Seed default progress if empty
  const count = db.prepare('SELECT COUNT(*) as c FROM progress').get();
  if (count.c === 0) {
    const insert = db.prepare('INSERT INTO progress (chapter, title, status) VALUES (?, ?, ?)');
    const chapters = [
      ['bab1', 'Pendahuluan', 'belum'],
      ['bab2', 'Tinjauan Pustaka', 'belum'],
      ['bab3', 'Metodologi Penelitian', 'belum'],
      ['bab4', 'Hasil dan Pembahasan', 'belum'],
      ['bab5', 'Kesimpulan dan Saran', 'belum'],
    ];
    const tx = db.transaction(() => {
      for (const [ch, title, status] of chapters) {
        insert.run(ch, title, status);
      }
    });
    tx();
  }

  return db;
}

function getDatabase() {
  if (!db) throw new Error('Database belum diinisialisasi. Panggil initDatabase() dulu.');
  return db;
}

module.exports = { initDatabase, getDatabase };
