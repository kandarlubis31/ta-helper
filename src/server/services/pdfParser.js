const fs = require('fs');
const pdfParse = require('pdf-parse');

/**
 * Extract full text from a PDF file path.
 * Returns { text, numPages, metadata }
 */
async function extractPdfText(filePath) {
  const fullPath = fs.existsSync(filePath) ? filePath : require('path').resolve(filePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`File PDF tidak ditemukan: ${fullPath}`);
  }

  const dataBuffer = fs.readFileSync(fullPath);

  try {
    const data = await pdfParse(dataBuffer);
    return {
      text: data.text,
      numPages: data.numpages,
      metadata: data.metadata || {},
    };
  } catch (err) {
    throw new Error(`Gagal parse PDF: ${err.message}`);
  }
}

module.exports = { extractPdfText };
