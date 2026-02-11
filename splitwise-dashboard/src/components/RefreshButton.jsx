import { RefreshCw } from 'lucide-react';

export default function RefreshButton({ onRefresh, isRefreshing, className = '' }) {
  return (
    <button
      onClick={onRefresh}
      disabled={isRefreshing}
      className={`p-2 rounded-lg bg-stone-800/50 hover:bg-stone-800 border border-stone-700/50 text-stone-400 hover:text-stone-200 transition-all disabled:opacity-50 ${className}`}
      title="Refresh data"
    >
      <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
    </button>
  );
}
