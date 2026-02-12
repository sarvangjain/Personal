import { useEffect, useRef, forwardRef } from 'react';
import {
  X, LayoutDashboard, Receipt, Users, Scale, Handshake,
  Wallet, FlaskConical, Settings, Clock, ChevronRight, Heart, Eye
} from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

// ExpenseSight is a special item that launches the standalone app
const STANDALONE_APPS = ['expensesight'];

// Tab metadata with icons, labels, and groups
const TAB_META = {
  overview:      { icon: LayoutDashboard, label: 'Overview',      color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  activity:      { icon: Receipt,         label: 'Activity',      color: 'text-purple-400',  bg: 'bg-purple-500/10' },
  groups:        { icon: Users,           label: 'Groups',        color: 'text-indigo-400',  bg: 'bg-indigo-500/10' },
  friends:       { icon: Scale,           label: 'Balances',      color: 'text-teal-400',    bg: 'bg-teal-500/10' },
  settle:        { icon: Handshake,       label: 'Settle Up',     color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  budget:        { icon: Wallet,          label: 'Budget',        color: 'text-rose-400',    bg: 'bg-rose-500/10' },
  expensesight:  { icon: Eye,             label: 'ExpenseSight',  color: 'text-violet-400',  bg: 'bg-violet-500/10' },
  beta:          { icon: FlaskConical,    label: 'Beta',          color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10' },
};

export { TAB_META };

const NAV_SECTIONS = [
  {
    title: 'Home',
    items: ['overview', 'activity'],
  },
  {
    title: 'Finance',
    items: ['groups', 'friends', 'settle', 'budget'],
  },
  {
    title: 'Personal',
    items: ['expensesight'],
  },
  {
    title: 'Labs',
    items: ['beta'],
  },
];

const NavItem = forwardRef(function NavItem({ tabId, isActive, badge, onClick, isStandaloneApp }, ref) {
  const meta = TAB_META[tabId];
  if (!meta) return null;
  const Icon = meta.icon;

  // Standalone apps get a special gradient treatment
  if (isStandaloneApp) {
    return (
      <button
        ref={ref}
        onClick={onClick}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group touch-manipulation bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 hover:from-violet-500/20 hover:to-purple-500/20"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Icon size={16} className="text-white" />
        </div>
        <span className="text-sm font-medium flex-1 text-left text-violet-300 group-hover:text-violet-200">
          {meta.label}
        </span>
        <span className="px-1.5 py-0.5 text-[9px] bg-violet-500/20 text-violet-400 rounded-full font-medium">
          App
        </span>
        <ChevronRight size={14} className="text-violet-500 group-hover:text-violet-400 transition-colors" />
      </button>
    );
  }

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group touch-manipulation ${
        isActive
          ? 'bg-stone-800/80 border border-stone-700/50'
          : 'hover:bg-stone-800/40 active:bg-stone-800/60 border border-transparent'
      }`}
    >
      <div className={`w-8 h-8 rounded-lg ${isActive ? meta.bg : 'bg-stone-800/50 group-hover:bg-stone-800'} flex items-center justify-center transition-colors`}>
        <Icon size={16} className={isActive ? meta.color : 'text-stone-500 group-hover:text-stone-400'} />
      </div>
      <span className={`text-sm font-medium flex-1 text-left ${isActive ? 'text-stone-200' : 'text-stone-400 group-hover:text-stone-300'}`}>
        {meta.label}
      </span>
      {badge > 0 && (
        <span className="px-1.5 py-0.5 text-[9px] bg-amber-500/15 text-amber-400 rounded-full font-mono">
          {badge}
        </span>
      )}
      <ChevronRight size={14} className={`${isActive ? 'text-stone-500' : 'text-stone-700 group-hover:text-stone-600'} transition-colors`} />
    </button>
  );
});

function RecentItem({ tabId, onClick }) {
  const meta = TAB_META[tabId];
  if (!meta) return null;
  const Icon = meta.icon;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-stone-800/40 active:bg-stone-800/60 transition-colors w-full touch-manipulation"
    >
      <Clock size={12} className="text-stone-600 flex-shrink-0" />
      <Icon size={14} className={meta.color} />
      <span className="text-xs text-stone-400 flex-1 text-left">{meta.label}</span>
    </button>
  );
}

// SVG Logo component
function AppLogo({ size = 32 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size}>
      <defs>
        <linearGradient id="sbBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#10b981' }} />
          <stop offset="100%" style={{ stopColor: '#0d9488' }} />
        </linearGradient>
        <linearGradient id="sbSplitGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: '#ffffff', stopOpacity: 0.95 }} />
          <stop offset="100%" style={{ stopColor: '#ffffff', stopOpacity: 0.85 }} />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="108" fill="url(#sbBgGrad)" />
      <circle cx="200" cy="256" r="100" fill="none" stroke="url(#sbSplitGrad)" strokeWidth="36" />
      <circle cx="312" cy="256" r="100" fill="none" stroke="url(#sbSplitGrad)" strokeWidth="36" />
      <ellipse cx="256" cy="256" rx="24" ry="80" fill="white" opacity="0.9" />
    </svg>
  );
}

export default function Sidebar({
  isOpen,
  onClose,
  activeTab,
  onNavigate,
  onOpenSettings,
  onOpenExpenseSight,
  user,
  recentTabs = [],
  settleUpCount = 0,
}) {
  useBodyScrollLock(isOpen);
  const sidebarRef = useRef(null);
  const expenseSightButtonRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Swipe to close (left swipe)
  useEffect(() => {
    if (!isOpen) return;
    let startX = 0;
    const handleTouchStart = (e) => { startX = e.touches[0].clientX; };
    const handleTouchEnd = (e) => {
      const diff = startX - e.changedTouches[0].clientX;
      if (diff > 80) onClose(); // Swiped left by 80px+
    };
    const el = sidebarRef.current;
    if (el) {
      el.addEventListener('touchstart', handleTouchStart, { passive: true });
      el.addEventListener('touchend', handleTouchEnd, { passive: true });
      return () => {
        el.removeEventListener('touchstart', handleTouchStart);
        el.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isOpen, onClose]);

  function handleNav(tabId) {
    // Check if this is a standalone app
    if (STANDALONE_APPS.includes(tabId)) {
      if (tabId === 'expensesight' && onOpenExpenseSight) {
        // Capture button position before closing sidebar
        const rect = expenseSightButtonRef.current?.getBoundingClientRect();
        onOpenExpenseSight(rect);
        onClose();
      }
      return;
    }
    onNavigate(tabId);
    onClose();
  }

  function handleSettings() {
    onOpenSettings();
    onClose();
  }

  const filteredRecents = recentTabs.filter(t => t !== activeTab).slice(0, 3);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 bottom-0 z-[61] w-[280px] sm:w-[320px] bg-stone-950 border-r border-stone-800/50 transition-transform duration-300 ease-out overflow-y-auto overscroll-contain ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex flex-col min-h-full p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <AppLogo size={28} />
              <div>
                <h2 className="font-display text-base text-stone-100 leading-tight">SplitSight</h2>
                <p className="text-[9px] text-stone-600 tracking-widest uppercase">Analytics</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg bg-stone-800/60 hover:bg-stone-700/60 active:bg-stone-700/80 flex items-center justify-center transition-colors touch-manipulation"
            >
              <X size={16} className="text-stone-400" />
            </button>
          </div>

          {/* User Card */}
          {user && (
            <div className="flex items-center gap-3 p-3 bg-stone-900/80 border border-stone-800/50 rounded-xl mb-5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
                {user.first_name?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-200 truncate">
                  {user.first_name} {user.last_name || ''}
                </p>
                <p className="text-[10px] text-stone-600 font-mono">ID: {user.id}</p>
              </div>
            </div>
          )}

          {/* Recently Visited */}
          {filteredRecents.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-semibold text-stone-600 uppercase tracking-wider px-3 mb-1.5">
                Recently Visited
              </p>
              {filteredRecents.map(tabId => (
                <RecentItem
                  key={tabId}
                  tabId={tabId}
                  onClick={() => handleNav(tabId)}
                />
              ))}
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-stone-800/50 mb-4" />

          {/* Navigation Sections */}
          <div className="flex-1 space-y-5">
            {NAV_SECTIONS.map(section => (
              <div key={section.title}>
                <p className="text-[10px] font-semibold text-stone-600 uppercase tracking-wider px-3 mb-1.5">
                  {section.title}
                </p>
                <div className="space-y-0.5">
                  {section.items.map(tabId => (
                    <NavItem
                      key={tabId}
                      ref={tabId === 'expensesight' ? expenseSightButtonRef : undefined}
                      tabId={tabId}
                      isActive={activeTab === tabId && !STANDALONE_APPS.includes(tabId)}
                      badge={tabId === 'settle' ? settleUpCount : 0}
                      isStandaloneApp={STANDALONE_APPS.includes(tabId)}
                      onClick={() => handleNav(tabId)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Section */}
          <div className="mt-4 pt-4 border-t border-stone-800/50 space-y-2">
            <button
              onClick={handleSettings}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-stone-800/40 active:bg-stone-800/60 transition-colors touch-manipulation"
            >
              <div className="w-8 h-8 rounded-lg bg-stone-800/50 flex items-center justify-center">
                <Settings size={16} className="text-stone-500" />
              </div>
              <span className="text-sm font-medium text-stone-400">Settings</span>
            </button>

            <div className="px-3 pt-2">
              <p className="text-[10px] text-stone-700 text-center">
                Made with <span className="text-red-400/60">❤️</span> by{' '}
                <a href="https://www.linkedin.com/in/sarvangjain/" target="_blank" rel="noopener noreferrer" className="text-stone-600 hover:text-stone-500 transition-colors">
                  Sarvang Jain
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
