import { NextRequest, NextResponse } from 'next/server';
import { createCandidate } from '@/lib/db';
import { extractTextFromBuffer, validateFileType } from '@/lib/parser';
import { parseCV } from '@/lib/llm';

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export async function POST(request: NextRequest) {
  try {
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

    // Read file into Buffer (works everywhere - local and Vercel)
    const fileBytes = await file.arrayBuffer();
    const buffer = Buffer.from(fileBytes);

    // Extract text directly from Buffer (no filesystem needed)
    let text = '';
    try {
      text = await extractTextFromBuffer(buffer, file.name, file.type);
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

    // Store file: Vercel Blob if configured, else local uploads/
    const ext = file.name.toLowerCase().endsWith('.docx')
      ? '.docx'
      : file.name.toLowerCase().endsWith('.doc')
      ? '.doc'
      : '.pdf';
    const uniqueFileName = `${generateId()}${ext}`;
    let storedFilePath = uniqueFileName;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      // Vercel Blob storage
      try {
        const { put } = await import('@vercel/blob');
        const blob = await put(`cvs/${uniqueFileName}`, buffer, {
          access: 'public',
          contentType: file.type || 'application/octet-stream',
        });
        storedFilePath = blob.url;
      } catch (blobErr) {
        console.warn('Vercel Blob failed, saving filename only:', blobErr);
        storedFilePath = uniqueFileName;
      }
    } else {
      // Local storage — write to uploads/ directory
      try {
        const { writeFile, mkdir } = await import('fs/promises');
        const path = await import('path');
        const uploadsDir = path.join(process.cwd(), 'uploads');
        await mkdir(uploadsDir, { recursive: true });
        await writeFile(path.join(uploadsDir, uniqueFileName), buffer);
      } catch (fsErr) {
        console.warn('Local file write failed:', fsErr);
        // Continue without local file — text was already extracted
      }
    }

    // Parse with AI (or regex fallback)
    const parsed = await parseCV(text);

    // Save candidate to database
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

    return NextResponse.json({
      success: true,
      message: 'CV başarıyla yüklendi ve işlendi.',
      candidate,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.' },
      { status: 500 }
    );
  }
}
