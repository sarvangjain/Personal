/**
 * ESBottomNav - Bottom tab navigation for ExpenseSight
 */

import { Home, Activity, BarChart3, CreditCard, TrendingUp } from 'lucide-react';

const TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'wealth', label: 'Wealth', icon: TrendingUp },
  { id: 'bills', label: 'Bills', icon: CreditCard },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
];

export default function ESBottomNav({ activeTab, onTabChange }) {
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-40 bg-stone-950/95 backdrop-blur-xl border-t border-stone-800/50"
      style={{ 
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)'
      }}
    >
      {/* Main nav content with padding */}
      <div className="flex items-center justify-around px-2 py-2">
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
    </nav>
  );
}
