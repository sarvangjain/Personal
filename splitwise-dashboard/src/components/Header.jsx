import { useState } from 'react';
import { Menu, Plus, WifiOff, Search, X, Eye } from 'lucide-react';
import SearchBar from './SearchBar';

// SVG Logo component matching the PWA icon
function AppLogo({ size = 36, className = '' }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 512 512" 
      width={size} 
      height={size}
      className={className}
    >
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#10b981' }} />
          <stop offset="100%" style={{ stopColor: '#0d9488' }} />
        </linearGradient>
        <linearGradient id="splitGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: '#ffffff', stopOpacity: 0.95 }} />
          <stop offset="100%" style={{ stopColor: '#ffffff', stopOpacity: 0.85 }} />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="108" fill="url(#bgGrad)" />
      <circle cx="200" cy="256" r="100" fill="none" stroke="url(#splitGrad)" strokeWidth="36" />
      <circle cx="312" cy="256" r="100" fill="none" stroke="url(#splitGrad)" strokeWidth="36" />
      <ellipse cx="256" cy="256" rx="24" ry="80" fill="white" opacity="0.9" />
    </svg>
  );
}

export default function Header({ user, onOpenSidebar, onAddExpense, groups, friends, expenses, onSelectGroup, onSelectFriend, onNavigate, isOnline = true, onOpenExpenseSight }) {
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  
  return (
    <header className="border-b border-stone-800/40 bg-stone-950/80 backdrop-blur-xl sticky top-0 z-50 safe-top">
      {/* Main header row */}
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Hamburger + Logo */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          <button
            onClick={onOpenSidebar}
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-stone-800/60 hover:bg-stone-700/60 active:bg-stone-700/80 flex items-center justify-center transition-colors border border-stone-700/40 touch-manipulation"
          >
            <Menu size={16} className="text-stone-400" />
          </button>
          <div className="flex items-center gap-2">
            <div className="relative">
              <AppLogo size={28} className="sm:w-8 sm:h-8 rounded-lg shadow-lg shadow-emerald-500/20" />
              {!isOnline && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-stone-900 flex items-center justify-center border border-stone-700">
                  <WifiOff size={8} className="text-amber-400" />
                </div>
              )}
            </div>
            <div>
              <h1 className="font-display text-sm sm:text-lg text-stone-100 leading-tight">SplitSight</h1>
              <p className="text-[8px] sm:text-[10px] text-stone-500 font-medium tracking-widest uppercase">Analytics</p>
            </div>
          </div>
          
          {/* Quick App Switch Button */}
          {onOpenExpenseSight && (
            <button
              onClick={onOpenExpenseSight}
              className="ml-1 sm:ml-2 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-500/30 hover:from-teal-500/20 hover:to-cyan-500/20 transition-all group touch-manipulation"
              title="Switch to ExpenseSight"
            >
              <div className="w-5 h-5 rounded bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                <Eye size={11} className="text-white" />
              </div>
              <span className="hidden sm:inline text-[10px] font-medium text-teal-400 group-hover:text-teal-300">
                ExpenseSight
              </span>
            </button>
          )}
        </div>

        {/* Center: Search Bar - desktop only */}
        <div className="hidden sm:flex flex-1 justify-center max-w-xl">
          <SearchBar
            groups={groups || []}
            friends={friends || []}
            expenses={expenses || []}
            onSelectGroup={onSelectGroup}
            onSelectFriend={onSelectFriend}
            onNavigate={onNavigate}
          />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Mobile search toggle */}
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="sm:hidden w-9 h-9 rounded-lg bg-stone-800/60 hover:bg-stone-700/60 active:bg-stone-700/80 flex items-center justify-center transition-colors border border-stone-700/40 touch-manipulation"
          >
            {showMobileSearch ? (
              <X size={15} className="text-stone-400" />
            ) : (
              <Search size={15} className="text-stone-400" />
            )}
          </button>
          
          <button
            onClick={onAddExpense}
            className="flex items-center justify-center gap-1.5 w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-medium rounded-lg sm:rounded-lg transition-colors shadow-lg shadow-emerald-500/15 touch-manipulation"
          >
            <Plus size={15} className="sm:w-[13px] sm:h-[13px]" />
            <span className="hidden sm:inline">Add Expense</span>
          </button>

          {/* User avatar - desktop only */}
          {user && (
            <button
              onClick={onOpenSidebar}
              className="hidden sm:flex w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 items-center justify-center text-xs font-semibold text-white hover:opacity-90 transition-opacity"
              title={user.first_name}
            >
              {user.first_name?.[0] || '?'}
            </button>
          )}
        </div>
      </div>
      
      {/* Mobile search bar - expandable */}
      {showMobileSearch && (
        <div className="sm:hidden px-3 pb-3 animate-fade-in">
          <SearchBar
            groups={groups || []}
            friends={friends || []}
            expenses={expenses || []}
            onSelectGroup={(id) => { onSelectGroup(id); setShowMobileSearch(false); }}
            onSelectFriend={(id) => { onSelectFriend(id); setShowMobileSearch(false); }}
            onNavigate={(tab) => { onNavigate(tab); setShowMobileSearch(false); }}
            autoFocus
          />
        </div>
      )}
    </header>
  );
}
