import { NextRequest, NextResponse } from 'next/server';
import { getCandidateById, updateCandidateStatus, deleteCandidate, getNotesByCandidate } from '@/lib/db';
import { CandidateStatus } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const candidate = await getCandidateById(Number(id));
    if (!candidate) return NextResponse.json({ error: 'Aday bulunamadı.' }, { status: 404 });
    const notes = await getNotesByCandidate(Number(id));
    return NextResponse.json({ candidate, notes });
  } catch (error) {
    console.error('Error in candidate GET:', error);
    return NextResponse.json({ error: 'Yüklenemedi.' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await request.json() as { status: CandidateStatus };
    const valid: CandidateStatus[] = ['Yeni', 'İncelendi', 'Görüşme Planlandı', 'Teklif Yapıldı', 'Reddedildi'];
    if (!valid.includes(status)) return NextResponse.json({ error: 'Geçersiz durum.' }, { status: 400 });

    const candidate = await updateCandidateStatus(Number(id), status);
    if (!candidate) return NextResponse.json({ error: 'Aday bulunamadı.' }, { status: 404 });
    return NextResponse.json({ candidate });
  } catch (error) {
    console.error('Error in candidate PUT:', error);
    return NextResponse.json({ error: 'Güncellenemedi.' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const candidate = await getCandidateById(Number(id));
    if (!candidate) return NextResponse.json({ error: 'Aday bulunamadı.' }, { status: 404 });

    // Delete local file if it exists and is not a remote URL
    if (candidate.file_path && !candidate.file_path.startsWith('http')) {
      const path = await import('path');
      const { unlink } = await import('fs/promises');
      try {
        await unlink(path.join(process.cwd(), 'uploads', candidate.file_path));
      } catch {
        /* ignore */
      }
    }

    await deleteCandidate(Number(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in candidate DELETE:', error);
    return NextResponse.json({ error: 'Silinemedi.' }, { status: 500 });
  }
}
