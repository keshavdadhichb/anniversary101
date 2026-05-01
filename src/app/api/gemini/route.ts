import { NextResponse } from 'next/server';
import { processVoiceCommand } from '@/lib/gemini';
import { fetchSheetData } from '@/lib/google-sheets';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Fetch context
    const [guests, rooms, vehicles] = await Promise.all([
      fetchSheetData('GUESTS'),
      fetchSheetData('ROOMS'),
      fetchSheetData('VEHICLES_TRIPS'),
    ]);

    const context = {
      guests,
      rooms,
      vehicles,
    };

    const result = await processVoiceCommand(text, context);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
