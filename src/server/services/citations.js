const { getAllJournals } = require('../db/queries');

/**
 * Format author name from JSON array to display string.
 */
function formatAuthorName(author) {
  const given = author.given || '';
  const family = author.family || '';

  if (given && family) {
    return `${family}, ${given.charAt(0)}.`;
  }
  return family || given || 'Unknown';
}

/**
 * Generate citation in APA format.
 * Format: Author, A. A., & Author, B. B. (Year). Title. Publisher/Journal.
 */
function formatAPA(journal) {
  let authors = [];
  try {
    authors = typeof journal.authors === 'string'
      ? JSON.parse(journal.authors)
      : journal.authors || [];
  } catch {
    authors = [];
  }

  const authorStr = authors.length > 0
    ? authors.map(formatAuthorName).join(', ') + '.'
    : '(No author).';

  const year = journal.year ? `(${journal.year}).` : '(n.d.).';
  const title = journal.title ? `${journal.title}.` : '[No title].';

  let source = '';
  if (journal.doi) {
    source = ` https://doi.org/${journal.doi}`;
  }

  return `${authorStr} ${year} ${title}${source}`;
}

/**
 * Generate citation in IEEE format.
 * Format: [N] A. Author and B. Author, "Title," Year. [Online]. Available: DOI
 */
function formatIEEE(journal, index) {
  let authors = [];
  try {
    authors = typeof journal.authors === 'string'
      ? JSON.parse(journal.authors)
      : journal.authors || [];
  } catch {
    authors = [];
  }

  const authorStr = authors.length > 0
    ? authors.map(a => {
        const given = a.given || '';
        const family = a.family || '';
        return `${given ? given.charAt(0) + '. ' : ''}${family}`;
      }).join(', ')
    : 'Anon.';

  const title = journal.title ? `"${journal.title},"` : '"[No title],"';
  const year = journal.year || 'n.d.';
  let access = '';

  if (journal.doi) {
    access = ` [Online]. Available: https://doi.org/${journal.doi}`;
  }

  return `[${index}] ${authorStr}, ${title} ${year}.${access}`;
}

/**
 * Generate full bibliography in APA or IEEE format.
 */
function generateBibliography(journalIds, format = 'apa') {
  const allJournals = getAllJournals();

  let journals;
  if (journalIds && journalIds.length > 0) {
    journals = allJournals.filter(j => journalIds.includes(j.id));
  } else {
    journals = allJournals;
  }

  const formatter = format.toLowerCase() === 'ieee' ? formatIEEE : formatAPA;

  const entries = journals.map((j, i) => ({
    id: j.id,
    title: j.title,
    year: j.year,
    citation: format === 'ieee' ? formatter(j, i + 1) : formatter(j),
  }));

  return {
    format: format.toUpperCase(),
    count: entries.length,
    entries,
  };
}

module.exports = { generateBibliography, formatAPA, formatIEEE };
