'use client';

import { useState, useOptimistic, useTransition, useMemo } from 'react';
import { VehicleTrip, Guest } from '@/lib/google-sheets';
import { useRouter } from 'next/navigation';
import { Search, Car, Phone, User, MapPin, Clock, Navigation, IndianRupee, X, Plus, Trash2, ArrowRight, PlusCircle, Settings2, Info, Map } from 'lucide-react';
import toast from 'react-hot-toast';
import { triggerSync } from '@/lib/sync-util';

interface VehicleListProps {
  initialVehicles: VehicleTrip[];
  allGuests: Guest[];
}

export function VehicleList({ initialVehicles, allGuests }: VehicleListProps) {
  const [search, setSearch] = useState('');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  
  const [optimisticVehicles, addOptimisticTrip] = useOptimistic(
    initialVehicles,
    (state: VehicleTrip[], updatedTrip: VehicleTrip) => {
      const exists = state.find(t => t.Trip_ID === updatedTrip.Trip_ID);
      if (exists) {
        return state.map(t => t.Trip_ID === updatedTrip.Trip_ID ? updatedTrip : t);
      } else {
        return [...state, updatedTrip];
      }
    }
  );

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filteredTrips = useMemo(() => {
    return optimisticVehicles.filter(t => 
      t.Vehicle_Number?.toLowerCase().includes(search.toLowerCase()) || 
      t.Trip_ID?.toLowerCase().includes(search.toLowerCase()) ||
      t.From_Location?.toLowerCase().includes(search.toLowerCase())
    );
  }, [optimisticVehicles, search]);

  const selectedTrip = useMemo(() => 
    optimisticVehicles.find(t => t.Trip_ID === selectedTripId),
    [optimisticVehicles, selectedTripId]
  );

  const tripOccupants = useMemo(() => {
    const map: Record<string, string[]> = {};
    allGuests.forEach(g => {
      const root = (g as any).Root_Number;
      if (root) {
        if (!map[root]) map[root] = [];
        map[root].push(g.Name);
      }
    });
    return map;
  }, [allGuests]);

  const handleUpdateTrip = async (trip: VehicleTrip, updates: Partial<VehicleTrip>) => {
    const updatedTrip = { ...trip, ...updates };
    startTransition(() => { addOptimisticTrip(updatedTrip); });
    try {
      triggerSync();
      const res = await fetch('/api/vehicles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: trip.Trip_ID, updates })
      });
      if (!res.ok) throw new Error('Update failed');
      toast.success('Trip updated');
      router.refresh();
    } catch (e) {
      toast.error('Failed to update trip');
      router.refresh();
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="sticky top-0 z-20 bg-[#F9FAFB]/80 backdrop-blur-md py-3 -mx-4 px-4 flex space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder="Search Root or Vehicle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border-none rounded-2xl py-4 pl-12 pr-4 shadow-sm ring-1 ring-gray-100 focus:ring-2 focus:ring-blue-600 transition-all text-base font-medium"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredTrips.map(trip => {
          const occupants = tripOccupants[trip.Trip_ID] || [];
          return (
            <div 
              key={trip.Trip_ID}
              onClick={() => setSelectedTripId(trip.Trip_ID)}
              className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-50 active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                    <Navigation size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 leading-tight">Root {trip.Trip_ID}</h3>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{trip.Vehicle_Number}</p>
                  </div>
                </div>
                <div className="bg-blue-50 px-3 py-1 rounded-full text-[10px] font-black text-blue-600 uppercase tracking-widest">
                  {occupants.length} Passengers
                </div>
              </div>
              
              <div className="flex items-center space-x-4 border-t border-gray-50 pt-4">
                <div className="flex-1">
                  <p className="text-[10px] font-black text-gray-300 uppercase mb-1">From</p>
                  <p className="text-sm font-bold text-gray-700 truncate">{trip.From_Location}</p>
                </div>
                <ArrowRight size={16} className="text-gray-300" />
                <div className="flex-1">
                  <p className="text-[10px] font-black text-gray-300 uppercase mb-1">Time</p>
                  <p className="text-sm font-bold text-gray-700 truncate">{trip.Depart_Time || 'TBD'}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trip Details Modal */}
      {selectedTrip && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedTripId(null)} />
          <div className="relative bg-[#F9FAFB] w-full max-w-md sm:rounded-[40px] rounded-t-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-300 flex flex-col max-h-[90vh]">
            <div className="bg-white px-8 py-6 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10 shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white"><Navigation size={24} /></div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Root {selectedTrip.Trip_ID}</h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{selectedTrip.Vehicle_Number}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTripId(null)} className="p-3 rounded-full bg-gray-50 text-gray-400"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50 space-y-4">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2 flex items-center"><Car size={12} className="mr-2" /> Driver Info</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-300 uppercase block mb-1">Driver Name</label>
                    <input type="text" value={selectedTrip.Driver_Name} onChange={(e) => handleUpdateTrip(selectedTrip, { Driver_Name: e.target.value })} className="w-full bg-gray-50 p-3 rounded-xl font-bold text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-300 uppercase block mb-1">Driver Phone</label>
                    <input type="tel" value={selectedTrip.Driver_Phone} onChange={(e) => handleUpdateTrip(selectedTrip, { Driver_Phone: e.target.value })} className="w-full bg-gray-50 p-3 rounded-xl font-bold text-sm" />
                  </div>
                </div>
              </section>

              <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50 space-y-4">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2 flex items-center"><User size={12} className="mr-2" /> Passenger Manifest</h4>
                <div className="space-y-2">
                  {(tripOccupants[selectedTrip.Trip_ID] || []).map((name, i) => (
                    <div key={i} className="flex items-center space-x-3 bg-gray-50 p-3 rounded-xl">
                      <User size={14} className="text-gray-400" />
                      <span className="text-sm font-bold text-gray-700">{name}</span>
                    </div>
                  ))}
                  {(tripOccupants[selectedTrip.Trip_ID] || []).length === 0 && (
                    <p className="text-xs text-gray-400 italic text-center py-4">No passengers assigned to this root yet.</p>
                  )}
                </div>
              </section>
            </div>
            
            <div className="p-8 bg-white border-t border-gray-100 shadow-lg">
              <button onClick={() => setSelectedTripId(null)} className="w-full py-5 bg-gray-900 text-white rounded-[24px] font-black text-lg active:scale-[0.98] transition-all">Close Trip View</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
