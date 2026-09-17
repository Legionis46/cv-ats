import { NextRequest, NextResponse } from 'next/server';
import { updateNote, deleteNote } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { content } = await request.json() as { content: string };
    if (!content?.trim()) return NextResponse.json({ error: 'İçerik boş olamaz.' }, { status: 400 });

    const note = await updateNote(Number(id), content.trim());
    if (!note) return NextResponse.json({ error: 'Not bulunamadı.' }, { status: 404 });
    return NextResponse.json({ success: true, note });
  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json({ error: 'Not güncellenemedi.' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ok = await deleteNote(Number(id));
    if (!ok) return NextResponse.json({ error: 'Not bulunamadı.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json({ error: 'Not silinemedi.' }, { status: 500 });
  }
}
