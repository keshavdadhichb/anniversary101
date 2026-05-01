'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Loader2, Info } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { useRouter } from 'next/navigation';

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
      alert('Speech recognition is not supported in this browser. Please try Chrome or Edge.');
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
        setActionMessage(data.confirmation_message || 'Are you sure you want to perform this action?');
        setIsModalOpen(true);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to process command');
    } finally {
      setIsProcessing(false);
    }
  };

  const executeAction = async () => {
    if (!actionPayload) return;
    setIsProcessing(true);
    
    try {
      // Determine which API to hit based on action
      // e.g. "UPDATE_GUEST", "UPDATE_ROOM", "UPDATE_VEHICLE"
      let endpoint = '';
      if (actionPayload.action.includes('GUEST')) endpoint = '/api/guests';
      else if (actionPayload.action.includes('ROOM')) endpoint = '/api/rooms';
      else if (actionPayload.action.includes('VEHICLE')) endpoint = '/api/vehicles';
      else throw new Error("Unknown action");

      // Extract ID to update. Usually the payload will have Guest_ID, Room_ID or Trip_ID.
      // But we must be careful how Gemini sends it. 
      // If it doesn't have an ID, we might need to search for it on the server, but for now we expect the payload to be directly updates.
      // Assuming Gemini gives us the ID directly in the payload if needed, or we might need to adjust.
      // Wait, standard update expects { id, updates }
      // If payload is {"Name": "Keshav", "Room_ID": "A103"}, we need to know WHICH id to update.
      // Let's just send the payload and handle it on backend, or send the whole payload as updates and extract ID here.
      // Actually, we can just send it as { id: actionPayload.payload.Guest_ID || actionPayload.payload.Room_ID, updates: actionPayload.payload }
      
      const id = actionPayload.payload.Guest_ID || actionPayload.payload.Room_ID || actionPayload.payload.Trip_ID;
      
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates: actionPayload.payload }),
      });
      
      if (!res.ok) throw new Error('Update failed');
      
      setIsModalOpen(false);
      setActionPayload(null);
      router.refresh(); // refresh the current page to get new data
      
      // show success temporarily
      setQueryResult('Action completed successfully!');
      setTimeout(() => setQueryResult(null), 3000);
      
    } catch (e) {
      console.error(e);
      alert('Failed to execute action. Ensure Gemini included the ID.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end space-y-4">
        {queryResult && (
          <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 max-w-xs animate-in slide-in-from-bottom-5">
            <div className="flex items-start space-x-2">
              <Info className="text-blue-500 shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-gray-800">{queryResult}</p>
            </div>
            <button 
              onClick={() => setQueryResult(null)}
              className="mt-2 text-xs text-gray-400 hover:text-gray-600 w-full text-right"
            >
              Dismiss
            </button>
          </div>
        )}

        <button
          onClick={toggleRecording}
          disabled={isProcessing}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300",
            isRecording ? "bg-red-500 animate-pulse scale-110" : "bg-blue-600 hover:bg-blue-700",
            isProcessing ? "opacity-75 cursor-not-allowed" : ""
          )}
        >
          {isProcessing ? (
            <Loader2 className="text-white animate-spin" size={24} />
          ) : (
            <Mic className="text-white" size={24} />
          )}
        </button>
      </div>

      <ConfirmationModal
        isOpen={isModalOpen}
        message={actionMessage}
        onConfirm={executeAction}
        onCancel={() => { setIsModalOpen(false); setActionPayload(null); }}
        isLoading={isProcessing}
      />
    </>
  );
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}
