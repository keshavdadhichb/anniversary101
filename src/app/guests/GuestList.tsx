'use client';

import { useState, useOptimistic, useTransition, useMemo } from 'react';
import { Guest, Room, VehicleTrip } from '@/lib/google-sheets';
import { Search, MapPin, Car, Phone, X, Save, ArrowLeft, CheckCircle2, Circle, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { triggerSync } from '@/lib/sync-util';

interface GuestListProps {
  initialGuests: Guest[];
  allRooms: Room[];
  allVehicles: VehicleTrip[];
}

export function GuestList({ initialGuests, allRooms, allVehicles }: GuestListProps) {
  const [search, setSearch] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Profile editing state
  const [tempPhone, setTempPhone] = useState('');
  const [isPhoneModified, setIsPhoneModified] = useState(false);
  
  const [optimisticGuests, addOptimisticGuest] = useOptimistic(
    initialGuests,
    (state: Guest[], updatedGuest: Guest) => {
      return state.map(g => g.Guest_ID === updatedGuest.Guest_ID ? updatedGuest : g);
    }
  );

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filteredGuests = useMemo(() => {
    return optimisticGuests.filter(g => 
      g.Name?.toLowerCase().includes(search.toLowerCase()) || 
      g.Phone?.toLowerCase().includes(search.toLowerCase())
    );
  }, [optimisticGuests, search]);

  const handleOpenProfile = (guest: Guest) => {
    setSelectedGuest(guest);
    setTempPhone(guest.Phone || '');
    setIsPhoneModified(false);
    setIsProfileOpen(true);
  };

  const handleUpdateGuest = async (updates: Partial<Guest>, successMessage: string) => {
    if (!selectedGuest) return;
    
    const updatedGuest = { ...selectedGuest, ...updates };
    
    startTransition(() => {
      addOptimisticGuest(updatedGuest);
      setSelectedGuest(updatedGuest);
    });

    try {
      triggerSync();
      const res = await fetch('/api/guests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedGuest.Guest_ID, updates }),
      });
      
      if (!res.ok) throw new Error('Update failed');
      
      toast.success(successMessage);
      router.refresh();
    } catch (e) {
      toast.error('Failed to update guest');
      router.refresh();
    }
  };

  const toggleCheckIn = () => {
    if (!selectedGuest) return;
    const isCheckedIn = selectedGuest.Status === 'Checked-In';
    const newStatus = isCheckedIn ? 'Pending' : 'Checked-In';
    handleUpdateGuest({ Status: newStatus }, isCheckedIn ? 'Check-in undone' : 'Guest checked in successfully!');
  };

  const savePhone = () => {
    handleUpdateGuest({ Phone: tempPhone }, 'Phone number updated');
    setIsPhoneModified(false);
  };

  return (
    <div className="relative">
      {/* Sticky Search Bar */}
      <div className="sticky top-0 z-20 bg-[#F9FAFB]/80 backdrop-blur-md py-3 -mx-4 px-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder="Search name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border-none rounded-2xl py-4 pl-12 pr-4 shadow-sm ring-1 ring-gray-100 focus:ring-2 focus:ring-blue-500 transition-all text-base"
          />
        </div>
      </div>

      {/* Guest List */}
      <div className="mt-4 space-y-3 pb-4">
        {filteredGuests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Users className="text-gray-300" size={40} />
            </div>
            <p className="text-gray-500 font-medium">No guests found matching &quot;{search}&quot;</p>
          </div>
        ) : (
          filteredGuests.map(guest => (
            <div 
              key={guest.Guest_ID}
              onClick={() => handleOpenProfile(guest)}
              className="bg-white p-5 rounded-2xl border border-gray-50 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold text-gray-900 leading-tight">
                  {guest.Name}
                </h3>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  guest.Status === 'Checked-In' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {guest.Status || 'Pending'}
                </span>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="flex items-center text-xs font-medium text-gray-400">
                  <MapPin size={14} className="mr-1.5" />
                  <span className={guest.Room_ID ? 'text-gray-700' : ''}>
                    {guest.Room_ID || 'Unassigned'}
                  </span>
                </div>
                <div className="flex items-center text-xs font-medium text-gray-400">
                  <Car size={14} className="mr-1.5" />
                  <span className={guest.Vehicle_ID ? 'text-gray-700' : ''}>
                    {guest.Vehicle_ID || 'Unassigned'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Slide-over Profile Modal */}
      {isProfileOpen && selectedGuest && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in"
            onClick={() => setIsProfileOpen(false)}
          />
          <div className="relative w-full max-w-[480px] bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center h-20">
              <button 
                onClick={() => setIsProfileOpen(false)}
                className="p-2 -ml-2 rounded-full hover:bg-gray-50 text-gray-500"
              >
                <ArrowLeft size={24} />
              </button>
              <h2 className="ml-2 text-xl font-extrabold text-gray-900">
                {selectedGuest.Name}
              </h2>
              <button 
                onClick={() => setIsProfileOpen(false)}
                className="ml-auto p-2 rounded-full hover:bg-gray-50 text-gray-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
              {/* Section 1: Contact */}
              <section>
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Contact Details</h4>
                <div className="flex space-x-3">
                  <div className="relative flex-1">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <Phone size={18} />
                    </div>
                    <input 
                      type="tel"
                      value={tempPhone}
                      onChange={(e) => {
                        setTempPhone(e.target.value);
                        setIsPhoneModified(true);
                      }}
                      className="w-full bg-gray-50 border-none rounded-xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                      placeholder="Phone number"
                    />
                  </div>
                  {isPhoneModified && (
                    <button 
                      onClick={savePhone}
                      className="bg-blue-600 text-white p-3.5 rounded-xl shadow-lg shadow-blue-200 active:scale-95 transition-all"
                    >
                      <Save size={20} />
                    </button>
                  ) }
                </div>
              </section>

              {/* Section 2: Travel Itinerary (Read-Only) */}
              <section>
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Travel Itinerary</h4>
                <div className="bg-gray-100/80 rounded-2xl p-5 border border-gray-200/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-500 flex items-center">
                      <Clock size={16} className="mr-2" /> Arrival
                    </span>
                    <span className="text-sm font-black text-gray-800">{selectedGuest.Arrival_Time || '--:--'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-500 flex items-center">
                      <Clock size={16} className="mr-2" /> Departure
                    </span>
                    <span className="text-sm font-black text-gray-800">{selectedGuest.Depart_Time || '--:--'}</span>
                  </div>
                </div>
              </section>

              {/* Section 3: Logistics Assignments */}
              <section className="space-y-6">
                <div>
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Assigned Room</h4>
                  <select 
                    value={selectedGuest.Room_ID || ''}
                    onChange={(e) => handleUpdateGuest({ Room_ID: e.target.value }, `Assigned to Room ${e.target.value}`)}
                    className="w-full bg-gray-50 border-none rounded-xl py-4 px-4 focus:ring-2 focus:ring-blue-500 text-gray-900 font-bold appearance-none ring-1 ring-gray-100"
                  >
                    <option value="">Select a Room</option>
                    {allRooms.map(room => (
                      <option key={room.Room_ID} value={room.Room_ID}>
                        {room.Room_ID} - {room.Location} ({room.Status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Assigned Vehicle</h4>
                  <select 
                    value={selectedGuest.Vehicle_ID || ''}
                    onChange={(e) => handleUpdateGuest({ Vehicle_ID: e.target.value }, `Assigned to Vehicle ${e.target.value}`)}
                    className="w-full bg-gray-50 border-none rounded-xl py-4 px-4 focus:ring-2 focus:ring-blue-500 text-gray-900 font-bold appearance-none ring-1 ring-gray-100"
                  >
                    <option value="">Select a Vehicle</option>
                    {/* We should ideally group vehicles/trips, but for now we list trips */}
                    {allVehicles.map(v => (
                      <option key={v.Trip_ID} value={v.Vehicle_Number}>
                        {v.Vehicle_Number} ({v.Driver_Name})
                      </option>
                    ))}
                  </select>
                </div>
              </section>
            </div>

            {/* Section 4: Check-In Action */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100">
              <button 
                onClick={toggleCheckIn}
                disabled={isPending}
                className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl transition-all active:scale-[0.98] ${
                  selectedGuest.Status === 'Checked-In'
                    ? 'border-2 border-red-500 text-red-500 bg-white hover:bg-red-50'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                }`}
              >
                {selectedGuest.Status === 'Checked-In' ? 'Undo Check-In' : 'Check-In Guest'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
