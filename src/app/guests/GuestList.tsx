'use client';

import { useState, useOptimistic, useTransition } from 'react';
import { Guest } from '@/lib/google-sheets';
import { Search, Phone, BedDouble, Car, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function GuestList({ initialGuests }: { initialGuests: Guest[] }) {
  const [search, setSearch] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  
  const [optimisticGuests, addOptimisticGuest] = useOptimistic(
    initialGuests,
    (state: Guest[], updatedGuest: Guest) => {
      return state.map(g => g.Guest_ID === updatedGuest.Guest_ID ? updatedGuest : g);
    }
  );

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filteredGuests = optimisticGuests.filter(g => 
    g.Name.toLowerCase().includes(search.toLowerCase()) || 
    g.Phone?.includes(search)
  );

  const handleUpdate = async (guestId: string, updates: Partial<Guest>) => {
    const originalGuest = optimisticGuests.find(g => g.Guest_ID === guestId);
    if (!originalGuest) return;

    const newGuest = { ...originalGuest, ...updates };
    
    startTransition(() => {
      addOptimisticGuest(newGuest);
      if (selectedGuest?.Guest_ID === guestId) {
        setSelectedGuest(newGuest);
      }
    });

    try {
      const res = await fetch('/api/guests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: guestId, updates })
      });
      if (!res.ok) throw new Error('Update failed');
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Failed to update guest in database.');
      // A full refresh would revert the optimistic update on error
      router.refresh();
    }
  };

  return (
    <div>
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search guests..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm transition-all"
        />
      </div>

      <div className="space-y-3">
        {filteredGuests.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No guests found.
          </div>
        ) : (
          filteredGuests.map(guest => (
            <div 
              key={guest.Guest_ID}
              onClick={() => setSelectedGuest(guest)}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer active:scale-[0.98] transition-transform"
            >
              <div>
                <h3 className="font-semibold text-gray-900">{guest.Name || 'Unnamed Guest'}</h3>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  {guest.Room_ID && (
                    <span className="flex items-center"><BedDouble size={14} className="mr-1" /> {guest.Room_ID}</span>
                  )}
                  {guest.Vehicle_ID && (
                    <span className="flex items-center"><Car size={14} className="mr-1" /> {guest.Vehicle_ID}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Guest Detail Modal */}
      {selectedGuest && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 duration-300">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">{selectedGuest.Name}</h2>
              <button 
                onClick={() => setSelectedGuest(null)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Phone size={16} className="mr-2 text-gray-400" /> Phone Number
                </label>
                <input 
                  type="tel"
                  defaultValue={selectedGuest.Phone}
                  onBlur={(e) => handleUpdate(selectedGuest.Guest_ID, { Phone: e.target.value })}
                  className="w-full border-gray-200 rounded-lg p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-colors"
                  placeholder="e.g. +91 9876543210"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <BedDouble size={16} className="mr-2 text-gray-400" /> Room Assignment
                </label>
                <input 
                  type="text"
                  defaultValue={selectedGuest.Room_ID}
                  onBlur={(e) => handleUpdate(selectedGuest.Guest_ID, { Room_ID: e.target.value })}
                  className="w-full border-gray-200 rounded-lg p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-colors"
                  placeholder="e.g. A102"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Car size={16} className="mr-2 text-gray-400" /> Vehicle Assignment
                </label>
                <input 
                  type="text"
                  defaultValue={selectedGuest.Vehicle_ID}
                  onBlur={(e) => handleUpdate(selectedGuest.Guest_ID, { Vehicle_ID: e.target.value })}
                  className="w-full border-gray-200 rounded-lg p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-colors"
                  placeholder="e.g. Innova-1"
                />
              </div>
              
              <div className="pt-4 flex gap-3">
                 <button 
                   onClick={() => setSelectedGuest(null)}
                   className="w-full py-3 bg-gray-100 text-gray-800 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                 >
                   Done
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
