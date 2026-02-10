import { Settings, Wallet, Plus, WifiOff } from 'lucide-react';
import SearchBar from './SearchBar';

export default function Header({ user, onSettings, onAddExpense, groups, friends, expenses, onSelectGroup, onSelectFriend, onNavigate, isOnline = true }) {
  return (
    <header className="border-b border-stone-800/40 bg-stone-950/80 backdrop-blur-xl sticky top-0 z-50 safe-top">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 relative">
            <Wallet size={16} className="text-white sm:w-[18px] sm:h-[18px]" />
            {!isOnline && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-stone-900 flex items-center justify-center border border-stone-700">
                <WifiOff size={8} className="text-amber-400" />
              </div>
            )}
          </div>
          <div className="hidden sm:block">
            <h1 className="font-display text-lg text-stone-100 leading-tight">SpendLens</h1>
            <p className="text-[10px] text-stone-500 font-medium tracking-widest uppercase">Splitwise Analytics</p>
          </div>
        </div>

        {/* Search Bar - centered (hidden on very small screens) */}
        <div className="flex-1 flex justify-center max-w-[280px] sm:max-w-none">
          <SearchBar
            groups={groups || []}
            friends={friends || []}
            expenses={expenses || []}
            onSelectGroup={onSelectGroup}
            onSelectFriend={onSelectFriend}
            onNavigate={onNavigate}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button
            onClick={onAddExpense}
            className="flex items-center justify-center gap-1.5 w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-medium rounded-lg sm:rounded-lg transition-colors shadow-lg shadow-emerald-500/15 touch-manipulation"
          >
            <Plus size={15} className="sm:w-[13px] sm:h-[13px]" />
            <span className="hidden sm:inline">Add Expense</span>
          </button>
          {user && (
            <span className="text-xs text-stone-400 hidden lg:block ml-1">
              {user.first_name}
            </span>
          )}
          <button
            onClick={onSettings}
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-stone-800/60 hover:bg-stone-700/60 active:bg-stone-700/80 flex items-center justify-center transition-colors border border-stone-700/40 touch-manipulation"
          >
            <Settings size={15} className="text-stone-400 sm:w-[14px] sm:h-[14px]" />
          </button>
        </div>
      </div>
    </header>
  );
}
