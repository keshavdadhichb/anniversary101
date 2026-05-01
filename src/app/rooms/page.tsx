import { fetchSheetData, Room, Guest } from '@/lib/google-sheets';
import { RoomGrid } from './RoomGrid';

export const revalidate = 0;

export default async function RoomsPage() {
  let rooms: Room[] = [];
  let guests: Guest[] = [];

  try {
    const [roomsData, guestsData] = await Promise.all([
      fetchSheetData<Room>('ROOMS'),
      fetchSheetData<Guest>('GUESTS')
    ]);
    rooms = roomsData;
    guests = guestsData;
  } catch (e) {
    console.error('Failed to fetch data for rooms page:', e);
  }

  return (
    <div className="pt-2">
      <RoomGrid initialRooms={rooms} allGuests={guests} />
    </div>
  );
}
