/**
 * ESHeader - ExpenseSight app header with back button
 */

import { ArrowLeft, Plus } from 'lucide-react';

export default function ESHeader({ onClose, onAddExpense, title = 'ExpenseSight' }) {
  return (
    <header className="flex-shrink-0 bg-stone-950/95 backdrop-blur-xl border-b border-stone-800/50 safe-top">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Back button */}
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-2 -ml-2 rounded-xl text-stone-400 hover:text-stone-200 hover:bg-stone-800/50 transition-all"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Back</span>
        </button>

        {/* Title */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <h1 className="text-lg font-display text-stone-200">{title}</h1>
        </div>

        {/* Add expense button */}
        <button
          onClick={onAddExpense}
          className="p-2.5 rounded-xl bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>
    </header>
  );
}
