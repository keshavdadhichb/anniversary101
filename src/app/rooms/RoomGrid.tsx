'use client';

import { useState, useOptimistic, useTransition } from 'react';
import { Room } from '@/lib/google-sheets';
import { useRouter } from 'next/navigation';
import { Users, MapPin, X, Plus, Home } from 'lucide-react';

export function RoomGrid({ initialRooms }: { initialRooms: Room[] }) {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [assigneeName, setAssigneeName] = useState('');
  const [isAddMode, setIsAddMode] = useState(false);
  const [newRoomId, setNewRoomId] = useState('');
  const [newRoomLocation, setNewRoomLocation] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState('');
  
  const [optimisticRooms, addOptimisticRoom] = useOptimistic(
    initialRooms,
    (state: Room[], action: { type: 'add' | 'update', room: Room }) => {
      if (action.type === 'add') {
        return [...state, action.room];
      }
      return state.map(r => r.Room_ID === action.room.Room_ID ? action.room : r);
    }
  );

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Group rooms by Location
  const roomsByLocation = optimisticRooms.reduce((acc, room) => {
    const loc = room.Location || 'Unassigned Location';
    if (!acc[loc]) acc[loc] = [];
    acc[loc].push(room);
    return acc;
  }, {} as Record<string, Room[]>);

  const handleAssign = async () => {
    if (!selectedRoom || !assigneeName.trim()) return;

    const currentOccupants = selectedRoom.Occupant_Names 
      ? selectedRoom.Occupant_Names.split(',').map(n => n.trim()).filter(Boolean) 
      : [];
    currentOccupants.push(assigneeName.trim());
    
    const newOccupantsStr = currentOccupants.join(', ');
    const newStatus = newOccupantsStr.length > 0 ? 'Occupied' : 'Available';

    const updatedRoom = { 
      ...selectedRoom, 
      Occupant_Names: newOccupantsStr,
      Status: newStatus
    };

    startTransition(() => {
      addOptimisticRoom({ type: 'update', room: updatedRoom });
      setSelectedRoom(null);
      setAssigneeName('');
    });

    try {
      const res = await fetch('/api/rooms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: selectedRoom.Room_ID, 
          updates: { Occupant_Names: newOccupantsStr, Status: newStatus } 
        })
      });
      if (!res.ok) throw new Error('Update failed');
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Failed to assign guest to room.');
      router.refresh();
    }
  };

  const handleAdd = async () => {
    if (!newRoomId.trim()) return;

    const newRoom: Room = {
      Room_ID: newRoomId.trim(),
      Location: newRoomLocation.trim(),
      Capacity: newRoomCapacity.trim(),
      Occupant_Names: '',
      Status: 'Available'
    };

    startTransition(() => {
      addOptimisticRoom({ type: 'add', room: newRoom });
      setIsAddMode(false);
      setNewRoomId('');
      setNewRoomLocation('');
      setNewRoomCapacity('');
    });

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoom)
      });
      if (!res.ok) throw new Error('Add failed');
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Failed to add room.');
      router.refresh();
    }
  };

  return (
    <div className="relative pb-24">
      <div className="flex justify-between items-center mb-6 px-1">
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
          Rooms
        </h1>
        <button 
          onClick={() => setIsAddMode(true)}
          className="flex items-center space-x-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 rounded-full shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all active:scale-95"
        >
          <Plus size={18} />
          <span className="font-medium text-sm">Add Room</span>
        </button>
      </div>

      <div className="space-y-8">
        {Object.keys(roomsByLocation).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
              <Home className="text-emerald-500" size={28} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No rooms found</h3>
            <p className="text-gray-500 text-sm max-w-[250px]">
              Your room list is empty. Add a new room to get started.
            </p>
            <button 
              onClick={() => setIsAddMode(true)}
              className="mt-6 px-6 py-2.5 bg-white text-emerald-600 border border-emerald-200 rounded-full font-medium shadow-sm active:scale-95 transition-transform"
            >
              Add First Room
            </button>
          </div>
        ) : (
          Object.entries(roomsByLocation).map(([location, rooms]) => (
            <div key={location} className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-gray-100/80">
              <div className="flex items-center space-x-2 mb-5">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <MapPin className="text-emerald-500" size={16} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">{location}</h2>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {rooms.map(room => {
                  const isOccupied = room.Status?.toLowerCase() === 'occupied' || (room.Occupant_Names && room.Occupant_Names.length > 0);
                  return (
                    <div
                      key={room.Room_ID}
                      onClick={() => setSelectedRoom(room)}
                      className={`relative p-4 rounded-2xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 hover:shadow-md ${
                        isOccupied 
                          ? 'bg-red-50/50 border-red-200 text-red-700 hover:border-red-300' 
                          : 'bg-emerald-50/50 border-emerald-200 text-emerald-700 hover:border-emerald-300'
                      }`}
                    >
                      <span className="text-2xl font-black block mb-1 tracking-tight">{room.Room_ID}</span>
                      <div className="flex items-center text-xs font-semibold opacity-80 bg-white/50 px-2 py-0.5 rounded-full">
                        <Users size={12} className="mr-1" />
                        <span>{room.Capacity || '?'} Beds</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Room Modal */}
      {isAddMode && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 duration-300 border border-white/20">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white">
              <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Add New Room</h2>
              <button 
                onClick={() => { setIsAddMode(false); setNewRoomId(''); setNewRoomLocation(''); setNewRoomCapacity(''); }}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors bg-gray-50"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Room ID / Number <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  value={newRoomId}
                  onChange={(e) => setNewRoomId(e.target.value)}
                  className="w-full border-0 ring-1 ring-gray-200 rounded-xl p-3.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all text-gray-900"
                  placeholder="e.g. 101"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Location (Building/Floor)
                </label>
                <input 
                  type="text"
                  value={newRoomLocation}
                  onChange={(e) => setNewRoomLocation(e.target.value)}
                  className="w-full border-0 ring-1 ring-gray-200 rounded-xl p-3.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all text-gray-900"
                  placeholder="e.g. Main Building - Floor 1"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Capacity (Beds)
                </label>
                <input 
                  type="number"
                  value={newRoomCapacity}
                  onChange={(e) => setNewRoomCapacity(e.target.value)}
                  className="w-full border-0 ring-1 ring-gray-200 rounded-xl p-3.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all text-gray-900"
                  placeholder="e.g. 2"
                />
              </div>
              
              <div className="pt-2">
                 <button 
                   onClick={handleAdd}
                   disabled={!newRoomId.trim() || isPending}
                   className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                 >
                   Save Room
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 duration-300">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white/95 backdrop-blur-md sticky top-0 z-10">
              <h2 className="text-xl font-bold text-gray-900">Room {selectedRoom.Room_ID}</h2>
              <button 
                onClick={() => { setSelectedRoom(null); setAssigneeName(''); }}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors bg-gray-50"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="bg-gray-50/80 border border-gray-100 p-5 rounded-2xl mb-2">
                <p className="text-sm font-semibold text-gray-500 mb-2">Current Occupants</p>
                <div className="flex flex-wrap gap-2">
                  {selectedRoom.Occupant_Names ? (
                    selectedRoom.Occupant_Names.split(',').map((name, i) => (
                      <span key={i} className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-800 shadow-sm">
                        {name.trim()}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 italic">No occupants</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Assign New Guest
                </label>
                <input 
                  type="text"
                  value={assigneeName}
                  onChange={(e) => setAssigneeName(e.target.value)}
                  className="w-full border-0 ring-1 ring-gray-200 rounded-xl p-3.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all text-gray-900"
                  placeholder="Type guest name..."
                  autoFocus
                />
              </div>
              
              <div className="pt-2 pb-2">
                 <button 
                   onClick={handleAssign}
                   disabled={!assigneeName.trim() || isPending}
                   className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black shadow-lg shadow-gray-900/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   Assign Guest
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
