'use client';

import { usePathname } from 'next/navigation';
import { RefreshCw, Download, X, Share, Plus } from 'lucide-react';
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
    // Check if already standalone (running as installed app)
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                               (window.navigator as any).standalone ||
                               document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
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
    // Detect iOS devices
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    if (isIOS) {
      setShowIOSPrompt(true);
    } else if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
          setIsStandalone(true);
        }
      } catch (err) {
        console.error('Install prompt failed:', err);
      }
    } else {
      // Fallback for desktop or unsupported browsers
      alert('To install: Open your browser menu (⋮ or ≡) and select "Add to Home Screen" or "Install App".');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-white border-b border-gray-100 shadow-sm px-4 py-4 flex justify-between items-center h-16">
        <h1 className="text-xl font-black text-gray-900 tracking-tight italic">
          {getTitle()}
        </h1>
        <div className="flex items-center space-x-3">
          {/* Install Button - Hidden if already running as an app */}
          {!isStandalone && (
            <button 
              onClick={handleInstallClick}
              className="flex items-center space-x-1.5 bg-blue-600 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-blue-100"
            >
              <Download size={14} />
              <span>Install</span>
            </button>
          )}
          <div className="p-2 bg-gray-50 rounded-xl">
            <RefreshCw 
              size={18} 
              className={`text-gray-400 transition-all duration-1000 ${isSyncing ? 'animate-spin text-blue-500' : ''}`} 
            />
          </div>
        </div>
      </header>

      {/* iOS Install Coach Mark (Premium Modal) */}
      {showIOSPrompt && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowIOSPrompt(false)} />
          <div className="relative bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl animate-in slide-in-from-bottom-full duration-500 border-t-8 border-blue-600">
            <button 
              onClick={() => setShowIOSPrompt(false)}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 transition-colors"
            >
              <X size={24} />
            </button>
            
            <div className="text-center space-y-8">
              <div className="w-20 h-20 bg-blue-600 rounded-[28px] mx-auto flex items-center justify-center text-white shadow-2xl shadow-blue-200">
                <Download size={36} />
              </div>
              
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-gray-900">Install Anniversary 101</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                  Run this app directly from your home screen for a fast, native full-screen experience.
                </p>
              </div>

              <div className="bg-gray-50 rounded-[32px] p-8 space-y-6 text-left border border-gray-100">
                <div className="flex items-center space-x-5">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md text-blue-600">
                    <Share size={24} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Step 1</p>
                    <p className="text-sm font-bold text-gray-800">Tap the Share button below</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-5">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md text-blue-600">
                    <Plus size={24} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Step 2</p>
                    <p className="text-sm font-bold text-gray-800">Select "Add to Home Screen"</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowIOSPrompt(false)}
                className="w-full py-6 bg-gray-900 text-white rounded-[24px] font-black text-xl shadow-xl active:scale-95 transition-all"
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
