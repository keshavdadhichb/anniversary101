'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, BedDouble, Car } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Guests', path: '/guests', icon: Users },
    { name: 'Rooms', path: '/rooms', icon: BedDouble },
    { name: 'Vehicles', path: '/vehicles', icon: Car },
  ];

  return (
    <nav className="fixed bottom-0 w-full max-w-[480px] bg-white border-t border-gray-100 flex items-center h-20 px-2 z-30">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.path);
        const Icon = item.icon;
        
        return (
          <Link
            key={item.path}
            href={item.path}
            className="flex-1 flex flex-col items-center justify-center space-y-1 group"
          >
            <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
