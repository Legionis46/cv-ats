import { NextRequest, NextResponse } from 'next/server';
import { queryCandidates } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const candidates = await queryCandidates({
      search: searchParams.get('search') || undefined,
      university: searchParams.get('university') || undefined,
      department: searchParams.get('department') || undefined,
      skills: searchParams.get('skills') ? searchParams.get('skills')!.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      min_experience: searchParams.get('min_experience') ? parseFloat(searchParams.get('min_experience')!) : undefined,
      max_experience: searchParams.get('max_experience') ? parseFloat(searchParams.get('max_experience')!) : undefined,
      status: searchParams.get('status') || undefined,
    });
    return NextResponse.json({ candidates });
  } catch (error) {
    console.error('Error in candidates route:', error);
    return NextResponse.json({ error: 'Adaylar yüklenemedi.' }, { status: 500 });
  }
}
