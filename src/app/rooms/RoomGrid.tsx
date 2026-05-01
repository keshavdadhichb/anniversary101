'use client';

import { useState, useOptimistic, useTransition, useMemo } from 'react';
import { Room, Guest } from '@/lib/google-sheets';
import { useRouter } from 'next/navigation';
import { Users, MapPin, X, Trash2, Search, Plus, Home } from 'lucide-react';
import toast from 'react-hot-toast';
import { triggerSync } from '@/lib/sync-util';

interface RoomGridProps {
  initialRooms: Room[];
  allGuests: Guest[];
}

export function RoomGrid({ initialRooms, allGuests }: RoomGridProps) {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [guestSearch, setGuestSearch] = useState('');
  
  const [optimisticRooms, addOptimisticRoom] = useOptimistic(
    initialRooms,
    (state: Room[], updatedRoom: Room) => {
      return state.map(r => r.Room_ID === updatedRoom.Room_ID ? updatedRoom : r);
    }
  );

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Stats
  const stats = useMemo(() => {
    let occupied = 0;
    let total = 0;
    optimisticRooms.forEach(r => {
      const occupants = r.Occupant_Names ? r.Occupant_Names.split(',').length : 0;
      occupied += occupants;
      total += parseInt(r.Capacity || '0') || 0;
    });
    return { occupied, total };
  }, [optimisticRooms]);

  // Group rooms by Location
  const roomsByLocation = optimisticRooms.reduce((acc, room) => {
    const loc = room.Location || 'Unassigned';
    if (!acc[loc]) acc[loc] = [];
    acc[loc].push(room);
    return acc;
  }, {} as Record<string, Room[]>);

  const handleUpdateRoom = async (room: Room, newOccupants: string) => {
    const newStatus = newOccupants.length > 0 ? 'Occupied' : 'Available';
    const updatedRoom = { ...room, Occupant_Names: newOccupants, Status: newStatus };

    startTransition(() => {
      addOptimisticRoom(updatedRoom);
      setSelectedRoom(updatedRoom);
    });

    try {
      triggerSync();
      const res = await fetch('/api/rooms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: room.Room_ID, 
          updates: { Occupant_Names: newOccupants, Status: newStatus } 
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

  const addGuestToRoom = (guestName: string) => {
    if (!selectedRoom) return;
    const current = selectedRoom.Occupant_Names ? selectedRoom.Occupant_Names.split(',').map(n => n.trim()).filter(Boolean) : [];
    if (current.length >= (parseInt(selectedRoom.Capacity || '0') || 0)) {
      toast.error('Room is at full capacity');
      return;
    }
    const updated = [...current, guestName].join(', ');
    handleUpdateRoom(selectedRoom, updated);
    setGuestSearch('');
  };

  const removeGuestFromRoom = (index: number) => {
    if (!selectedRoom) return;
    const current = selectedRoom.Occupant_Names ? selectedRoom.Occupant_Names.split(',').map(n => n.trim()).filter(Boolean) : [];
    current.splice(index, 1);
    handleUpdateRoom(selectedRoom, current.join(', '));
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
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Overall Capacity</h3>
          <p className="text-2xl font-black text-gray-900">{stats.occupied}<span className="text-gray-300 mx-1">/</span>{stats.total}</p>
        </div>
        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
          <Home className="text-blue-500" size={24} />
        </div>
      </div>

      {Object.entries(roomsByLocation).map(([location, rooms]) => (
        <div key={location} className="space-y-4">
          <h2 className="text-sm font-black text-gray-500 uppercase tracking-[0.2em] px-2">{location}</h2>
          
          <div className="grid grid-cols-3 gap-3">
            {rooms.map(room => {
              const occupants = room.Occupant_Names ? room.Occupant_Names.split(',').filter(Boolean).length : 0;
              const capacity = parseInt(room.Capacity || '0') || 0;
              const isFull = occupants >= capacity;
              
              return (
                <div
                  key={room.Room_ID}
                  onClick={() => setSelectedRoom(room)}
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative cursor-pointer transition-all active:scale-95 shadow-sm border-2 ${
                    isFull 
                      ? 'bg-red-50 border-red-100 text-red-600' 
                      : 'bg-green-50 border-green-100 text-green-600'
                  }`}
                >
                  {/* Capacity Badge */}
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-white/80 backdrop-blur-sm text-[10px] font-black border border-inherit">
                    {occupants}/{capacity}
                  </div>
                  
                  <span className="text-xl font-black">{room.Room_ID}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Room Management Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedRoom(null)} />
          <div className="relative bg-white w-full max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-300 flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-gray-900">Room {selectedRoom.Room_ID}</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{selectedRoom.Location}</p>
              </div>
              <button onClick={() => setSelectedRoom(null)} className="p-2 rounded-full bg-gray-50 text-gray-400">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Occupancy Progress Bar */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Occupancy</h4>
                  <span className="text-sm font-black text-gray-900">
                    {selectedRoom.Occupant_Names ? selectedRoom.Occupant_Names.split(',').length : 0} / {selectedRoom.Capacity}
                  </span>
                </div>
                <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      (selectedRoom.Occupant_Names ? selectedRoom.Occupant_Names.split(',').length : 0) >= (parseInt(selectedRoom.Capacity || '0')) 
                        ? 'bg-red-500' 
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, ((selectedRoom.Occupant_Names ? selectedRoom.Occupant_Names.split(',').length : 0) / (parseInt(selectedRoom.Capacity || '0') || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Occupants List */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Current Occupants</h4>
                <div className="space-y-2">
                  {selectedRoom.Occupant_Names ? selectedRoom.Occupant_Names.split(',').map((name, i) => (
                    <div key={i} className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <span className="font-bold text-gray-800">{name.trim()}</span>
                      <button 
                        onClick={() => removeGuestFromRoom(i)}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-400 italic py-2">No occupants yet</p>
                  )}
                </div>
              </div>

              {/* Add Guest Search */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Assign Guest</h4>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text"
                    placeholder="Search unassigned guests..."
                    value={guestSearch}
                    onChange={(e) => setGuestSearch(e.target.value)}
                    disabled={(selectedRoom.Occupant_Names ? selectedRoom.Occupant_Names.split(',').length : 0) >= (parseInt(selectedRoom.Capacity || '0') || 0)}
                    className="w-full bg-gray-50 border-none rounded-xl py-3.5 pl-11 pr-4 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100 text-sm font-medium"
                  />
                </div>
                
                {guestSearch && unassignedGuests.length > 0 && (
                  <div className="bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden divide-y divide-gray-50">
                    {unassignedGuests.map(guest => (
                      <button 
                        key={guest.Guest_ID}
                        onClick={() => addGuestToRoom(guest.Name || '')}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between group"
                      >
                        <span className="font-bold text-gray-700">{guest.Name}</span>
                        <Plus size={16} className="text-blue-500 opacity-0 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 pt-2">
              <button 
                onClick={() => setSelectedRoom(null)}
                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black hover:bg-black shadow-xl shadow-gray-200 transition-all active:scale-[0.98]"
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
