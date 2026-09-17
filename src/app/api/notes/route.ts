import { NextRequest, NextResponse } from 'next/server';
import { createNote, getCandidateById } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { candidate_id, content } = await request.json() as { candidate_id: number; content: string };
    if (!candidate_id || !content?.trim()) {
      return NextResponse.json({ error: 'candidate_id ve içerik zorunlu.' }, { status: 400 });
    }

    const candidate = await getCandidateById(candidate_id);
    if (!candidate) {
      return NextResponse.json({ error: 'Aday bulunamadı.' }, { status: 404 });
    }

    const note = await createNote(candidate_id, content.trim());
    return NextResponse.json({ success: true, note });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json({ error: 'Not eklenemedi.' }, { status: 500 });
  }
}
