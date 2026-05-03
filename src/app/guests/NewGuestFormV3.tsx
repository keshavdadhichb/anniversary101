'use client';

import { useState } from 'react';
import { X, User, MapPin, Clock, Phone, Check, Users, Building2, Plane } from 'lucide-react';
import toast from 'react-hot-toast';

export function NewGuestFormV3({ onAdded, onCancel, rooms, vehicles }: any) {
  const [form, setForm] = useState({
    Name: '',
    Phone: '',
    Status: 'Pending',
    Family_POC: '',
    Origin: '',
    Hotel: '',
    Room_ID: '',
    Root_Number: '',
    Arrival_Time: '',
    Depart_Time: '',
    Remarks: ''
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
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">New Guest Registration</h2>
            <p className="text-blue-100 font-bold text-xs uppercase tracking-widest">Complete Itinerary Setup</p>
          </div>
          <button onClick={onCancel} className="p-3 bg-white/20 rounded-full"><X /></button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto max-h-[60vh] bg-gray-50">
          {/* SECTION: PERSONAL */}
          <section className="bg-white p-6 rounded-3xl shadow-sm space-y-4 border border-gray-100">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center"><User size={12} className="mr-2" /> Personal Info</h4>
            <div>
              <label className="text-xs font-black text-blue-600 uppercase mb-2 block">Full Name *</label>
              <input 
                className="w-full bg-gray-50 p-4 rounded-xl font-bold border-2 border-gray-100 focus:border-blue-500 outline-none"
                value={form.Name} onChange={e => setForm({...form, Name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-blue-600 uppercase mb-2 block">Phone</label>
                <input className="w-full bg-gray-50 p-4 rounded-xl font-bold" value={form.Phone} onChange={e => setForm({...form, Phone: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-black text-blue-600 uppercase mb-2 block">Family POC</label>
                <input className="w-full bg-gray-50 p-4 rounded-xl font-bold" value={form.Family_POC} onChange={e => setForm({...form, Family_POC: e.target.value})} />
              </div>
            </div>
          </section>

          {/* SECTION: TRAVEL */}
          <section className="bg-white p-6 rounded-3xl shadow-sm space-y-4 border border-gray-100">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center"><Plane size={12} className="mr-2" /> Travel Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-blue-600 uppercase mb-2 block">Origin</label>
                <input className="w-full bg-gray-50 p-4 rounded-xl font-bold" value={form.Origin} onChange={e => setForm({...form, Origin: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-black text-blue-600 uppercase mb-2 block">Root No.</label>
                <select className="w-full bg-gray-50 p-4 rounded-xl font-bold" value={form.Root_Number} onChange={e => setForm({...form, Root_Number: e.target.value})}>
                  <option value="">None</option>
                  {vehicles.map((v:any) => <option key={v.Trip_ID} value={v.Trip_ID}>Root {v.Trip_ID}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-blue-600 uppercase mb-2 block">Arrival Time</label>
                <input className="w-full bg-gray-50 p-4 rounded-xl font-bold" value={form.Arrival_Time} onChange={e => setForm({...form, Arrival_Time: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-black text-blue-600 uppercase mb-2 block">Depart Time</label>
                <input className="w-full bg-gray-50 p-4 rounded-xl font-bold" value={form.Depart_Time} onChange={e => setForm({...form, Depart_Time: e.target.value})} />
              </div>
            </div>
          </section>

          {/* SECTION: STAY */}
          <section className="bg-white p-6 rounded-3xl shadow-sm space-y-4 border border-gray-100">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center"><Building2 size={12} className="mr-2" /> Stay Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-blue-600 uppercase mb-2 block">Hotel</label>
                <input className="w-full bg-gray-50 p-4 rounded-xl font-bold" value={form.Hotel} onChange={e => setForm({...form, Hotel: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-black text-blue-600 uppercase mb-2 block">Room No.</label>
                <select className="w-full bg-gray-50 p-4 rounded-xl font-bold" value={form.Room_ID} onChange={e => setForm({...form, Room_ID: e.target.value})}>
                  <option value="">None</option>
                  {rooms.map((r:any) => <option key={r.Room_ID} value={r.Room_ID}>{r.Room_ID}</option>)}
                </select>
              </div>
            </div>
          </section>
        </div>

        <div className="p-8 bg-white rounded-b-[44px] border-t border-gray-100">
          <button 
            onClick={handleSubmit}
            className="w-full py-6 bg-blue-600 text-white rounded-[28px] font-black text-2xl shadow-2xl shadow-blue-200 active:scale-95 transition-all flex items-center justify-center"
          >
            <Check className="mr-3" size={32} /> REGISTER GUEST
          </button>
        </div>
      </div>
    </div>
  );
}
