import { fetchSheetData, VehicleTrip, Guest } from '@/lib/google-sheets';
import { VehicleList } from './VehicleList';

export const revalidate = 0;

export default async function VehiclesPage() {
  let vehicles: VehicleTrip[] = [];
  let guests: Guest[] = [];

  try {
    const [vehiclesData, guestsData] = await Promise.all([
      fetchSheetData<VehicleTrip>('VEHICLES_TRIPS'),
      fetchSheetData<Guest>('GUESTS')
    ]);
    vehicles = vehiclesData;
    guests = guestsData;
  } catch (e) {
    console.error('Failed to fetch data for vehicles page:', e);
  }

  return (
    <div className="pt-2">
      <VehicleList initialVehicles={vehicles} allGuests={guests} />
    </div>
  );
}
