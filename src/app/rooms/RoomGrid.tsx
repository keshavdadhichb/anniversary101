'use client';

import { useState, useOptimistic, useTransition, useMemo } from 'react';
import { Room, Guest } from '@/lib/google-sheets';
import { useRouter } from 'next/navigation';
import { Users, MapPin, X, Trash2, Search, Plus, Home, PlusCircle, LayoutGrid, Layers, User, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { triggerSync } from '@/lib/sync-util';

interface RoomGridProps {
  initialRooms: Room[];
  allGuests: Guest[];
}

export function RoomGrid({ initialRooms, allGuests }: RoomGridProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [guestSearch, setGuestSearch] = useState('');
  
  const [newRoom, setNewRoom] = useState<Partial<Room>>({
    Room_ID: '',
    Location: '',
    Capacity: '2',
    Status: 'Available'
  });

  const [optimisticRooms, addOptimisticRoom] = useOptimistic(
    initialRooms,
    (state: Room[], updatedRoom: Room) => {
      const exists = state.find(r => r.Room_ID === updatedRoom.Room_ID);
      if (exists) {
        return state.map(r => r.Room_ID === updatedRoom.Room_ID ? updatedRoom : r);
      } else {
        return [...state, updatedRoom];
      }
    }
  );

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const roomOccupancy = useMemo(() => {
    const map: Record<string, string[]> = {};
    allGuests.forEach(g => {
      if (g.Room_ID) {
        if (!map[g.Room_ID]) map[g.Room_ID] = [];
        map[g.Room_ID].push(g.Name);
      }
    });
    return map;
  }, [allGuests]);

  const stats = useMemo(() => {
    let occupiedCount = 0;
    let totalCapacity = 0;
    optimisticRooms.forEach(r => {
      const occupants = roomOccupancy[r.Room_ID] || [];
      occupiedCount += occupants.length;
      totalCapacity += parseInt(r.Capacity || '0') || 0;
    });
    return { occupiedCount, totalCapacity };
  }, [optimisticRooms, roomOccupancy]);

  const roomsByLocation = optimisticRooms.reduce((acc, room) => {
    const loc = room.Location || 'Unassigned';
    if (!acc[loc]) acc[loc] = [];
    acc[loc].push(room);
    return acc;
  }, {} as Record<string, Room[]>);

  const selectedRoom = useMemo(() => 
    optimisticRooms.find(r => r.Room_ID === selectedRoomId),
    [optimisticRooms, selectedRoomId]
  );

  const handleUpdateRoom = async (room: Room, updates: Partial<Room>) => {
    const updatedRoom = { ...room, ...updates };
    startTransition(() => { addOptimisticRoom(updatedRoom); });
    try {
      triggerSync();
      const res = await fetch('/api/rooms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: room.Room_ID, updates })
      });
      if (!res.ok) throw new Error('Update failed');
      toast.success('Room updated');
      router.refresh();
    } catch (e) {
      toast.error('Failed to update room');
      router.refresh();
    }
  };

  const updateGuestRoom = async (guestId: string, roomId: string | null) => {
    try {
      triggerSync();
      const res = await fetch('/api/guests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: guestId, updates: { Room_ID: roomId || '' } }),
      });
      if (!res.ok) throw new Error('Update failed');
      router.refresh();
    } catch (e) {
      toast.error('Failed to move guest');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-50 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-50 rounded-2xl">
            <Building2 className="text-blue-600" size={24} />
          </div>
          <div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Live Occupancy</h3>
            <p className="text-2xl font-black text-gray-900">{stats.occupiedCount}<span className="text-gray-300 mx-1 text-lg">/</span>{stats.totalCapacity}</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
        >
          <PlusCircle size={24} />
        </button>
      </div>

      {Object.entries(roomsByLocation).map(([location, rooms]) => (
        <div key={location} className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black text-gray-500 uppercase tracking-[0.2em]">{location}</h2>
            <span className="text-[10px] font-black text-gray-300">{rooms.length} Rooms</span>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {rooms.map(room => {
              const occupants = roomOccupancy[room.Room_ID] || [];
              const capacity = parseInt(room.Capacity || '0') || 2;
              const isFull = occupants.length >= capacity;
              const isPartiallyFull = occupants.length > 0 && occupants.length < capacity;
              
              return (
                <div
                  key={room.Room_ID}
                  onClick={() => setSelectedRoomId(room.Room_ID)}
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative cursor-pointer transition-all active:scale-95 shadow-sm border-2 ${
                    isFull 
                      ? 'bg-red-50 border-red-200 text-red-600' 
                      : isPartiallyFull
                        ? 'bg-blue-50 border-blue-200 text-blue-600'
                        : 'bg-white border-gray-100 text-gray-400'
                  }`}
                >
                  <div className={`absolute top-1 right-1 px-1 rounded-full text-[8px] font-black border ${
                    occupants.length > 0 ? 'bg-white border-inherit' : 'hidden'
                  }`}>
                    {occupants.length}
                  </div>
                  <span className="text-sm font-black">{room.Room_ID}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Room Management Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedRoomId(null)} />
          <div className="relative bg-white w-full max-w-md sm:rounded-[40px] rounded-t-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-300 flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white shadow-sm">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Room {selectedRoom.Room_ID}</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{selectedRoom.Location}</p>
              </div>
              <button onClick={() => setSelectedRoomId(null)} className="p-3 rounded-full bg-gray-50 text-gray-400">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50">
              <section className="bg-white p-6 rounded-3xl shadow-sm space-y-4">
                <div className="flex justify-between items-end mb-2">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Live Occupancy</h4>
                  <span className="text-sm font-black text-gray-900">
                    {(roomOccupancy[selectedRoom.Room_ID] || []).length} / {selectedRoom.Capacity || 2}
                  </span>
                </div>
                <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      (roomOccupancy[selectedRoom.Room_ID] || []).length >= (parseInt(selectedRoom.Capacity || '2')) 
                        ? 'bg-red-500' 
                        : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(100, (((roomOccupancy[selectedRoom.Room_ID] || []).length) / (parseInt(selectedRoom.Capacity || '2') || 1)) * 100)}%` }}
                  />
                </div>
              </section>

              <section className="bg-white p-6 rounded-3xl shadow-sm space-y-4">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Occupants</h4>
                <div className="space-y-3">
                  {(roomOccupancy[selectedRoom.Room_ID] || []).length > 0 ? (roomOccupancy[selectedRoom.Room_ID] || []).map((name, i) => {
                    const guest = allGuests.find(g => g.Name === name);
                    return (
                      <div key={i} className="flex justify-between items-center bg-blue-50 p-4 rounded-2xl border border-blue-100">
                        <div className="flex items-center">
                          <User size={16} className="text-blue-500 mr-3" />
                          <span className="font-black text-blue-900">{name}</span>
                        </div>
                        <button 
                          onClick={() => { if(guest) updateGuestRoom(guest.Guest_ID, null); }}
                          className="p-2 text-blue-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    );
                  }) : (
                    <p className="text-sm text-gray-400 italic py-4 text-center">Room is currently empty</p>
                  )}
                </div>
              </section>
              
              <section className="bg-white p-6 rounded-3xl shadow-sm space-y-4">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Update Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-300 uppercase block mb-1">Capacity</label>
                    <input 
                      type="number"
                      value={selectedRoom.Capacity}
                      onChange={(e) => handleUpdateRoom(selectedRoom, { Capacity: e.target.value })}
                      className="w-full bg-gray-50 p-3 rounded-xl font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-300 uppercase block mb-1">Location</label>
                    <input 
                      type="text"
                      value={selectedRoom.Location}
                      onChange={(e) => handleUpdateRoom(selectedRoom, { Location: e.target.value })}
                      className="w-full bg-gray-50 p-3 rounded-xl font-bold text-sm"
                    />
                  </div>
                </div>
              </section>
            </div>
            
            <div className="p-8 bg-white border-t border-gray-100">
              <button onClick={() => setSelectedRoomId(null)} className="w-full py-5 bg-gray-900 text-white rounded-[24px] font-black text-lg active:scale-[0.98] transition-all">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
