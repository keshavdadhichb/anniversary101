'use client';

import { useState, useOptimistic, useTransition } from 'react';
import { VehicleTrip } from '@/lib/google-sheets';
import { Search, MapPin, User, Users, Clock, Route, IndianRupee, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function VehicleList({ initialVehicles }: { initialVehicles: VehicleTrip[] }) {
  const [search, setSearch] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleTrip | null>(null);
  const [newPassenger, setNewPassenger] = useState('');
  
  const [optimisticVehicles, addOptimisticVehicle] = useOptimistic(
    initialVehicles,
    (state: VehicleTrip[], updatedVehicle: VehicleTrip) => {
      return state.map(v => v.Trip_ID === updatedVehicle.Trip_ID ? updatedVehicle : v);
    }
  );

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filteredVehicles = optimisticVehicles.filter(v => 
    v.Vehicle_Number?.toLowerCase().includes(search.toLowerCase()) || 
    v.Driver_Name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddPassenger = async () => {
    if (!selectedVehicle || !newPassenger.trim()) return;

    const currentPassengers = selectedVehicle.Passengers 
      ? selectedVehicle.Passengers.split(',').map(n => n.trim()).filter(Boolean) 
      : [];
    currentPassengers.push(newPassenger.trim());
    
    const newPassengersStr = currentPassengers.join(', ');

    const updatedVehicle = { 
      ...selectedVehicle, 
      Passengers: newPassengersStr
    };

    startTransition(() => {
      addOptimisticVehicle(updatedVehicle);
      setSelectedVehicle(updatedVehicle);
      setNewPassenger('');
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

  return (
    <div>
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search vehicles or drivers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm transition-all"
        />
      </div>

      <div className="space-y-4">
        {filteredVehicles.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No vehicles found.
          </div>
        ) : (
          filteredVehicles.map(vehicle => (
            <div 
              key={vehicle.Trip_ID}
              onClick={() => setSelectedVehicle(vehicle)}
              className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 cursor-pointer active:scale-[0.98] transition-transform"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{vehicle.Vehicle_Number || 'Unknown Vehicle'}</h3>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <User size={14} className="mr-1" />
                    <span>{vehicle.Driver_Name || 'Unknown Driver'}</span>
                    {vehicle.Driver_Phone && <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded-md">{vehicle.Driver_Phone}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-blue-600 flex items-center justify-end">
                    <IndianRupee size={14} className="mr-0.5" />
                    {vehicle.Trip_Cost || '0'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{vehicle.Distance_KM || '0'} km</div>
                </div>
              </div>

              <div className="flex items-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <Route size={16} className="text-gray-400 mr-2 shrink-0" />
                <div className="flex-1 truncate">
                  <span className="font-medium">{vehicle.From_Location || 'N/A'}</span>
                  <span className="mx-2 text-gray-300">→</span>
                  <span className="font-medium">{vehicle.To_Location || 'N/A'}</span>
                </div>
                <div className="flex items-center text-xs text-gray-500 ml-2">
                  <Clock size={12} className="mr-1" />
                  {vehicle.Depart_Time || '--:--'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Vehicle Detail Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 duration-300">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-xl font-bold text-gray-900">{selectedVehicle.Vehicle_Number}</h2>
              <button 
                onClick={() => setSelectedVehicle(null)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                  <Route size={16} className="mr-2" /> Trip Details
                </h4>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-500">From</span>
                    <span className="font-medium">{selectedVehicle.From_Location || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">To</span>
                    <span className="font-medium">{selectedVehicle.To_Location || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Departure</span>
                    <span className="font-medium">{selectedVehicle.Depart_Time || '-'}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-blue-200/50">
                    <span className="text-gray-500">Distance</span>
                    <span className="font-medium">{selectedVehicle.Distance_KM || '0'} km</span>
                  </div>
                  <div className="flex justify-between text-blue-700 font-semibold">
                    <span>Total Cost</span>
                    <span className="flex items-center"><IndianRupee size={14} />{selectedVehicle.Trip_Cost || '0'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <Users size={16} className="mr-2 text-gray-400" /> Passengers
                </h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(selectedVehicle.Passengers ? selectedVehicle.Passengers.split(',') : []).filter(Boolean).map((p, i) => (
                    <span key={i} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm border border-gray-200">
                      {p.trim()}
                    </span>
                  ))}
                  {(!selectedVehicle.Passengers || selectedVehicle.Passengers.trim() === '') && (
                    <span className="text-sm text-gray-400 italic">No passengers assigned.</span>
                  )}
                </div>

                <div className="flex space-x-2">
                  <input 
                    type="text"
                    value={newPassenger}
                    onChange={(e) => setNewPassenger(e.target.value)}
                    className="flex-1 border-gray-200 rounded-lg p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                    placeholder="Type guest name..."
                  />
                  <button 
                    onClick={handleAddPassenger}
                    disabled={!newPassenger.trim() || isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center shrink-0"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
