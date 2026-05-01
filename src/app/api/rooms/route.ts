import { NextResponse } from 'next/server';
import { fetchSheetData, updateSheetRow, appendSheetRow, Room } from '@/lib/google-sheets';

export async function GET() {
  try {
    const rooms = await fetchSheetData<Room>('ROOMS');
    return NextResponse.json(rooms);
  } catch (error: any) {
    console.error('Failed to fetch rooms:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { id, updates } = data; // id is Room_ID
    
    if (!id || !updates) {
      return NextResponse.json({ error: 'Missing id or updates' }, { status: 400 });
    }

    await updateSheetRow('ROOMS', 'Room_ID', id, updates);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update room:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!data || !data.Room_ID) {
      return NextResponse.json({ error: 'Missing Room_ID' }, { status: 400 });
    }
    await appendSheetRow('ROOMS', data);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to add room:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
