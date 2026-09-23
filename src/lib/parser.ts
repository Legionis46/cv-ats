/**
 * File text extraction — Buffer-based, works on Vercel serverless.
 * Uses require() for pdf-parse to avoid module loading issues in Next.js.
 */

export async function extractTextFromBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const lowerName = fileName.toLowerCase();

  if (mimeType === 'application/pdf' || lowerName.endsWith('.pdf')) {
    return extractFromPDF(buffer);
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword' ||
    lowerName.endsWith('.docx') ||
    lowerName.endsWith('.doc')
  ) {
    return extractFromDOCX(buffer);
  } else if (mimeType === 'text/plain') {
    return buffer.toString('utf-8');
  }

  throw new Error('Desteklenmeyen dosya formatı. Sadece PDF veya DOCX yükleyin.');
}

async function extractFromPDF(buffer: Buffer): Promise<string> {
  // Strategy 1: Try pdf-parse/lib (avoids test file loading issue)
  try {
    const pdfParse = require('pdf-parse/lib/pdf-parse.js'); // eslint-disable-line
    const data = await pdfParse(buffer);
    if (data?.text && data.text.trim().length > 10) {
      return data.text;
    }
  } catch (err1) {
    console.warn('pdf-parse/lib failed:', err1 instanceof Error ? err1.message : err1);
  }

  // Strategy 2: Try main pdf-parse entry point
  try {
    const pdfParse = require('pdf-parse'); // eslint-disable-line
    const data = await pdfParse(buffer);
    if (data?.text && data.text.trim().length > 10) {
      return data.text;
    }
  } catch (err2) {
    console.warn('pdf-parse main failed:', err2 instanceof Error ? err2.message : err2);
  }

  // Strategy 3: Raw text extraction from PDF binary (works for many simple PDFs)
  try {
    const rawText = extractRawTextFromPDF(buffer);
    if (rawText && rawText.trim().length > 10) {
      console.log('Using raw PDF text extraction fallback');
      return rawText;
    }
  } catch (err3) {
    console.warn('Raw PDF extraction failed:', err3);
  }

  throw new Error(
    'PDF dosyası okunamadı. Lütfen Word (DOCX) formatında deneyin veya metin tabanlı bir PDF yükleyin.'
  );
}

/**
 * Simple raw text extractor for PDFs — pulls readable text from binary.
 * Works on basic/text-based PDFs without full PDF parsing.
 */
function extractRawTextFromPDF(buffer: Buffer): string {
  const str = buffer.toString('latin1');
  const texts: string[] = [];

  // Extract text from BT...ET blocks
  const btEtRegex = /BT\s+([\s\S]*?)\s*ET/g;
  let match;
  while ((match = btEtRegex.exec(str)) !== null) {
    const block = match[1];
    // Extract text from Tj, TJ, ' and " operators
    const tjRegex = /\(([^)]*)\)\s*(?:Tj|'|")/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      const text = tjMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\');
      if (text.trim().length > 0) texts.push(text);
    }
    // Extract from TJ arrays: [(text) -200 (text)] TJ
    const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
    let arrMatch;
    while ((arrMatch = tjArrayRegex.exec(block)) !== null) {
      const arrContent = arrMatch[1];
      const strRegex = /\(([^)]*)\)/g;
      let strMatch;
      while ((strMatch = strRegex.exec(arrContent)) !== null) {
        if (strMatch[1].trim().length > 0) texts.push(strMatch[1]);
      }
    }
  }

  return texts.join(' ').replace(/\s+/g, ' ').trim();
}

async function extractFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    if (result.value && result.value.trim().length > 0) {
      return result.value;
    }
    throw new Error('DOCX dosyası boş görünüyor.');
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('boş')) throw error;
    console.error('mammoth error:', msg);
    throw new Error('DOCX dosyası işlenirken hata oluştu: ' + msg);
  }
}

export function validateFileType(mimeType: string, fileName: string): boolean {
  const allowedMimes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ];
  const allowedExtensions = ['.pdf', '.docx', '.doc'];
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  return allowedMimes.includes(mimeType) || allowedExtensions.includes(ext);
}
