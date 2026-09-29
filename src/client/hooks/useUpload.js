import { useState, useCallback } from 'react';

export function useUpload({ onSuccess } = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleUpload = useCallback(async (files, tags = []) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files).filter(f => f.type === 'application/pdf');
    if (fileArray.length === 0) {
      setError('Hanya file PDF yang diterima.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      for (const file of fileArray) {
        formData.append('files', file);
      }
      if (tags.length > 0) {
        formData.append('tags', JSON.stringify(tags));
      }

      const res = await fetch('/api/journals/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const parts = [];
      if (data.journals?.length > 0) {
        parts.push(`✅ ${data.journals.length} jurnal berhasil diupload:`);
        data.journals.slice(0, 5).forEach(j => {
          parts.push(`  • "${j.title}" (${j.numPages}h${j.chunks ? `, ${j.chunks} chunk` : ''})`);
        });
        if (data.journals.length > 5) {
          parts.push(`  ... dan ${data.journals.length - 5} lainnya`);
        }
      }
      if (data.errors?.length > 0) {
        parts.push(`\n⚠️ ${data.errors.length} file gagal:`);
        data.errors.slice(0, 3).forEach(e => {
          parts.push(`  • ${e.file}: ${e.error}`);
        });
      }
      setSuccess(parts.join('\n'));
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [onSuccess]);

  return { loading, error, success, setError, setSuccess, handleUpload };
}

export function useDoiFetch({ onSuccess } = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleDoiFetch = useCallback(async (doi, tags = []) => {
    if (!doi.trim()) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/journals/doi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doi: doi.trim(), tags }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(`✓ "${data.journal.title}" (${data.journal.year}) berhasil di-fetch!`);
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [onSuccess]);

  return { loading, error, success, setError, setSuccess, handleDoiFetch };
}
