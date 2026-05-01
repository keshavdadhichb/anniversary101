'use client';

import { useState, useOptimistic, useTransition } from 'react';
import { Guest } from '@/lib/google-sheets';
import { Search, Phone, BedDouble, Car, X, Plus, UserPlus, Edit3 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function GuestList({ initialGuests }: { initialGuests: Guest[] }) {
  const [search, setSearch] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestPhone, setNewGuestPhone] = useState('');
  
  const [optimisticGuests, addOptimisticGuest] = useOptimistic(
    initialGuests,
    (state: Guest[], action: { type: 'add' | 'update', guest: Guest }) => {
      if (action.type === 'add') {
        return [...state, action.guest];
      }
      return state.map(g => g.Guest_ID === action.guest.Guest_ID ? action.guest : g);
    }
  );

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filteredGuests = optimisticGuests.filter(g => 
    g.Name?.toLowerCase().includes(search.toLowerCase()) || 
    g.Phone?.includes(search)
  );

  const handleUpdate = async (guestId: string, updates: Partial<Guest>) => {
    const originalGuest = optimisticGuests.find(g => g.Guest_ID === guestId);
    if (!originalGuest) return;

    const newGuest = { ...originalGuest, ...updates };
    
    startTransition(() => {
      addOptimisticGuest({ type: 'update', guest: newGuest });
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
      router.refresh();
    }
  };

  const handleAdd = async () => {
    if (!newGuestName.trim()) return;

    const tempId = `TEMP_${Date.now()}`;
    const newGuest: Guest = {
      Guest_ID: tempId,
      Name: newGuestName.trim(),
      Phone: newGuestPhone.trim(),
      Arrival_Time: '',
      Depart_Time: '',
      Room_ID: '',
      Vehicle_ID: '',
      Status: ''
    };

    startTransition(() => {
      addOptimisticGuest({ type: 'add', guest: newGuest });
      setIsAddMode(false);
      setNewGuestName('');
      setNewGuestPhone('');
    });

    try {
      const res = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGuest)
      });
      if (!res.ok) throw new Error('Add failed');
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Failed to add guest to database.');
      router.refresh();
    }
  };

  return (
    <div className="relative pb-24">
      <div className="flex justify-between items-center mb-6 px-1">
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Guests
        </h1>
        <button 
          onClick={() => setIsAddMode(true)}
          className="flex items-center space-x-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-full shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all active:scale-95"
        >
          <Plus size={18} />
          <span className="font-medium text-sm">Add Guest</span>
        </button>
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search guests by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full pl-11 pr-4 py-3.5 border-none rounded-2xl bg-white/70 backdrop-blur-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-base shadow-sm ring-1 ring-gray-100 transition-all"
        />
      </div>

      <div className="space-y-4">
        {filteredGuests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <UserPlus className="text-blue-500" size={28} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No guests found</h3>
            <p className="text-gray-500 text-sm max-w-[250px]">
              {search ? "We couldn't find anyone matching your search." : "Your guest list is empty. Add a new guest to get started."}
            </p>
            {!search && (
              <button 
                onClick={() => setIsAddMode(true)}
                className="mt-6 px-6 py-2.5 bg-white text-blue-600 border border-blue-200 rounded-full font-medium shadow-sm active:scale-95 transition-transform"
              >
                Add First Guest
              </button>
            )}
          </div>
        ) : (
          filteredGuests.map(guest => (
            <div 
              key={guest.Guest_ID}
              onClick={() => setSelectedGuest(guest)}
              className="group bg-white p-5 rounded-2xl shadow-sm border border-gray-100/80 flex justify-between items-center cursor-pointer hover:shadow-md hover:border-blue-100 transition-all active:scale-[0.98] relative overflow-hidden"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">{guest.Name || 'Unnamed Guest'}</h3>
                
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  {guest.Phone && (
                    <span className="flex items-center text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
                      <Phone size={12} className="mr-1.5 text-gray-400" /> {guest.Phone}
                    </span>
                  )}
                  {guest.Room_ID && (
                    <span className="flex items-center text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                      <BedDouble size={12} className="mr-1.5" /> {guest.Room_ID}
                    </span>
                  )}
                  {guest.Vehicle_ID && (
                    <span className="flex items-center text-xs font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded-md border border-purple-100">
                      <Car size={12} className="mr-1.5" /> {guest.Vehicle_ID}
                    </span>
                  )}
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                <Edit3 size={18} className="text-gray-400 group-hover:text-blue-500" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Guest Modal */}
      {isAddMode && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 duration-300 border border-white/20">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white">
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Add New Guest</h2>
              <button 
                onClick={() => { setIsAddMode(false); setNewGuestName(''); setNewGuestPhone(''); }}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors bg-gray-50"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                  className="w-full border-0 ring-1 ring-gray-200 rounded-xl p-3.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all text-gray-900"
                  placeholder="e.g. John Doe"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Phone Number
                </label>
                <input 
                  type="tel"
                  value={newGuestPhone}
                  onChange={(e) => setNewGuestPhone(e.target.value)}
                  className="w-full border-0 ring-1 ring-gray-200 rounded-xl p-3.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all text-gray-900"
                  placeholder="e.g. +91 9876543210"
                />
              </div>
              
              <div className="pt-2">
                 <button 
                   onClick={handleAdd}
                   disabled={!newGuestName.trim() || isPending}
                   className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                 >
                   Save Guest
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Guest Profile Modal */}
      {selectedGuest && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 duration-300">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white/95 backdrop-blur-md sticky top-0 z-10">
              <h2 className="text-xl font-bold text-gray-900 truncate pr-4">{selectedGuest.Name}</h2>
              <button 
                onClick={() => setSelectedGuest(null)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors bg-gray-50 shrink-0"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center">
                    <Phone size={16} className="mr-2 text-blue-500" /> Phone Number
                  </label>
                  <input 
                    type="tel"
                    defaultValue={selectedGuest.Phone}
                    onBlur={(e) => handleUpdate(selectedGuest.Guest_ID, { Phone: e.target.value })}
                    className="w-full border-0 ring-1 ring-gray-200 rounded-xl p-3.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 font-medium"
                    placeholder="Add phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center">
                    <BedDouble size={16} className="mr-2 text-indigo-500" /> Room Assignment
                  </label>
                  <input 
                    type="text"
                    defaultValue={selectedGuest.Room_ID}
                    onBlur={(e) => handleUpdate(selectedGuest.Guest_ID, { Room_ID: e.target.value })}
                    className="w-full border-0 ring-1 ring-gray-200 rounded-xl p-3.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-gray-900 font-medium"
                    placeholder="Assign a room"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center">
                    <Car size={16} className="mr-2 text-purple-500" /> Vehicle Assignment
                  </label>
                  <input 
                    type="text"
                    defaultValue={selectedGuest.Vehicle_ID}
                    onBlur={(e) => handleUpdate(selectedGuest.Guest_ID, { Vehicle_ID: e.target.value })}
                    className="w-full border-0 ring-1 ring-gray-200 rounded-xl p-3.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-purple-500 transition-all text-gray-900 font-medium"
                    placeholder="Assign a vehicle"
                  />
                </div>
              </div>
              
              <div className="pt-4 pb-2">
                 <button 
                   onClick={() => setSelectedGuest(null)}
                   className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black shadow-lg shadow-gray-900/20 transition-all active:scale-[0.98]"
                 >
                   Done Editing
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
