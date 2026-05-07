'use client';

import { usePathname } from 'next/navigation';
import { RefreshCw, Download, X, Share } from 'lucide-react';
import { useEffect, useState } from 'react';

export function TopAppBar() {
  const pathname = usePathname();
  const [isSyncing, setIsSyncing] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Determine title based on path
  const getTitle = () => {
    if (pathname.includes('/guests')) return 'Guest Directory';
    if (pathname.includes('/rooms')) return 'Room Grid';
    if (pathname.includes('/vehicles')) return 'Fleet Dashboard';
    return 'Anniversary 101';
  };

  useEffect(() => {
    // Check if already standalone
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    const handleSync = () => {
      setIsSyncing(true);
      setTimeout(() => setIsSyncing(false), 2000);
    };
    window.addEventListener('sheet-sync', handleSync);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('sheet-sync', handleSync);
    };
  }, []);

  const handleInstallClick = async () => {
    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    if (isIOS) {
      setShowIOSPrompt(true);
    } else if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // Fallback for browsers that don't support the prompt
      alert('To install: Use your browser menu and select "Add to Home Screen"');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-white border-b border-gray-100 shadow-sm px-4 py-4 flex justify-between items-center h-16">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">
          {getTitle()}
        </h1>
        <div className="flex items-center space-x-3">
          {/* Install Button - Hidden in standalone mode */}
          {!isStandalone && (
            <button 
              onClick={handleInstallClick}
              className="flex items-center space-x-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider active:scale-95 transition-all"
            >
              <Download size={14} />
              <span>Install</span>
            </button>
          )}
          <RefreshCw 
            size={18} 
            className={`text-gray-300 transition-all duration-1000 ${isSyncing ? 'animate-spin text-blue-500' : ''}`} 
          />
        </div>
      </header>

      {/* iOS Install Coach Mark */}
      {showIOSPrompt && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowIOSPrompt(false)} />
          <div className="relative bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl animate-in slide-in-from-bottom-full duration-500">
            <button 
              onClick={() => setShowIOSPrompt(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-xl shadow-blue-100">
                <Download size={32} />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-black text-gray-900">Install Anniversary 101</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Install this app on your iPhone to use it full-screen and offline.
                </p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6 space-y-4 text-left border border-gray-100">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm text-blue-600">
                    <Share size={18} />
                  </div>
                  <p className="text-sm font-bold text-gray-700">1. Tap the Share button below</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm text-blue-600">
                    <Plus size={18} />
                  </div>
                  <p className="text-sm font-bold text-gray-700">2. Select "Add to Home Screen"</p>
                </div>
              </div>

              <button 
                onClick={() => setShowIOSPrompt(false)}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
