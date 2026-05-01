import { NextResponse } from 'next/server';
import { fetchSheetData, updateSheetRow, appendSheetRow, Guest } from '@/lib/google-sheets';

export async function GET() {
  try {
    const guests = await fetchSheetData<Guest>('GUESTS');
    return NextResponse.json(guests);
  } catch (error: any) {
    console.error('Failed to fetch guests:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { id, updates } = data; // id is Guest_ID
    
    if (!id || !updates) {
      return NextResponse.json({ error: 'Missing id or updates' }, { status: 400 });
    }

    await updateSheetRow('GUESTS', 'Guest_ID', id, updates);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update guest:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    if (!data || !data.Name) {
      return NextResponse.json({ error: 'Missing Name' }, { status: 400 });
    }

    await appendSheetRow('GUESTS', data);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to add guest:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
