'use client';

import { useState, useOptimistic, useTransition, useMemo } from 'react';
import { Guest, Room, VehicleTrip } from '@/lib/google-sheets';
import { Search, MapPin, Car, Phone, X, Save, ArrowLeft, CheckCircle2, Circle, Clock, Plus, UserPlus, Calendar, User, Info, AlertTriangle, ShieldCheck, ChevronRight } from 'lucide-react';
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

  const toggleCheckIn = () => {
    if (!selectedGuest) return;
    const isCheckedIn = selectedGuest.Status === 'Checked-In';
    const newStatus = isCheckedIn ? 'Pending' : 'Checked-In';
    handleUpdateGuest({ Status: newStatus }, isCheckedIn ? 'Check-in undone' : 'Guest checked in successfully!');
  };

  // Find assigned details
  const assignedRoom = useMemo(() => 
    allRooms.find(r => r.Room_ID === selectedGuest?.Room_ID),
    [selectedGuest, allRooms]
  );
  const assignedVehicle = useMemo(() => 
    allVehicles.find(v => v.Vehicle_Number === selectedGuest?.Vehicle_ID),
    [selectedGuest, allVehicles]
  );

  return (
    <div className="relative">
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
        {filteredGuests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <User className="text-gray-300" size={40} />
            </div>
            <p className="text-gray-500 font-medium">No guests found</p>
          </div>
        ) : (
          filteredGuests.map(guest => (
            <div 
              key={guest.Guest_ID}
              onClick={() => handleOpenProfile(guest)}
              className="bg-white p-5 rounded-2xl border border-gray-50 shadow-sm active:scale-[0.98] transition-all cursor-pointer flex justify-between items-center group"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1.5">
                  <h3 className="text-lg font-black text-gray-900 leading-tight">
                    {guest.Name}
                  </h3>
                  {guest.Status === 'Checked-In' && <ShieldCheck size={16} className="text-green-500" />}
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    <MapPin size={12} className="mr-1" />
                    <span className={guest.Room_ID ? 'text-blue-600' : ''}>
                      {guest.Room_ID || 'NO ROOM'}
                    </span>
                  </div>
                  <div className="flex items-center text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    <Car size={12} className="mr-1" />
                    <span className={guest.Vehicle_ID ? 'text-indigo-600' : ''}>
                      {guest.Vehicle_ID || 'NO TRIP'}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-200 group-hover:text-blue-400 transition-colors" />
            </div>
          ))
        )}
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

      {/* ENHANCED GUEST PROFILE DASHBOARD */}
      {isProfileOpen && selectedGuest && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsProfileOpen(false)}
          />
          <div className="relative w-full max-w-[480px] bg-[#F9FAFB] h-full flex flex-col shadow-2xl animate-in slide-in-from-right-full duration-500">
            {/* Modal Header */}
            <div className="px-6 py-6 bg-white border-b border-gray-100 flex items-center h-24 shadow-sm">
              <button 
                onClick={() => setIsProfileOpen(false)}
                className="p-3 -ml-2 rounded-2xl hover:bg-gray-50 text-gray-400 transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <div className="ml-3">
                <h2 className="text-2xl font-black text-gray-900 leading-none">
                  {selectedGuest.Name}
                </h2>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5">Guest Profile Dashboard</p>
              </div>
              <button 
                onClick={() => setIsProfileOpen(false)}
                className="ml-auto p-3 rounded-2xl bg-gray-50 text-gray-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-40">
              {/* PRIMARY STATUS & CONTACT */}
              <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-50 flex justify-between items-center">
                <div className="space-y-4 flex-1">
                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Check-In Status</h4>
                    <select 
                      value={selectedGuest.Status || 'Pending'}
                      onChange={(e) => handleUpdateGuest({ Status: e.target.value }, `Status updated to ${e.target.value}`)}
                      className={`px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest border-none ring-1 appearance-none outline-none ${
                        selectedGuest.Status === 'Checked-In' 
                          ? 'bg-green-50 text-green-700 ring-green-100' 
                          : 'bg-amber-50 text-amber-700 ring-amber-100'
                      }`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Checked-In">Checked-In</option>
                    </select>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Phone Number</h4>
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                          type="tel"
                          value={tempPhone}
                          onChange={(e) => { setTempPhone(e.target.value); setIsPhoneModified(true); }}
                          className="w-full bg-gray-50 border-none rounded-xl py-2.5 pl-9 pr-4 font-bold text-sm"
                        />
                      </div>
                      {isPhoneModified && (
                        <button onClick={() => { handleUpdateGuest({ Phone: tempPhone }, 'Updated'); setIsPhoneModified(false); }} className="bg-blue-600 text-white px-3 rounded-xl shadow-lg shadow-blue-100"><Save size={16} /></button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* LOGISTICS: ROOM ASSIGNMENT */}
              <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-50 space-y-4">
                <div className="flex items-center text-blue-600 font-black text-[10px] uppercase tracking-widest">
                  <MapPin size={14} className="mr-2" /> Accommodation details
                </div>
                {assignedRoom ? (
                  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 flex justify-between items-center">
                    <div>
                      <p className="text-xl font-black text-blue-900">Room {assignedRoom.Room_ID}</p>
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-0.5">{assignedRoom.Location}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-blue-400 uppercase">Capacity</p>
                      <p className="text-sm font-black text-blue-700">{assignedRoom.Capacity} People</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-200 text-center">
                    <p className="text-xs font-bold text-gray-400 uppercase">No Room Assigned Yet</p>
                  </div>
                )}
                <div className="pt-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Change Assignment</label>
                  <select 
                    value={selectedGuest.Room_ID || ''}
                    onChange={(e) => handleUpdateGuest({ Room_ID: e.target.value }, `Moved to Room ${e.target.value}`)}
                    className="w-full bg-gray-50 border-none rounded-xl py-4 px-4 font-black text-sm appearance-none ring-1 ring-gray-100"
                  >
                    <option value="">Select a Room</option>
                    {allRooms.map(room => (
                      <option key={room.Room_ID} value={room.Room_ID}>{room.Room_ID} - {room.Location}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* LOGISTICS: VEHICLE ASSIGNMENT */}
              <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-50 space-y-4">
                <div className="flex items-center text-indigo-600 font-black text-[10px] uppercase tracking-widest">
                  <Car size={14} className="mr-2" /> Transport details
                </div>
                {assignedVehicle ? (
                  <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xl font-black text-indigo-900">{assignedVehicle.Vehicle_Number}</p>
                        <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-0.5">{assignedVehicle.Driver_Name || 'Driver N/A'}</p>
                      </div>
                      {assignedVehicle.Driver_Phone && (
                        <a href={`tel:${assignedVehicle.Driver_Phone}`} className="p-3 bg-white text-indigo-600 rounded-xl shadow-sm"><Phone size={18} /></a>
                      )}
                    </div>
                    <div className="flex items-center text-[10px] font-black text-indigo-400 uppercase space-x-4">
                      <span className="flex items-center"><Clock size={12} className="mr-1" /> {assignedVehicle.Depart_Time || '--:--'}</span>
                      <span className="flex items-center"><MapPin size={12} className="mr-1" /> {assignedVehicle.To_Location || 'Destination TBD'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-200 text-center">
                    <p className="text-xs font-bold text-gray-400 uppercase">No Vehicle Assigned Yet</p>
                  </div>
                )}
                <div className="pt-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Change Assignment</label>
                  <select 
                    value={selectedGuest.Vehicle_ID || ''}
                    onChange={(e) => handleUpdateGuest({ Vehicle_ID: e.target.value }, `Assigned to ${e.target.value}`)}
                    className="w-full bg-gray-50 border-none rounded-xl py-4 px-4 font-black text-sm appearance-none ring-1 ring-gray-100"
                  >
                    <option value="">Select a Vehicle</option>
                    {allVehicles.map(v => (
                      <option key={v.Trip_ID} value={v.Vehicle_Number}>{v.Vehicle_Number} ({v.Driver_Name})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* TRAVEL ITINERARY */}
              <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-50 space-y-4">
                <div className="flex items-center text-rose-600 font-black text-[10px] uppercase tracking-widest">
                  <Clock size={14} className="mr-2" /> Travel schedule
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-2xl ring-1 ring-gray-100">
                    <label className="text-[10px] font-black text-gray-300 uppercase block mb-1">Arrival</label>
                    <input 
                      type="text"
                      defaultValue={selectedGuest.Arrival_Time}
                      onBlur={(e) => handleUpdateGuest({ Arrival_Time: e.target.value }, 'Arrival updated')}
                      className="bg-transparent border-none w-full font-black text-gray-700 text-sm outline-none"
                    />
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl ring-1 ring-gray-100">
                    <label className="text-[10px] font-black text-gray-300 uppercase block mb-1">Departure</label>
                    <input 
                      type="text"
                      defaultValue={selectedGuest.Depart_Time}
                      onBlur={(e) => handleUpdateGuest({ Depart_Time: e.target.value }, 'Departure updated')}
                      className="bg-transparent border-none w-full font-black text-gray-700 text-sm outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* QUICK ACTIONS FOOTER */}
            <div className="absolute bottom-0 left-0 right-0 p-8 bg-white border-t border-gray-100 shadow-xl flex space-x-3">
              <button 
                onClick={toggleCheckIn}
                disabled={isPending}
                className={`flex-1 py-5 rounded-[24px] font-black text-lg transition-all active:scale-[0.98] ${
                  selectedGuest.Status === 'Checked-In'
                    ? 'bg-red-50 text-red-500 border-2 border-red-100'
                    : 'bg-green-600 text-white shadow-xl shadow-green-100'
                }`}
              >
                {selectedGuest.Status === 'Checked-In' ? 'UNDO CHECK-IN' : 'CHECK-IN NOW'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
