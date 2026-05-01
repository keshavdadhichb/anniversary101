'use client';

import { useState } from 'react';
import { X, User, MapPin, Clock, Phone, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export function NewGuestFormV3({ onAdded, onCancel, rooms, vehicles }: any) {
  const [form, setForm] = useState({
    Name: '',
    Phone: '',
    Status: 'Pending',
    Room_ID: '',
    Vehicle_ID: '',
    Arrival_Time: '',
    Depart_Time: ''
  });

  const handleSubmit = async () => {
    if (!form.Name) return toast.error('Name is required');
    try {
      const res = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, Guest_ID: `G_${Date.now()}` }),
      });
      if (res.ok) {
        toast.success('Guest Added!');
        onAdded();
      }
    } catch (e) {
      toast.error('Error adding guest');
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl flex flex-col my-auto border-4 border-blue-600">
        <div className="p-8 bg-blue-600 text-white flex justify-between items-center rounded-t-[44px]">
          <div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">New Guest V3</h2>
            <p className="text-blue-100 font-bold text-xs">8 FIELDS TOTAL - PLEASE SCROLL</p>
          </div>
          <button onClick={onCancel} className="p-3 bg-white/20 rounded-full"><X /></button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto max-h-[60vh] bg-gray-50">
          {/* FIELD 1 */}
          <div className="bg-white p-6 rounded-3xl shadow-sm">
            <label className="text-xs font-black text-blue-600 uppercase mb-2 block">1. Full Name</label>
            <input 
              className="w-full bg-gray-50 p-4 rounded-xl font-bold text-lg border-2 border-gray-100 focus:border-blue-500 outline-none"
              value={form.Name} onChange={e => setForm({...form, Name: e.target.value})}
            />
          </div>

          {/* FIELD 2 & 3 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-3xl shadow-sm">
              <label className="text-xs font-black text-blue-600 uppercase mb-2 block">2. Phone</label>
              <input className="w-full bg-gray-50 p-4 rounded-xl font-bold" value={form.Phone} onChange={e => setForm({...form, Phone: e.target.value})} />
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm">
              <label className="text-xs font-black text-blue-600 uppercase mb-2 block">3. Status</label>
              <select className="w-full bg-gray-50 p-4 rounded-xl font-bold appearance-none" value={form.Status} onChange={e => setForm({...form, Status: e.target.value})}>
                <option value="Pending">Pending</option>
                <option value="Checked-In">Checked-In</option>
              </select>
            </div>
          </div>

          {/* FIELD 4 & 5 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-3xl shadow-sm">
              <label className="text-xs font-black text-blue-600 uppercase mb-2 block">4. Room ID</label>
              <select className="w-full bg-gray-50 p-4 rounded-xl font-bold" value={form.Room_ID} onChange={e => setForm({...form, Room_ID: e.target.value})}>
                <option value="">None</option>
                {rooms.map((r:any) => <option key={r.Room_ID} value={r.Room_ID}>{r.Room_ID}</option>)}
              </select>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm">
              <label className="text-xs font-black text-blue-600 uppercase mb-2 block">5. Vehicle ID</label>
              <select className="w-full bg-gray-50 p-4 rounded-xl font-bold" value={form.Vehicle_ID} onChange={e => setForm({...form, Vehicle_ID: e.target.value})}>
                <option value="">None</option>
                {vehicles.map((v:any) => <option key={v.Trip_ID} value={v.Vehicle_Number}>{v.Vehicle_Number}</option>)}
              </select>
            </div>
          </div>

          {/* FIELD 6 & 7 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-3xl shadow-sm">
              <label className="text-xs font-black text-blue-600 uppercase mb-2 block">6. Arrival</label>
              <input className="w-full bg-gray-50 p-4 rounded-xl font-bold" value={form.Arrival_Time} onChange={e => setForm({...form, Arrival_Time: e.target.value})} placeholder="e.g. 10th May" />
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm">
              <label className="text-xs font-black text-blue-600 uppercase mb-2 block">7. Departure</label>
              <input className="w-full bg-gray-50 p-4 rounded-xl font-bold" value={form.Depart_Time} onChange={e => setForm({...form, Depart_Time: e.target.value})} placeholder="e.g. 13th May" />
            </div>
          </div>
          
          <div className="text-center py-4">
            <p className="text-blue-400 text-xs font-black animate-bounce">↓ SCROLL TO SEE ALL FIELDS ↓</p>
          </div>
        </div>

        <div className="p-8 bg-white rounded-b-[44px] border-t border-gray-100">
          <button 
            onClick={handleSubmit}
            className="w-full py-6 bg-blue-600 text-white rounded-[28px] font-black text-2xl shadow-2xl shadow-blue-200 active:scale-95 transition-all flex items-center justify-center"
          >
            <Check className="mr-3" size={32} /> SAVE GUEST
          </button>
        </div>
      </div>
    </div>
  );
}
