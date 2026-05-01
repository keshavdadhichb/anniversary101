'use client';

import { useState, useOptimistic, useTransition, useMemo } from 'react';
import { Room, Guest } from '@/lib/google-sheets';
import { useRouter } from 'next/navigation';
import { Users, MapPin, X, Trash2, Search, Plus, Home, PlusCircle, LayoutGrid, Layers, User } from 'lucide-react';
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

  // DERIVE OCCUPANCY IN REAL-TIME FROM ALL GUESTS
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

    startTransition(() => {
      addOptimisticRoom(updatedRoom);
    });

    try {
      triggerSync();
      const res = await fetch('/api/rooms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: room.Room_ID, 
          updates 
        })
      });
      if (!res.ok) throw new Error('Update failed');
      toast.success('Room updated');
      router.refresh();
    } catch (e) {
      toast.error('Failed to update room');
      router.refresh();
    }
  };

  const handleAddRoom = async () => {
    if (!newRoom.Room_ID || !newRoom.Location) {
      toast.error('ID and Location are required');
      return;
    }
    const roomToCreate: Room = {
      Room_ID: newRoom.Room_ID,
      Location: newRoom.Location,
      Capacity: newRoom.Capacity || '2',
      Occupant_Names: '',
      Status: newRoom.Status || 'Available'
    };

    startTransition(() => {
      addOptimisticRoom(roomToCreate);
    });

    try {
      triggerSync();
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomToCreate),
      });
      if (!res.ok) throw new Error('Failed to add room');
      toast.success('Room added successfully!');
      setIsAddModalOpen(false);
      setNewRoom({ Room_ID: '', Location: '', Capacity: '2', Status: 'Available' });
      router.refresh();
    } catch (e) {
      toast.error('Failed to add room');
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

  const unassignedGuests = useMemo(() => {
    return allGuests.filter(g => 
      !g.Room_ID && 
      g.Name?.toLowerCase().includes(guestSearch.toLowerCase())
    ).slice(0, 5);
  }, [allGuests, guestSearch]);

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Live Occupancy</h3>
          <p className="text-2xl font-black text-gray-900">{stats.occupiedCount}<span className="text-gray-300 mx-1">/</span>{stats.totalCapacity}</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100 active:scale-95 transition-all"
        >
          <PlusCircle size={28} />
        </button>
      </div>

      {Object.entries(roomsByLocation).map(([location, rooms]) => (
        <div key={location} className="space-y-4">
          <h2 className="text-sm font-black text-gray-500 uppercase tracking-[0.2em] px-2">{location}</h2>
          
          <div className="grid grid-cols-3 gap-3">
            {rooms.map(room => {
              const occupants = roomOccupancy[room.Room_ID] || [];
              const capacity = parseInt(room.Capacity || '0') || 0;
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
                        : 'bg-green-50 border-green-100 text-green-600'
                  }`}
                >
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-white/80 backdrop-blur-sm text-[10px] font-black border border-inherit">
                    {occupants.length}/{capacity}
                  </div>
                  <span className="text-xl font-black">{room.Room_ID}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Add Room Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-8 bg-blue-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black">Add New Room</h3>
                <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-1">Full Room Setup</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50">
              <section className="bg-white p-6 rounded-3xl shadow-sm space-y-6">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-2">Room ID / Number <span className="text-red-500">*</span></label>
                  <input type="text" value={newRoom.Room_ID} onChange={(e) => setNewRoom({...newRoom, Room_ID: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-5 font-black text-gray-900 transition-all outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-2">Location <span className="text-red-500">*</span></label>
                  <select value={newRoom.Location} onChange={(e) => setNewRoom({...newRoom, Location: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-5 font-black text-gray-900 transition-all outline-none appearance-none">
                    <option value="">Select Location</option>
                    <option value="Hotel A">Hotel A</option>
                    <option value="Hotel B">Hotel B</option>
                    <option value="Home">Home</option>
                  </select>
                </div>
              </section>
            </div>
            
            <div className="p-8 bg-white border-t border-gray-100">
              <button onClick={handleAddRoom} className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black text-xl shadow-2xl active:scale-95 transition-all">Create Room</button>
            </div>
          </div>
        </div>
      )}

      {/* Room Management Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedRoomId(null)} />
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
                    {(roomOccupancy[selectedRoom.Room_ID] || []).length} / {selectedRoom.Capacity}
                  </span>
                </div>
                <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      (roomOccupancy[selectedRoom.Room_ID] || []).length >= (parseInt(selectedRoom.Capacity || '0')) 
                        ? 'bg-red-500' 
                        : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(100, (((roomOccupancy[selectedRoom.Room_ID] || []).length) / (parseInt(selectedRoom.Capacity || '0') || 1)) * 100)}%` }}
                  />
                </div>
              </section>

              <section className="bg-white p-6 rounded-3xl shadow-sm space-y-4">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Current Occupants</h4>
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
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Assign Guest</h4>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text"
                    placeholder="Search unassigned guests..."
                    value={guestSearch}
                    onChange={(e) => setGuestSearch(e.target.value)}
                    disabled={(roomOccupancy[selectedRoom.Room_ID] || []).length >= (parseInt(selectedRoom.Capacity || '0') || 0)}
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100 text-sm font-bold"
                  />
                </div>
                
                {guestSearch && unassignedGuests.length > 0 && (
                  <div className="bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden divide-y divide-gray-50 mt-2">
                    {unassignedGuests.map(guest => (
                      <button 
                        key={guest.Guest_ID}
                        onClick={() => updateGuestRoom(guest.Guest_ID, selectedRoom.Room_ID)}
                        className="w-full text-left px-5 py-4 hover:bg-gray-50 flex items-center justify-between group"
                      >
                        <span className="font-bold text-gray-700">{guest.Name}</span>
                        <Plus size={18} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
            
            <div className="p-8 bg-white border-t border-gray-100">
              <button 
                onClick={() => setSelectedRoomId(null)}
                className="w-full py-5 bg-gray-900 text-white rounded-[24px] font-black text-lg active:scale-[0.98] transition-all"
              >
                Close Management
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
