import { TrendingUp, TrendingDown, Scale, ArrowUpRight, ArrowDownRight, Receipt } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from 'recharts';
import { formatCurrency, formatCompact, computeExpensesByCategory, computeMonthlySpending, computeRecentExpenses, computeDayOfWeekSpending } from '../utils/analytics';
import { format, parseISO } from 'date-fns';

const CHART_COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4', '#84cc16', '#e11d48'];

function StatCard({ icon: Icon, label, value, subtext, type = 'neutral' }) {
  const glowClass = type === 'positive' ? 'stat-glow-green' : type === 'negative' ? 'stat-glow-red' : 'stat-glow-amber';
  const textColor = type === 'positive' ? 'text-emerald-400' : type === 'negative' ? 'text-red-400' : 'text-amber-400';
  const iconBg = type === 'positive' ? 'bg-emerald-500/10' : type === 'negative' ? 'bg-red-500/10' : 'bg-amber-500/10';

  return (
    <div className={`glass-card p-5 ${glowClass}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon size={16} className={textColor} />
        </div>
      </div>
      <p className={`font-display text-2xl ${textColor}`}>{value}</p>
      <p className="text-xs text-stone-500 mt-1 font-medium">{label}</p>
      {subtext && <p className="text-[10px] text-stone-600 mt-0.5">{subtext}</p>}
    </div>
  );
}

function CategoryChart({ data }) {
  const top6 = data.slice(0, 6);
  const total = top6.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="glass-card p-6">
      <h3 className="font-display text-base text-stone-200 mb-4">Spending by Category</h3>
      {data.length === 0 ? (
        <p className="text-sm text-stone-500 py-8 text-center">No categorized expenses yet</p>
      ) : (
        <div className="flex gap-6 items-center">
          <div className="w-40 h-40 flex-shrink-0">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={top6}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="amount"
                  strokeWidth={2}
                  stroke="rgba(12,10,9,0.8)"
                >
                  {top6.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2.5 overflow-hidden">
            {top6.map((cat, i) => (
              <div key={cat.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i] }} />
                <span className="text-xs text-stone-400 truncate flex-1">{cat.name}</span>
                <span className="text-xs font-mono text-stone-300">{formatCompact(cat.amount)}</span>
                <span className="text-[10px] text-stone-600 w-8 text-right">
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
    <div className="glass-card p-6">
      <h3 className="font-display text-base text-stone-200 mb-4">Monthly Spending Trend</h3>
      <div className="h-56">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="colorShare" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" vertical={false} />
            <XAxis dataKey="shortMonth" tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} tickFormatter={v => formatCompact(v)} />
            <Tooltip
              formatter={(value) => [formatCurrency(value), '']}
              contentStyle={{ background: 'rgba(28,25,23,0.95)', border: '1px solid rgba(120,113,108,0.3)', borderRadius: 12, fontSize: 12 }}
            />
            <Area type="monotone" dataKey="share" name="Your Share" stroke="#10b981" fill="url(#colorShare)" strokeWidth={2} />
            <Area type="monotone" dataKey="paid" name="You Paid" stroke="#f59e0b" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DayOfWeekChart({ data }) {
  return (
    <div className="glass-card p-6">
      <h3 className="font-display text-base text-stone-200 mb-4">Spending by Day of Week</h3>
      <div className="h-44">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} tickFormatter={v => formatCompact(v)} />
            <Tooltip formatter={(value) => [formatCurrency(value), 'Spent']} />
            <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RecentTransactions({ expenses, userId }) {
  return (
    <div className="glass-card p-6">
      <h3 className="font-display text-base text-stone-200 mb-4">Recent Expenses</h3>
      <div className="space-y-1">
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
              <div key={exp.id} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-stone-800/30 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-stone-800/60 flex items-center justify-center flex-shrink-0 border border-stone-700/30">
                  <Receipt size={12} className="text-stone-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-300 truncate">{exp.description}</p>
                  <p className="text-[10px] text-stone-600">
                    {format(parseISO(exp.date), 'MMM d')} · {payerName} paid {formatCurrency(parseFloat(exp.cost))}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-mono ${iPaid > 0 && iPaid > myShare ? 'text-emerald-400' : 'text-stone-400'}`}>
                    {formatCurrency(myShare)}
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
  const recent = computeRecentExpenses(expenses, 10);
  const dayOfWeek = computeDayOfWeekSpending(expenses, userId);
  const totalYourExpenses = categories.reduce((s, c) => s + c.amount, 0);

  return (
    <>
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Others Owe You"
          value={formatCurrency(balances.totalOwed)}
          type="positive"
        />
        <StatCard
          icon={TrendingDown}
          label="You Owe Others"
          value={formatCurrency(balances.totalOwe)}
          type="negative"
        />
        <StatCard
          icon={Scale}
          label="Net Balance"
          value={formatCurrency(balances.netBalance)}
          type={balances.netBalance >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          icon={Receipt}
          label="Your Total Share"
          value={formatCurrency(totalYourExpenses)}
          subtext={`from ${expenses.length} expenses`}
          type="neutral"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MonthlyChart data={monthly} />
        <CategoryChart data={categories} />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RecentTransactions expenses={recent} userId={userId} />
        </div>
        <DayOfWeekChart data={dayOfWeek} />
      </div>
    </>
  );
}
