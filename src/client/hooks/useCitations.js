import { useState, useCallback } from 'react';

export function useCitations() {
  const [format, setFormat] = useState('apa');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/citations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [format]);

  const handleReset = useCallback(() => {
    setResult(null);
    setError('');
    setFormat('apa');
  }, []);

  return {
    format, setFormat,
    result, loading, error,
    handleGenerate, handleReset,
  };
}
