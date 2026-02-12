/**
 * ESBottomNav - Bottom tab navigation for ExpenseSight
 */

import { Home, Activity, Wallet, BarChart3, FlaskConical } from 'lucide-react';

const TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'budget', label: 'Budget', icon: Wallet },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
  { id: 'labs', label: 'Labs', icon: FlaskConical },
];

export default function ESBottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="flex-shrink-0 bg-stone-950/95 backdrop-blur-xl border-t border-stone-800/50">
      {/* Main nav content with padding */}
      <div className="flex items-center justify-around px-2 py-2">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[56px] ${
                isActive 
                  ? 'text-teal-400' 
                  : 'text-stone-500 hover:text-stone-300'
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
      {/* Safe area padding at the bottom */}
      <div className="safe-bottom" style={{ minHeight: '8px' }} />
    </nav>
  );
}
