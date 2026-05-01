import { fetchSheetData, Guest, Room, VehicleTrip } from '@/lib/google-sheets';
import { GuestList } from './GuestList';

export const revalidate = 0;

export default async function GuestsPage() {
  let guests: Guest[] = [];
  let rooms: Room[] = [];
  let vehicles: VehicleTrip[] = [];

  try {
    const [guestsData, roomsData, vehiclesData] = await Promise.all([
      fetchSheetData<Guest>('GUESTS'),
      fetchSheetData<Room>('ROOMS'),
      fetchSheetData<VehicleTrip>('VEHICLES_TRIPS')
    ]);
    guests = guestsData;
    rooms = roomsData;
    vehicles = vehiclesData;
  } catch (e) {
    console.error('Failed to fetch data for guests page:', e);
  }

  return (
    <div className="pt-2">
      <GuestList initialGuests={guests} allRooms={rooms} allVehicles={vehicles} />
    </div>
  );
}
