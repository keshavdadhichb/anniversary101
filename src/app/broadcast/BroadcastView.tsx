'use client';

import { useState, useMemo } from 'react';
import { Guest } from '@/lib/google-sheets';
import { Send, MessageSquare, Users, CheckCircle, Clock, Search, MessageCircle, X, Info, Layout, ChevronRight, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface BroadcastViewProps {
  guests: Guest[];
}
const TEMPLATES = [
  {
    id: 'itinerary_en',
    name: 'English Itinerary',
    text: `*!! Radhe Radhe !!*

*Greetings {{name}} Family,*

*📍 Stay Details:*
• *Hotel:* {{hotel}}
• *Check-in:* {{checkin}}
• *Room No.:* {{room}}
• *Note:* Please bring your original Aadhaar Card/ID for check-in.

---
*🗓️ Event Schedule:*

*May 10:* Bhajan @ New Home - 9:00 PM
*May 11:* Hawan & Grah Pravesh - 7:30 AM onwards
*May 11:* Sangeet & Bhajan Sandhya @ Mansingha - 11:30 AM & 9:00 PM
*May 12:* Temple Darshan - 7:30 AM
*May 12:* Family Function & Anniversary Reception - 11:00 AM & 7:30 PM

*Special Events:*
*Govardhan Parikrama:* May 13, 12:30 AM (Contact: Mayank - 98281 30058)
*Premanand Ji Darshan:* Contact Anshu Sharma - 94560 55903

---
*🍴 Meal Timings (Mansingha Place):*
• Breakfast: 7:30 - 10:30 AM
• Lunch: 12:30 - 3:00 PM
• Hi-Tea: 4:00 - 5:00 PM
• Dinner: 8:00 - 10:30 PM

---
*📞 For Assistance:*
• Transport: 99943 10384
• Refreshments: 97699 70955
• Room Allotment: 80724 64078

Warm Regards,
*Sunthwal Family (Ladnun)*`,
    icon: <Users size={18} />
  },
  {
    id: 'itinerary_hindi',
    name: 'Hindi Itinerary',
    text: `*!! राधे राधे !!*

*नमस्ते {{name}} परिवार,*

*📍 आपके स्टे की जानकारी:*
• *होटल:* {{hotel}}
• *चेक-इन:* {{checkin}}
• *कमरा नंबर:* {{room}}
• *नोट:* कृपया चेक-इन के लिए अपना मूल आधार कार्ड/ID साथ लाएं।

---
*🗓️ कार्यक्रम विवरण:*

*10 मई:* भजन (नया घर) - रात 9:00 बजे
*11 मई:* हवन और गृह प्रवेश - सुबह 7:30 बजे
*11 मई:* संगीत और भजन संध्या (मानसिंहका) - सुबह 11:30 और रात 9:00 बजे
*12 मई:* मंदिर दर्शन - सुबह 7:30 बजे
*12 मई:* अपनों का सम्मान और एनिवर्सरी रिसेप्शन - सुबह 11:00 और शाम 7:30 बजे

*विशेष कार्यक्रम:*
*गोवर्धन परिक्रमा:* 13 मई, रात 12:30 बजे (संपर्क: मयंक - 98281 30058)
*प्रेमानंद जी दर्शन:* (सीमित सीटें) संपर्क: अंशु शर्मा - 94560 55903

---
*🍴 भोजन का समय (Mansingha Place):*
• नाश्ता: 7:30 - 10:30 AM
• लंच: 12:30 - 3:00 PM
• चाय: 4:00 - 5:00 PM
• डिनर: 8:00 - 10:30 PM

---
*📞 सहायता के लिए:*
• ट्रांसपोर्ट: 99943 10384
• रिफ्रेशमेंट: 97699 70955
• रूम अलॉटमेंट: 80724 64078

सादर,
*सुंथवाल परिवार (लाडनूं)*`,
    icon: <Users size={18} />
  },
  {
    id: 'welcome',
    name: 'Welcome Message',
    text: "Hi {{name}}! Welcome to the Vrindavan Anniversary. We are so happy to have you! Looking forward to seeing you. 🙏",
    icon: <MessageCircle size={18} />
  },
  {
    id: 'stay',
    name: 'Room & Stay Info',
    text: "Hi {{name}}! Your room details are ready. Room: {{room}} at Hotel: {{hotel}}. Check-in Date: {{checkin}}. See you soon! 🛌",
    icon: <Layout size={18} />
  },
  {
    id: 'travel',
    name: 'Transport Details',
    text: "Hi {{name}}! Your transport assignment is Root {{root}} ({{vehicle}}). It is scheduled to depart at {{time}} from {{from}}. 🚗",
    icon: <Clock size={18} />
  },
  {
    id: 'custom',
    name: 'Custom Message',
    text: "Hi {{name}}! ",
    icon: <Info size={18} />
  }
];

export default function BroadcastView({ guests }: BroadcastViewProps) {
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [customText, setCustomText] = useState(TEMPLATES[0].text);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredGuests = useMemo(() => {
    const testNumbers = ['7708186715', '9952390715', '9952430715'];
    
    return guests.filter(g => {
      const cleanPhone = g.Phone?.replace(/\D/g, '') || '';
      const matchesSearch = g.Name.toLowerCase().includes(search.toLowerCase()) || 
                           g.Family_POC?.toLowerCase().includes(search.toLowerCase());
      
      if (statusFilter === 'Test') {
        return testNumbers.some(tn => cleanPhone.includes(tn));
      }

      const matchesStatus = statusFilter === 'All' || g.Status === statusFilter;
      return matchesSearch && matchesStatus && g.Phone;
    });
  }, [guests, search, statusFilter]);

  const personalizeMessage = (template: string, guest: Guest) => {
    // Find all family members in the same room to list them
    const familyMembers = guests
      .filter(g => g.Room_ID === guest.Room_ID && g.Hotel === guest.Hotel)
      .map(g => g.Name)
      .join('\n');

    return template
      .replace(/{{name}}/g, guest.Name || '')
      .replace(/{{family_members}}/g, familyMembers)
      .replace(/{{room}}/g, guest.Room_ID || 'TBD')
      .replace(/{{hotel}}/g, guest.Hotel || 'TBD')
      .replace(/{{checkin}}/g, guest.Arrival_Time || 'TBD')
      .replace(/{{root}}/g, guest.Root_Number || 'TBD')
      .replace(/{{vehicle}}/g, guest.Vehicle_ID || 'TBD')
      .replace(/{{time}}/g, guest.Arrival_Time || 'TBD')
      .replace(/{{from}}/g, guest.Origin || 'TBD');
  };

  const handleSend = (guest: Guest) => {
    if (!guest.Phone) {
      toast.error('No phone number found for this guest');
      return;
    }
    const message = personalizeMessage(customText, guest);
    // Clean phone number (remove spaces, +, etc.)
    const cleanPhone = guest.Phone.replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* TEMPLATE SELECTOR */}
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-50 space-y-4">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Select Template</h3>
        <div className="flex overflow-x-auto pb-2 space-x-2 scrollbar-hide">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => { setSelectedTemplate(t); setCustomText(t.text); }}
              className={`flex-shrink-0 px-4 py-3 rounded-2xl text-xs font-black transition-all flex items-center space-x-2 border-2 ${
                selectedTemplate.id === t.id 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' 
                  : 'bg-white border-gray-100 text-gray-400'
              }`}
            >
              {t.icon}
              <span>{t.name}</span>
            </button>
          ))}
        </div>
        
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-300 uppercase">Message Editor (with placeholders)</label>
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-700 h-32 focus:ring-2 focus:ring-blue-600"
          />
          <p className="text-[10px] font-medium text-gray-400">Available: {"{{name}}, {{family_members}}, {{room}}, {{hotel}}, {{root}}, {{vehicle}}, {{time}}, {{from}}"}</p>
        </div>
      </div>

      {/* FILTER & LIST */}
      <div className="space-y-4">
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search guests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border-none rounded-2xl py-4 pl-12 pr-4 shadow-sm text-sm font-bold"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border-none rounded-2xl px-4 py-4 shadow-sm text-xs font-black uppercase appearance-none"
          >
            <option value="All">All Guests</option>
            <option value="Test">⚠️ Test Numbers</option>
            <option value="Pending">Pending</option>
            <option value="In Transit">In Transit</option>
            <option value="Checked-In">In Hotel</option>
          </select>
        </div>

        <div className="bg-white rounded-[32px] overflow-hidden border border-gray-50 shadow-sm divide-y divide-gray-50">
          <div className="bg-blue-50 p-4 border-b border-blue-100">
            <p className="text-xs font-black text-blue-600 uppercase tracking-widest text-center">
              {filteredGuests.length} Guests ready to broadcast
            </p>
          </div>
          {filteredGuests.length > 0 ? filteredGuests.map(guest => (
            <div key={guest.Guest_ID} className="p-4 flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                  <User size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900">{guest.Name}</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{guest.Family_POC} • {guest.Phone}</p>
                </div>
              </div>
              <button
                onClick={() => handleSend(guest)}
                className="bg-green-500 text-white p-3 rounded-2xl shadow-lg shadow-green-100 active:scale-90 transition-all flex items-center space-x-2"
              >
                <MessageCircle size={18} />
                <span className="text-[10px] font-black uppercase hidden sm:inline">Send</span>
              </button>
            </div>
          )) : (
            <div className="py-20 text-center space-y-4">
              <Users size={40} className="mx-auto text-gray-100" />
              <p className="text-gray-400 font-bold">No guests with phone numbers found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
