import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { getCandidateById, getStorageBaseDir } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const candidate = await getCandidateById(Number(id));

    if (!candidate?.file_path) {
      return NextResponse.json({ error: 'Dosya bulunamadı.' }, { status: 404 });
    }

    // If stored on Vercel Blob or external cloud storage:
    if (candidate.file_path.startsWith('http://') || candidate.file_path.startsWith('https://')) {
      return NextResponse.redirect(candidate.file_path);
    }

    // Local file storage — check both storage base dir and cwd
    let filePath = path.join(getStorageBaseDir(), 'uploads', candidate.file_path);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), 'uploads', candidate.file_path);
    }
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Dosya sistemde yok.' }, { status: 404 });
    }

    const buffer = fs.readFileSync(filePath);
    const ext = candidate.file_path.toLowerCase().endsWith('.docx') ? 'docx'
              : candidate.file_path.toLowerCase().endsWith('.doc') ? 'doc' : 'pdf';
    const contentType = ext === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(candidate.file_name || `cv.${ext}`)}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json({ error: 'Dosya indirilemedi.' }, { status: 500 });
  }
}
