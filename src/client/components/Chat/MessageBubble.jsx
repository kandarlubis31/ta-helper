import React, { memo, useCallback, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useToast } from '../../contexts/AppContext';

// ── Content pre-processing ──────────────────────────────────────────
// Normalizes whitespace, catches streaming artifacts, and wraps
// standalone [text] citations into <span class="citation-ref"> so
// rehype-raw can pass them through to the rendered DOM.
export function preprocessContent(text) {
  if (!text) return '';

  // 1. Normalize line endings
  let normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2. Extract & protect fenced code blocks from ALL transformations
  const codeBlocks = [];
  normalized = normalized.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `\x00CB${codeBlocks.length - 1}\x00`;
  });

  // 3. Per-line: trim trailing spaces/tabs
  normalized = normalized
    .split('\n')
    .map(line => line.replace(/[ \t]+$/g, ''))
    .join('\n');

  // 4. Collapse 3+ consecutive blank lines → 2
  normalized = normalized.replace(/\n{3,}/g, '\n\n');

  // 5. Streaming safety — replace incomplete markdown syntax
  //    *** → ⁎  (triple asterisk — always streaming artifact)
  normalized = normalized.replace(/\*\*\*/g, '\u204E');
  //    `word → ′word  (unclosed backtick)
  normalized = normalized.replace(/`([^\s`])/g, '\u2032$1');
  //    Note: **word is intentionally NOT replaced — react-markdown
  //    renders unclosed bold as literal text, which is harmless.

  // 6. Citation extension — [text] NOT followed by (url), NOT starting with ^
  normalized = normalized.replace(
    /\[([^^\]\n][^\]\n]*)\](?!\s*\()/g,
    '<span class="citation-ref">[$1]</span>'
  );

  // 7. Restore code blocks (AFTER all transformations)
  normalized = normalized.replace(/\x00CB(\d+)\x00/g, (_, i) => codeBlocks[+i]);

  return normalized;
}

// ── Custom react-markdown components ─────────────────────────────────

// Extract language class from code child for the CSS ::before label
function extractLang(children) {
  const code = React.Children.toArray(children).find(
    c => c?.props?.className
  );
  return code?.props?.className || '';
}

const markdownComponents = {
  // Heading mapping — # and ## → h2, ### → h3, ####+ → h4
  h1: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
  h2: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
  h3: ({ children, ...props }) => <h3 {...props}>{children}</h3>,
  h4: ({ children, ...props }) => <h4 {...props}>{children}</h4>,
  h5: ({ children, ...props }) => <h4 {...props}>{children}</h4>,
  h6: ({ children, ...props }) => <h4 {...props}>{children}</h4>,

  // Link safety
  a: ({ href, children, node, ...props }) => {
    if (!href || !/^(https?:\/\/|mailto:|#)/i.test(href)) {
      return <>{children}</>;
    }
    return (
      <a href={href} target="_blank" rel="noopener" {...props}>
        {children}
      </a>
    );
  },

  // Table wrapper with copy button
  table: ({ children }) => (
    <div className="table-wrapper">
      <button
        className="table-copy-btn"
        type="button"
        data-action="copy-table"
      >
        salin tabel
      </button>
      <div className="table-scroll">
        <table>{children}</table>
      </div>
    </div>
  ),

  // Code block — pass language class to <pre> so CSS ::before works
  pre: ({ children, node, ...props }) => {
    const langClass = extractLang(children);
    return (
      <pre className={langClass} {...props}>
        {children}
      </pre>
    );
  },
};

// ── Helpers ─────────────────────────────────────────────────────────

function getJournalLabel(j) {
  try {
    const authors =
      typeof j.authors === 'string' ? JSON.parse(j.authors) : j.authors;
    return Array.isArray(authors) && authors.length > 0
      ? `${authors[0].family || 'Unknown'}, ${j.year}`
      : j.title.substring(0, 30);
  } catch {
    return j.title.substring(0, 30);
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ── Component ───────────────────────────────────────────────────────

const MessageBubble = memo(function MessageBubble({
  role,
  content,
  relevantJournals,
  journalRefs,
  responseNum,
  isStreaming,
  isLastAi,
  onRegenerate,
}) {
  const showToast = useToast();
  const [copied, setCopied] = useState(false);
  const [copiedWithCitations, setCopiedWithCitations] = useState(false);

  // ── User message (plain text) ──────────────────────────────────
  if (role === 'user') {
    return (
      <div className="message user">
        <div className="message-header">
          <span className="message-label">peneliti</span>
        </div>
        <div className="message-body">
          <span className="message-user-prefix">&gt; </span>
          {content}
        </div>
      </div>
    );
  }

  // ── AI message (markdown) ──────────────────────────────────────
  const journalCount = relevantJournals?.length || 0;
  const responseLabel = responseNum && responseNum > 1 ? ` #${responseNum}` : '';
  const label = `tara${responseLabel}${journalCount > 0 ? ` \u00b7 ${journalCount} jurnal` : ''}`;

  const preprocessed = preprocessContent(content);

  const handleCopyText = useCallback(async () => {
    const ok = await copyText(content);
    if (ok) {
      setCopied(true);
      showToast('Teks disalin', 'success');
      setTimeout(() => setCopied(false), 1500);
    } else {
      showToast('Gagal menyalin teks', 'error');
    }
  }, [content, showToast]);

  const handleMessageBodyClick = useCallback(
    (e) => {
      const btn = e.target.closest('.table-copy-btn');
      if (!btn) return;

      const wrapper = btn.closest('.table-wrapper');
      if (!wrapper) return;

      const table = wrapper.querySelector('table');
      if (!table) return;

      const rows = [];
      const thead = table.querySelector('thead');
      const tbody = table.querySelector('tbody');

      if (thead) {
        const headerRow = thead.querySelector('tr');
        if (headerRow) {
          rows.push(
            [...headerRow.querySelectorAll('th, td')].map((c) =>
              c.textContent.trim()
            )
          );
        }
      }

      const bodyRows = tbody ? tbody.querySelectorAll('tr') : [];
      if (rows.length === 0) {
        table.querySelectorAll('tr').forEach((tr) => {
          rows.push(
            [...tr.querySelectorAll('td, th')].map((c) =>
              c.textContent.trim()
            )
          );
        });
      } else {
        bodyRows.forEach((tr) => {
          rows.push(
            [...tr.querySelectorAll('td, th')].map((c) =>
              c.textContent.trim()
            )
          );
        });
      }

      const tsv = rows.map((r) => r.join('\t')).join('\n');

      copyText(tsv).then((ok) => {
        if (ok) {
          btn.classList.add('copied');
          showToast('Tabel disalin', 'success');
          setTimeout(() => btn.classList.remove('copied'), 1500);
        } else {
          showToast('Gagal menyalin tabel', 'error');
        }
      });
    },
    [showToast]
  );

  const handleCopyWithCitations = useCallback(async () => {
    let text = content;
    if (relevantJournals?.length) {
      text += '\n\n\u2014\nJurnal: ';
      text += relevantJournals.map((j) => getJournalLabel(j)).join('; ');
    }
    const ok = await copyText(text);
    if (ok) {
      setCopiedWithCitations(true);
      showToast('Teks + sitasi disalin', 'success');
      setTimeout(() => setCopiedWithCitations(false), 1500);
    } else {
      showToast('Gagal menyalin teks', 'error');
    }
  }, [content, relevantJournals, showToast]);

  return (
    <div className="message assistant">
      <div className="message-header">
        <span className="message-pilcrow">{'\u00b6'}</span>
        <span className="message-label">{label}</span>
      </div>
      <div className="message-body" onClick={handleMessageBodyClick}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={markdownComponents}
        >
          {preprocessed}
        </ReactMarkdown>
      </div>
      {isStreaming && <span className="streaming-indicator" />}
      {relevantJournals?.length > 0 && (
        <div className="message-journals">
          {relevantJournals.map((j) => (
            <span key={j.id} className="journal-badge" title={j.title}>
              {getJournalLabel(j)}
            </span>
          ))}
        </div>
      )}
      {!isStreaming && (
        <div className="message-footer">
          <button
            className={`message-footer-btn${copied ? ' copied' : ''}`}
            onClick={handleCopyText}
          >
            {copied ? '\u2713 disalin' : 'salin teks'}
          </button>
          {journalCount > 0 && (
            <button
              className={`message-footer-btn${copiedWithCitations ? ' copied' : ''}`}
              onClick={handleCopyWithCitations}
            >
              {copiedWithCitations ? '\u2713 disalin' : 'salin + sitasi'}
            </button>
          )}
          {isLastAi && onRegenerate && (
            <button
              className="message-footer-btn regenerate-btn"
              onClick={onRegenerate}
              title="Regenerate respons"
            >
              regenerate
            </button>
          )}
        </div>
      )}
    </div>
  );
});

export default MessageBubble;
