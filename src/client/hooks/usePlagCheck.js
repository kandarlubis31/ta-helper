import { useState, useCallback } from 'react';

export function usePlagCheck() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCheck = useCallback(async () => {
    if (text.trim().length < 20) {
      setError('Teks minimal 20 karakter.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/plagcheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [text]);

  const getScoreColor = useCallback((score) => {
    if (score >= 85) return 'tinggi';
    if (score >= 70) return 'sedang';
    return 'aman';
  }, []);

  return { text, setText, result, loading, error, handleCheck, getScoreColor };
}
