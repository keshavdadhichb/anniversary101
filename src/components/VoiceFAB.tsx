'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Loader2, Info, X } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export function VoiceFAB() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [queryResult, setQueryResult] = useState<string | null>(null);
  
  const [actionPayload, setActionPayload] = useState<any>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onstart = () => {
          setIsRecording(true);
        };

        recognitionRef.current.onresult = async (event: any) => {
          setIsRecording(false);
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            await processCommand(transcript);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      }
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.error('Voice commands are not supported in this browser.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setQueryResult(null);
      recognitionRef.current?.start();
    }
  };

  const processCommand = async (text: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      
      if (data.type === 'QUERY') {
        setQueryResult(data.response);
      } else if (data.type === 'ACTION') {
        setActionPayload(data);
        setActionMessage(data.confirmation_message || 'Are you sure?');
        setIsModalOpen(true);
      }
    } catch (e) {
      toast.error('Failed to process voice command');
    } finally {
      setIsProcessing(false);
    }
  };

  const executeAction = async () => {
    if (!actionPayload) return;
    setIsProcessing(true);
    
    try {
      const res = await fetch('/api/gemini/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionPayload.action,
          payload: actionPayload.payload,
        }),
      });
      
      const result = await res.json();
      
      if (!res.ok) throw new Error(result.error || 'Action failed');
      
      setIsModalOpen(false);
      setActionPayload(null);
      router.refresh();
      toast.success('✓ Action completed');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-24 right-6 z-40 flex flex-col items-end space-y-4">
        {/* QUERY Response Bottom Sheet / Tooltip */}
        {queryResult && (
          <div className="bg-white p-6 rounded-[32px] shadow-2xl border border-gray-100 max-w-[300px] animate-in slide-in-from-bottom-10 flex flex-col">
            <div className="flex items-start space-x-3 mb-4">
              <div className="bg-blue-50 p-2 rounded-xl text-blue-500">
                <Info size={20} />
              </div>
              <p className="text-lg font-bold text-gray-800 leading-tight">
                {queryResult}
              </p>
            </div>
            <button 
              onClick={() => setQueryResult(null)}
              className="w-full py-3 bg-gray-50 text-gray-500 rounded-xl font-bold text-sm"
            >
              Close
            </button>
          </div>
        )}

        {/* The FAB */}
        <div className="relative group">
          {isRecording && (
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full animate-bounce">
              Listening...
            </div>
          )}
          
          <button
            onClick={toggleRecording}
            disabled={isProcessing}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 relative ${
              isRecording 
                ? 'bg-red-500 animate-pulse scale-110' 
                : isProcessing
                  ? 'bg-amber-400'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-90 shadow-blue-200'
            }`}
          >
            {isProcessing ? (
              <Loader2 className="text-white animate-spin" size={28} />
            ) : (
              <Mic className={`text-white transition-transform ${isRecording ? 'scale-125' : ''}`} size={28} />
            )}
          </button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isModalOpen}
        message={actionMessage}
        payload={actionPayload?.payload}
        onConfirm={executeAction}
        onCancel={() => { setIsModalOpen(false); setActionPayload(null); }}
        isLoading={isProcessing}
      />
    </>
  );
}
