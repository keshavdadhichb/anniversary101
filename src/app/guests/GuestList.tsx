'use client';

import { useState, useOptimistic, useTransition, useMemo } from 'react';
import { Guest, Room, VehicleTrip } from '@/lib/google-sheets';
import { Search, MapPin, Car, Phone, X, Save, ArrowLeft, CheckCircle2, Circle, Clock, Plus, UserPlus, Calendar, User, Info, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { triggerSync } from '@/lib/sync-util';
import { NewGuestFormV3 } from './NewGuestFormV3';

interface GuestListProps {
  initialGuests: Guest[];
  allRooms: Room[];
  allVehicles: VehicleTrip[];
}

export function GuestList({ initialGuests, allRooms, allVehicles }: GuestListProps) {
  const [search, setSearch] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [tempPhone, setTempPhone] = useState('');
  const [isPhoneModified, setIsPhoneModified] = useState(false);

  const [optimisticGuests, addOptimisticGuest] = useOptimistic(
    initialGuests,
    (state: Guest[], updatedGuest: Guest) => {
      const exists = state.find(g => g.Guest_ID === updatedGuest.Guest_ID);
      if (exists) {
        return state.map(g => g.Guest_ID === updatedGuest.Guest_ID ? updatedGuest : g);
      } else {
        return [updatedGuest, ...state];
      }
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

  return (
    <div className="relative">
      {/* VERSION PROOF ALERT */}
      <div className="bg-amber-400 p-4 rounded-2xl mb-4 flex items-center space-x-3 shadow-lg animate-pulse border-4 border-amber-600">
        <AlertTriangle className="text-amber-900" size={32} />
        <div>
          <p className="font-black text-amber-900 text-sm">UI VERSION 3.0 LOADED</p>
          <p className="text-amber-800 text-[10px] font-bold">If you see this, the code is updated. Tap the blue button to see ALL 8 FIELDS.</p>
        </div>
      </div>

      {/* Sticky Search & Add Bar */}
      <div className="sticky top-0 z-20 bg-[#F9FAFB]/80 backdrop-blur-md py-3 -mx-4 px-4 flex space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder="Search name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border-none rounded-2xl py-4 pl-12 pr-4 shadow-sm ring-1 ring-gray-100 focus:ring-2 focus:ring-blue-600 transition-all text-base font-medium"
          />
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-100 active:scale-95 transition-all flex items-center justify-center"
        >
          <UserPlus size={24} />
        </button>
      </div>

      {/* Guest List */}
      <div className="mt-4 space-y-3 pb-4">
        {filteredGuests.map(guest => (
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
          </div>
        )) }
      </div>

      {/* NEW GUEST MODAL V3 */}
      {isAddModalOpen && (
        <NewGuestFormV3 
          onAdded={() => { setIsAddModalOpen(false); router.refresh(); }}
          onCancel={() => setIsAddModalOpen(false)}
          rooms={allRooms}
          vehicles={allVehicles}
        />
      )}

      {/* Slide-over Profile Modal */}
      {isProfileOpen && selectedGuest && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in"
            onClick={() => setIsProfileOpen(false)}
          />
          <div className="relative w-full max-w-[480px] bg-[#F9FAFB] h-full flex flex-col shadow-2xl animate-in slide-in-from-right-full duration-300">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-white border-b border-gray-100 flex items-center h-20 shadow-sm">
              <button 
                onClick={() => setIsProfileOpen(false)}
                className="p-2 -ml-2 rounded-full hover:bg-gray-50 text-gray-500"
              >
                <ArrowLeft size={24} />
              </button>
              <h2 className="ml-2 text-xl font-black text-gray-900">
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
              <section className="bg-white p-5 rounded-3xl shadow-sm border border-gray-50">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Guest Status</h4>
                <select 
                  value={selectedGuest.Status || 'Pending'}
                  onChange={(e) => handleUpdateGuest({ Status: e.target.value }, `Status updated to ${e.target.value}`)}
                  className="w-full bg-gray-50 border-none rounded-xl py-4 px-4 focus:ring-2 focus:ring-blue-500 text-gray-900 font-bold ring-1 ring-gray-100 appearance-none"
                >
                  <option value="Pending">Pending</option>
                  <option value="Checked-In">Checked-In</option>
                </select>
              </section>

              <section className="bg-white p-5 rounded-3xl shadow-sm border border-gray-50">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Contact Details</h4>
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
                    />
                  </div>
                  {isPhoneModified && (
                    <button 
                      onClick={() => {
                        handleUpdateGuest({ Phone: tempPhone }, 'Phone number updated');
                        setIsPhoneModified(false);
                      }}
                      className="bg-blue-600 text-white p-3.5 rounded-xl shadow-lg shadow-blue-200 active:scale-95 transition-all"
                    >
                      <Save size={20} />
                    </button>
                  ) }
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
