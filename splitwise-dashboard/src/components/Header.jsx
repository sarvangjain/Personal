import { Settings, Wallet } from 'lucide-react';

export default function Header({ user, onSettings }) {
  return (
    <header className="border-b border-stone-800/40 bg-stone-950/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Wallet size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-display text-lg text-stone-100 leading-tight">SpendLens</h1>
            <p className="text-[10px] text-stone-500 font-medium tracking-widest uppercase">Splitwise Analytics</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <span className="text-xs text-stone-400 hidden sm:block">
              {user.first_name} {user.last_name}
            </span>
          )}
          <button
            onClick={onSettings}
            className="w-8 h-8 rounded-lg bg-stone-800/60 hover:bg-stone-700/60 flex items-center justify-center transition-colors border border-stone-700/40"
          >
            <Settings size={14} className="text-stone-400" />
          </button>
        </div>
      </div>
    </header>
  );
}
