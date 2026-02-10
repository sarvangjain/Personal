import { AlertCircle, RefreshCw, Settings } from 'lucide-react';

export default function ErrorState({ message, onRetry, onSettings }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
        <AlertCircle size={28} className="text-red-400" />
      </div>
      <div className="text-center max-w-md">
        <h2 className="text-lg font-display text-stone-200 mb-2">Connection Failed</h2>
        <p className="text-sm text-stone-400 leading-relaxed">{message}</p>
        <p className="text-xs text-stone-500 mt-2">Check your API key in Settings or ensure Splitwise is reachable.</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors"
        >
          <RefreshCw size={14} /> Retry
        </button>
        <button
          onClick={onSettings}
          className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm rounded-lg transition-colors border border-stone-700"
        >
          <Settings size={14} /> Settings
        </button>
      </div>
    </div>
  );
}
