import { fetchSheetData, Guest } from '@/lib/google-sheets';
import BroadcastView from './BroadcastView';

export const revalidate = 0;

export default async function BroadcastPage() {
  let guests: Guest[] = [];
  
  try {
    guests = await fetchSheetData<Guest>('GUESTS');
  } catch (e) {
    console.error('Failed to fetch guests for broadcast:', e);
  }

  return (
    <div className="max-w-[480px] mx-auto pt-4">
      <div className="mb-6 px-2">
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter italic uppercase">Broadcast Center</h1>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Personalized WhatsApp Messenger</p>
      </div>
      
      <BroadcastView guests={guests} />
    </div>
  );
}
