import { useState, useEffect, useCallback } from 'react';

export const STATUSES = [
  { id: 'belum', label: 'Belum Mulai', icon: '○' },
  { id: 'draft', label: 'Draft', icon: '◐' },
  { id: 'revisi', label: 'Revisi', icon: '◑' },
  { id: 'selesai', label: 'Selesai', icon: '●' },
];

export const CHAPTER_LABELS = {
  bab1: 'Bab I', bab2: 'Bab II', bab3: 'Bab III', bab4: 'Bab IV', bab5: 'Bab V',
  bab6: 'Bab VI', bab7: 'Bab VII', bab8: 'Bab VIII', bab9: 'Bab IX', bab10: 'Bab X',
};

export function useProgress() {
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', status: 'belum', notes: '', chapter: '' });
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(null); // status id string

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch('/api/progress');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProgress(data.progress || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  const handleEdit = useCallback((item) => {
    setEditing(item);
    setEditForm({
      chapter: item.chapter || '',
      title: item.title || '',
      status: item.status || 'belum',
      notes: item.notes || '',
    });
  }, []);

  // ── Add new item ─────────────────────────────────────────────

  const handleAddNew = useCallback(() => {
    // Find next available chapter number
    const existingNums = progress
      .map(p => parseInt((p.chapter || '').replace('bab', '')))
      .filter(n => !isNaN(n));
    let nextNum = 1;
    while (existingNums.includes(nextNum)) nextNum++;

    setEditing({ chapter: `bab${nextNum}`, title: '', status: 'belum', notes: '' });
    setEditForm({
      chapter: `bab${nextNum}`,
      title: '',
      status: 'belum',
      notes: '',
    });
  }, [progress]);

  const isNewItem = !editing?.id && editing?.chapter;

  const handleSave = useCallback(async () => {
    if (!editing) return;
    setSaving(true);
    setError('');

    try {
      const body = {
        chapter: editing.chapter,
        title: editForm.title,
        status: editForm.status,
        notes: editForm.notes,
        action: isNewItem ? 'create' : undefined,
      };

      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProgress(data.progress);
      setEditing(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [editing, editForm, isNewItem]);

  // ── Drag & Drop ──────────────────────────────────────────────

  const handleDragStart = useCallback((e, chapter) => {
    e.dataTransfer.setData('text/plain', chapter);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');
  }, []);

  const handleDragEnd = useCallback((e) => {
    e.currentTarget.classList.remove('dragging');
    setDragOver(null);
  }, []);

  const handleDragOver = useCallback((e, status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(prev => prev !== status ? status : prev);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(null);
  }, []);

  const handleDrop = useCallback(async (e, newStatus) => {
    e.preventDefault();
    setDragOver(null);
    const chapter = e.dataTransfer.getData('text/plain');
    if (!chapter) return;

    const item = progress.find(p => p.chapter === chapter);
    if (!item || item.status === newStatus) return;

    // Optimistic update
    setProgress(prev => prev.map(p =>
      p.chapter === chapter ? { ...p, status: newStatus } : p
    ));

    // Fire-and-forget API update
    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter, status: newStatus, action: 'move' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProgress(data.progress); // Sync with server
    } catch (err) {
      setError(err.message);
      // Revert on failure
      setProgress(prev => prev.map(p =>
        p.chapter === chapter ? { ...p, status: item.status } : p
      ));
    }
  }, [progress]);

  // ── Move item (mobile fallback / button click) ────────────

  const handleMove = useCallback(async (chapter, newStatus) => {
    const item = progress.find(p => p.chapter === chapter);
    if (!item || item.status === newStatus) return;

    // Optimistic update
    setProgress(prev => prev.map(p =>
      p.chapter === chapter ? { ...p, status: newStatus } : p
    ));

    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter, status: newStatus, action: 'move' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProgress(data.progress);
    } catch (err) {
      setError(err.message);
      // Revert on failure
      setProgress(prev => prev.map(p =>
        p.chapter === chapter ? { ...p, status: item.status } : p
      ));
    }
  }, [progress]);

  const getChapterLabel = useCallback((ch) => CHAPTER_LABELS[ch] || ch, []);

  // ── Delete item ─────────────────────────────────────────────

  const handleDelete = useCallback(async (item, e, confirmAsync) => {
    e.stopPropagation();
    const ok = confirmAsync
      ? await confirmAsync(`Hapus "${CHAPTER_LABELS[item.chapter] || item.chapter}: ${item.title || '—'}"?`)
      : confirm(`Hapus "${CHAPTER_LABELS[item.chapter] || item.chapter}: ${item.title || '—'}"?`);
    if (!ok) return;

    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter: item.chapter, action: 'delete' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProgress(data.progress);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // ── Dashboard stats ─────────────────────────────────────────

  const getStats = useCallback(() => {
    const total = progress.length;
    const done = progress.filter(p => p.status === 'selesai').length;
    const inProgress = progress.filter(p => p.status !== 'selesai' && p.status !== 'belum').length;
    const notStarted = progress.filter(p => p.status === 'belum').length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, notStarted, pct };
  }, [progress]);

  // ── AI summary ──────────────────────────────────────────────

  const [aiSummary, setAiSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  const handleAiSummary = useCallback(async () => {
    if (progress.length === 0) return;
    setSummaryLoading(true);
    try {
      const stats = getStats();
      const context = progress.map(p => {
        const label = CHAPTER_LABELS[p.chapter] || p.chapter;
        const statusMap = { belum: 'Belum', draft: 'Draft', revisi: 'Revisi', selesai: 'Selesai' };
        return `- ${label}: ${p.title || 'Tanpa judul'} [${statusMap[p.status]}]${p.notes ? ` — ${p.notes}` : ''}`;
      }).join('\n');

      const msg = `Analisis progres TA saya. ${stats.done}/${stats.total} selesai (${stats.pct}%), ${stats.inProgress} dalam proses.\n\n${context}\n\nTolong berikan:\n1. Ringkasan singkat status progres\n2. Rekomendasi prioritas (mana yang harus dikerjakan duluan)\n3. Estimasi selesai jika memungkinkan\n\nFormat: poin-poin singkat, Bahasa Indonesia.`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, skipHistory: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiSummary(data.message || '');
    } catch (err) {
      setAiSummary(`Gagal analisis: ${err.message}`);
    } finally {
      setSummaryLoading(false);
    }
  }, [progress, getStats]);

  return {
    progress, loading, error, editing, editForm, saving,
    setEditForm, setEditing, fetchProgress,
    handleEdit, handleSave, handleAddNew, handleDelete, getChapterLabel,
    isNewItem, dragOver,
    handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop,
    getStats, aiSummary, summaryLoading, handleAiSummary,
    handleMove,
  };
}
