const { getDatabase } = require('./schema');

// === Journals ===

function insertJournal(journal) {
  const db = getDatabase();
  return db.prepare(`
    INSERT INTO journals (id, title, authors, year, doi, source, file_path, abstract, full_text, tags)
    VALUES (@id, @title, @authors, @year, @doi, @source, @file_path, @abstract, @full_text, @tags)
  `).run(journal);
}

function getJournalById(id) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM journals WHERE id = ?').get(id);
}

function getAllJournals() {
  const db = getDatabase();
  return db.prepare('SELECT * FROM journals ORDER BY indexed_at DESC').all();
}

function deleteJournal(id) {
  const db = getDatabase();
  return db.prepare('DELETE FROM journals WHERE id = ?').run(id);
}

function updateJournalTags(id, tags) {
  const db = getDatabase();
  return db.prepare('UPDATE journals SET tags = ? WHERE id = ?').run(tags, id);
}

function getJournalCount() {
  const db = getDatabase();
  return db.prepare('SELECT COUNT(*) as count FROM journals').get().count;
}

// === Chat Messages ===

function insertChatMessage(role, content, journalRefs) {
  const db = getDatabase();
  return db.prepare(`
    INSERT INTO chat_messages (role, content, journal_refs)
    VALUES (?, ?, ?)
  `).run(role, content, JSON.stringify(journalRefs || []));
}

function getChatHistory(limit = 50) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT ?').all(limit).reverse();
}

function getRecentChatMessages(limit = 10) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT ?').all(limit).reverse();
}

function clearChatHistory() {
  const db = getDatabase();
  return db.prepare('DELETE FROM chat_messages').run();
}

// === Progress ===

function getAllProgress() {
  const db = getDatabase();
  return db.prepare('SELECT * FROM progress ORDER BY id ASC').all();
}

function updateProgress(chapter, updates) {
  const db = getDatabase();
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(updates)) {
    if (['title', 'status', 'notes'].includes(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }
  if (fields.length === 0) return null;
  fields.push("updated_at = CURRENT_TIMESTAMP");
  values.push(chapter);
  return db.prepare(`UPDATE progress SET ${fields.join(', ')} WHERE chapter = ?`).run(...values);
}

function insertProgress(chapter, title, status, notes) {
  const db = getDatabase();
  return db.prepare(`
    INSERT INTO progress (chapter, title, status, notes)
    VALUES (?, ?, ?, ?)
  `).run(chapter, title, status || 'belum', notes || '');
}

function deleteProgress(chapter) {
  const db = getDatabase();
  return db.prepare('DELETE FROM progress WHERE chapter = ?').run(chapter);
}

// === Config ===

function getConfig(key) {
  const db = getDatabase();
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setConfig(key, value) {
  const db = getDatabase();
  return db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, value);
}

module.exports = {
  insertJournal,
  getJournalById,
  getAllJournals,
  deleteJournal,
  updateJournalTags,
  getJournalCount,
  insertChatMessage,
  getChatHistory,
  getRecentChatMessages,
  clearChatHistory,
  getAllProgress,
  updateProgress,
  insertProgress,
  deleteProgress,
  getConfig,
  setConfig,
};
