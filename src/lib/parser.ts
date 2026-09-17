import fs from 'fs';

export async function extractTextFromFile(filePath: string, mimeType: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);

  if (mimeType === 'application/pdf' || filePath.toLowerCase().endsWith('.pdf')) {
    return extractFromPDF(buffer);
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword' ||
    filePath.toLowerCase().endsWith('.docx') ||
    filePath.toLowerCase().endsWith('.doc')
  ) {
    return extractFromDOCX(buffer);
  } else if (mimeType === 'text/plain') {
    return buffer.toString('utf-8');
  }
  throw new Error(`Desteklenmeyen dosya formatı: ${mimeType}`);
}

async function extractFromPDF(buffer: Buffer): Promise<string> {
  try {
    const pdfParseModule = await import('pdf-parse');
    // pdf-parse exports a function or default function depending on environment
    // eslint-disable-next-line
    const pdfParse = typeof pdfParseModule === 'function' ? pdfParseModule : (pdfParseModule as any).default || pdfParseModule;
    const data = await pdfParse(buffer);
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('PDF içeriği okunamadı. Lütfen metin tabanlı bir PDF yükleyin.');
    }
    return data.text;
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('PDF içeriği')) throw error;
    throw new Error('PDF dosyası işlenirken bir hata oluştu.');
  }
}

async function extractFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    if (!result.value || result.value.trim().length === 0) {
      throw new Error('DOCX dosyası boş veya içeriği okunamadı.');
    }
    return result.value;
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('DOCX')) throw error;
    throw new Error('DOCX dosyası işlenirken bir hata oluştu.');
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
