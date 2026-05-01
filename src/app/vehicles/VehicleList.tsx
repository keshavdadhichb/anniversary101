'use client';

import { useState, useOptimistic, useTransition, useMemo } from 'react';
import { VehicleTrip, Guest } from '@/lib/google-sheets';
import { useRouter } from 'next/navigation';
import { Search, Car, Phone, User, MapPin, Clock, Navigation, IndianRupee, X, Plus, Trash2, ArrowRight, PlusCircle, Settings2, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { triggerSync } from '@/lib/sync-util';

interface VehicleListProps {
  initialVehicles: VehicleTrip[];
  allGuests: Guest[];
}

export function VehicleList({ initialVehicles, allGuests }: VehicleListProps) {
  const [search, setSearch] = useState('');
  const [selectedVehicleNum, setSelectedVehicleNum] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [guestSearch, setGuestSearch] = useState('');
  
  const [newTrip, setNewTrip] = useState<Partial<VehicleTrip>>({
    Vehicle_Number: '',
    Driver_Name: '',
    Driver_Phone: '',
    From_Location: '',
    To_Location: '',
    Passengers: '',
    Depart_Time: '',
    Distance_KM: '',
    Trip_Cost: ''
  });

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

  const handleAddTrip = async () => {
    if (!newTrip.Vehicle_Number) {
      toast.error('Vehicle Number is required');
      return;
    }
    const tripToCreate: VehicleTrip = {
      Trip_ID: `T_${Date.now()}`,
      Vehicle_Number: newTrip.Vehicle_Number,
      Driver_Name: newTrip.Driver_Name || '',
      Driver_Phone: newTrip.Driver_Phone || '',
      From_Location: newTrip.From_Location || '',
      To_Location: newTrip.To_Location || '',
      Passengers: newTrip.Passengers || '',
      Depart_Time: newTrip.Depart_Time || '',
      Distance_KM: newTrip.Distance_KM || '',
      Trip_Cost: newTrip.Trip_Cost || ''
    };

    startTransition(() => {
      addOptimisticTrip(tripToCreate);
    });

    try {
      triggerSync();
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tripToCreate),
      });
      if (!res.ok) throw new Error('Failed to add trip');
      toast.success('Vehicle trip added!');
      setIsAddModalOpen(false);
      setNewTrip({ Vehicle_Number: '', Driver_Name: '', Driver_Phone: '', From_Location: '', To_Location: '', Passengers: '', Depart_Time: '', Distance_KM: '', Trip_Cost: '' });
      router.refresh();
    } catch (e) {
      toast.error('Failed to add trip');
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
      {/* Sticky Search & Add Bar */}
      <div className="sticky top-0 z-20 bg-[#F9FAFB]/80 backdrop-blur-md py-3 -mx-4 px-4 flex space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder="Search vehicle or driver..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border-none rounded-2xl py-4 pl-12 pr-4 shadow-sm ring-1 ring-gray-100 focus:ring-2 focus:ring-blue-600 transition-all text-base font-medium"
          />
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-100 active:scale-95 transition-all flex items-center justify-center"
        >
          <PlusCircle size={24} />
        </button>
      </div>

      {/* Vehicle List */}
      <div className="space-y-4">
        {vehicleGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Car className="text-gray-300" size={40} />
            </div>
            <p className="text-gray-500 font-medium">No vehicles found</p>
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

      {/* Add Vehicle Modal (V2) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-8 bg-blue-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black">Add New Vehicle Trip</h3>
                <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-1">Trip Details & Costs</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50">
              <section className="bg-white p-6 rounded-3xl shadow-sm space-y-6">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 flex items-center">
                  <Car size={14} className="mr-2" /> Vehicle & Driver
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-2">Vehicle # <span className="text-red-500">*</span></label>
                    <input type="text" value={newTrip.Vehicle_Number} onChange={(e) => setNewTrip({...newTrip, Vehicle_Number: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-5 font-black text-gray-900 transition-all outline-none" placeholder="RJ-14..." />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-2">Driver Name</label>
                    <input type="text" value={newTrip.Driver_Name} onChange={(e) => setNewTrip({...newTrip, Driver_Name: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-5 font-black text-gray-900 transition-all outline-none" placeholder="Name" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-2">Driver Phone</label>
                  <input type="tel" value={newTrip.Driver_Phone} onChange={(e) => setNewTrip({...newTrip, Driver_Phone: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-5 font-black text-gray-900 transition-all outline-none" placeholder="+91..." />
                </div>
              </section>

              <section className="bg-white p-6 rounded-3xl shadow-sm space-y-6">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 flex items-center">
                  <Navigation size={14} className="mr-2" /> Trip Route
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-2">From</label>
                    <input type="text" value={newTrip.From_Location} onChange={(e) => setNewTrip({...newTrip, From_Location: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-5 font-black text-gray-900 transition-all outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-2">To</label>
                    <input type="text" value={newTrip.To_Location} onChange={(e) => setNewTrip({...newTrip, To_Location: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-5 font-black text-gray-900 transition-all outline-none" />
                  </div>
                </div>
              </section>

              <section className="bg-white p-6 rounded-3xl shadow-sm space-y-6">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 flex items-center">
                  <IndianRupee size={14} className="mr-2" /> Time & Cost
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-2">Time</label>
                    <input type="text" value={newTrip.Depart_Time} onChange={(e) => setNewTrip({...newTrip, Depart_Time: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-5 font-black text-gray-900 transition-all outline-none text-sm" placeholder="5:00 AM" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-2">Dist (KM)</label>
                    <input type="text" value={newTrip.Distance_KM} onChange={(e) => setNewTrip({...newTrip, Distance_KM: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-5 font-black text-gray-900 transition-all outline-none text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-2">Cost (₹)</label>
                    <input type="text" value={newTrip.Trip_Cost} onChange={(e) => setNewTrip({...newTrip, Trip_Cost: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-5 font-black text-gray-900 transition-all outline-none text-sm" />
                  </div>
                </div>
              </section>
            </div>
            
            <div className="p-8 bg-white border-t border-gray-100">
              <button 
                onClick={handleAddTrip}
                className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black text-xl shadow-2xl shadow-blue-100 active:scale-95 transition-all flex items-center justify-center"
              >
                Create Trip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Detail View */}
      {selectedVehicleNum && selectedVehicleData && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedVehicleNum(null)} />
          <div className="relative bg-[#F9FAFB] w-full max-w-md sm:rounded-[40px] rounded-t-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-300 flex flex-col h-full max-h-[90vh]">
            <div className="bg-white px-8 py-6 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10 shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center text-white"><Car size={24} /></div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">{selectedVehicleNum}</h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Driver: {selectedVehicleData[0]?.Driver_Name || 'N/A'}</p>
                </div>
              </div>
              <button onClick={() => setSelectedVehicleNum(null)} className="p-3 rounded-full bg-gray-50 text-gray-400"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
              {selectedVehicleData.map((trip, idx) => (
                <div key={trip.Trip_ID} className="relative pl-10 mb-8">
                  <div className="absolute left-[20px] top-8 w-4 h-4 rounded-full bg-blue-600 ring-4 ring-white shadow-md z-10" />
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-blue-600 font-black text-sm bg-blue-50 px-4 py-1.5 rounded-full">
                        <Clock size={14} className="mr-2" />
                        <input 
                          type="text" 
                          defaultValue={trip.Depart_Time} 
                          onBlur={(e) => handleUpdateTrip(trip, { Depart_Time: e.target.value })}
                          className="bg-transparent border-none w-24 outline-none font-black"
                        />
                      </div>
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Trip #{idx + 1}</span>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <label className="text-[10px] font-black text-gray-300 uppercase mb-1 block">From</label>
                          <input type="text" defaultValue={trip.From_Location} onBlur={(e) => handleUpdateTrip(trip, { From_Location: e.target.value })} className="w-full bg-gray-50 border-none rounded-xl py-2 px-3 text-sm font-bold" />
                        </div>
                        <ArrowRight size={16} className="mx-4 mt-4 text-gray-300" />
                        <div className="flex-1 text-right">
                          <label className="text-[10px] font-black text-gray-300 uppercase mb-1 block text-right">To</label>
                          <input type="text" defaultValue={trip.To_Location} onBlur={(e) => handleUpdateTrip(trip, { To_Location: e.target.value })} className="w-full bg-gray-50 border-none rounded-xl py-2 px-3 text-sm font-bold text-right" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-4">
                        <div className="bg-gray-50 p-3 rounded-2xl">
                          <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Distance</label>
                          <div className="flex items-center">
                            <input type="text" defaultValue={trip.Distance_KM} onBlur={(e) => handleUpdateTrip(trip, { Distance_KM: e.target.value })} className="bg-transparent border-none w-full font-black text-gray-700" />
                            <span className="text-xs font-bold text-gray-400 ml-1">KM</span>
                          </div>
                        </div>
                        <div className="bg-emerald-50 p-3 rounded-2xl">
                          <label className="text-[10px] font-black text-emerald-600 uppercase mb-1 block">Trip Cost</label>
                          <div className="flex items-center text-emerald-700">
                            <span className="text-sm font-black mr-1">₹</span>
                            <input type="text" defaultValue={trip.Trip_Cost} onBlur={(e) => handleUpdateTrip(trip, { Trip_Cost: e.target.value })} className="bg-transparent border-none w-full font-black" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50/50 p-4 rounded-2xl">
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                          <User size={12} className="mr-2" /> Passenger Manifest
                        </h5>
                        <button onClick={() => setActiveTripId(trip.Trip_ID)} className="p-1.5 bg-blue-600 text-white rounded-lg shadow-lg active:scale-90 transition-all"><Plus size={14} /></button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {trip.Passengers ? trip.Passengers.split(',').map((name, pIdx) => (
                          <div key={pIdx} className="bg-white border border-gray-100 text-[10px] font-bold text-gray-600 px-3 py-1.5 rounded-xl flex items-center shadow-sm">
                            {name.trim()}
                            <button onClick={() => removePassengerFromTrip(trip, pIdx)} className="ml-2 text-gray-300 hover:text-red-500 transition-colors"><X size={12} /></button>
                          </div>
                        )) : <p className="text-[10px] text-gray-400 italic py-2">Empty manifest</p>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-8 bg-white border-t border-gray-100 shadow-lg">
              <button onClick={() => setSelectedVehicleNum(null)} className="w-full py-5 bg-gray-900 text-white rounded-[24px] font-black text-lg active:scale-[0.98] transition-all">Close Dashboard</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Passenger Modal */}
      {activeTripId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => { setActiveTripId(null); setGuestSearch(''); }} />
          <div className="relative bg-white w-full max-w-xs rounded-[40px] shadow-2xl p-8 space-y-6 animate-in zoom-in-95">
            <h3 className="text-xl font-black text-gray-900">Add Passenger</h3>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input autoFocus type="text" placeholder="Search name..." value={guestSearch} onChange={(e) => setGuestSearch(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-500" />
            </div>
            {guestSearch && guestResults.length > 0 && (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {guestResults.map(guest => (
                  <button key={guest.Guest_ID} onClick={() => { const trip = optimisticVehicles.find(t => t.Trip_ID === activeTripId); if (trip) addPassengerToTrip(trip, guest.Name || ''); setActiveTripId(null); }} className="w-full text-left p-4 hover:bg-blue-50 rounded-2xl font-bold text-gray-700 text-sm flex justify-between items-center group transition-all">
                    {guest.Name} <Plus size={16} className="text-blue-600 opacity-0 group-hover:opacity-100 transition-all" />
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => { setActiveTripId(null); setGuestSearch(''); }} className="w-full py-4 bg-gray-50 text-gray-500 rounded-2xl font-bold text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
