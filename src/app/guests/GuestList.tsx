'use client';

import { useState, useOptimistic, useTransition, useMemo } from 'react';
import { Guest, Room, VehicleTrip } from '@/lib/google-sheets';
import { Search, MapPin, Car, Phone, X, Save, ArrowLeft, CheckCircle2, Circle, Clock, Plus, UserPlus, Calendar, User, Info, AlertTriangle, ShieldCheck, ChevronRight, Users, Plane, Info as InfoIcon, Truck, Building2, Map } from 'lucide-react';
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
  const [selectedGuest, setSelectedGuest] = useState<any | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [tempData, setTempData] = useState<any>({});
  const [isModified, setIsModified] = useState(false);

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

  // Stats for the "Clean Dashboard"
  const stats = useMemo(() => {
    return {
      total: optimisticGuests.length,
      pending: optimisticGuests.filter(g => g.Status === 'Pending' || !g.Status).length,
      inTransit: optimisticGuests.filter(g => g.Status === 'In Transit').length,
      checkedIn: optimisticGuests.filter(g => g.Status === 'Checked-In').length,
      checkedOut: optimisticGuests.filter(g => g.Status === 'Checked-Out').length,
    };
  }, [optimisticGuests]);

  const filteredGuests = useMemo(() => {
    if (!search.trim()) return []; // SHOW ONLY NUMBERS IF NO SEARCH
    return optimisticGuests.filter(g => 
      g.Name?.toLowerCase().includes(search.toLowerCase()) || 
      (g as any).Family_POC?.toLowerCase().includes(search.toLowerCase())
    );
  }, [optimisticGuests, search]);

  const handleOpenProfile = (guest: any) => {
    setSelectedGuest(guest);
    setTempData({ ...guest });
    setIsModified(false);
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

  const saveAllChanges = () => {
    if (!selectedGuest) return;
    handleUpdateGuest(tempData, 'All details updated successfully');
    setIsModified(false);
  };

  return (
    <div className="relative">
      {/* CLEAN DASHBOARD STATS */}
      {!search.trim() && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-50 flex flex-col items-center justify-center space-y-2">
            <Users className="text-blue-500" size={24} />
            <p className="text-3xl font-black text-gray-900">{stats.total}</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Guests</p>
          </div>
          <div className="bg-green-50 p-6 rounded-[32px] shadow-sm border border-green-100 flex flex-col items-center justify-center space-y-2">
            <ShieldCheck className="text-green-600" size={24} />
            <p className="text-3xl font-black text-green-900">{stats.checkedIn}</p>
            <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">Checked In</p>
          </div>
          <div className="bg-amber-50 p-6 rounded-[32px] shadow-sm border border-amber-100 flex flex-col items-center justify-center space-y-2">
            <Truck className="text-amber-600" size={24} />
            <p className="text-3xl font-black text-amber-900">{stats.inTransit}</p>
            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">In Transit</p>
          </div>
          <div className="bg-gray-50 p-6 rounded-[32px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-2">
            <Circle className="text-gray-400" size={24} />
            <p className="text-3xl font-black text-gray-700">{stats.pending}</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pending</p>
          </div>
        </div>
      )}

      {/* Sticky Search & Add Bar */}
      <div className="sticky top-0 z-20 bg-[#F9FAFB]/80 backdrop-blur-md py-3 -mx-4 px-4 flex space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder="Search Name or Family POC..."
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

      {/* SEARCH RESULTS */}
      <div className="mt-4 space-y-3 pb-4">
        {search.trim() && filteredGuests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <User className="text-gray-300" size={40} />
            </div>
            <p className="text-gray-500 font-medium">No one found with that name</p>
          </div>
        ) : (
          filteredGuests.map(guest => (
            <div 
              key={guest.Guest_ID}
              onClick={() => handleOpenProfile(guest)}
              className="bg-white p-5 rounded-2xl border border-gray-50 shadow-sm active:scale-[0.98] transition-all cursor-pointer flex justify-between items-center group"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-lg font-black text-gray-900 leading-tight">
                    {guest.Name}
                  </h3>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                    guest.Status === 'Checked-In' ? 'bg-green-100 text-green-700' :
                    guest.Status === 'In Transit' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {guest.Status || 'Pending'}
                  </span>
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                  <Users size={10} className="mr-1" /> {(guest as any).Family_POC || 'Independent'}
                </p>
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

      {/* COMPREHENSIVE GUEST PROFILE DASHBOARD */}
      {isProfileOpen && selectedGuest && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsProfileOpen(false)} />
          <div className="relative w-full max-w-[480px] bg-[#F9FAFB] h-full flex flex-col shadow-2xl animate-in slide-in-from-right-full duration-500">
            {/* Header */}
            <div className="px-6 py-6 bg-white border-b border-gray-100 flex items-center h-24 shadow-sm sticky top-0 z-10">
              <button onClick={() => setIsProfileOpen(false)} className="p-3 -ml-2 rounded-2xl hover:bg-gray-50 text-gray-400"><ArrowLeft size={24} /></button>
              <div className="ml-3">
                <h2 className="text-2xl font-black text-gray-900 leading-none">{selectedGuest.Name}</h2>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1.5 flex items-center"><Users size={10} className="mr-1" /> Family: {(selectedGuest as any).Family_POC}</p>
              </div>
              <button onClick={() => setIsProfileOpen(false)} className="ml-auto p-3 rounded-2xl bg-gray-50 text-gray-400"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-40">
              {/* SECTION: PERSONAL & STATUS */}
              <section className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-50 space-y-6">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2 flex items-center"><User size={12} className="mr-2" /> Personal & Status</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-300 uppercase block mb-1">Status</label>
                    <select 
                      value={tempData.Status || 'Pending'}
                      onChange={(e) => { setTempData({...tempData, Status: e.target.value}); setIsModified(true); }}
                      className="w-full bg-gray-50 border-none rounded-xl py-3 px-3 font-black text-xs appearance-none ring-1 ring-gray-100"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Transit">In Transit</option>
                      <option value="Checked-In">Checked-In</option>
                      <option value="Checked-Out">Checked-Out</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-300 uppercase block mb-1">Phone</label>
                    <input 
                      type="tel"
                      value={tempData.Phone || ''}
                      onChange={(e) => { setTempData({...tempData, Phone: e.target.value}); setIsModified(true); }}
                      className="w-full bg-gray-50 border-none rounded-xl py-3 px-3 font-bold text-xs ring-1 ring-gray-100"
                      placeholder="Add Phone"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-300 uppercase block mb-1">Family POC</label>
                  <input 
                    type="text"
                    value={tempData.Family_POC || ''}
                    onChange={(e) => { setTempData({...tempData, Family_POC: e.target.value}); setIsModified(true); }}
                    className="w-full bg-gray-50 border-none rounded-xl py-3 px-3 font-bold text-xs ring-1 ring-gray-100"
                  />
                </div>
              </section>

              {/* SECTION: TRAVEL DETAILS */}
              <section className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-50 space-y-6">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2 flex items-center"><Plane size={12} className="mr-2" /> Travel Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-300 uppercase block mb-1">Origin</label>
                    <input 
                      type="text"
                      value={tempData.Origin || ''}
                      onChange={(e) => { setTempData({...tempData, Origin: e.target.value}); setIsModified(true); }}
                      className="w-full bg-gray-50 border-none rounded-xl py-3 px-3 font-bold text-xs ring-1 ring-gray-100"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-300 uppercase block mb-1">Root No.</label>
                    <select 
                      value={tempData.Root_Number || ''}
                      onChange={(e) => { setTempData({...tempData, Root_Number: e.target.value}); setIsModified(true); }}
                      className="w-full bg-gray-50 border-none rounded-xl py-3 px-3 font-bold text-xs ring-1 ring-gray-100"
                    >
                      <option value="">None</option>
                      {allVehicles.map(v => <option key={v.Trip_ID} value={v.Trip_ID}>Root {v.Trip_ID} ({v.Vehicle_Number})</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-300 uppercase block mb-1">Arrival Time</label>
                    <input 
                      type="text"
                      value={tempData.Arrival_Time || ''}
                      onChange={(e) => { setTempData({...tempData, Arrival_Time: e.target.value}); setIsModified(true); }}
                      className="w-full bg-gray-50 border-none rounded-xl py-3 px-3 font-bold text-xs ring-1 ring-gray-100"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-300 uppercase block mb-1">Depart Time</label>
                    <input 
                      type="text"
                      value={tempData.Depart_Time || ''}
                      onChange={(e) => { setTempData({...tempData, Depart_Time: e.target.value}); setIsModified(true); }}
                      className="w-full bg-gray-50 border-none rounded-xl py-3 px-3 font-bold text-xs ring-1 ring-gray-100"
                    />
                  </div>
                </div>
              </section>

              {/* SECTION: STAY DETAILS */}
              <section className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-50 space-y-6">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2 flex items-center"><Building2 size={12} className="mr-2" /> Stay Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-300 uppercase block mb-1">Hotel</label>
                    <input 
                      type="text"
                      value={tempData.Hotel || ''}
                      onChange={(e) => { setTempData({...tempData, Hotel: e.target.value}); setIsModified(true); }}
                      className="w-full bg-gray-50 border-none rounded-xl py-3 px-3 font-bold text-xs ring-1 ring-gray-100"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-300 uppercase block mb-1">Room No.</label>
                    <select 
                      value={tempData.Room_ID || ''}
                      onChange={(e) => { setTempData({...tempData, Room_ID: e.target.value}); setIsModified(true); }}
                      className="w-full bg-gray-50 border-none rounded-xl py-3 px-3 font-bold text-xs ring-1 ring-gray-100"
                    >
                      <option value="">Unassigned</option>
                      {allRooms.map(r => <option key={r.Room_ID} value={r.Room_ID}>{r.Room_ID} ({r.Location})</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-300 uppercase block mb-1">Remarks</label>
                  <textarea 
                    value={tempData.Remarks || ''}
                    onChange={(e) => { setTempData({...tempData, Remarks: e.target.value}); setIsModified(true); }}
                    className="w-full bg-gray-50 border-none rounded-xl py-3 px-3 font-bold text-xs ring-1 ring-gray-100 h-20"
                  />
                </div>
              </section>
            </div>

            {/* SAVE BUTTON */}
            {isModified && (
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-white border-t border-gray-100 shadow-2xl animate-in slide-in-from-bottom-full">
                <button 
                  onClick={saveAllChanges}
                  className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black text-xl shadow-xl shadow-blue-100 active:scale-95 transition-all flex items-center justify-center"
                >
                  <Save size={24} className="mr-3" /> Save All Changes
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
