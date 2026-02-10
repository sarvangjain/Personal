import { useState, useEffect } from 'react';
import { ArrowLeft, Users, MapPin, Home, Briefcase, Loader2, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { getAllExpensesForGroup } from '../api/splitwise';
import { formatCurrency, formatCompact, getUserId } from '../utils/analytics';
import GroupDashboard from './GroupDashboard';

const groupIcons = {
  trip: MapPin,
  home: Home,
  other: Briefcase,
};

function MemberAvatars({ members, maxShow = 6 }) {
  const shown = members?.slice(0, maxShow) || [];
  const remaining = (members?.length || 0) - maxShow;

  return (
    <div className="flex -space-x-2">
      {shown.map((m) => (
        m.picture?.small ? (
          <img
            key={m.id}
            src={m.picture.small}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-stone-900"
            alt={m.first_name}
            title={`${m.first_name} ${m.last_name || ''}`}
          />
        ) : (
          <div
            key={m.id}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-stone-900 bg-stone-700 flex items-center justify-center text-xs sm:text-sm font-medium text-stone-400"
            title={`${m.first_name} ${m.last_name || ''}`}
          >
            {m.first_name?.[0] || '?'}
          </div>
        )
      ))}
      {remaining > 0 && (
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-stone-900 bg-stone-800 flex items-center justify-center text-xs sm:text-sm font-medium text-stone-500">
          +{remaining}
        </div>
      )}
    </div>
  );
}

export default function GroupDetail({ group, onBack }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = getUserId();
  
  const Icon = groupIcons[group?.group_type] || Users;
  const memberCount = group?.members?.length || 0;

  // Calculate user's balance in this group
  let userBalance = 0;
  const userMember = group?.members?.[0];
  if (userMember?.balance?.[0]) {
    userBalance = parseFloat(userMember.balance[0].amount) || 0;
  }

  const hasDebt = (group?.simplified_debts?.length > 0) || (group?.original_debts?.length > 0);
  const isOwed = userBalance > 0;
  const isOwing = userBalance < 0;

  useEffect(() => {
    if (!group?.id) return;
    
    let cancelled = false;
    async function loadExpenses() {
      setLoading(true);
      try {
        const data = await getAllExpensesForGroup(group.id);
        if (!cancelled) setExpenses(data);
      } catch (err) {
        console.error('Failed to load group expenses:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadExpenses();
    return () => { cancelled = true; };
  }, [group?.id]);

  if (!group) {
    return (
      <div className="glass-card p-8 sm:p-12 text-center">
        <p className="text-base sm:text-lg text-stone-400">Group not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      {/* Header with Back Button */}
      <div className="flex items-start gap-3 sm:gap-4">
        <button 
          onClick={onBack} 
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-stone-800/60 hover:bg-stone-700/60 flex items-center justify-center border border-stone-700/40 transition-colors flex-shrink-0"
        >
          <ArrowLeft size={18} className="text-stone-400 sm:w-5 sm:h-5" />
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-stone-800/80 flex items-center justify-center flex-shrink-0">
              <Icon size={20} className="text-stone-400 sm:w-6 sm:h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-xl sm:text-2xl text-stone-100 truncate">{group.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm sm:text-base text-stone-500">{memberCount} members</span>
                {group.group_type && (
                  <>
                    <span className="text-stone-700">•</span>
                    <span className="text-sm sm:text-base text-stone-500 capitalize">{group.group_type}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Balance Badge */}
          {hasDebt ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-800/50 border border-stone-700/30">
              {isOwed ? (
                <>
                  <TrendingUp size={14} className="text-emerald-400" />
                  <span className="text-sm sm:text-base font-mono text-emerald-400">+{formatCurrency(Math.abs(userBalance))}</span>
                  <span className="text-xs sm:text-sm text-stone-500">owed to you</span>
                </>
              ) : isOwing ? (
                <>
                  <TrendingDown size={14} className="text-red-400" />
                  <span className="text-sm sm:text-base font-mono text-red-400">{formatCurrency(Math.abs(userBalance))}</span>
                  <span className="text-xs sm:text-sm text-stone-500">you owe</span>
                </>
              ) : (
                <span className="text-sm sm:text-base text-stone-400">Has unsettled activity</span>
              )}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-sm sm:text-base text-emerald-400">✓ All settled up</span>
            </div>
          )}
        </div>
      </div>

      {/* Members Row */}
      <div className="glass-card p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-sm text-stone-500 mb-2">Group Members</p>
            <MemberAvatars members={group.members} maxShow={8} />
          </div>
          {group.invite_link && (
            <a
              href={group.invite_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs sm:text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <span>Invite</span>
              <ExternalLink size={12} />
            </a>
          )}
        </div>
        
        {/* Member Names */}
        <div className="mt-3 pt-3 border-t border-stone-800/50">
          <div className="flex flex-wrap gap-2">
            {group.members?.map(m => (
              <span key={m.id} className="px-2 py-1 text-xs sm:text-sm bg-stone-800/50 text-stone-400 rounded-md">
                {m.first_name} {m.last_name?.[0] ? `${m.last_name[0]}.` : ''}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Group Dashboard Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12 sm:py-16">
          <Loader2 size={24} className="text-emerald-400 animate-spin sm:w-7 sm:h-7" />
          <span className="ml-3 text-sm sm:text-base text-stone-400">Loading group expenses...</span>
        </div>
      ) : (
        <GroupDashboard group={group} expenses={expenses} loading={false} userId={userId} />
      )}
    </div>
  );
}
