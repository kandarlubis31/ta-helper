const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { extractPdfText } = require('./pdfParser');

const DEBUG = process.env.NODE_ENV !== 'production';

/**
 * Normalize DOI input (accepts both raw DOI and full URL)
 */
function normalizeDoi(input) {
  const trimmed = input.trim();
  // Match https://doi.org/10.xxxx/xxx
  const urlMatch = trimmed.match(/doi\.org\/(10\..+)/i);
  if (urlMatch) return urlMatch[1];

  // Match raw DOI
  const doiMatch = trimmed.match(/^(10\.\S+)/);
  if (doiMatch) return doiMatch[1];

  return null;
}

/**
 * Fetch metadata from CrossRef API.
 */
async function fetchCrossRefMetadata(doi) {
  const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': 'TARA-TA/0.1 (mailto:dev@tara-ta.local)' },
    timeout: 15000,
  });

  const msg = data.message;
  if (!msg) throw new Error('DOI tidak ditemukan di CrossRef.');

  const authors = (msg.author || []).map(a => ({
    given: a.given || '',
    family: a.family || '',
  }));

  return {
    title: (msg.title || [])[0] || 'Unknown Title',
    authors: JSON.stringify(authors),
    year: (msg.created?.['date-parts']?.[0]?.[0]) || (msg.published?.['date-parts']?.[0]?.[0]) || new Date().getFullYear(),
    doi,
    abstract: msg.abstract || '',
  };
}

/**
 * Fetch open access PDF URL from Unpaywall.
 * Returns { pdfUrl, isOA } or null.
 */
async function fetchUnpaywall(doi) {
  try {
    const email = 'dev@tara-ta.local';
    const url = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${email}`;
    const { data } = await axios.get(url, { timeout: 10000 });

    if (data.best_oa_location && data.best_oa_location.url_for_pdf) {
      return {
        pdfUrl: data.best_oa_location.url_for_pdf,
        isOA: data.is_oa || false,
      };
    }
    return null;
  } catch (err) {
    console.warn('⚠️  Unpaywall fetch failed:', err.message);
    return null;
  }
}

/**
 * Download PDF from URL and save to local path.
 */
async function downloadPdf(pdfUrl, savePath) {
  const response = await axios.get(pdfUrl, {
    responseType: 'arraybuffer',
    timeout: 60000,
  });

  fs.writeFileSync(savePath, Buffer.from(response.data));
  return savePath;
}

/**
 * Complete DOI fetch flow: metadata + optional PDF download.
 */
async function fetchByDoi(doiInput, dataDir) {
  const doi = normalizeDoi(doiInput);
  if (!doi) throw new Error('Format DOI tidak valid. Contoh: 10.1016/j.eswa.2021.114456');

  if (DEBUG) console.log(`📚 Fetching DOI: ${doi}...`);

  // Step 1: CrossRef metadata
  const metadata = await fetchCrossRefMetadata(doi);
  if (DEBUG) console.log(`  ✓ Metadata: "${metadata.title}"`);

  // Step 2: Try Unpaywall for full text
  let pdfPath = null;
  let fullText = null;

  const unpaywall = await fetchUnpaywall(doi);
  if (unpaywall && unpaywall.pdfUrl) {
    try {
      const pdfsDir = path.join(dataDir, 'pdfs');
      if (!fs.existsSync(pdfsDir)) fs.mkdirSync(pdfsDir, { recursive: true });

      const filename = `doi-${doi.replace(/[\/\\]/g, '_')}.pdf`;
      pdfPath = path.join(pdfsDir, filename);

      if (DEBUG) console.log('  ⬇️  Downloading PDF...');
      await downloadPdf(unpaywall.pdfUrl, pdfPath);
      if (DEBUG) console.log(`  ✓ PDF: ${pdfPath}`);

      const result = await extractPdfText(pdfPath);
      fullText = result.text;
      if (DEBUG) console.log(`  ✓ Teks: ${result.numPages} halaman`);
    } catch (err) {
      console.warn(`  ⚠️  Gagal download/parse PDF: ${err.message}`);
    }
  } else {
    console.log('  ℹ️  No open-access PDF (abstract only).');
  }

  return {
    ...metadata,
    pdfPath,
    fullText: fullText || metadata.abstract || '',
  };
}

module.exports = { fetchByDoi, normalizeDoi };
