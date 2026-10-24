import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

function Toast({ message, type, onClose }) {
  const isSuccess = type === "success";

  return (
    <div
      className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md bg-zinc-950/95 text-zinc-100 transition-all duration-300 animate-in slide-in-from-top-2 ${
        isSuccess ? "border-emerald-500/30" : "border-rose-500/30"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
      )}
      <p className="text-xs font-medium font-sans pr-2 text-zinc-200">{message}</p>
      <button
        onClick={onClose}
        className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
        aria-label="Close notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default Toast;
