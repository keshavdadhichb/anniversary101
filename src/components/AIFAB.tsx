'use client';

import { useState } from 'react';
import { Send, Loader2, Sparkles, X, ChevronRight } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export function AIFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [queryResult, setQueryResult] = useState<string | null>(null);
  
  const [actionPayload, setActionPayload] = useState<any>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const router = useRouter();

  const handleProcess = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!command.trim() || isProcessing) return;

    setIsProcessing(true);
    setQueryResult(null);
    
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: command }),
      });
      const data = await res.json();
      
      if (data.type === 'QUERY') {
        setQueryResult(data.response);
      } else if (data.type === 'ACTION') {
        setActionPayload(data);
        setActionMessage(data.confirmation_message || 'Confirm this action?');
        setIsModalOpen(true);
      }
    } catch (e) {
      toast.error('AI processing failed');
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
      setCommand('');
      setIsOpen(false);
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
      <div className="fixed bottom-24 right-6 z-40 flex flex-col items-end">
        {/* Result Tooltip */}
        {queryResult && (
          <div className="mb-4 bg-white p-6 rounded-[32px] shadow-2xl border border-blue-50 max-w-[280px] animate-in slide-in-from-bottom-5">
            <p className="text-gray-800 font-bold leading-tight mb-4">{queryResult}</p>
            <button 
              onClick={() => setQueryResult(null)}
              className="w-full py-2 bg-gray-50 text-gray-500 rounded-xl font-bold text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Expandable Input */}
        {isOpen ? (
          <form 
            onSubmit={handleProcess}
            className="flex items-center bg-white rounded-full shadow-2xl border border-gray-100 p-2 pr-2 pl-6 animate-in slide-in-from-bottom-5 w-[320px] max-w-[calc(100vw-48px)]"
          >
            <input 
              autoFocus
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Type command (e.g. Put Keshav in A101)"
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-800 placeholder-gray-400 py-2"
            />
            <button 
              type="submit"
              disabled={isProcessing || !command.trim()}
              className="bg-blue-600 text-white p-3 rounded-full shadow-lg shadow-blue-200 active:scale-90 transition-all disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            </button>
            <button 
              type="button"
              onClick={() => setIsOpen(false)}
              className="ml-1 p-2 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsOpen(true)}
            className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center shadow-2xl hover:bg-black active:scale-90 transition-all group"
          >
            <Sparkles className="text-white group-hover:scale-110 transition-transform" size={28} />
          </button>
        )}
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
