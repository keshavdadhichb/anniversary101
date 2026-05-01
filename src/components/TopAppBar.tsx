'use client';

import { usePathname } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

export function TopAppBar() {
  const pathname = usePathname();
  const [isSyncing, setIsSyncing] = useState(false);

  // Determine title based on path
  const getTitle = () => {
    if (pathname.includes('/guests')) return 'Guest Directory';
    if (pathname.includes('/rooms')) return 'Room Grid';
    if (pathname.includes('/vehicles')) return 'Fleet Dashboard';
    return 'Anniversary Logistics';
  };

  // Mock syncing effect for demonstration (or could be wired to actual state)
  useEffect(() => {
    const handleSync = () => {
      setIsSyncing(true);
      setTimeout(() => setIsSyncing(false), 2000);
    };

    // Listen for custom sync events if we add them later
    window.addEventListener('sheet-sync', handleSync);
    return () => window.removeEventListener('sheet-sync', handleSync);
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full bg-white border-b border-gray-100 shadow-sm px-4 py-4 flex justify-between items-center h-16">
      <h1 className="text-xl font-bold text-gray-900 tracking-tight">
        {getTitle()}
      </h1>
      <div className="flex items-center">
        <RefreshCw 
          size={18} 
          className={`text-gray-300 transition-all duration-1000 ${isSyncing ? 'animate-spin text-blue-500' : ''}`} 
        />
      </div>
    </header>
  );
}
