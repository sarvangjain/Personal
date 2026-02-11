import { TrendingUp, TrendingDown, Scale, Receipt } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from 'recharts';
import { formatCurrency, formatCompact, computeExpensesByCategory, computeMonthlySpending, computeRecentExpenses, computeDayOfWeekSpending, computeCategoryTrend } from '../utils/analytics';
import { format, parseISO } from 'date-fns';

const CHART_COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4', '#84cc16', '#e11d48'];

/**
 * StatCard with multi-currency support.
 * `value` = primary display string, `extraValues` = optional array of secondary currency strings
 */
function StatCard({ icon: Icon, label, value, extraValues, subtext, type = 'neutral' }) {
  const glowClass = type === 'positive' ? 'stat-glow-green' : type === 'negative' ? 'stat-glow-red' : 'stat-glow-amber';
  const textColor = type === 'positive' ? 'text-emerald-400' : type === 'negative' ? 'text-red-400' : 'text-amber-400';
  const iconBg = type === 'positive' ? 'bg-emerald-500/10' : type === 'negative' ? 'bg-red-500/10' : 'bg-amber-500/10';

  return (
    <div className={`glass-card p-3 sm:p-5 ${glowClass}`}>
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon size={14} className={`${textColor} sm:w-4 sm:h-4`} />
        </div>
      </div>
      <p className={`font-display text-lg sm:text-2xl ${textColor}`}>{value}</p>
      {extraValues && extraValues.length > 0 && (
        <div className="mt-0.5 space-y-0">
          {extraValues.map((v, i) => (
            <p key={i} className={`font-display text-sm sm:text-base ${textColor} opacity-70`}>{v}</p>
          ))}
        </div>
      )}
      <p className="text-[10px] sm:text-xs text-stone-500 mt-0.5 sm:mt-1 font-medium">{label}</p>
      {subtext && <p className="text-[9px] sm:text-[10px] text-stone-600 mt-0.5">{subtext}</p>}
    </div>
  );
}

function CategoryChart({ data }) {
  const top6 = data.slice(0, 6);
  const total = top6.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="glass-card p-4 sm:p-6">
      <h3 className="font-display text-sm sm:text-base text-stone-200 mb-3 sm:mb-4">Spending by Category</h3>
      {data.length === 0 ? (
        <p className="text-sm text-stone-500 py-8 text-center">No categorized expenses yet</p>
      ) : (
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center">
          <div className="w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={top6} cx="50%" cy="50%" innerRadius={32} outerRadius={55} dataKey="amount" strokeWidth={2} stroke="rgba(12,10,9,0.8)">
                  {top6.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 w-full space-y-2 sm:space-y-2.5 overflow-hidden">
            {top6.map((cat, i) => (
              <div key={cat.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i] }} />
                <span className="text-[11px] sm:text-xs text-stone-400 truncate flex-1">{cat.name}</span>
                <span className="text-[11px] sm:text-xs font-mono text-stone-300">{formatCompact(cat.amount)}</span>
                <span className="text-[9px] sm:text-[10px] text-stone-600 w-7 sm:w-8 text-right">
                  {total > 0 ? Math.round((cat.amount / total) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MonthlyChart({ data }) {
  return (
    <div className="glass-card p-4 sm:p-6">
      <h3 className="font-display text-sm sm:text-base text-stone-200 mb-3 sm:mb-4">Monthly Spending Trend</h3>
      <div className="h-44 sm:h-56">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="colorShare" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" vertical={false} />
            <XAxis dataKey="shortMonth" tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9, fill: '#78716c' }} axisLine={false} tickLine={false} tickFormatter={v => formatCompact(v)} width={38} />
            <Tooltip formatter={(value) => [formatCurrency(value), '']} contentStyle={{ background: 'rgba(28,25,23,0.95)', border: '1px solid rgba(120,113,108,0.3)', borderRadius: 12, fontSize: 11 }} />
            <Area type="monotone" dataKey="share" name="Your Share" stroke="#10b981" fill="url(#colorShare)" strokeWidth={2} />
            <Area type="monotone" dataKey="paid" name="You Paid" stroke="#f59e0b" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CategoryTrendChart({ data }) {
  if (!data || data.length === 0) return null;

  // Get category keys (everything except 'month')
  const catKeys = Object.keys(data[0] || {}).filter(k => k !== 'month');
  if (catKeys.length === 0) return null;

  return (
    <div className="glass-card p-4 sm:p-6">
      <h3 className="font-display text-sm sm:text-base text-stone-200 mb-3 sm:mb-4">Category Trend (4 Months)</h3>
      <div className="h-44 sm:h-56">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 5, right: 8, bottom: 5, left: 0 }} stackOffset="none">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#78716c' }} axisLine={false} tickLine={false} tickFormatter={v => formatCompact(v)} width={38} />
            <Tooltip formatter={(value) => [formatCurrency(value), '']} />
            {catKeys.map((cat, i) => (
              <Area
                key={cat}
                type="monotone"
                dataKey={cat}
                name={cat}
                stackId="1"
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
                fillOpacity={0.3}
                strokeWidth={1.5}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-2 sm:gap-3 mt-2 sm:mt-3">
        {catKeys.map((cat, i) => (
          <div key={cat} className="flex items-center gap-1 sm:gap-1.5">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="text-[9px] sm:text-[10px] text-stone-500">{cat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DayOfWeekChart({ data }) {
  return (
    <div className="glass-card p-4 sm:p-6">
      <h3 className="font-display text-sm sm:text-base text-stone-200 mb-3 sm:mb-4">Spending by Day of Week</h3>
      <div className="h-36 sm:h-44">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#78716c' }} axisLine={false} tickLine={false} tickFormatter={v => formatCompact(v)} width={36} />
            <Tooltip formatter={(value) => [formatCurrency(value), 'Spent']} />
            <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RecentTransactions({ expenses, userId }) {
  return (
    <div className="glass-card p-4 sm:p-6">
      <h3 className="font-display text-base sm:text-base text-stone-200 mb-3 sm:mb-4">Recent Expenses</h3>
      <div className="space-y-0.5 sm:space-y-1 max-h-[320px] sm:max-h-[360px] overflow-y-auto pr-1 -mr-1">
        {expenses.length === 0 ? (
          <p className="text-sm text-stone-500 py-4 text-center">No recent expenses</p>
        ) : (
          expenses.map(exp => {
            const userEntry = exp.users?.find(u => u.user_id === userId);
            const myShare = userEntry ? parseFloat(userEntry.owed_share) : 0;
            const iPaid = userEntry ? parseFloat(userEntry.paid_share) : 0;
            const payer = exp.users?.find(u => parseFloat(u.paid_share) > 0);
            const payerName = payer ? `${payer.user?.first_name || ''}` : '';

            return (
              <div key={exp.id} className="flex items-center gap-2.5 sm:gap-3 py-2.5 sm:py-2.5 px-2 sm:px-2 rounded-lg hover:bg-stone-800/30 active:bg-stone-800/40 transition-colors touch-manipulation">
                <div className="w-8 h-8 sm:w-8 sm:h-8 rounded-lg bg-stone-800/60 flex items-center justify-center flex-shrink-0 border border-stone-700/30">
                  <Receipt size={13} className="text-stone-500 sm:w-3 sm:h-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm sm:text-sm text-stone-300 truncate">{exp.description}</p>
                  <p className="text-xs sm:text-[10px] text-stone-600">
                    {format(parseISO(exp.date), 'MMM d')} · {payerName} paid {formatCurrency(parseFloat(exp.cost), exp.currency_code || 'INR')}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm sm:text-sm font-mono ${iPaid > 0 && iPaid > myShare ? 'text-emerald-400' : 'text-stone-400'}`}>
                    {formatCurrency(myShare, exp.currency_code || 'INR')}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function OverviewCards({ balances, expenses, userId }) {
  const categories = computeExpensesByCategory(expenses, userId);
  const monthly = computeMonthlySpending(expenses, userId, 6);
  const recent = computeRecentExpenses(expenses, 15);
  const dayOfWeek = computeDayOfWeekSpending(expenses, userId);
  const categoryTrend = computeCategoryTrend(expenses, userId, 4);
  const totalYourExpenses = categories.reduce((s, c) => s + c.amount, 0);

  return (
    <>
      {/* Monthly Spending & Category Charts - Top */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MonthlyChart data={monthly} />
        <CategoryChart data={categories} />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={TrendingUp} label="Others Owe You" type="positive"
          value={formatCurrency(balances.totalOwed, balances.primaryCurrency)}
          extraValues={balances.currencies?.slice(1).filter(c => c.owed > 0).map(c => `+ ${formatCurrency(c.owed, c.code)}`)}
        />
        <StatCard
          icon={TrendingDown} label="You Owe Others" type="negative"
          value={formatCurrency(balances.totalOwe, balances.primaryCurrency)}
          extraValues={balances.currencies?.slice(1).filter(c => c.owe > 0).map(c => `+ ${formatCurrency(c.owe, c.code)}`)}
        />
        <StatCard
          icon={Scale} label="Net Balance"
          type={balances.netBalance >= 0 ? 'positive' : 'negative'}
          value={formatCurrency(balances.netBalance, balances.primaryCurrency)}
          extraValues={balances.currencies?.slice(1).filter(c => Math.abs(c.net) > 0.5).map(c => formatCurrency(c.net, c.code))}
        />
        <StatCard icon={Receipt} label="Your Total Share" value={formatCurrency(totalYourExpenses)} subtext={`from ${expenses.length} expenses`} type="neutral" />
      </div>

      {/* Charts Row 2 — Category Trend + Day of Week */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CategoryTrendChart data={categoryTrend} />
        </div>
        <DayOfWeekChart data={dayOfWeek} />
      </div>

      {/* Recent Transactions */}
      <RecentTransactions expenses={recent} userId={userId} />
    </>
  );
}
