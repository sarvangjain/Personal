/**
 * ExpenseSightAnalytics - Charts and insights for personal expenses
 */

import { useMemo } from 'react';
import { format, parseISO, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart, Bar
} from 'recharts';
import { TrendingUp, Tag, Calendar, Zap } from 'lucide-react';
import { formatCurrency } from '../../utils/analytics';
import { CHART_COLORS, TOOLTIP_STYLE, TOUCH_ACTIVE_DOT } from '../../utils/chartConfig';

// ─── Category Breakdown Chart ────────────────────────────────────────────────
function CategoryBreakdown({ expenses }) {
  const data = useMemo(() => {
    const categories = {};
    for (const exp of expenses) {
      if (exp.isRefund) continue;
      const cat = exp.category || 'Other';
      categories[cat] = (categories[cat] || 0) + exp.amount;
    }
    return Object.entries(categories)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [expenses]);

  const total = data.reduce((s, d) => s + d.amount, 0);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
    return (
      <div style={TOOLTIP_STYLE.contentStyle}>
        <p className="text-xs font-medium text-stone-200">{d.name}</p>
        <p className="text-xs text-emerald-400">{formatCurrency(d.value, 'INR')}</p>
        <p className="text-[10px] text-stone-500">{pct}% of total</p>
      </div>
    );
  };

  if (data.length === 0) {
    return (
      <div className="glass-card p-4 text-center">
        <Tag size={24} className="mx-auto text-stone-600 mb-2" />
        <p className="text-sm text-stone-500">No category data yet</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-medium text-stone-300 flex items-center gap-2 mb-4">
        <Tag size={14} className="text-teal-400" />
        By Category
      </h3>
      
      <div className="flex gap-4 items-center">
        <div className="w-28 h-28 flex-shrink-0">
          <ResponsiveContainer>
            <PieChart>
              <Pie 
                data={data} 
                cx="50%" 
                cy="50%" 
                innerRadius={28} 
                outerRadius={48} 
                dataKey="amount"
                strokeWidth={2}
                stroke="rgba(12,10,9,0.8)"
              >
                {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex-1 space-y-1.5">
          {data.map((cat, i) => (
            <div key={cat.name} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i] }} />
              <span className="text-[11px] text-stone-400 truncate flex-1">{cat.name}</span>
              <span className="text-[11px] font-mono text-stone-300">
                {formatCurrency(cat.amount, 'INR')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Monthly Trend Chart ─────────────────────────────────────────────────────
function MonthlyTrend({ expenses }) {
  const data = useMemo(() => {
    const months = {};
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const key = format(date, 'yyyy-MM');
      months[key] = { month: key, label: format(date, 'MMM'), amount: 0 };
    }
    
    // Aggregate expenses
    for (const exp of expenses) {
      if (exp.isRefund) continue;
      const month = exp.date.substring(0, 7);
      if (months[month]) {
        months[month].amount += exp.amount;
      }
    }
    
    return Object.values(months);
  }, [expenses]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={TOOLTIP_STYLE.contentStyle}>
        <p className="text-xs font-medium text-stone-300">{label}</p>
        <p className="text-xs text-teal-400">{formatCurrency(payload[0].value, 'INR')}</p>
      </div>
    );
  };

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-medium text-stone-300 flex items-center gap-2 mb-4">
        <TrendingUp size={14} className="text-emerald-400" />
        Monthly Trend
      </h3>
      
      <div className="h-36 -mx-2">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="esGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="label" 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: '#78716c', fontSize: 10 }}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#esGradient)"
              activeDot={{ ...TOUCH_ACTIVE_DOT, fill: '#8b5cf6' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Daily Spending Chart ────────────────────────────────────────────────────
function DailySpending({ expenses }) {
  const data = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = now;
    const days = eachDayOfInterval({ start, end });
    
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayTotal = expenses
        .filter(e => e.date === dateStr && !e.isRefund)
        .reduce((sum, e) => sum + e.amount, 0);
      
      return {
        day: format(day, 'd'),
        date: format(day, 'MMM d'),
        amount: dayTotal,
      };
    });
  }, [expenses]);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div style={TOOLTIP_STYLE.contentStyle}>
        <p className="text-xs font-medium text-stone-300">{d.date}</p>
        <p className="text-xs text-emerald-400">{formatCurrency(d.amount, 'INR')}</p>
      </div>
    );
  };

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-medium text-stone-300 flex items-center gap-2 mb-4">
        <Calendar size={14} className="text-amber-400" />
        This Month (Daily)
      </h3>
      
      <div className="h-32 -mx-2">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: '#78716c', fontSize: 9 }}
              interval="preserveStartEnd"
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar 
              dataKey="amount" 
              fill="#8b5cf6"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Stats Cards ─────────────────────────────────────────────────────────────
function StatsCards({ expenses }) {
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = format(now, 'yyyy-MM');
    const lastMonth = format(subMonths(now, 1), 'yyyy-MM');
    
    let thisMonthTotal = 0;
    let lastMonthTotal = 0;
    let totalExpenses = 0;
    let totalRefunds = 0;
    
    for (const exp of expenses) {
      if (exp.isRefund) {
        totalRefunds += exp.amount;
        continue;
      }
      
      totalExpenses += exp.amount;
      const month = exp.date.substring(0, 7);
      if (month === thisMonth) thisMonthTotal += exp.amount;
      if (month === lastMonth) lastMonthTotal += exp.amount;
    }
    
    const monthChange = lastMonthTotal > 0 
      ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 
      : 0;
    
    const avgDaily = thisMonthTotal / now.getDate();
    
    return {
      thisMonth: thisMonthTotal,
      lastMonth: lastMonthTotal,
      monthChange,
      totalExpenses,
      totalRefunds,
      avgDaily,
    };
  }, [expenses]);

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="glass-card p-3">
        <p className="text-[10px] text-stone-500 uppercase tracking-wider mb-1">This Month</p>
        <p className="text-lg font-display text-stone-200">
          {formatCurrency(stats.thisMonth, 'INR')}
        </p>
        {stats.monthChange !== 0 && (
          <p className={`text-[10px] ${stats.monthChange > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {stats.monthChange > 0 ? '↑' : '↓'} {Math.abs(stats.monthChange).toFixed(0)}% vs last month
          </p>
        )}
      </div>
      
      <div className="glass-card p-3">
        <p className="text-[10px] text-stone-500 uppercase tracking-wider mb-1">Daily Average</p>
        <p className="text-lg font-display text-teal-400">
          {formatCurrency(stats.avgDaily, 'INR')}
        </p>
        <p className="text-[10px] text-stone-500">this month</p>
      </div>
      
      <div className="glass-card p-3">
        <p className="text-[10px] text-stone-500 uppercase tracking-wider mb-1">Total Spent</p>
        <p className="text-lg font-display text-stone-200">
          {formatCurrency(stats.totalExpenses, 'INR')}
        </p>
        <p className="text-[10px] text-stone-500">all time</p>
      </div>
      
      <div className="glass-card p-3">
        <p className="text-[10px] text-stone-500 uppercase tracking-wider mb-1">Refunds</p>
        <p className="text-lg font-display text-emerald-400">
          {formatCurrency(stats.totalRefunds, 'INR')}
        </p>
        <p className="text-[10px] text-stone-500">all time</p>
      </div>
    </div>
  );
}

// ─── Top Expenses ────────────────────────────────────────────────────────────
function TopExpenses({ expenses }) {
  const top = useMemo(() => {
    return expenses
      .filter(e => !e.isRefund)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [expenses]);

  if (top.length === 0) return null;

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-medium text-stone-300 flex items-center gap-2 mb-3">
        <Zap size={14} className="text-amber-400" />
        Top Expenses
      </h3>
      
      <div className="space-y-2">
        {top.map((exp, i) => (
          <div key={exp.id} className="flex items-center gap-3">
            <span className="w-5 h-5 rounded bg-stone-800 text-[10px] text-stone-500 flex items-center justify-center">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-stone-200 truncate">{exp.description}</p>
              <p className="text-[10px] text-stone-500">
                {format(parseISO(exp.date), 'MMM d')} • {exp.category}
              </p>
            </div>
            <p className="text-sm font-mono text-stone-300">
              {formatCurrency(exp.amount, 'INR')}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ExpenseSightAnalytics({ expenses }) {
  if (expenses.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <TrendingUp size={32} className="mx-auto text-stone-600 mb-3" />
        <p className="text-sm text-stone-400">No expenses to analyze yet</p>
        <p className="text-xs text-stone-600 mt-1">Add some expenses to see analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StatsCards expenses={expenses} />
      <MonthlyTrend expenses={expenses} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CategoryBreakdown expenses={expenses} />
        <DailySpending expenses={expenses} />
      </div>
      <TopExpenses expenses={expenses} />
    </div>
  );
}
