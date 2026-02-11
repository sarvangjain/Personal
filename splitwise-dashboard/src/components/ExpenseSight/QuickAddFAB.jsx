/**
 * QuickAddFAB - Floating Action Button for quick expense entry
 */

import { Plus } from 'lucide-react';

export default function QuickAddFAB({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30 flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl hover:shadow-violet-500/40 active:scale-95 animate-pulse-subtle"
      aria-label="Quick add expense"
    >
      <Plus size={28} strokeWidth={2.5} />
    </button>
  );
}
