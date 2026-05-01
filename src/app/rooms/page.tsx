import { fetchSheetData, Room } from '@/lib/google-sheets';
import { RoomGrid } from './RoomGrid';

export const revalidate = 0;

export default async function RoomsPage() {
  let rooms: Room[] = [];
  try {
    rooms = await fetchSheetData<Room>('ROOMS');
  } catch (e) {
    console.error(e);
  }

  return (
    <div className="p-4 pt-8 pb-24 min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Rooms</h1>
      <RoomGrid initialRooms={rooms} />
    </div>
  );
}
