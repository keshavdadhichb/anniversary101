import { NextResponse } from 'next/server';
import { fetchSheetData, updateSheetRow, VehicleTrip } from '@/lib/google-sheets';

export async function GET() {
  try {
    const vehicles = await fetchSheetData<VehicleTrip>('VEHICLES_TRIPS');
    return NextResponse.json(vehicles);
  } catch (error: any) {
    console.error('Failed to fetch vehicles:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { id, updates } = data; // id is Trip_ID
    
    if (!id || !updates) {
      return NextResponse.json({ error: 'Missing id or updates' }, { status: 400 });
    }

    await updateSheetRow('VEHICLES_TRIPS', 'Trip_ID', id, updates);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update vehicle trip:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
