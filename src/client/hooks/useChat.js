import { useState, useRef, useEffect, useCallback } from 'react';

const THESIS_TITLE_KEY = 'tara_thesis_title';
const ACADEMIC_MODE_KEY = 'tara_academic_mode';
const MESSAGES_CACHE_KEY = 'tara_messages_cache';

// ── Shared streaming helper — used by both handleSend & handleRegenerate ─
async function streamFromApi(message, thesisTitle, academicMode, {
  setStreamingText,
  setIsStreaming,
  setMessages,
  onMessageDone,
  skipHistory = false,
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000); // 2 min timeout

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        message,
        thesisTitle: thesisTitle || undefined,
        academicMode,
        skipHistory,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Server error (${res.status})`);
    }

    if (!res.body) {
      throw new Error('Response body is empty');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let streamError = null;

    // Set streaming IMMEDIATELY — prevents stuck "mengetik..." state
    setIsStreaming(true);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.error) { streamError = data.error; break; }
            if (data.done) {
              setStreamingText('');
              setIsStreaming(false);
              setMessages(prev => [...prev, onMessageDone(data)]);
            } else if (data.delta !== undefined) {
              setStreamingText(data.full);
            }
          } catch { /* skip partial chunks */ }
        }
      }
      if (streamError) break;
    }

    setIsStreaming(false);
    setStreamingText('');

    if (streamError) {
      throw new Error(streamError);
    }
  } finally {
    clearTimeout(timeout);
  }
}

export function useChat() {
  const [messages, setMessages] = useState(() => {
    // Instant load from localStorage cache — no flicker on refresh
    try {
      const cached = localStorage.getItem(MESSAGES_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* corrupted cache, ignore */ }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [thesisTitle, setThesisTitle] = useState(() => {
    try {
      return localStorage.getItem(THESIS_TITLE_KEY) || '';
    } catch { return ''; }
  });
  const [showThesisModal, setShowThesisModal] = useState(() => {
    try {
      return !localStorage.getItem(THESIS_TITLE_KEY);
    } catch { return true; }
  });
  const [academicMode, setAcademicMode] = useState(() => {
    try {
      return localStorage.getItem(ACADEMIC_MODE_KEY) === 'true';
    } catch { return false; }
  });
  const [historyLoaded, setHistoryLoaded] = useState(false);
  // Track if initial load from cache was used (to skip saving empty array before server fetch)
  const cacheUsedRef = useRef(messages.length > 0);

  const toggleAcademicMode = useCallback(() => {
    setAcademicMode(prev => {
      const next = !prev;
      try { localStorage.setItem(ACADEMIC_MODE_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // ── Load history on mount ────────────────────────────────────────

  useEffect(() => {
    loadHistory();
  }, []);

  // ── Auto-scroll when new messages come (only if near bottom) ─────

  useEffect(() => {
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingText, isNearBottom]);

  // ── Persist messages to localStorage ─────────────────────────────

  useEffect(() => {
    if (!historyLoaded) return; // Don't save before initial load
    try {
      if (messages.length > 0) {
        localStorage.setItem(MESSAGES_CACHE_KEY, JSON.stringify(messages));
      } else {
        localStorage.removeItem(MESSAGES_CACHE_KEY);
      }
    } catch { /* quota exceeded, ignore */ }
  }, [messages, historyLoaded]);

  // ── Track scroll position ────────────────────────────────────────

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const threshold = 100;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setIsNearBottom(near);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsNearBottom(true);
  }, []);

  // ── Load history ─────────────────────────────────────────────────

  const loadHistory = useCallback(async () => {
    // If we already loaded from cache, set historyLoaded immediately
    // so the skeleton doesn't flash. Then silently sync from server.
    if (cacheUsedRef.current) {
      setHistoryLoaded(true);
    }

    try {
      const res = await fetch('/api/chat/history');
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages);
      }
    } catch { /* silent */ }
    finally {
      setHistoryLoaded(true);
    }
  }, []);

  // ── Send message ─────────────────────────────────────────────────

  const handleSend = useCallback(async (text) => {
    setError('');
    setLoading(true);

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);

    setIsNearBottom(true);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    try {
      let currentThesis = '';
      try { currentThesis = localStorage.getItem(THESIS_TITLE_KEY) || ''; } catch { /* silent */ }
      const isAcademic = localStorage.getItem(ACADEMIC_MODE_KEY) === 'true';

      await streamFromApi(text, currentThesis, isAcademic, {
        setStreamingText,
        setIsStreaming,
        setMessages,
        onMessageDone: (data) => ({
          role: 'assistant',
          content: data.result.message,
          journalRefs: data.result.journalRefs,
          relevantJournals: data.result.relevantJournals,
          responseNum: 1,
        }),
      });
    } catch (err) {
      const msg = err.message || 'Gagal menghubungi AI.';
      setError(msg);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Error: ${msg}`,
      }]);
      setIsStreaming(false);
      setStreamingText('');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Clear history ────────────────────────────────────────────────

  const handleClear = useCallback(async () => {
    try {
      await fetch('/api/chat/history', { method: 'DELETE' });
      setMessages([]);
      try { localStorage.removeItem(MESSAGES_CACHE_KEY); } catch {}
    } catch {
      setError('Gagal menghapus history.');
    }
  }, []);

  const handleClearAll = useCallback(async () => {
    await handleClear();
    try {
      localStorage.removeItem(THESIS_TITLE_KEY);
      localStorage.removeItem(MESSAGES_CACHE_KEY);
      setThesisTitle('');
      setShowThesisModal(true);
    } catch { /* silent */ }
  }, [handleClear]);

  const confirmThesisTitle = useCallback((title) => {
    const trimmed = title.trim();
    if (trimmed) {
      try { localStorage.setItem(THESIS_TITLE_KEY, trimmed); } catch {}
      setThesisTitle(trimmed);
    }
    setShowThesisModal(false);
  }, []);

  const skipThesisTitle = useCallback(() => {
    setShowThesisModal(false);
  }, []);

  const updateThesisTitle = useCallback((title) => {
    const trimmed = title.trim();
    try { localStorage.setItem(THESIS_TITLE_KEY, trimmed); } catch {}
    setThesisTitle(trimmed);
  }, []);

  // ── Regenerate last response (cache old + append new) ────────────

  const regeneratingRef = useRef(false);

  const handleRegenerate = useCallback(async () => {
    if (regeneratingRef.current || loading) return;
    regeneratingRef.current = true;

    const msgs = messages;
    const lastUserIdx = msgs.map((m, i) => ({ m, i })).filter(x => x.m.role === 'user').pop()?.i;
    if (lastUserIdx === undefined) { regeneratingRef.current = false; return; }
    const lastUserContent = msgs[lastUserIdx].content;

    // Count existing AI responses after this user message → responseNum
    let existingResponses = 0;
    for (let i = lastUserIdx + 1; i < msgs.length; i++) {
      if (msgs[i].role === 'assistant' && msgs[i].content) existingResponses++;
    }
    const responseNum = existingResponses + 1;

    setLoading(true);
    setError('');
    setIsNearBottom(true);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    try {
      let currentThesis = '';
      try { currentThesis = localStorage.getItem(THESIS_TITLE_KEY) || ''; } catch { /* silent */ }
      const isAcademic = localStorage.getItem(ACADEMIC_MODE_KEY) === 'true';

      await streamFromApi(lastUserContent, currentThesis, isAcademic, {
        skipHistory: true,
        setStreamingText,
        setIsStreaming,
        setMessages,
        onMessageDone: (data) => ({
          role: 'assistant',
          content: data.result.message,
          journalRefs: data.result.journalRefs,
          relevantJournals: data.result.relevantJournals,
          responseNum,
        }),
      });
    } catch (err) {
      const msg = err.message || 'Gagal menghubungi AI.';
      setError(msg);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Error: ${msg}`,
        responseNum,
      }]);
      setIsStreaming(false);
      setStreamingText('');
    } finally {
      setLoading(false);
      regeneratingRef.current = false;
    }
  }, [messages, loading]);

  // ── Approximate token count ──────────────────────────────────────

  const getApproxTokens = useCallback(() => {
    let chars = 0;
    for (const msg of messages) {
      chars += (msg.content || '').length;
    }
    return Math.round(chars / 2.5);
  }, [messages]);

  return {
    messages, loading, error, streamingText, isStreaming,
    isNearBottom, messagesEndRef, messagesContainerRef,
    handleScroll, scrollToBottom,
    handleSend, handleClear, handleClearAll, setError,
    thesisTitle, showThesisModal, historyLoaded,
    confirmThesisTitle, skipThesisTitle, updateThesisTitle,
    academicMode, toggleAcademicMode, handleRegenerate, getApproxTokens,
  };
}
