import { describe, it, expect } from 'vitest';
import { preprocessContent } from '../MessageBubble';

// ── Helpers ────────────────────────────────────────────────────────
const prep = (text) => preprocessContent(text);

function notContains(actual, substring) {
  if (actual.indexOf(substring) !== -1) {
    throw new Error(
      `Expected output NOT to contain "${substring}"\nActual: ${actual}`
    );
  }
}

// ── Tests ──────────────────────────────────────────────────────────
describe('preprocessContent', () => {
  // ─── edge cases ────────────────────────────────────────────────
  describe('edge cases', () => {
    it('returns empty string for null/undefined/empty input', () => {
      expect(prep(null)).toBe('');
      expect(prep(undefined)).toBe('');
      expect(prep('')).toBe('');
    });

    it('normalizes Windows line endings (\\r\\n)', () => {
      const result = prep('foo\r\nbar');
      expect(result).toBe('foo\nbar');
    });

    it('preserves plain text unchanged', () => {
      const result = prep('Hello, dunia!');
      expect(result).toBe('Hello, dunia!');
    });
  });

  // ─── whitespace normalization ──────────────────────────────────
  describe('whitespace normalization', () => {
    it('trims trailing spaces per line', () => {
      const result = prep('hello   \nworld  ');
      expect(result).toBe('hello\nworld');
    });

    it('collapses 3+ blank lines to 2', () => {
      const result = prep('a\n\n\n\nb');
      expect(result).toBe('a\n\nb');
    });

    it('collapses 4+ consecutive newlines', () => {
      const result = prep('a\n\n\n\n\nb');
      expect(result).toBe('a\n\nb');
    });

    it('preserves single and double newlines', () => {
      const result = prep('a\nb\n\nc');
      expect(result).toBe('a\nb\n\nc');
    });

    it('does NOT collapse newlines inside code blocks', () => {
      const result = prep('```\n\n\n\ncode\n\n\n\n```');
      expect(result).toContain('\n\n\n\ncode\n\n\n\n');
    });
  });

  // ─── streaming safety ──────────────────────────────────────────
  describe('streaming safety', () => {
    it('replaces *** with Unicode lookalike', () => {
      const result = prep('Halo *** dunia');
      notContains(result, '***');
      expect(result).toContain('\u204E');
    });

    it('does NOT replace ** inside code blocks', () => {
      const result = prep('```\n**bold** *italic*\n```');
      // Code block content is fully protected — streaming safety runs before restore
      notContains(result, '\u204E');
      expect(result).toContain('**bold**');
    });

    it('replaces stray backtick with lookalike', () => {
      const result = prep('Ini `code');
      notContains(result, '`code');
      expect(result).toContain('\u2032code');
    });

    it('does NOT replace backtick inside code blocks', () => {
      const result = prep('```js\nconst fn = () => `hello`;\n```');
      expect(result).toContain('`hello`');
      notContains(result, '\u2032');
    });

    it('preserves single * (legitimate academic text)', () => {
      const result = prep('p<0.05* significant');
      expect(result).toContain('*');
    });

    it('preserves **text** (valid bold) — react-markdown handles it natively', () => {
      const result = prep('**completed** and *incomplete');
      expect(result).toContain('**completed**');
      expect(result).toContain('*incomplete');
    });
  });

  // ─── citation extension ────────────────────────────────────────
  describe('citation extension', () => {
    it('wraps standalone [text] in citation-ref span', () => {
      const result = prep('[Smith 2024]');
      expect(result).toContain(
        '<span class="citation-ref">[Smith 2024]</span>'
      );
    });

    it('does NOT wrap [text](url) — leaves links alone', () => {
      const result = prep('[link text](https://example.com)');
      notContains(result, 'citation-ref');
      expect(result).toContain('[link text](https://example.com)');
    });

    it('does NOT wrap [^1] footnote references', () => {
      const result = prep('[^1]');
      expect(result).toBe('[^1]');
    });

    it('does NOT wrap footnote references with text [^note]', () => {
      const result = prep('[^note]');
      expect(result).toBe('[^note]');
    });

    it('handles multiple citations in one message', () => {
      const result = prep('[Smith 2024] dan [Jones 2023]');
      expect(result).toContain('citation-ref">[Smith 2024]');
      expect(result).toContain('citation-ref">[Jones 2023]');
    });
  });
});
