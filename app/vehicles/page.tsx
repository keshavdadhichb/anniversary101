import { fetchSheetData, VehicleTrip } from '@/lib/google-sheets';
import { VehicleList } from './VehicleList';

export const revalidate = 0;

export default async function VehiclesPage() {
  let vehicles: VehicleTrip[] = [];
  try {
    vehicles = await fetchSheetData<VehicleTrip>('VEHICLES_TRIPS');
  } catch (e) {
    console.error(e);
  }

  return (
    <div className="p-4 pt-8 pb-24 min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Vehicles & Trips</h1>
      <VehicleList initialVehicles={vehicles} />
    </div>
  );
}
