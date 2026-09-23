import { NextRequest, NextResponse } from 'next/server';
import { createCandidate, getStorageBaseDir } from '@/lib/db';
import { extractTextFromBuffer, validateFileType } from '@/lib/parser';
import { parseCV } from '@/lib/llm';

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let step = 'init';
  try {
    step = 'formData';
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Dosya bulunamadı. Lütfen bir CV dosyası yükleyin.' },
        { status: 400 }
      );
    }

    if (!validateFileType(file.type, file.name)) {
      return NextResponse.json(
        { error: 'Geçersiz dosya formatı. Sadece PDF veya DOCX kabul edilir.' },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Dosya çok büyük. Maksimum 10MB.' },
        { status: 400 }
      );
    }

    // Read file into Buffer (works everywhere)
    step = 'readBuffer';
    const fileBytes = await file.arrayBuffer();
    const buffer = Buffer.from(fileBytes);

    if (buffer.length === 0) {
      return NextResponse.json(
        { error: 'Dosya boş. Lütfen geçerli bir dosya seçin.' },
        { status: 400 }
      );
    }

    // Extract text — multiple fallback strategies, should not fail for valid files
    step = 'extractText';
    let text = '';
    let extractionFailed = false;
    try {
      text = await extractTextFromBuffer(buffer, file.name, file.type);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Bilinmeyen hata';
      console.warn(`Text extraction warning (continuing anyway): ${msg}`);
      extractionFailed = true;
    }

    // Parse CV with AI or regex (even with partial text)
    step = 'parseCV';
    let parsed;
    if (text && text.trim().length > 10) {
      try {
        parsed = await parseCV(text);
      } catch (e) {
        console.error('parseCV error:', e);
        parsed = null;
      }
    }

    // If extraction failed or parse gave nothing, use filename as name
    const fileName = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    const candidateName = parsed?.name && parsed.name !== 'İsim Bulunamadı'
      ? parsed.name
      : fileName || 'İsimsiz Aday';

    // Store the file
    step = 'storeFile';
    const ext = file.name.toLowerCase().endsWith('.docx') ? '.docx'
      : file.name.toLowerCase().endsWith('.doc') ? '.doc' : '.pdf';
    const uniqueFileName = `${generateId()}${ext}`;
    let storedFilePath = uniqueFileName;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put } = await import('@vercel/blob');
        const blob = await put(`cvs/${uniqueFileName}`, buffer, {
          access: 'public',
          contentType: file.type || 'application/octet-stream',
        });
        storedFilePath = blob.url;
      } catch (blobErr) {
        console.warn('Vercel Blob failed:', blobErr);
      }
    } else {
      try {
        const { writeFile, mkdir } = await import('fs/promises');
        const pathMod = await import('path');
        const uploadsDir = pathMod.join(getStorageBaseDir(), 'uploads');
        await mkdir(uploadsDir, { recursive: true });
        await writeFile(pathMod.join(uploadsDir, uniqueFileName), buffer);
      } catch (fsErr) {
        console.warn('Local file save failed (non-critical):', fsErr);
      }
    }

    // Save to database
    step = 'saveDB';
    const candidate = await createCandidate({
      name: candidateName,
      email: parsed?.email || null,
      phone: parsed?.phone || null,
      location: parsed?.location || null,
      university: parsed?.university || null,
      department: parsed?.department || null,
      graduation_year: parsed?.graduation_year || null,
      skills: parsed?.skills || [],
      experience_years: parsed?.experience_years || 0,
      last_position: parsed?.last_position || null,
      last_company: parsed?.last_company || null,
      languages: parsed?.languages || [],
      summary: extractionFailed
        ? 'Dosya içeriği otomatik okunamadı. Detayları manuel olarak düzenleyebilirsiniz.'
        : (parsed?.summary || null),
      status: 'Yeni',
      file_path: storedFilePath,
      file_name: file.name,
    });

    const message = extractionFailed
      ? 'CV dosyası kaydedildi (içerik okunamadı, manuel düzenleme gerekebilir).'
      : 'CV başarıyla yüklendi ve işlendi.';

    return NextResponse.json({
      success: true,
      message,
      candidate,
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`Upload error at [${step}]:`, msg);
    return NextResponse.json(
      { error: `Yükleme hatası (${step}): ${msg}` },
      { status: 500 }
    );
  }
}
