import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { createCandidate } from '@/lib/db';
import { extractTextFromFile, validateFileType } from '@/lib/parser';
import { parseCV } from '@/lib/llm';

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Dosya bulunamadı. Lütfen bir CV dosyası yükleyin.' }, { status: 400 });
    }
    if (!validateFileType(file.type, file.name)) {
      return NextResponse.json(
        { error: 'Geçersiz dosya formatı. Sadece PDF veya DOCX kabul edilir.' },
        { status: 400 }
      );
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Dosya çok büyük. Maksimum 10MB.' }, { status: 400 });
    }

    const fileBytes = await file.arrayBuffer();
    const buffer = Buffer.from(fileBytes);

    // Save file: Use Vercel Blob if configured, else save to local uploads/
    let storedFilePath = '';
    const ext = file.name.toLowerCase().endsWith('.docx') ? '.docx'
              : file.name.toLowerCase().endsWith('.doc') ? '.doc' : '.pdf';
    const uniqueFileName = `${generateId()}${ext}`;

    const uploadsDir = path.join(process.cwd(), 'uploads');
    const localTempPath = path.join(uploadsDir, uniqueFileName);

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put } = await import('@vercel/blob');
        const blob = await put(`cvs/${uniqueFileName}`, file, {
          access: 'public',
        });
        storedFilePath = blob.url;
      } catch (blobErr) {
        console.warn('Vercel Blob failed, falling back to local file storage:', blobErr);
        await writeFile(localTempPath, buffer);
        storedFilePath = uniqueFileName;
      }
    } else {
      await writeFile(localTempPath, buffer);
      storedFilePath = uniqueFileName;
    }

    // Always ensure local file exists for text extraction
    if (!storedFilePath.startsWith('http')) {
      // already written
    } else {
      // In cloud environment, write temporarily to extract text
      try {
        await writeFile(localTempPath, buffer);
      } catch {
        // if filesystem is read-only (unlikely for /tmp), we handle gracefully
      }
    }

    // Extract text
    let text = '';
    try {
      text = await extractTextFromFile(localTempPath, file.type);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Dosya metni okunamadı.' },
        { status: 422 }
      );
    }

    if (text.trim().length < 20) {
      return NextResponse.json(
        { error: 'CV içeriği çok kısa veya boş. Lütfen geçerli bir CV yükleyin.' },
        { status: 422 }
      );
    }

    // Parse with LLM (or regex fallback)
    const parsed = await parseCV(text);

    // Save to Database
    const candidate = await createCandidate({
      name: parsed.name,
      email: parsed.email || null,
      phone: parsed.phone || null,
      location: parsed.location || null,
      university: parsed.university || null,
      department: parsed.department || null,
      graduation_year: parsed.graduation_year || null,
      skills: parsed.skills || [],
      experience_years: parsed.experience_years || 0,
      last_position: parsed.last_position || null,
      last_company: parsed.last_company || null,
      languages: parsed.languages || [],
      summary: parsed.summary || null,
      status: 'Yeni',
      file_path: storedFilePath,
      file_name: file.name,
    });

    return NextResponse.json({ success: true, message: 'CV başarıyla işlendi.', candidate });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Beklenmeyen bir hata oluştu.' }, { status: 500 });
  }
}
