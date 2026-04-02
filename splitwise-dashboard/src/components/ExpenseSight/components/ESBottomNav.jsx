/**
 * ESBottomNav - Bottom tab navigation for ExpenseSight
 * 
 * Nav height: 60px base + safe-area-inset-bottom
 * Main content should use pb-[calc(60px+env(safe-area-inset-bottom,0px))] to avoid overlap
 */

import { Home, Activity, BarChart3, CreditCard, TrendingUp } from 'lucide-react';

export const BOTTOM_NAV_HEIGHT = 60;

const TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'wealth', label: 'Wealth', icon: TrendingUp },
  { id: 'bills', label: 'Bills', icon: CreditCard },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
];

export default function ESBottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-stone-950/95 backdrop-blur-xl border-t border-stone-800/50">
      {/* Main nav content - fixed 60px height */}
      <div className="flex items-center justify-around px-2 h-[60px]">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-2 sm:px-3 py-2 rounded-xl transition-all min-w-[52px] sm:min-w-[56px] touch-manipulation ${
                isActive 
                  ? 'text-teal-400' 
                  : 'text-stone-500 hover:text-stone-300 active:text-stone-200'
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${
                isActive ? 'bg-teal-500/20' : ''
              }`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-medium ${
                isActive ? 'text-teal-400' : 'text-stone-500'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
      {/* Safe area spacer - fills the home indicator area on notched phones */}
      <div className="safe-bottom" />
    </nav>
  );
}
