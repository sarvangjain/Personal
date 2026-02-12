/**
 * ESInsights - Analytics tab with charts, trends, and insights
 */

import { useMemo } from 'react';
import { 
  BarChart3, TrendingUp, PieChart as PieIcon, Calendar,
  ArrowUpRight
} from 'lucide-react';
import { format, parseISO, subMonths, startOfMonth, endOfMonth, isWithinInterval, getDay } from 'date-fns';
import { 
  PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { formatCurrency } from '../../../utils/analytics';
import { CHART_COLORS, TOOLTIP_STYLE, TOUCH_ACTIVE_DOT } from '../../../utils/chartConfig';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Monthly Trend Chart
function MonthlyTrendChart({ data }) {
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={TOOLTIP_STYLE.contentStyle}>
        <p className="text-xs text-stone-400 mb-1">{payload[0]?.payload?.month}</p>
        <p className="text-sm text-violet-400 font-medium">
          {formatCurrency(payload[0]?.value, 'INR')}
        </p>
      </div>
    );
  };

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-medium text-stone-300 mb-4 flex items-center gap-2">
        <TrendingUp size={16} className="text-violet-400" />
        6-Month Trend
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="monthlyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="monthShort" 
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
              fill="url(#monthlyGradient)"
              strokeWidth={2}
              activeDot={TOUCH_ACTIVE_DOT}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Category Breakdown Pie Chart
function CategoryBreakdownChart({ data }) {
  const RADIAN = Math.PI / 180;
  
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-medium text-stone-300 mb-4 flex items-center gap-2">
        <PieIcon size={16} className="text-violet-400" />
        Category Breakdown
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={70}
              innerRadius={35}
              dataKey="value"
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => formatCurrency(value, 'INR')}
              contentStyle={TOOLTIP_STYLE.contentStyle}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-2 justify-center mt-2">
        {data.slice(0, 6).map((item, i) => (
          <div key={item.name} className="flex items-center gap-1.5">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="text-[10px] text-stone-400">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Day of Week Chart
function DayOfWeekChart({ data }) {
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={TOOLTIP_STYLE.contentStyle}>
        <p className="text-xs text-stone-400 mb-1">{payload[0]?.payload?.day}</p>
        <p className="text-sm text-emerald-400 font-medium">
          {formatCurrency(payload[0]?.value, 'INR')}
        </p>
        <p className="text-[10px] text-stone-500">
          {payload[0]?.payload?.count} expenses
        </p>
      </div>
    );
  };

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-medium text-stone-300 mb-4 flex items-center gap-2">
        <Calendar size={16} className="text-violet-400" />
        Spending by Day
      </h3>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis 
              dataKey="day" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#78716c', fontSize: 10 }}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={index === 0 || index === 6 ? '#f59e0b' : '#10b981'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-stone-600 text-center mt-2">
        Orange = weekends • Green = weekdays
      </p>
    </div>
  );
}

// Top Expenses List
function TopExpensesList({ expenses }) {
  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-medium text-stone-300 mb-4 flex items-center gap-2">
        <ArrowUpRight size={16} className="text-violet-400" />
        Top Expenses
      </h3>
      <div className="space-y-3">
        {expenses.map((exp, i) => (
          <div key={exp.id} className="flex items-center gap-3">
            <span className="w-5 h-5 rounded-full bg-stone-800 text-stone-500 text-xs flex items-center justify-center">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-stone-200 truncate">{exp.description}</p>
              <p className="text-[10px] text-stone-500">
                {exp.category} • {format(parseISO(exp.date), 'MMM d')}
              </p>
            </div>
            <p className="text-sm font-mono text-stone-200">
              {formatCurrency(exp.amount, 'INR')}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Stats Summary Cards
function StatsSummary({ stats }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="glass-card p-3">
        <p className="text-xs text-stone-500">Avg per Expense</p>
        <p className="text-lg font-display text-stone-200">
          {formatCurrency(stats.avgExpense, 'INR')}
        </p>
      </div>
      <div className="glass-card p-3">
        <p className="text-xs text-stone-500">Total Expenses</p>
        <p className="text-lg font-display text-violet-400">
          {stats.count}
        </p>
      </div>
      <div className="glass-card p-3">
        <p className="text-xs text-stone-500">Highest Day</p>
        <p className="text-lg font-display text-amber-400">
          {stats.highestDay}
        </p>
      </div>
      <div className="glass-card p-3">
        <p className="text-xs text-stone-500">Top Category</p>
        <p className="text-lg font-display text-emerald-400 truncate">
          {stats.topCategory}
        </p>
      </div>
    </div>
  );
}

export default function ESInsights({ expenses }) {
  // Calculate monthly trend (6 months)
  const monthlyTrend = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(new Date(), i);
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      
      const monthExpenses = expenses.filter(e => {
        if (e.cancelled || e.isRefund) return false;
        const expDate = parseISO(e.date);
        return isWithinInterval(expDate, { start, end });
      });
      
      const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      months.push({
        month: format(month, 'MMMM yyyy'),
        monthShort: format(month, 'MMM'),
        amount: total,
      });
    }
    return months;
  }, [expenses]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const breakdown = {};
    for (const exp of expenses) {
      if (exp.cancelled || exp.isRefund) continue;
      breakdown[exp.category] = (breakdown[exp.category] || 0) + exp.amount;
    }
    return Object.entries(breakdown)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [expenses]);

  // Day of week analysis
  const dayOfWeekData = useMemo(() => {
    const days = DAYS_OF_WEEK.map(day => ({ day, amount: 0, count: 0 }));
    
    for (const exp of expenses) {
      if (exp.cancelled || exp.isRefund) continue;
      const dayIndex = getDay(parseISO(exp.date));
      days[dayIndex].amount += exp.amount;
      days[dayIndex].count += 1;
    }
    
    return days;
  }, [expenses]);

  // Top expenses
  const topExpenses = useMemo(() => {
    return [...expenses]
      .filter(e => !e.cancelled && !e.isRefund)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [expenses]);

  // Summary stats
  const stats = useMemo(() => {
    const validExpenses = expenses.filter(e => !e.cancelled && !e.isRefund);
    const total = validExpenses.reduce((sum, e) => sum + e.amount, 0);
    const avgExpense = validExpenses.length > 0 ? total / validExpenses.length : 0;
    
    // Find highest spending day of week
    const highestDayIndex = dayOfWeekData.reduce((maxIdx, day, idx, arr) => 
      day.amount > arr[maxIdx].amount ? idx : maxIdx, 0);
    
    return {
      avgExpense,
      count: validExpenses.length,
      highestDay: DAYS_OF_WEEK[highestDayIndex],
      topCategory: categoryData[0]?.name || 'N/A',
    };
  }, [expenses, dayOfWeekData, categoryData]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-display text-stone-200">Insights</h2>
        <p className="text-xs text-stone-500">Understand your spending patterns</p>
      </div>

      {/* Stats Summary */}
      <StatsSummary stats={stats} />

      {/* Monthly Trend */}
      {monthlyTrend.some(m => m.amount > 0) && (
        <MonthlyTrendChart data={monthlyTrend} />
      )}

      {/* Category Breakdown */}
      {categoryData.length > 0 && (
        <CategoryBreakdownChart data={categoryData} />
      )}

      {/* Day of Week */}
      <DayOfWeekChart data={dayOfWeekData} />

      {/* Top Expenses */}
      {topExpenses.length > 0 && (
        <TopExpensesList expenses={topExpenses} />
      )}

      {/* Empty State */}
      {expenses.length === 0 && (
        <div className="text-center py-12 glass-card">
          <BarChart3 size={40} className="mx-auto text-stone-600 mb-4" />
          <p className="text-sm text-stone-500">No data yet</p>
          <p className="text-xs text-stone-600 mt-1">Add expenses to see insights</p>
        </div>
      )}
    </div>
  );
}
