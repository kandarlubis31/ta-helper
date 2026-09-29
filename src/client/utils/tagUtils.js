export function parseTags(tags) {
  if (!tags) return [];
  try {
    const parsed = typeof tags === 'string' ? JSON.parse(tags) : tags;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    if (typeof tags === 'string') {
      return tags.split(',').map(t => t.trim()).filter(Boolean);
    }
    return [];
  }
}
