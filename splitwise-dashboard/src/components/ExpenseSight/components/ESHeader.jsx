/**
 * ESHeader - ExpenseSight app header with hamburger menu
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Menu, Plus, X, ArrowLeft, Settings, HelpCircle, Info, 
  Clock, Home, Receipt, Wallet, TrendingUp, FlaskConical,
  ChevronRight, Target, PieChart, CreditCard, Bell
} from 'lucide-react';
import NotificationSettings from './NotificationSettings';
import useNotifications from '../../../hooks/useNotifications';

// Tab metadata for ExpenseSight
const ES_TAB_META = {
  home:     { icon: Home,        label: 'Home',      color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  activity: { icon: Receipt,     label: 'Activity',  color: 'text-teal-400',    bg: 'bg-teal-500/10' },
  budget:   { icon: Wallet,      label: 'Budget',    color: 'text-cyan-400',    bg: 'bg-cyan-500/10' },
  bills:    { icon: CreditCard,  label: 'Bills',     color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  goals:    { icon: Target,      label: 'Goals',     color: 'text-pink-400',    bg: 'bg-pink-500/10' },
  insights: { icon: TrendingUp,  label: 'Insights',  color: 'text-purple-400',  bg: 'bg-purple-500/10' },
  labs:     { icon: FlaskConical,label: 'Labs',      color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10' },
};

// Navigation sections
const NAV_SECTIONS = [
  {
    title: 'Main',
    items: ['home', 'activity'],
  },
  {
    title: 'Finance',
    items: ['budget', 'bills', 'goals'],
  },
  {
    title: 'Analytics',
    items: ['insights'],
  },
  {
    title: 'Explore',
    items: ['labs'],
  },
];

// Recent tab item component
function RecentTabItem({ tabId, onClick }) {
  const meta = ES_TAB_META[tabId];
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

// Navigation item component
function NavItem({ tabId, isActive, onClick }) {
  const meta = ES_TAB_META[tabId];
  if (!meta) return null;
  const Icon = meta.icon;

  return (
    <button
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
      <ChevronRight size={14} className={`${isActive ? 'text-stone-500' : 'text-stone-700 group-hover:text-stone-600'} transition-colors`} />
    </button>
  );
}

// Slide-out menu
function SlideMenu({ isOpen, onClose, onBackToSplitSight, activeTab, onNavigate, recentTabs = [], onOpenNotifications }) {
  const sidebarRef = useRef(null);
  
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

  if (!isOpen) return null;
  
  // Filter recent tabs to exclude current active tab
  const filteredRecents = recentTabs.filter(tabId => tabId !== activeTab && ES_TAB_META[tabId]);
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* Menu panel */}
      <div 
        ref={sidebarRef}
        className="fixed top-0 left-0 h-full w-72 bg-stone-900 border-r border-stone-800/50 z-50 animate-slide-in-left flex flex-col"
      >
        {/* Safe area top */}
        <div className="safe-top flex-shrink-0" />
        
        {/* Header */}
        <div className="p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-display text-stone-200">ExpenseSight</h2>
                <p className="text-xs text-stone-500">Personal Tracker</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-stone-500 hover:text-stone-300 hover:bg-stone-800/50 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
          {/* Recent tabs */}
          {filteredRecents.length > 0 && (
            <div className="mb-4">
              <h3 className="text-[10px] uppercase tracking-wider text-stone-600 font-medium px-3 mb-2">
                Recently Visited
              </h3>
              <div className="space-y-0.5">
                {filteredRecents.slice(0, 3).map(tabId => (
                  <RecentTabItem
                    key={tabId}
                    tabId={tabId}
                    onClick={() => {
                      onNavigate(tabId);
                      onClose();
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Navigation sections */}
          {NAV_SECTIONS.map((section, idx) => (
            <div key={section.title}>
              <h3 className="text-[10px] uppercase tracking-wider text-stone-600 font-medium px-3 mb-2">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map(tabId => (
                  <NavItem
                    key={tabId}
                    tabId={tabId}
                    isActive={activeTab === tabId}
                    onClick={() => {
                      onNavigate(tabId);
                      onClose();
                    }}
                  />
                ))}
              </div>
              {idx < NAV_SECTIONS.length - 1 && (
                <div className="h-px bg-stone-800/50 my-3" />
              )}
            </div>
          ))}
          
          {/* Quick Actions */}
          <div className="h-px bg-stone-800/50 my-3" />
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-stone-600 font-medium px-3 mb-2">
              Quick Actions
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => {
                  onNavigate('budget');
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-stone-800/40 active:bg-stone-800/60 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
                  <Target size={16} className="text-teal-400" />
                </div>
                <span className="text-sm font-medium text-stone-400 group-hover:text-stone-300">Set Budget Goal</span>
              </button>
              
              <button
                onClick={() => {
                  onNavigate('insights');
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-stone-800/40 active:bg-stone-800/60 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <PieChart size={16} className="text-purple-400" />
                </div>
                <span className="text-sm font-medium text-stone-400 group-hover:text-stone-300">View Analytics</span>
              </button>
            </div>
          </div>
          
          {/* Back to SplitSight */}
          <div className="h-px bg-stone-800/50 my-3" />
          <button
            onClick={() => { onBackToSplitSight(); onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 hover:from-emerald-500/20 hover:to-teal-500/20 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <ArrowLeft size={16} className="text-white" />
            </div>
            <span className="text-sm font-medium text-emerald-300 flex-1 text-left">Back to SplitSight</span>
            <span className="px-1.5 py-0.5 text-[9px] bg-emerald-500/20 text-emerald-400 rounded-full font-medium">
              App
            </span>
          </button>
        </div>
        
        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-stone-800/50">
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <button 
                onClick={() => { onOpenNotifications(); onClose(); }}
                className="p-2 rounded-lg text-stone-500 hover:text-stone-300 hover:bg-stone-800/50 transition-colors"
                title="Notifications"
              >
                <Bell size={18} />
              </button>
              <button className="p-2 rounded-lg text-stone-500 hover:text-stone-300 hover:bg-stone-800/50 transition-colors">
                <Settings size={18} />
              </button>
              <button className="p-2 rounded-lg text-stone-500 hover:text-stone-300 hover:bg-stone-800/50 transition-colors">
                <HelpCircle size={18} />
              </button>
              <button className="p-2 rounded-lg text-stone-500 hover:text-stone-300 hover:bg-stone-800/50 transition-colors">
                <Info size={18} />
              </button>
            </div>
            <p className="text-[10px] text-stone-600">v1.0</p>
          </div>
          {/* Safe area bottom */}
          <div className="safe-bottom" />
        </div>
      </div>
    </>
  );
}

// SplitSight logo component for the switch button
function SplitSightMiniLogo({ size = 20 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size}>
      <defs>
        <linearGradient id="esBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#10b981' }} />
          <stop offset="100%" style={{ stopColor: '#0d9488' }} />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="108" fill="url(#esBgGrad)" />
      <circle cx="200" cy="256" r="80" fill="none" stroke="white" strokeWidth="28" opacity="0.9" />
      <circle cx="312" cy="256" r="80" fill="none" stroke="white" strokeWidth="28" opacity="0.9" />
      <ellipse cx="256" cy="256" rx="18" ry="60" fill="white" opacity="0.85" />
    </svg>
  );
}

export default function ESHeader({ onClose, onAddExpense, title = 'ExpenseSight', activeTab = 'home', onNavigate, recentTabs = [], userId }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);
  
  // Notifications hook
  const notifications = useNotifications(userId);
  
  return (
    <>
      <header className="flex-shrink-0 bg-stone-950/95 backdrop-blur-xl border-b border-stone-800/50">
        {/* Safe area padding at top */}
        <div className="safe-top" />
        
        <div className="flex items-center justify-between px-3 sm:px-4 py-3 gap-2">
          {/* Left: Hamburger + Quick Switch (hidden on very small screens) */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Hamburger menu button */}
            <button
              onClick={() => setMenuOpen(true)}
              className="p-2 sm:p-2.5 -ml-1 rounded-xl text-stone-400 hover:text-stone-200 hover:bg-stone-800/50 active:bg-stone-800 transition-all touch-manipulation"
            >
              <Menu size={22} />
            </button>
            
            {/* Quick App Switch Button - icon only on small screens */}
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 p-2 sm:px-2 sm:py-1.5 rounded-lg bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 hover:from-emerald-500/20 hover:to-teal-500/20 active:from-emerald-500/30 active:to-teal-500/30 transition-all group touch-manipulation"
              title="Switch to SplitSight"
            >
              <SplitSightMiniLogo size={18} />
              <span className="hidden sm:inline text-[10px] font-medium text-emerald-400 group-hover:text-emerald-300">
                SplitSight
              </span>
            </button>
          </div>

          {/* Center: Title - flexible width */}
          <div className="flex items-center justify-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <h1 className="text-base sm:text-lg font-display text-stone-200 truncate">{title}</h1>
          </div>

          {/* Right: Add expense button */}
          <button
            onClick={onAddExpense}
            className="p-2 sm:p-2.5 rounded-xl bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 active:bg-teal-500/40 transition-colors flex-shrink-0 touch-manipulation"
          >
            <Plus size={20} />
          </button>
        </div>
      </header>
      
      {/* Slide-out menu */}
      <SlideMenu 
        isOpen={menuOpen} 
        onClose={() => setMenuOpen(false)}
        onBackToSplitSight={onClose}
        activeTab={activeTab}
        onNavigate={onNavigate}
        recentTabs={recentTabs}
        onOpenNotifications={() => setNotificationSettingsOpen(true)}
      />
      
      {/* Notification Settings Modal */}
      <NotificationSettings
        isOpen={notificationSettingsOpen}
        onClose={() => setNotificationSettingsOpen(false)}
        settings={notifications.settings}
        permission={notifications.permission}
        isSupported={notifications.isSupported}
        onRequestPermission={notifications.requestPermission}
        onUpdateSettings={notifications.updateSettings}
        onDisable={notifications.disableNotifications}
        loading={notifications.loading}
      />
    </>
  );
}
