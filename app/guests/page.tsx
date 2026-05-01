import { fetchSheetData, Guest } from '@/lib/google-sheets';
import { GuestList } from './GuestList';

export const revalidate = 0; // Disable cache for real-time sheets data

export default async function GuestsPage() {
  let guests: Guest[] = [];
  try {
    guests = await fetchSheetData<Guest>('GUESTS');
  } catch (e) {
    console.error(e);
  }

  return (
    <div className="p-4 pt-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Guests</h1>
      <GuestList initialGuests={guests} />
    </div>
  );
}
