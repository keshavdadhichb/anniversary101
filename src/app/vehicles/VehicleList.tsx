'use client';

import { useState, useOptimistic, useTransition } from 'react';
import { VehicleTrip } from '@/lib/google-sheets';
import { Search, MapPin, User, Users, Clock, Route, IndianRupee, Plus, X, Edit3, Navigation, Car } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function VehicleList({ initialVehicles }: { initialVehicles: VehicleTrip[] }) {
  const [search, setSearch] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleTrip | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [assigneeName, setAssigneeName] = useState('');
  
  const [newVehicleNum, setNewVehicleNum] = useState('');
  const [newDriverName, setNewDriverName] = useState('');
  const [newFromLocation, setNewFromLocation] = useState('');
  const [newToLocation, setNewToLocation] = useState('');

  const [optimisticVehicles, addOptimisticVehicle] = useOptimistic(
    initialVehicles,
    (state: VehicleTrip[], action: { type: 'add' | 'update', vehicle: VehicleTrip }) => {
      if (action.type === 'add') {
        return [...state, action.vehicle];
      }
      return state.map(v => v.Trip_ID === action.vehicle.Trip_ID ? action.vehicle : v);
    }
  );

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filteredVehicles = optimisticVehicles.filter(v => 
    v.Vehicle_Number?.toLowerCase().includes(search.toLowerCase()) || 
    v.Driver_Name?.toLowerCase().includes(search.toLowerCase()) ||
    v.From_Location?.toLowerCase().includes(search.toLowerCase()) ||
    v.To_Location?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAssign = async () => {
    if (!selectedVehicle || !assigneeName.trim()) return;

    const currentPassengers = selectedVehicle.Passengers 
      ? selectedVehicle.Passengers.split(',').map(n => n.trim()).filter(Boolean) 
      : [];
    currentPassengers.push(assigneeName.trim());
    
    const newPassengersStr = currentPassengers.join(', ');

    const updatedVehicle = { ...selectedVehicle, Passengers: newPassengersStr };

    startTransition(() => {
      addOptimisticVehicle({ type: 'update', vehicle: updatedVehicle });
      setSelectedVehicle(updatedVehicle);
      setAssigneeName('');
    });

    try {
      const res = await fetch('/api/vehicles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: selectedVehicle.Trip_ID, 
          updates: { Passengers: newPassengersStr } 
        })
      });
      if (!res.ok) throw new Error('Update failed');
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Failed to add passenger.');
      router.refresh();
    }
  };

  const handleUpdateField = async (tripId: string, updates: Partial<VehicleTrip>) => {
    const original = optimisticVehicles.find(v => v.Trip_ID === tripId);
    if (!original) return;
    
    const updatedVehicle = { ...original, ...updates };

    startTransition(() => {
      addOptimisticVehicle({ type: 'update', vehicle: updatedVehicle });
      if (selectedVehicle?.Trip_ID === tripId) {
        setSelectedVehicle(updatedVehicle);
      }
    });

    try {
      const res = await fetch('/api/vehicles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tripId, updates })
      });
      if (!res.ok) throw new Error('Update failed');
      router.refresh();
    } catch (error) {
      console.error(error);
      router.refresh();
    }
  };

  const handleAdd = async () => {
    if (!newVehicleNum.trim()) return;

    const tempId = `TRIP_${Date.now()}`;
    const newTrip: VehicleTrip = {
      Trip_ID: tempId,
      Vehicle_Number: newVehicleNum.trim(),
      Driver_Name: newDriverName.trim(),
      Driver_Phone: '',
      From_Location: newFromLocation.trim(),
      To_Location: newToLocation.trim(),
      Passengers: '',
      Depart_Time: '',
      Distance_KM: '',
      Trip_Cost: ''
    };

    startTransition(() => {
      addOptimisticVehicle({ type: 'add', vehicle: newTrip });
      setIsAddMode(false);
      setNewVehicleNum('');
      setNewDriverName('');
      setNewFromLocation('');
      setNewToLocation('');
    });

    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTrip)
      });
      if (!res.ok) throw new Error('Add failed');
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Failed to add trip to database.');
      router.refresh();
    }
  };

  return (
    <div className="relative pb-24">
      <div className="flex justify-between items-center mb-6 px-1">
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">
          Trips
        </h1>
        <button 
          onClick={() => setIsAddMode(true)}
          className="flex items-center space-x-1 bg-gradient-to-r from-orange-500 to-rose-500 text-white px-4 py-2 rounded-full shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all active:scale-95"
        >
          <Plus size={18} />
          <span className="font-medium text-sm">Add Trip</span>
        </button>
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search by vehicle, driver or route..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full pl-11 pr-4 py-3.5 border-none rounded-2xl bg-white/70 backdrop-blur-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 sm:text-base shadow-sm ring-1 ring-gray-100 transition-all"
        />
      </div>

      <div className="space-y-4">
        {filteredVehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-4">
              <Car className="text-orange-500" size={28} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No trips found</h3>
            <p className="text-gray-500 text-sm max-w-[250px]">
              {search ? "We couldn't find any trips matching your search." : "Your trip list is empty. Add a new trip to get started."}
            </p>
            {!search && (
              <button 
                onClick={() => setIsAddMode(true)}
                className="mt-6 px-6 py-2.5 bg-white text-orange-600 border border-orange-200 rounded-full font-medium shadow-sm active:scale-95 transition-transform"
              >
                Add First Trip
              </button>
            )}
          </div>
        ) : (
          filteredVehicles.map(vehicle => (
            <div 
              key={vehicle.Trip_ID}
              onClick={() => setSelectedVehicle(vehicle)}
              className="group bg-white/90 backdrop-blur-sm p-5 rounded-3xl shadow-sm border border-gray-100/80 cursor-pointer hover:shadow-md hover:border-orange-100 transition-all active:scale-[0.98] relative overflow-hidden"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-orange-400 to-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">{vehicle.Vehicle_Number || 'Unknown Vehicle'}</h3>
                  <div className="flex items-center text-sm text-gray-500 mt-1 font-medium">
                    <User size={14} className="mr-1.5 text-orange-400" />
                    {vehicle.Driver_Name || 'No Driver'}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-orange-50 transition-colors">
                  <Edit3 size={18} className="text-gray-400 group-hover:text-orange-500" />
                </div>
              </div>

              <div className="flex items-center space-x-3 mb-4 bg-gray-50/80 p-3 rounded-2xl">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                  <div className="w-0.5 h-6 bg-gray-300"></div>
                  <div className="w-2 h-2 rounded-full border-2 border-rose-500"></div>
                </div>
                <div className="flex flex-col justify-between h-10 flex-1">
                  <p className="text-xs font-semibold text-gray-700 truncate">{vehicle.From_Location || 'TBD'}</p>
                  <p className="text-xs font-semibold text-gray-700 truncate">{vehicle.To_Location || 'TBD'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold border-t border-gray-100 pt-3">
                <div className="flex items-center text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                  <Users size={14} className="mr-1.5" />
                  {vehicle.Passengers ? vehicle.Passengers.split(',').length : 0} pax
                </div>
                {vehicle.Trip_Cost && (
                  <div className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                    <IndianRupee size={14} className="mr-1" />
                    {vehicle.Trip_Cost}
                  </div>
                )}
                {vehicle.Depart_Time && (
                  <div className="flex items-center text-purple-600 bg-purple-50 px-2 py-1 rounded-md">
                    <Clock size={14} className="mr-1.5" />
                    {vehicle.Depart_Time}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Trip Modal */}
      {isAddMode && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 duration-300 border border-white/20">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white">
              <h2 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">Add New Trip</h2>
              <button 
                onClick={() => { setIsAddMode(false); setNewVehicleNum(''); setNewDriverName(''); setNewFromLocation(''); setNewToLocation(''); }}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors bg-gray-50"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Vehicle Number <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  value={newVehicleNum}
                  onChange={(e) => setNewVehicleNum(e.target.value)}
                  className="w-full border-0 ring-1 ring-gray-200 rounded-xl p-3.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all text-gray-900"
                  placeholder="e.g. RJ14 XX 1234"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Driver Name
                </label>
                <input 
                  type="text"
                  value={newDriverName}
                  onChange={(e) => setNewDriverName(e.target.value)}
                  className="w-full border-0 ring-1 ring-gray-200 rounded-xl p-3.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all text-gray-900"
                  placeholder="e.g. Ramesh"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    From
                  </label>
                  <input 
                    type="text"
                    value={newFromLocation}
                    onChange={(e) => setNewFromLocation(e.target.value)}
                    className="w-full border-0 ring-1 ring-gray-200 rounded-xl p-3.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all text-gray-900"
                    placeholder="e.g. Airport"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    To
                  </label>
                  <input 
                    type="text"
                    value={newToLocation}
                    onChange={(e) => setNewToLocation(e.target.value)}
                    className="w-full border-0 ring-1 ring-gray-200 rounded-xl p-3.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all text-gray-900"
                    placeholder="e.g. Hotel"
                  />
                </div>
              </div>
              
              <div className="pt-2">
                 <button 
                   onClick={handleAdd}
                   disabled={!newVehicleNum.trim() || isPending}
                   className="w-full py-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl font-bold shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                 >
                   Save Trip
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Vehicle & Assignment Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 duration-300">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white/95 backdrop-blur-md sticky top-0 z-10">
              <h2 className="text-xl font-bold text-gray-900">{selectedVehicle.Vehicle_Number}</h2>
              <button 
                onClick={() => { setSelectedVehicle(null); setAssigneeName(''); }}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors bg-gray-50"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              
              {/* Trip Info Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center">
                    <IndianRupee size={12} className="mr-1 text-emerald-500" /> Cost
                  </label>
                  <input 
                    type="text"
                    defaultValue={selectedVehicle.Trip_Cost}
                    onBlur={(e) => handleUpdateField(selectedVehicle.Trip_ID, { Trip_Cost: e.target.value })}
                    className="w-full border-0 ring-1 ring-gray-200 rounded-xl p-3 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all text-sm font-semibold text-gray-900"
                    placeholder="e.g. 1500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center">
                    <Clock size={12} className="mr-1 text-purple-500" /> Time
                  </label>
                  <input 
                    type="text"
                    defaultValue={selectedVehicle.Depart_Time}
                    onBlur={(e) => handleUpdateField(selectedVehicle.Trip_ID, { Depart_Time: e.target.value })}
                    className="w-full border-0 ring-1 ring-gray-200 rounded-xl p-3 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all text-sm font-semibold text-gray-900"
                    placeholder="e.g. 10:00 AM"
                  />
                </div>
              </div>

              {/* Passengers Section */}
              <div className="bg-gray-50/80 border border-gray-100 p-5 rounded-2xl">
                <p className="text-sm font-semibold text-gray-500 mb-3 flex items-center">
                  <Users size={16} className="mr-2 text-blue-500" /> Passengers
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedVehicle.Passengers ? (
                    selectedVehicle.Passengers.split(',').map((name, i) => (
                      <span key={i} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-800 shadow-sm flex items-center">
                        {name.trim()}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400 italic">No passengers assigned yet</span>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={assigneeName}
                    onChange={(e) => setAssigneeName(e.target.value)}
                    className="flex-1 border-0 ring-1 ring-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium text-gray-900"
                    placeholder="Add passenger name..."
                  />
                  <button 
                    onClick={handleAssign}
                    disabled={!assigneeName.trim()}
                    className="px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="pt-2 pb-2">
                 <button 
                   onClick={() => { setSelectedVehicle(null); setAssigneeName(''); }}
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
