import { NextResponse } from 'next/server';
import { fetchSheetData, updateSheetRow, Guest, Room, VehicleTrip } from '@/lib/google-sheets';

/**
 * POST /api/gemini/execute
 * 
 * Executes a structured ACTION from Gemini AI.
 * Gemini returns { Name: "Keshav", Room_ID: "A103" } — no ID.
 * This endpoint does the name-based lookup to find the correct row ID,
 * then calls updateSheetRow with the resolved ID.
 */
export async function POST(request: Request) {
  try {
    const { action, payload } = await request.json();

    if (!action || !payload) {
      return NextResponse.json({ error: 'Missing action or payload' }, { status: 400 });
    }

    if (action === 'UPDATE_GUEST') {
      const { Name, ...updates } = payload;
      if (!Name) {
        return NextResponse.json({ error: 'Payload must include Name to look up guest' }, { status: 400 });
      }

      // Fetch all guests to find the one by name
      const guests = await fetchSheetData<Guest>('GUESTS');
      const match = guests.find(
        (g) => g.Name?.trim().toLowerCase() === String(Name).trim().toLowerCase()
      );

      if (!match) {
        return NextResponse.json(
          { error: `Guest "${Name}" not found in the database.` },
          { status: 404 }
        );
      }

      await updateSheetRow('GUESTS', 'Guest_ID', match.Guest_ID, updates);
      return NextResponse.json({ success: true, updated: { ...match, ...updates } });
    }

    if (action === 'UPDATE_ROOM') {
      const { Room_ID, ...updates } = payload;
      if (!Room_ID) {
        return NextResponse.json({ error: 'Payload must include Room_ID' }, { status: 400 });
      }
      await updateSheetRow('ROOMS', 'Room_ID', Room_ID, updates);
      return NextResponse.json({ success: true });
    }

    if (action === 'UPDATE_VEHICLE' || action === 'UPDATE_TRIP') {
      const { Trip_ID, ...updates } = payload;
      if (!Trip_ID) {
        return NextResponse.json({ error: 'Payload must include Trip_ID' }, { status: 400 });
      }
      await updateSheetRow('VEHICLES_TRIPS', 'Trip_ID', Trip_ID, updates);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('Gemini Execute Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
