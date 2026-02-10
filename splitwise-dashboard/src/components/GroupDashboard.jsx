import { Loader2, Receipt, Crown, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, Legend } from 'recharts';
import { computeExpensesByCategory, computeMonthlySpending, computeTopPayers, computeRecentExpenses, formatCurrency, formatCompact } from '../utils/analytics';
import { format, parseISO } from 'date-fns';

const CHART_COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4', '#84cc16', '#e11d48'];

function GroupSummaryCards({ expenses, group, userId }) {
  const totalCost = expenses.reduce((s, e) => s + parseFloat(e.cost), 0);
  const myShare = expenses.reduce((s, e) => {
    const u = e.users?.find(x => x.user_id === userId);
    return s + (u ? parseFloat(u.owed_share) : 0);
  }, 0);
  const myPaid = expenses.reduce((s, e) => {
    const u = e.users?.find(x => x.user_id === userId);
    return s + (u ? parseFloat(u.paid_share) : 0);
  }, 0);
  const memberCount = group?.members?.length || 1;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {[
        { label: 'Total Group Spend', value: formatCurrency(totalCost), color: 'text-stone-200' },
        { label: 'Your Share', value: formatCurrency(myShare), color: 'text-amber-400' },
        { label: 'You Paid', value: formatCurrency(myPaid), color: 'text-emerald-400' },
        { label: 'Avg per Person', value: formatCurrency(totalCost / memberCount), color: 'text-indigo-400' },
        { label: 'Total Expenses', value: expenses.length.toString(), color: 'text-teal-400' },
      ].map(item => (
        <div key={item.label} className="glass-card p-4">
          <p className={`font-display text-xl ${item.color}`}>{item.value}</p>
          <p className="text-[10px] text-stone-500 mt-1 font-medium uppercase tracking-wide">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function MemberBreakdown({ expenses }) {
  const members = {};
  expenses.forEach(exp => {
    exp.users?.forEach(u => {
      const id = u.user_id;
      if (!members[id]) {
        members[id] = {
          name: `${u.user?.first_name || ''} ${u.user?.last_name || ''}`.trim(),
          picture: u.user?.picture?.medium,
          paid: 0,
          owed: 0,
        };
      }
      members[id].paid += parseFloat(u.paid_share);
      members[id].owed += parseFloat(u.owed_share);
    });
  });

  const memberList = Object.values(members).sort((a, b) => b.paid - a.paid);
  const maxPaid = Math.max(...memberList.map(m => m.paid), 1);

  return (
    <div className="glass-card p-6">
      <h3 className="font-display text-base text-stone-200 mb-4 flex items-center gap-2">
        <Crown size={14} className="text-amber-400" /> Member Breakdown
      </h3>
      <div className="space-y-3">
        {memberList.map((m, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {m.picture ? (
                  <img src={m.picture} className="w-6 h-6 rounded-full" alt="" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-stone-700 flex items-center justify-center text-[10px] text-stone-400 font-medium">
                    {m.name[0]}
                  </div>
                )}
                <span className="text-sm text-stone-300">{m.name}</span>
              </div>
              <div className="flex gap-4 text-xs font-mono">
                <span className="text-emerald-400">Paid {formatCompact(m.paid)}</span>
                <span className="text-stone-500">Share {formatCompact(m.owed)}</span>
              </div>
            </div>
            <div className="h-1.5 bg-stone-800/60 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                style={{ width: `${(m.paid / maxPaid) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpenseTimeline({ expenses, userId }) {
  const recent = computeRecentExpenses(expenses, 20);

  return (
    <div className="glass-card p-6">
      <h3 className="font-display text-base text-stone-200 mb-4 flex items-center gap-2">
        <Receipt size={14} className="text-stone-400" /> Expense Timeline
      </h3>
      <div className="space-y-0.5 max-h-[400px] overflow-y-auto pr-2">
        {recent.map(exp => {
          const userEntry = exp.users?.find(u => u.user_id === userId);
          const myShare = userEntry ? parseFloat(userEntry.owed_share) : 0;
          const payer = exp.users?.find(u => parseFloat(u.paid_share) > 0);

          return (
            <div key={exp.id} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-stone-800/30 transition-colors">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-emerald-500/40 to-transparent flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-300 truncate">{exp.description}</p>
                <p className="text-[10px] text-stone-600">
                  {format(parseISO(exp.date), 'MMM d, yyyy')} · {payer?.user?.first_name || 'Unknown'} paid {formatCurrency(parseFloat(exp.cost))}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-mono text-stone-400">{formatCurrency(myShare)}</p>
                <p className="text-[10px] text-stone-600">{exp.category?.name || ''}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GroupDashboard({ group, expenses, loading, userId }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="text-emerald-400 animate-spin" />
        <span className="ml-3 text-sm text-stone-400">Loading expenses...</span>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-stone-400">No expenses found in this group.</p>
      </div>
    );
  }

  const categories = computeExpensesByCategory(expenses, userId);
  const monthly = computeMonthlySpending(expenses, userId, 6);
  const topPayers = computeTopPayers(expenses);
  const topCats = categories.slice(0, 8);

  return (
    <div className="space-y-4">
      <GroupSummaryCards expenses={expenses} group={group} userId={userId} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Trend */}
        <div className="glass-card p-6">
          <h3 className="font-display text-base text-stone-200 mb-4">Monthly Trend</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <AreaChart data={monthly} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="groupGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" vertical={false} />
                <XAxis dataKey="shortMonth" tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} tickFormatter={v => formatCompact(v)} />
                <Tooltip formatter={(value) => [formatCurrency(value), '']} />
                <Area type="monotone" dataKey="total" name="Group Total" stroke="#6366f1" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" />
                <Area type="monotone" dataKey="share" name="Your Share" stroke="#10b981" fill="url(#groupGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="glass-card p-6">
          <h3 className="font-display text-base text-stone-200 mb-4">Category Breakdown</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={topCats} layout="vertical" margin={{ top: 0, right: 5, bottom: 0, left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} tickFormatter={v => formatCompact(v)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip formatter={(value) => [formatCurrency(value), 'Amount']} />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {topCats.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MemberBreakdown expenses={expenses} />
        <ExpenseTimeline expenses={expenses} userId={userId} />
      </div>

      {/* Top Payers */}
      <div className="glass-card p-6">
        <h3 className="font-display text-base text-stone-200 mb-4 flex items-center gap-2">
          <TrendingUp size={14} className="text-emerald-400" /> Top Payers
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {topPayers.slice(0, 6).map((payer, i) => (
            <div key={payer.id} className="text-center p-3 bg-stone-800/30 rounded-xl border border-stone-800/30">
              {payer.picture ? (
                <img src={payer.picture} className="w-10 h-10 rounded-full mx-auto mb-2" alt="" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-stone-700 mx-auto mb-2 flex items-center justify-center text-sm text-stone-400 font-medium">
                  {payer.name[0]}
                </div>
              )}
              <p className="text-xs text-stone-300 truncate">{payer.name}</p>
              <p className="text-sm font-mono text-emerald-400 mt-0.5">{formatCompact(payer.totalPaid)}</p>
              <p className="text-[10px] text-stone-600">{payer.count} expenses</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
