import { Loader2, Receipt, Crown, TrendingUp, Users } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from 'recharts';
import { computeExpensesByCategory, computeMonthlySpending, computeTopPayers, computeRecentExpenses, formatCurrency, formatCompact, computeDayOfWeekSpending } from '../utils/analytics';
import { format, parseISO, subMonths } from 'date-fns';

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
  const netForMe = myPaid - myShare;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {[
        { label: 'Total Group Spend', value: formatCurrency(totalCost), color: 'text-stone-200' },
        { label: 'Your Share', value: formatCurrency(myShare), color: 'text-amber-400' },
        { label: 'You Paid', value: formatCurrency(myPaid), color: 'text-emerald-400' },
        { label: 'Your Net', value: `${netForMe >= 0 ? '+' : ''}${formatCurrency(netForMe)}`, color: netForMe >= 0 ? 'text-emerald-400' : 'text-red-400' },
        { label: 'Avg/Person', value: formatCurrency(totalCost / memberCount), color: 'text-indigo-400' },
      ].map(item => (
        <div key={item.label} className="glass-card p-3 sm:p-4">
          <p className={`font-display text-lg sm:text-xl ${item.color}`}>{item.value}</p>
          <p className="text-[11px] sm:text-[10px] text-stone-500 mt-1 font-medium uppercase tracking-wide">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function MemberSharePie({ expenses }) {
  const members = {};
  expenses.forEach(exp => {
    exp.users?.forEach(u => {
      const id = u.user_id;
      const name = `${u.user?.first_name || ''}`.trim();
      if (!members[id]) members[id] = { name, owed: 0 };
      members[id].owed += parseFloat(u.owed_share);
    });
  });
  const data = Object.values(members).filter(m => m.owed > 0).sort((a, b) => b.owed - a.owed);
  if (data.length === 0) return null;

  return (
    <div className="glass-card p-6">
      <h3 className="font-display text-base text-stone-200 mb-4 flex items-center gap-2">
        <Users size={14} className="text-indigo-400" /> Share Distribution
      </h3>
      <div className="flex gap-5 items-center">
        <div className="w-36 h-36 flex-shrink-0">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="owed" strokeWidth={2} stroke="rgba(12,10,9,0.8)">
                {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2 overflow-hidden">
          {data.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="text-xs text-stone-400 truncate flex-1">{m.name}</span>
              <span className="text-xs font-mono text-stone-300">{formatCompact(m.owed)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MemberBreakdown({ expenses }) {
  const members = {};
  expenses.forEach(exp => {
    exp.users?.forEach(u => {
      const id = u.user_id;
      if (!members[id]) {
        members[id] = { name: `${u.user?.first_name || ''} ${u.user?.last_name || ''}`.trim(), picture: u.user?.picture?.medium, paid: 0, owed: 0 };
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
        {memberList.map((m, i) => {
          const net = m.paid - m.owed;
          return (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {m.picture ? <img src={m.picture} className="w-6 h-6 rounded-full" alt="" /> : (
                    <div className="w-6 h-6 rounded-full bg-stone-700 flex items-center justify-center text-[10px] text-stone-400 font-medium">{m.name[0]}</div>
                  )}
                  <span className="text-sm text-stone-300">{m.name}</span>
                </div>
                <div className="flex gap-3 text-xs font-mono">
                  <span className="text-emerald-400">Paid {formatCompact(m.paid)}</span>
                  <span className="text-stone-500">Share {formatCompact(m.owed)}</span>
                  <span className={net >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {net >= 0 ? '+' : ''}{formatCompact(net)}
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-stone-800/60 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                  style={{ width: `${(m.paid / maxPaid) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MemberMonthlyComparison({ expenses }) {
  // Build per-member monthly data
  const now = new Date();
  const months = 4;
  const monthKeys = [];
  for (let i = months - 1; i >= 0; i--) monthKeys.push(format(subMonths(now, i), 'yyyy-MM'));

  const memberNames = {};
  expenses.forEach(exp => {
    exp.users?.forEach(u => {
      if (parseFloat(u.paid_share) > 0 || parseFloat(u.owed_share) > 0) {
        memberNames[u.user_id] = `${u.user?.first_name || ''}`.trim();
      }
    });
  });

  const chartData = monthKeys.map(key => {
    const row = { month: format(parseISO(key + '-01'), 'MMM') };
    Object.entries(memberNames).forEach(([id, name]) => { row[name] = 0; });

    expenses.forEach(exp => {
      if (exp.payment || exp.deleted_at) return;
      const expKey = format(parseISO(exp.date), 'yyyy-MM');
      if (expKey !== key) return;
      exp.users?.forEach(u => {
        const name = memberNames[u.user_id];
        if (name) row[name] += parseFloat(u.owed_share);
      });
    });
    return row;
  });

  const names = Object.values(memberNames);
  if (names.length === 0) return null;

  return (
    <div className="glass-card p-6">
      <h3 className="font-display text-base text-stone-200 mb-4">Monthly by Member</h3>
      <div className="h-56">
        <ResponsiveContainer>
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} tickFormatter={v => formatCompact(v)} />
            <Tooltip formatter={(v) => formatCurrency(v)} />
            {names.map((name, i) => (
              <Bar key={name} dataKey={name} stackId="members" fill={CHART_COLORS[i % CHART_COLORS.length]} radius={i === names.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} maxBarSize={40} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-3 mt-3">
        {names.map((name, i) => (
          <div key={name} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="text-[10px] text-stone-500">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpenseTimeline({ expenses, userId }) {
  const recent = computeRecentExpenses(expenses, 25);

  return (
    <div className="glass-card p-4 sm:p-6">
      <h3 className="font-display text-base sm:text-lg text-stone-200 mb-4 flex items-center gap-2">
        <Receipt size={16} className="text-stone-400 sm:w-[14px] sm:h-[14px]" /> Expense Timeline ({expenses.length} total)
      </h3>
      <div className="space-y-0.5 max-h-[450px] overflow-y-auto pr-2">
        {recent.map(exp => {
          const userEntry = exp.users?.find(u => u.user_id === userId);
          const myShare = userEntry ? parseFloat(userEntry.owed_share) : 0;
          const payer = exp.users?.find(u => parseFloat(u.paid_share) > 0);
          return (
            <div key={exp.id} className="flex items-center gap-3 py-3 sm:py-2.5 px-2 rounded-lg hover:bg-stone-800/30 transition-colors">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-emerald-500/40 to-transparent flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-sm text-stone-300 truncate">{exp.description}</p>
                <p className="text-xs sm:text-[10px] text-stone-600">
                  {format(parseISO(exp.date), 'MMM d, yyyy')} · {payer?.user?.first_name || 'Unknown'} paid {formatCurrency(parseFloat(exp.cost), exp.currency_code || 'INR')}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm sm:text-xs font-mono text-stone-400">{formatCurrency(myShare, exp.currency_code || 'INR')}</p>
                <p className="text-xs sm:text-[10px] text-stone-600">{exp.category?.name || ''}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayOfWeekChart({ data }) {
  return (
    <div className="glass-card p-6">
      <h3 className="font-display text-base text-stone-200 mb-4">Group Day Pattern</h3>
      <div className="h-44">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} tickFormatter={v => formatCompact(v)} />
            <Tooltip formatter={(v) => [formatCurrency(v), 'Spent']} />
            <Bar dataKey="amount" fill="#ec4899" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
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
  const dayOfWeek = computeDayOfWeekSpending(expenses, userId);

  return (
    <div className="space-y-4 animate-fade-in">
      <GroupSummaryCards expenses={expenses} group={group} userId={userId} />

      {/* Row 1: Monthly Trend + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                  {topCats.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Member Monthly + Share Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MemberMonthlyComparison expenses={expenses} />
        <MemberSharePie expenses={expenses} />
      </div>

      {/* Row 3: Member Breakdown + Day Pattern */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <MemberBreakdown expenses={expenses} />
        </div>
        <DayOfWeekChart data={dayOfWeek} />
      </div>

      {/* Row 4: Timeline + Top Payers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ExpenseTimeline expenses={expenses} userId={userId} />
        </div>

        <div className="glass-card p-6">
          <h3 className="font-display text-base text-stone-200 mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-emerald-400" /> Top Payers
          </h3>
          <div className="space-y-3">
            {topPayers.slice(0, 8).map((payer, i) => (
              <div key={payer.id} className="flex items-center gap-3">
                <span className="text-[10px] text-stone-600 w-4 text-right font-mono">{i + 1}</span>
                {payer.picture ? <img src={payer.picture} className="w-7 h-7 rounded-full" alt="" /> : (
                  <div className="w-7 h-7 rounded-full bg-stone-700 flex items-center justify-center text-[10px] text-stone-400 font-medium">{payer.name[0]}</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-stone-300 truncate">{payer.name}</p>
                  <p className="text-[10px] text-stone-600">{payer.count} expenses</p>
                </div>
                <span className="text-sm font-mono text-emerald-400">{formatCompact(payer.totalPaid)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
