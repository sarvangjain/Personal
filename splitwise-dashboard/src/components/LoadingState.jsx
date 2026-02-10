import { Loader2 } from 'lucide-react';

export default function LoadingState() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 size={32} className="text-emerald-400 animate-spin" />
      <p className="text-stone-400 text-sm font-medium">Loading your financial data...</p>
    </div>
  );
}
