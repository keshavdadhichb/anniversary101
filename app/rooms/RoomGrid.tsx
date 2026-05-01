'use client';

import { useState, useOptimistic, useTransition } from 'react';
import { Room } from '@/lib/google-sheets';
import { useRouter } from 'next/navigation';
import { Users, MapPin, X } from 'lucide-react';

export function RoomGrid({ initialRooms }: { initialRooms: Room[] }) {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [assigneeName, setAssigneeName] = useState('');
  
  const [optimisticRooms, addOptimisticRoom] = useOptimistic(
    initialRooms,
    (state: Room[], updatedRoom: Room) => {
      return state.map(r => r.Room_ID === updatedRoom.Room_ID ? updatedRoom : r);
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

    // We assume current Occupant_Names is comma separated or empty.
    const currentOccupants = selectedRoom.Occupant_Names 
      ? selectedRoom.Occupant_Names.split(',').map(n => n.trim()).filter(Boolean) 
      : [];
    currentOccupants.push(assigneeName.trim());
    
    const newOccupantsStr = currentOccupants.join(', ');
    
    // Auto status logic: if capacity is met or we just say occupied if anyone is there
    // For simplicity, let's just mark it Occupied if there's any occupant
    const newStatus = newOccupantsStr.length > 0 ? 'Occupied' : 'Available';

    const updatedRoom = { 
      ...selectedRoom, 
      Occupant_Names: newOccupantsStr,
      Status: newStatus
    };

    startTransition(() => {
      addOptimisticRoom(updatedRoom);
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

  return (
    <div className="space-y-8">
      {Object.entries(roomsByLocation).map(([location, rooms]) => (
        <div key={location} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-2 mb-4">
            <MapPin className="text-gray-400" size={20} />
            <h2 className="text-xl font-semibold text-gray-800">{location}</h2>
          </div>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {rooms.map(room => {
              const isOccupied = room.Status?.toLowerCase() === 'occupied' || (room.Occupant_Names && room.Occupant_Names.length > 0);
              return (
                <div
                  key={room.Room_ID}
                  onClick={() => setSelectedRoom(room)}
                  className={`relative p-3 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-95 ${
                    isOccupied 
                      ? 'bg-red-50 border-red-200 text-red-700' 
                      : 'bg-green-50 border-green-200 text-green-700'
                  }`}
                >
                  <span className="text-lg font-bold block mb-1">{room.Room_ID}</span>
                  <div className="flex items-center text-xs opacity-80">
                    <Users size={12} className="mr-1" />
                    <span>{room.Capacity || '?'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Assignment Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 duration-300">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
              <h2 className="text-xl font-bold text-gray-900">Room {selectedRoom.Room_ID}</h2>
              <button 
                onClick={() => { setSelectedRoom(null); setAssigneeName(''); }}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl mb-4">
                <p className="text-sm text-gray-500 mb-1">Current Occupants:</p>
                <p className="font-medium text-gray-900">
                  {selectedRoom.Occupant_Names || 'None'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign Guest
                </label>
                <input 
                  type="text"
                  value={assigneeName}
                  onChange={(e) => setAssigneeName(e.target.value)}
                  className="w-full border-gray-200 rounded-lg p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-colors"
                  placeholder="Type guest name..."
                  autoFocus
                />
              </div>
              
              <div className="pt-4">
                 <button 
                   onClick={handleAssign}
                   disabled={!assigneeName.trim()}
                   className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
