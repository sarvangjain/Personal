import { useState, useMemo, useRef, useCallback } from 'react';
import { 
  MapPin, Calendar, Users, Flame, ChevronLeft, ArrowLeft, 
  Crown, Receipt, TrendingUp, Share2, Download, X, Loader2, Check,
  ChevronRight, Sparkles
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { format, parseISO } from 'date-fns';
import { detectTrips, formatTripCurrency } from '../utils/trips';
import { formatCurrency, formatCompact } from '../utils/analytics';
import ShareableTripCard from './ShareableTripCard';

const CHART_COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6'];

// ── Trip Card (list view) ───────────────────────────────────────────────────

function TripCard({ trip, onClick }) {
  return (
    <button
      onClick={onClick}
      className="glass-card p-4 sm:p-5 w-full text-left hover:border-stone-700/60 transition-all group active:scale-[0.98]"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Vibe icon */}
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-stone-800 to-stone-900 border border-stone-700/50 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
          <span className="text-2xl sm:text-3xl">{trip.vibe.emoji}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-display text-base sm:text-lg text-white truncate">{trip.groupName}</h3>
            <span className="px-2 py-0.5 text-[9px] font-medium bg-stone-800 text-stone-400 rounded-full flex-shrink-0">
              {trip.vibe.label}
            </span>
          </div>

          <p className="text-xs text-stone-500 flex items-center gap-1.5">
            <Calendar size={11} />
            {trip.dateRange}
            <span className="text-stone-700">·</span>
            {trip.durationDays}d
          </p>

          <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 mt-2.5">
            <div>
              <p className="text-sm font-display text-emerald-400">{formatCompact(trip.totalGroupSpend, trip.currency)}</p>
              <p className="text-[9px] text-stone-600">Group total</p>
            </div>
            <div className="w-px h-6 bg-stone-800 hidden sm:block" />
            <div>
              <p className="text-sm font-display text-amber-400">{formatCompact(trip.yourShare, trip.currency)}</p>
              <p className="text-[9px] text-stone-600">Your share</p>
            </div>
            <div className="flex items-center gap-1 ml-auto sm:ml-0">
              <Users size={11} className="text-stone-500" />
              <span className="text-xs text-stone-400">{trip.memberCount}</span>
              <span className="text-stone-700 mx-0.5">·</span>
              <Receipt size={11} className="text-stone-500" />
              <span className="text-xs text-stone-400">{trip.expenseCount}</span>
            </div>
          </div>
        </div>

        <ChevronRight size={16} className="text-stone-600 self-center flex-shrink-0" />
      </div>
    </button>
  );
}

// ── Trip Detail View ────────────────────────────────────────────────────────

function TripDetail({ trip, onBack }) {
  const [showShareModal, setShowShareModal] = useState(false);
  const topCats = trip.categories.slice(0, 5);

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-stone-800/80 hover:bg-stone-700 flex items-center justify-center transition-colors"
        >
          <ArrowLeft size={16} className="text-stone-400" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{trip.vibe.emoji}</span>
            <h2 className="font-display text-lg sm:text-xl text-white truncate">{trip.groupName}</h2>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">{trip.dateRange} · {trip.durationDays} day{trip.durationDays > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowShareModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors"
        >
          <Share2 size={13} />
          Share
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-xl font-display text-emerald-400">{formatCompact(trip.totalGroupSpend, trip.currency)}</p>
          <p className="text-[10px] text-stone-500 mt-0.5">Group Total</p>
        </div>
        <div className="glass-card p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-xl font-display text-amber-400">{formatCompact(trip.yourShare, trip.currency)}</p>
          <p className="text-[10px] text-stone-500 mt-0.5">Your Share</p>
        </div>
        <div className="glass-card p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-xl font-display text-cyan-400">{formatCompact(trip.perDayBurnRate, trip.currency)}</p>
          <p className="text-[10px] text-stone-500 mt-0.5">Per Day (Group)</p>
        </div>
        <div className="glass-card p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-xl font-display text-indigo-400">{trip.memberCount}</p>
          <p className="text-[10px] text-stone-500 mt-0.5">Members</p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="glass-card p-5 sm:p-6">
        <h3 className="font-display text-sm text-stone-200 mb-4">Where the Money Went</h3>
        {topCats.length === 0 ? (
          <p className="text-sm text-stone-500 text-center py-4">No category data</p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center">
            <div className="w-32 h-32 sm:w-36 sm:h-36 flex-shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={topCats}
                    cx="50%" cy="50%"
                    innerRadius={30} outerRadius={52}
                    dataKey="amount"
                    strokeWidth={2}
                    stroke="rgba(12,10,9,0.8)"
                  >
                    {topCats.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 w-full space-y-2">
              {topCats.map((cat, i) => (
                <div key={cat.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i] }} />
                  <span className="text-xs text-stone-400 truncate flex-1">{cat.name}</span>
                  <span className="text-[10px] text-stone-600 w-8 text-right">{cat.percentage}%</span>
                  <span className="text-xs font-mono text-stone-300">{formatCompact(cat.amount, trip.currency)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Generous Payer + Biggest Expense */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {trip.generousPayer && (
          <div className="glass-card p-4 sm:p-5">
            <p className="text-[10px] text-amber-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Crown size={11} /> Most Generous Payer
            </p>
            <div className="flex items-center gap-3">
              {trip.generousPayer.picture ? (
                <img src={trip.generousPayer.picture} alt="" className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-sm font-medium text-white">
                  {trip.generousPayer.name?.[0] || '?'}
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{trip.generousPayer.name}</p>
                <p className="text-[10px] text-stone-500">{trip.generousPayer.count} payments</p>
              </div>
              <p className="text-base font-display text-amber-400">{formatCompact(trip.generousPayer.totalPaid, trip.currency)}</p>
            </div>
          </div>
        )}

        {trip.biggestExpense && (
          <div className="glass-card p-4 sm:p-5">
            <p className="text-[10px] text-rose-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Flame size={11} /> Biggest Expense
            </p>
            <p className="text-sm font-medium text-white truncate">{trip.biggestExpense.description}</p>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-stone-500">{trip.biggestExpense.category}</span>
              <span className="text-base font-display text-rose-400">{formatCompact(trip.biggestExpense.cost, trip.currency)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Top Payers Leaderboard */}
      {trip.payers.length > 1 && (
        <div className="glass-card p-5 sm:p-6">
          <h3 className="font-display text-sm text-stone-200 mb-3">Payer Leaderboard</h3>
          <div className="space-y-2">
            {trip.payers.slice(0, 6).map((payer, i) => {
              const maxPaid = trip.payers[0].totalPaid;
              const pct = maxPaid > 0 ? (payer.totalPaid / maxPaid) * 100 : 0;
              return (
                <div key={payer.id} className="flex items-center gap-3">
                  <span className="text-xs text-stone-600 w-4 text-right font-mono">#{i + 1}</span>
                  {payer.picture ? (
                    <img src={payer.picture} alt="" className="w-7 h-7 rounded-full flex-shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-stone-800 flex items-center justify-center text-[10px] text-stone-400 flex-shrink-0">
                      {payer.name?.[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-stone-300 truncate">{payer.name}</span>
                      <span className="text-xs font-mono text-stone-400">{formatCompact(payer.totalPaid, trip.currency)}</span>
                    </div>
                    <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expense Timeline */}
      <div className="glass-card p-5 sm:p-6">
        <h3 className="font-display text-sm text-stone-200 mb-3 flex items-center gap-2">
          <Receipt size={13} className="text-stone-400" />
          Expense Timeline ({trip.expenses.length})
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {trip.expenses.map((exp, i) => (
            <div key={exp.id || i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-800/30 transition-colors">
              <div className="text-[10px] text-stone-600 w-12 text-right flex-shrink-0">
                {format(parseISO(exp.date), 'MMM d')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-stone-300 truncate">{exp.description}</p>
                <p className="text-[9px] text-stone-600">{exp.category}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-mono text-stone-300">{formatCompact(exp.cost, trip.currency)}</p>
                <p className="text-[9px] text-stone-600">You: {formatCompact(exp.yourShare, trip.currency)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Net Contribution */}
      <div className="glass-card p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-stone-500">Your net contribution</p>
          <p className="text-[10px] text-stone-600">Paid - Your share</p>
        </div>
        <p className={`text-lg font-display ${trip.netContribution >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {trip.netContribution >= 0 ? '+' : ''}{formatCompact(trip.netContribution, trip.currency)}
        </p>
      </div>

      {/* Shareable modal */}
      {showShareModal && (
        <ShareableTripCard trip={trip} onClose={() => setShowShareModal(false)} />
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function TripTracker({ expenses, groups, userId }) {
  const [selectedTrip, setSelectedTrip] = useState(null);

  const trips = useMemo(
    () => detectTrips(expenses, groups, userId),
    [expenses, groups, userId]
  );

  if (selectedTrip) {
    return <TripDetail trip={selectedTrip} onBack={() => setSelectedTrip(null)} />;
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
          <MapPin size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-display text-stone-200">Trips & Events</h2>
          <p className="text-xs text-stone-500">Auto-detected from your expense clusters</p>
        </div>
      </div>

      {trips.length === 0 ? (
        <div className="glass-card p-8 sm:p-12 text-center">
          <MapPin size={28} className="text-stone-600 mx-auto mb-3" />
          <p className="text-stone-400">No trips detected yet</p>
          <p className="text-xs text-stone-600 mt-1">
            Trips are detected when a group has 3+ expenses within a few days. Keep logging!
          </p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card p-3 text-center">
              <p className="text-xl font-display text-cyan-400">{trips.length}</p>
              <p className="text-[10px] text-stone-500">Trips Found</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="text-xl font-display text-emerald-400">
                {formatCompact(trips.reduce((s, t) => s + t.totalGroupSpend, 0))}
              </p>
              <p className="text-[10px] text-stone-500">Total Spent</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="text-xl font-display text-amber-400">
                {trips.reduce((s, t) => s + t.durationDays, 0)}
              </p>
              <p className="text-[10px] text-stone-500">Days of Fun</p>
            </div>
          </div>

          {/* Trip List */}
          <div className="space-y-3">
            {trips.map(trip => (
              <TripCard
                key={trip.id}
                trip={trip}
                onClick={() => setSelectedTrip(trip)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
