import { Users, MapPin, Home, Briefcase, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, formatCompact, getUserId } from '../utils/analytics';

const groupIcons = {
  trip: MapPin,
  home: Home,
  other: Briefcase,
};

function MemberAvatars({ members, maxShow = 4 }) {
  const shown = members?.slice(0, maxShow) || [];
  const remaining = (members?.length || 0) - maxShow;

  return (
    <div className="flex -space-x-2">
      {shown.map((m, i) => (
        m.picture?.small ? (
          <img
            key={m.id}
            src={m.picture.small}
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-stone-900"
            alt=""
          />
        ) : (
          <div
            key={m.id}
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-stone-900 bg-stone-700 flex items-center justify-center text-[9px] sm:text-[10px] font-medium text-stone-400"
          >
            {m.first_name?.[0] || '?'}
          </div>
        )
      ))}
      {remaining > 0 && (
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-stone-900 bg-stone-800 flex items-center justify-center text-[9px] sm:text-[10px] font-medium text-stone-500">
          +{remaining}
        </div>
      )}
    </div>
  );
}

function GroupCard({ group, onSelect }) {
  const Icon = groupIcons[group.group_type] || Users;
  const memberCount = group.members?.length || 0;
  const userId = getUserId();
  
  // Calculate user's balance in this group
  const debts = group.simplified_debts || group.original_debts || [];
  let userBalance = 0;
  
  // Find current user's balance from group members
  const currentUserMember = group.members?.find(m => m.id === userId);
  if (currentUserMember?.balance) {
    currentUserMember.balance.forEach(b => {
      userBalance += parseFloat(b.amount) || 0;
    });
  }

  const hasDebt = debts.length > 0;
  const isOwed = userBalance > 0;
  const isOwing = userBalance < 0;

  return (
    <button
      onClick={() => onSelect(group.id)}
      className="w-full text-left p-4 sm:p-5 rounded-2xl border transition-all duration-200 group touch-manipulation active:scale-[0.98] bg-stone-900/50 border-stone-800/50 hover:border-stone-700/60 hover:bg-stone-900/70"
    >
      {/* Header Row */}
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-stone-800/80`}>
          <Icon size={18} className="text-stone-400 sm:w-5 sm:h-5" />
        </div>
        <ChevronRight
          size={16}
          className="text-stone-600 group-hover:text-stone-400 group-hover:translate-x-0.5 transition-all sm:w-[18px] sm:h-[18px]"
        />
      </div>

      {/* Group Name */}
      <h3 className="text-base sm:text-lg font-display text-stone-200 truncate mb-1">
        {group.name}
      </h3>

      {/* Balance Info */}
      {hasDebt ? (
        <div className="flex items-center gap-1.5 mb-3">
          {isOwed ? (
            <>
              <TrendingUp size={12} className="text-emerald-400" />
              <span className="text-sm sm:text-base font-mono text-emerald-400">
                +{formatCompact(Math.abs(userBalance))}
              </span>
              <span className="text-xs sm:text-sm text-stone-500">owed to you</span>
            </>
          ) : isOwing ? (
            <>
              <TrendingDown size={12} className="text-red-400" />
              <span className="text-sm sm:text-base font-mono text-red-400">
                {formatCompact(Math.abs(userBalance))}
              </span>
              <span className="text-xs sm:text-sm text-stone-500">you owe</span>
            </>
          ) : (
            <span className="text-xs sm:text-sm text-stone-500">Has activity</span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-xs sm:text-sm text-emerald-400/70">✓ Settled up</span>
        </div>
      )}

      {/* Footer: Members */}
      <div className="flex items-center justify-between pt-2 border-t border-stone-800/50">
        <MemberAvatars members={group.members} maxShow={4} />
        <span className="text-xs sm:text-sm text-stone-500">
          {memberCount} {memberCount === 1 ? 'member' : 'members'}
        </span>
      </div>
    </button>
  );
}

export default function GroupSelector({ groups, onSelect }) {
  if (groups.length === 0) {
    return (
      <div className="glass-card p-8 sm:p-12 text-center">
        <Users size={32} className="text-stone-600 mx-auto mb-3" />
        <p className="text-base sm:text-lg font-display text-stone-400">No groups found</p>
        <p className="text-sm sm:text-base text-stone-600 mt-1">Create a group in Splitwise to see it here</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <h2 className="font-display text-xl sm:text-2xl text-stone-200">Your Groups</h2>
        <span className="text-sm sm:text-base text-stone-500">{groups.length} groups</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {groups.map(group => (
          <GroupCard key={group.id} group={group} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
