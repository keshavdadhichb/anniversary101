'use client';

import { useState, useOptimistic, useTransition, useMemo } from 'react';
import { VehicleTrip, Guest } from '@/lib/google-sheets';
import { useRouter } from 'next/navigation';
import { Search, Car, Phone, User, MapPin, Clock, Navigation, IndianRupee, X, Plus, Trash2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { triggerSync } from '@/lib/sync-util';

interface VehicleListProps {
  initialVehicles: VehicleTrip[];
  allGuests: Guest[];
}

export function VehicleList({ initialVehicles, allGuests }: VehicleListProps) {
  const [search, setSearch] = useState('');
  const [selectedVehicleNum, setSelectedVehicleNum] = useState<string | null>(null);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [guestSearch, setGuestSearch] = useState('');
  
  const [optimisticVehicles, addOptimisticTrip] = useOptimistic(
    initialVehicles,
    (state: VehicleTrip[], updatedTrip: VehicleTrip) => {
      return state.map(t => t.Trip_ID === updatedTrip.Trip_ID ? updatedTrip : t);
    }
  );

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Grouping logic: Vehicles are grouped by Vehicle_Number
  const vehicleGroups = useMemo(() => {
    const groups: Record<string, { trips: VehicleTrip[], totalCost: number, driverName: string, driverPhone: string }> = {};
    
    optimisticVehicles.forEach(trip => {
      const num = trip.Vehicle_Number || 'Unknown';
      if (!groups[num]) {
        groups[num] = { trips: [], totalCost: 0, driverName: trip.Driver_Name || '', driverPhone: trip.Driver_Phone || '' };
      }
      groups[num].trips.push(trip);
      const cost = parseInt(trip.Trip_Cost?.replace(/[^0-9]/g, '') || '0') || 0;
      groups[num].totalCost += cost;
    });

    // Filter groups by search
    return Object.entries(groups).filter(([num, data]) => 
      num.toLowerCase().includes(search.toLowerCase()) || 
      data.driverName.toLowerCase().includes(search.toLowerCase())
    );
  }, [optimisticVehicles, search]);

  const handleUpdateTrip = async (trip: VehicleTrip, updates: Partial<VehicleTrip>) => {
    const updatedTrip = { ...trip, ...updates };

    startTransition(() => {
      addOptimisticTrip(updatedTrip);
    });

    try {
      triggerSync();
      const res = await fetch('/api/vehicles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: trip.Trip_ID, 
          updates 
        })
      });
      if (!res.ok) throw new Error('Update failed');
      toast.success('Trip updated');
      router.refresh();
    } catch (e) {
      toast.error('Failed to update trip');
      router.refresh();
    }
  };

  const addPassengerToTrip = (trip: VehicleTrip, guestName: string) => {
    const current = trip.Passengers ? trip.Passengers.split(',').map(n => n.trim()).filter(Boolean) : [];
    const updated = [...current, guestName].join(', ');
    handleUpdateTrip(trip, { Passengers: updated });
    setGuestSearch('');
  };

  const removePassengerFromTrip = (trip: VehicleTrip, index: number) => {
    const current = trip.Passengers ? trip.Passengers.split(',').map(n => n.trim()).filter(Boolean) : [];
    current.splice(index, 1);
    handleUpdateTrip(trip, { Passengers: current.join(', ') });
  };

  const selectedVehicleData = useMemo(() => {
    if (!selectedVehicleNum) return null;
    return optimisticVehicles.filter(t => t.Vehicle_Number === selectedVehicleNum);
  }, [selectedVehicleNum, optimisticVehicles]);

  const guestResults = useMemo(() => {
    return allGuests.filter(g => 
      g.Name?.toLowerCase().includes(guestSearch.toLowerCase())
    ).slice(0, 5);
  }, [allGuests, guestSearch]);

  return (
    <div className="space-y-4">
      {/* Sticky Search */}
      <div className="sticky top-0 z-20 bg-[#F9FAFB]/80 backdrop-blur-md py-3 -mx-4 px-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder="Search vehicle or driver..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border-none rounded-2xl py-4 pl-12 pr-4 shadow-sm ring-1 ring-gray-100 focus:ring-2 focus:ring-blue-500 transition-all text-base"
          />
        </div>
      </div>

      <div className="space-y-4">
        {vehicleGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Car className="text-gray-300" size={40} />
            </div>
            <p className="text-gray-500 font-medium">No vehicles found matching &quot;{search}&quot;</p>
          </div>
        ) : (
          vehicleGroups.map(([num, data]) => (
            <div 
              key={num}
              onClick={() => setSelectedVehicleNum(num)}
              className="bg-white rounded-3xl p-6 shadow-sm border border-gray-50 active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center text-white">
                    <Car size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 leading-tight">{num}</h3>
                    <div className="flex items-center text-sm font-bold text-gray-400">
                      <User size={14} className="mr-1" /> {data.driverName || 'No Driver'}
                    </div>
                  </div>
                </div>
                {data.driverPhone && (
                  <a 
                    href={`tel:${data.driverPhone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-3 bg-blue-50 text-blue-600 rounded-2xl active:scale-90 transition-all"
                  >
                    <Phone size={20} />
                  </a>
                )}
              </div>
              
              <div className="flex justify-between items-end border-t border-gray-50 pt-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Total Trips</p>
                  <p className="text-lg font-black text-gray-700">{data.trips.length}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Total Cost</p>
                  <p className="text-lg font-black text-emerald-600">₹{data.totalCost.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Vehicle Detail / Trip View */}
      {selectedVehicleNum && selectedVehicleData && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedVehicleNum(null)} />
          <div className="relative bg-[#F9FAFB] w-full max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-300 flex flex-col h-full max-h-[90vh]">
            {/* Header */}
            <div className="bg-white px-6 py-6 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white">
                  <Car size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900">{selectedVehicleNum}</h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Driver: {selectedVehicleData[0]?.Driver_Name || 'N/A'}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedVehicleNum(null)} className="p-2 rounded-full bg-gray-50 text-gray-400">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] px-2 pt-2">Trip Timeline</h4>
              
              <div className="space-y-4 relative before:absolute before:left-8 before:top-4 before:bottom-4 before:w-0.5 before:bg-gray-200">
                {selectedVehicleData.map((trip, idx) => (
                  <div key={trip.Trip_ID} className="relative pl-12">
                    {/* Timeline Dot */}
                    <div className="absolute left-[30px] top-6 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-white shadow-sm z-10" />
                    
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center text-sm font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                          <Clock size={14} className="mr-2" /> {trip.Depart_Time || '--:--'}
                        </div>
                        <span className="text-[10px] font-black text-gray-300">TRIP #{idx + 1}</span>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">From</p>
                          <p className="font-bold text-gray-800 text-sm truncate">{trip.From_Location || '---'}</p>
                        </div>
                        <ArrowRight size={16} className="text-gray-300 mt-4" />
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1 text-right">To</p>
                          <p className="font-bold text-gray-800 text-sm text-right truncate">{trip.To_Location || '---'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 border-t border-gray-50 pt-4">
                        <div>
                          <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest block mb-1">Distance (KM)</label>
                          <div className="relative">
                            <Navigation size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                              type="text"
                              defaultValue={trip.Distance_KM}
                              onBlur={(e) => handleUpdateTrip(trip, { Distance_KM: e.target.value })}
                              className="w-full bg-gray-50 border-none rounded-xl py-2 pl-8 pr-3 text-sm font-bold text-gray-700"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest block mb-1">Cost (₹)</label>
                          <div className="relative">
                            <IndianRupee size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                              type="text"
                              defaultValue={trip.Trip_Cost}
                              onBlur={(e) => handleUpdateTrip(trip, { Trip_Cost: e.target.value })}
                              className="w-full bg-gray-50 border-none rounded-xl py-2 pl-8 pr-3 text-sm font-bold text-emerald-600"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Passenger Manifest */}
                      <div className="pt-2">
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Passenger Manifest</h5>
                          <button 
                            onClick={() => setActiveTripId(trip.Trip_ID)}
                            className="text-blue-600 p-1 rounded-full bg-blue-50 active:scale-90 transition-all"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {trip.Passengers ? trip.Passengers.split(',').map((name, pIdx) => (
                            <div key={pIdx} className="bg-gray-100 text-[10px] font-bold text-gray-600 px-2.5 py-1 rounded-full flex items-center">
                              {name.trim()}
                              <button onClick={() => removePassengerFromTrip(trip, pIdx)} className="ml-1.5 text-gray-300 hover:text-red-500">
                                <X size={10} />
                              </button>
                            </div>
                          )) : (
                            <p className="text-[10px] text-gray-400 italic">No passengers assigned</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 bg-white border-t border-gray-100">
              <button 
                onClick={() => setSelectedVehicleNum(null)}
                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black hover:bg-black transition-all active:scale-[0.98]"
              >
                Close Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Passenger Modal (Small Search) */}
      {activeTripId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setActiveTripId(null); setGuestSearch(''); }} />
          <div className="relative bg-white w-full max-w-xs rounded-3xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <h3 className="text-lg font-black text-gray-900">Add Passenger</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text"
                autoFocus
                placeholder="Search guest name..."
                value={guestSearch}
                onChange={(e) => setGuestSearch(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {guestSearch && guestResults.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {guestResults.map(guest => (
                  <button 
                    key={guest.Guest_ID}
                    onClick={() => {
                      const trip = optimisticVehicles.find(t => t.Trip_ID === activeTripId);
                      if (trip) addPassengerToTrip(trip, guest.Name || '');
                      setActiveTripId(null);
                    }}
                    className="w-full text-left p-3 hover:bg-gray-50 rounded-xl font-bold text-gray-700 text-sm flex justify-between items-center group"
                  >
                    {guest.Name}
                    <Plus size={14} className="text-blue-500 opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            )}
            
            <button 
              onClick={() => { setActiveTripId(null); setGuestSearch(''); }}
              className="w-full py-3 bg-gray-100 text-gray-500 rounded-xl font-bold text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
