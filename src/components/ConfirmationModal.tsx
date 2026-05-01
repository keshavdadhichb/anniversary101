'use client';

import { X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  message: string;
  payload?: any;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmationModal({ isOpen, message, payload, onConfirm, onCancel, isLoading }: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Yellow Warning Header */}
        <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex items-center space-x-3">
          <div className="bg-amber-100 p-2 rounded-full">
            <AlertCircle className="text-amber-600" size={24} />
          </div>
          <h3 className="text-lg font-black text-amber-900 tracking-tight">Confirm Action</h3>
          <button 
            onClick={onCancel}
            disabled={isLoading}
            className="ml-auto text-amber-400 hover:text-amber-600"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <p className="text-gray-800 text-lg font-bold leading-snug">
            {message}
          </p>

          {/* Data Preview */}
          {payload && (
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Proposed Change</p>
              <pre className="text-xs font-mono text-gray-600 bg-white p-3 rounded-xl border border-gray-100 overflow-x-auto">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </div>
          )}
          
          <div className="flex flex-col space-y-3">
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 shadow-xl shadow-blue-100 active:scale-[0.98] transition-all flex justify-center items-center"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Yes, Execute'
              )}
            </button>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="w-full py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-[0.98]"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
