/**
 * File text extraction — works with Buffer directly (no file path needed).
 * This approach works both locally and on Vercel serverless.
 */

export async function extractTextFromBuffer(buffer: Buffer, fileName: string, mimeType: string): Promise<string> {
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
  throw new Error(`Desteklenmeyen dosya formatı. Sadece PDF veya DOCX yükleyin.`);
}

async function extractFromPDF(buffer: Buffer): Promise<string> {
  try {
    // pdf-parse must be required (not imported) to avoid Next.js edge runtime issues
    // We use a workaround to make it work in serverless environments
    const pdfParse = require('pdf-parse'); // eslint-disable-line
    const data = await pdfParse(buffer);
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('PDF içeriği boş veya okunamıyor. Lütfen metin tabanlı bir PDF yükleyin.');
    }
    return data.text;
  } catch (error: unknown) {
    if (error instanceof Error && (
      error.message.includes('PDF içeriği') ||
      error.message.includes('okunamıyor')
    )) {
      throw error;
    }
    throw new Error('PDF dosyası işlenirken hata oluştu. Dosyanın bozuk olmadığından emin olun.');
  }
}

async function extractFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    if (!result.value || result.value.trim().length === 0) {
      throw new Error('DOCX dosyası boş veya içeriği okunamıyor.');
    }
    return result.value;
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('DOCX')) throw error;
    throw new Error('DOCX dosyası işlenirken hata oluştu.');
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
