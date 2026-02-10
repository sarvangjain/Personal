import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Receipt, TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { getExpensesForFriend } from '../api/splitwise';
import { computeExpensesByCategory, computeMonthlySpending, computeRecentExpenses, formatCurrency, formatCompact, getUserId } from '../utils/analytics';
import { format, parseISO } from 'date-fns';

const CHART_COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4'];

export default function FriendDetail({ friend, onBack }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = getUserId();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getExpensesForFriend(friend.id);
        if (!cancelled) setExpenses(data);
      } catch (err) {
        console.error('Failed to load friend expenses:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [friend.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-emerald-400 animate-spin" />
        <span className="ml-3 text-sm text-stone-400">Loading expenses with {friend.name}...</span>
      </div>
    );
  }

  const categories = computeExpensesByCategory(expenses, userId);
  const monthly = computeMonthlySpending(expenses, userId, 8);
  const recent = computeRecentExpenses(expenses, 25);
  const totalShared = expenses.reduce((s, e) => s + parseFloat(e.cost), 0);
  const myShare = expenses.reduce((s, e) => {
    const u = e.users?.find(x => x.user_id === userId);
    return s + (u ? parseFloat(u.owed_share) : 0);
  }, 0);
  const theirShare = expenses.reduce((s, e) => {
    const u = e.users?.find(x => x.user_id === friend.id);
    return s + (u ? parseFloat(u.owed_share) : 0);
  }, 0);
  const topCats = categories.slice(0, 6);
  const catTotal = topCats.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-stone-800/60 hover:bg-stone-700/60 flex items-center justify-center border border-stone-700/40 transition-colors">
          <ArrowLeft size={16} className="text-stone-400" />
        </button>
        <div className="flex items-center gap-3">
          {friend.picture ? (
            <img src={friend.picture} className="w-10 h-10 rounded-full" alt="" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-stone-700 flex items-center justify-center text-base text-stone-400 font-medium">
              {friend.name[0]}
            </div>
          )}
          <div>
            <h2 className="font-display text-xl text-stone-100">{friend.name}</h2>
            <p className={`text-xs font-mono ${friend.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {friend.balance >= 0 ? 'Owes you' : 'You owe'} {formatCurrency(Math.abs(friend.balance))}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Shared', value: formatCurrency(totalShared), color: 'text-stone-200' },
          { label: 'Your Share', value: formatCurrency(myShare), color: 'text-amber-400' },
          { label: 'Their Share', value: formatCurrency(theirShare), color: 'text-indigo-400' },
          { label: 'Expenses Together', value: expenses.length.toString(), color: 'text-teal-400' },
        ].map(item => (
          <div key={item.label} className="glass-card p-4">
            <p className={`font-display text-xl ${item.color}`}>{item.value}</p>
            <p className="text-[10px] text-stone-500 mt-1 font-medium uppercase tracking-wide">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly trend */}
        <div className="glass-card p-6">
          <h3 className="font-display text-base text-stone-200 mb-4">Monthly Trend with {friend.name.split(' ')[0]}</h3>
          <div className="h-52">
            <ResponsiveContainer>
              <AreaChart data={monthly} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="friendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" vertical={false} />
                <XAxis dataKey="shortMonth" tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} tickFormatter={v => formatCompact(v)} />
                <Tooltip formatter={(value) => [formatCurrency(value), '']} />
                <Area type="monotone" dataKey="share" name="Your Share" stroke="#10b981" fill="url(#friendGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="total" name="Total" stroke="#6366f1" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category donut */}
        <div className="glass-card p-6">
          <h3 className="font-display text-base text-stone-200 mb-4">Categories</h3>
          {topCats.length === 0 ? (
            <p className="text-sm text-stone-500 py-8 text-center">No categorized expenses</p>
          ) : (
            <div className="flex gap-6 items-center">
              <div className="w-36 h-36 flex-shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={topCats} cx="50%" cy="50%" innerRadius={36} outerRadius={62} dataKey="amount" strokeWidth={2} stroke="rgba(12,10,9,0.8)">
                      {topCats.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2 overflow-hidden">
                {topCats.map((cat, i) => (
                  <div key={cat.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i] }} />
                    <span className="text-xs text-stone-400 truncate flex-1">{cat.name}</span>
                    <span className="text-xs font-mono text-stone-300">{formatCompact(cat.amount)}</span>
                    <span className="text-[10px] text-stone-600 w-8 text-right">{catTotal > 0 ? Math.round((cat.amount / catTotal) * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expense List */}
      <div className="glass-card p-6">
        <h3 className="font-display text-base text-stone-200 mb-4">All Expenses ({expenses.length})</h3>
        <div className="space-y-0.5 max-h-[500px] overflow-y-auto pr-2">
          {recent.map(exp => {
            const userEntry = exp.users?.find(u => u.user_id === userId);
            const myExpShare = userEntry ? parseFloat(userEntry.owed_share) : 0;
            const iPaid = userEntry ? parseFloat(userEntry.paid_share) > 0 : false;
            return (
              <div key={exp.id} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-stone-800/30 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${iPaid ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-stone-800/60 border-stone-700/30'}`}>
                  {iPaid ? <TrendingUp size={12} className="text-emerald-400" /> : <TrendingDown size={12} className="text-stone-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-300 truncate">{exp.description}</p>
                  <p className="text-[10px] text-stone-600">
                    {format(parseISO(exp.date), 'MMM d, yyyy')} · {exp.category?.name || 'General'} · Total {formatCurrency(parseFloat(exp.cost))}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-mono ${iPaid ? 'text-emerald-400' : 'text-stone-400'}`}>{formatCurrency(myExpShare)}</p>
                  <p className="text-[10px] text-stone-600">{iPaid ? 'you paid' : 'they paid'}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
