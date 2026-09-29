import { useState, useEffect, useCallback, useMemo } from 'react';
import { parseTags } from '../utils/tagUtils';

export function useJournals() {
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [activeTag, setActiveTag] = useState(null);

  const fetchJournals = useCallback(async () => {
    try {
      const res = await fetch('/api/journals');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setJournals(data.journals || []);
      setSelected(new Set());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchJournals(); }, [fetchJournals]);

  // Extract all unique tags from journals
  const allTags = useMemo(() => {
    const tagSet = new Set();
    for (const j of journals) {
      for (const tag of parseTags(j.tags)) {
        tagSet.add(tag);
      }
    }
    return tagSet;
  }, [journals]);

  // Filter journals by active tag
  const filteredJournals = useMemo(() => {
    if (!activeTag) return journals;
    return journals.filter(j => {
      const tags = parseTags(j.tags);
      return tags.includes(activeTag);
    });
  }, [journals, activeTag]);

  const toggleSelect = useCallback((id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelected(prev => {
      if (prev.size === filteredJournals.length) return new Set();
      return new Set(filteredJournals.map(j => j.id));
    });
  }, [filteredJournals]);

  const handleDeleteSelected = useCallback(async (confirmAsync) => {
    if (selected.size === 0) return;
    const ok = confirmAsync
      ? await confirmAsync(`Yakin hapus ${selected.size} jurnal terpilih?`)
      : confirm(`Yakin hapus ${selected.size} jurnal terpilih?`);
    if (!ok) return;

    setDeleting(true);
    setError('');
    let deleted = 0;
    let failed = 0;

    for (const id of selected) {
      try {
        const res = await fetch(`/api/journals/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        deleted++;
      } catch (err) {
        failed++;
        console.error('Delete failed:', err.message);
      }
    }

    setDeleting(false);
    setSelected(new Set());
    await fetchJournals();

    if (failed > 0) {
      setError(`${deleted} dihapus, ${failed} gagal. Coba lagi.`);
    }
  }, [selected, fetchJournals]);

  const handleDeleteSingle = useCallback(async (id, title, confirmAsync) => {
    const ok = confirmAsync
      ? await confirmAsync(`Yakin hapus jurnal "${title}"?`)
      : confirm(`Yakin hapus jurnal "${title}"?`);
    if (!ok) return;
    try {
      const res = await fetch(`/api/journals/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchJournals();
    } catch (err) {
      setError(err.message);
    }
  }, [fetchJournals]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  // ── Update tags ───────────────────────────────────────────────

  const handleUpdateTags = useCallback(async (id, tags) => {
    const res = await fetch(`/api/journals/${id}/tags`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    // Update local state
    setJournals(prev => prev.map(j => j.id === id ? data.journal : j));
  }, []);

  return {
    journals: filteredJournals, loading, error, selected, deleting,
    toggleSelect, toggleSelectAll, handleDeleteSelected, handleDeleteSingle, clearSelection,
    setError,
    allTags, activeTag, setActiveTag,
    handleUpdateTags,
  };
}
