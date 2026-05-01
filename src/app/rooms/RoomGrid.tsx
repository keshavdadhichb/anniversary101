'use client';

import { useState, useOptimistic, useTransition, useMemo } from 'react';
import { Room, Guest } from '@/lib/google-sheets';
import { useRouter } from 'next/navigation';
import { Users, MapPin, X, Trash2, Search, Plus, Home, PlusCircle, LayoutGrid, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { triggerSync } from '@/lib/sync-util';

interface RoomGridProps {
  initialRooms: Room[];
  allGuests: Guest[];
}

export function RoomGrid({ initialRooms, allGuests }: RoomGridProps) {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
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

  const roomsByLocation = optimisticRooms.reduce((acc, room) => {
    const loc = room.Location || 'Unassigned';
    if (!acc[loc]) acc[loc] = [];
    acc[loc].push(room);
    return acc;
  }, {} as Record<string, Room[]>);

  const handleUpdateRoom = async (room: Room, updates: Partial<Room>) => {
    const updatedRoom = { ...room, ...updates };

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

  const addGuestToRoom = (guestName: string) => {
    if (!selectedRoom) return;
    const current = selectedRoom.Occupant_Names ? selectedRoom.Occupant_Names.split(',').map(n => n.trim()).filter(Boolean) : [];
    if (current.length >= (parseInt(selectedRoom.Capacity || '0') || 0)) {
      toast.error('Room is at full capacity');
      return;
    }
    const updated = [...current, guestName].join(', ');
    handleUpdateRoom(selectedRoom, { Occupant_Names: updated, Status: 'Occupied' });
    setGuestSearch('');
  };

  const removeGuestFromRoom = (index: number) => {
    if (!selectedRoom) return;
    const current = selectedRoom.Occupant_Names ? selectedRoom.Occupant_Names.split(',').map(n => n.trim()).filter(Boolean) : [];
    current.splice(index, 1);
    const updated = current.join(', ');
    const newStatus = current.length === 0 ? 'Available' : 'Occupied';
    handleUpdateRoom(selectedRoom, { Occupant_Names: updated, Status: newStatus });
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
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Overall Capacity</h3>
          <p className="text-2xl font-black text-gray-900">{stats.occupied}<span className="text-gray-300 mx-1">/</span>{stats.total}</p>
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

      {/* Add Room Modal (V2) */}
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
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 flex items-center">
                  <LayoutGrid size={14} className="mr-2" /> Room Identity
                </h4>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-2">Room ID / Number <span className="text-red-500">*</span></label>
                  <input 
                    type="text"
                    value={newRoom.Room_ID}
                    onChange={(e) => setNewRoom({...newRoom, Room_ID: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-5 font-black text-gray-900 transition-all outline-none"
                    placeholder="e.g. 101"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-2">Location <span className="text-red-500">*</span></label>
                  <select 
                    value={newRoom.Location}
                    onChange={(e) => setNewRoom({...newRoom, Location: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-5 font-black text-gray-900 transition-all outline-none appearance-none"
                  >
                    <option value="">Select Location</option>
                    <option value="Hotel A">Hotel A</option>
                    <option value="Hotel B">Hotel B</option>
                    <option value="Home">Home</option>
                  </select>
                </div>
              </section>

              <section className="bg-white p-6 rounded-3xl shadow-sm space-y-6">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 flex items-center">
                  <Layers size={14} className="mr-2" /> Capacity & Status
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-2">Capacity</label>
                    <input 
                      type="number"
                      value={newRoom.Capacity}
                      onChange={(e) => setNewRoom({...newRoom, Capacity: e.target.value})}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-5 font-black text-gray-900 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-2">Initial Status</label>
                    <select 
                      value={newRoom.Status}
                      onChange={(e) => setNewRoom({...newRoom, Status: e.target.value})}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-5 font-black text-gray-900 transition-all outline-none appearance-none"
                    >
                      <option value="Available">Available</option>
                      <option value="Occupied">Occupied</option>
                    </select>
                  </div>
                </div>
              </section>
            </div>
            
            <div className="p-8 bg-white border-t border-gray-100">
              <button 
                onClick={handleAddRoom}
                className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black text-xl shadow-2xl shadow-blue-100 active:scale-95 transition-all flex items-center justify-center"
              >
                Create Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room Management Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedRoom(null)} />
          <div className="relative bg-white w-full max-w-md sm:rounded-[40px] rounded-t-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-300 flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white shadow-sm">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Room {selectedRoom.Room_ID}</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{selectedRoom.Location}</p>
              </div>
              <button onClick={() => setSelectedRoom(null)} className="p-3 rounded-full bg-gray-50 text-gray-400">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50">
              <section className="bg-white p-6 rounded-3xl shadow-sm space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Location</label>
                    <select 
                      value={selectedRoom.Location}
                      onChange={(e) => handleUpdateRoom(selectedRoom, { Location: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-xl py-4 px-4 focus:ring-2 focus:ring-blue-500 font-bold text-sm appearance-none ring-1 ring-gray-100"
                    >
                      <option value="Hotel A">Hotel A</option>
                      <option value="Hotel B">Hotel B</option>
                      <option value="Home">Home</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Capacity</label>
                    <input 
                      type="number"
                      value={selectedRoom.Capacity}
                      onChange={(e) => handleUpdateRoom(selectedRoom, { Capacity: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-xl py-4 px-4 focus:ring-2 focus:ring-blue-500 font-bold text-sm ring-1 ring-gray-100"
                    />
                  </div>
                </div>
              </section>

              <section className="bg-white p-6 rounded-3xl shadow-sm space-y-4">
                <div className="flex justify-between items-end mb-2">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Live Occupancy</h4>
                  <span className="text-sm font-black text-gray-900">
                    {selectedRoom.Occupant_Names ? selectedRoom.Occupant_Names.split(',').length : 0} / {selectedRoom.Capacity}
                  </span>
                </div>
                <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      (selectedRoom.Occupant_Names ? selectedRoom.Occupant_Names.split(',').length : 0) >= (parseInt(selectedRoom.Capacity || '0')) 
                        ? 'bg-red-500' 
                        : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(100, ((selectedRoom.Occupant_Names ? selectedRoom.Occupant_Names.split(',').length : 0) / (parseInt(selectedRoom.Capacity || '0') || 1)) * 100)}%` }}
                  />
                </div>
              </section>

              <section className="bg-white p-6 rounded-3xl shadow-sm space-y-4">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Current Occupants</h4>
                <div className="space-y-3">
                  {selectedRoom.Occupant_Names ? selectedRoom.Occupant_Names.split(',').map((name, i) => (
                    <div key={i} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <span className="font-bold text-gray-800">{name.trim()}</span>
                      <button 
                        onClick={() => removeGuestFromRoom(i)}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  )) : (
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
                    disabled={(selectedRoom.Occupant_Names ? selectedRoom.Occupant_Names.split(',').length : 0) >= (parseInt(selectedRoom.Capacity || '0') || 0)}
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100 text-sm font-medium"
                  />
                </div>
                
                {guestSearch && unassignedGuests.length > 0 && (
                  <div className="bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden divide-y divide-gray-50 mt-2">
                    {unassignedGuests.map(guest => (
                      <button 
                        key={guest.Guest_ID}
                        onClick={() => addGuestToRoom(guest.Name || '')}
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
                onClick={() => setSelectedRoom(null)}
                className="w-full py-5 bg-gray-900 text-white rounded-[24px] font-black text-lg shadow-xl active:scale-[0.98] transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
