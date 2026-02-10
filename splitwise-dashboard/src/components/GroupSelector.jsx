import { Users, MapPin, Home, Briefcase, ChevronRight } from 'lucide-react';

const groupIcons = {
  trip: MapPin,
  home: Home,
  other: Briefcase,
};

export default function GroupSelector({ groups, selectedGroupId, onSelect }) {
  return (
    <div>
      <h2 className="font-display text-xl text-stone-200 mb-4">Select a Group</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {groups.map(group => {
          const isSelected = group.id === selectedGroupId;
          const Icon = groupIcons[group.group_type] || Users;
          const memberCount = group.members?.length || 0;
          const hasDebt = group.simplified_debts?.length > 0 || group.original_debts?.length > 0;

          return (
            <button
              key={group.id}
              onClick={() => onSelect(group.id)}
              className={`text-left p-4 rounded-xl border transition-all duration-200 group ${
                isSelected
                  ? 'bg-emerald-500/10 border-emerald-500/30 shadow-lg shadow-emerald-500/5'
                  : 'bg-stone-900/40 border-stone-800/40 hover:border-stone-700/60 hover:bg-stone-800/40'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isSelected ? 'bg-emerald-500/20' : 'bg-stone-800/60'
                }`}>
                  <Icon size={14} className={isSelected ? 'text-emerald-400' : 'text-stone-500'} />
                </div>
                <ChevronRight
                  size={14}
                  className={`transition-transform ${isSelected ? 'text-emerald-400 translate-x-0' : 'text-stone-600 -translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0'}`}
                />
              </div>
              <h3 className={`text-sm font-medium mt-3 truncate ${isSelected ? 'text-emerald-300' : 'text-stone-300'}`}>
                {group.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-stone-500">{memberCount} members</span>
                {hasDebt && <span className="w-1.5 h-1.5 rounded-full bg-amber-500/60" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
