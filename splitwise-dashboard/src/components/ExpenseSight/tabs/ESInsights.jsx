/**
 * ESInsights - Analytics tab with charts, trends, and insights
 */

import { useState, useMemo } from 'react';
import { 
  BarChart3, TrendingUp, PieChart as PieIcon, Calendar,
  ArrowUpRight, Repeat, AlertCircle
} from 'lucide-react';
import { format, parseISO, subMonths, subDays, startOfMonth, endOfMonth, isWithinInterval, getDay, differenceInDays } from 'date-fns';
import { 
  PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { formatCurrency } from '../../../utils/analytics';
import { CHART_COLORS, TOOLTIP_STYLE, TOUCH_ACTIVE_DOT } from '../../../utils/chartConfig';
import MonthCompare from '../components/MonthCompare';
import SpendingForecast from '../components/SpendingForecast';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Monthly Trend Chart
function MonthlyTrendChart({ data }) {
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={TOOLTIP_STYLE.contentStyle}>
        <p className="text-xs text-stone-400 mb-1">{payload[0]?.payload?.month}</p>
        <p className="text-sm text-teal-400 font-medium">
          {formatCurrency(payload[0]?.value, 'INR')}
        </p>
      </div>
    );
  };

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-medium text-stone-300 mb-4 flex items-center gap-2">
        <TrendingUp size={16} className="text-teal-400" />
        6-Month Trend
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="esInsightsMonthlyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
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
              stroke="#14b8a6"
              fill="url(#esInsightsMonthlyGradient)"
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
        <PieIcon size={16} className="text-teal-400" />
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
        <Calendar size={16} className="text-teal-400" />
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
        <ArrowUpRight size={16} className="text-teal-400" />
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
        <p className="text-lg font-display text-teal-400">
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

// Detect and display recurring expenses (subscriptions)
function RecurringExpensesCard({ recurringExpenses }) {
  if (recurringExpenses.length === 0) return null;

  const totalMonthly = recurringExpenses.reduce((sum, item) => sum + item.avgAmount, 0);
  const totalAnnual = totalMonthly * 12;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-stone-300 flex items-center gap-2">
          <Repeat size={16} className="text-teal-400" />
          Recurring Expenses
        </h3>
        <span className="text-xs text-stone-500">
          ~{formatCurrency(totalMonthly, 'INR')}/mo
        </span>
      </div>
      
      <div className="space-y-3">
        {recurringExpenses.map((item, i) => (
          <div key={i} className="flex items-center gap-3 p-2 bg-stone-800/30 rounded-lg">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              item.frequency === 'monthly' ? 'bg-teal-500/20' :
              item.frequency === 'weekly' ? 'bg-emerald-500/20' :
              'bg-amber-500/20'
            }`}>
              <Repeat size={14} className={
                item.frequency === 'monthly' ? 'text-teal-400' :
                item.frequency === 'weekly' ? 'text-emerald-400' :
                'text-amber-400'
              } />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-stone-200 truncate">{item.description}</p>
              <div className="flex items-center gap-2 text-[10px] text-stone-500">
                <span className="capitalize">{item.frequency}</span>
                <span>•</span>
                <span>{item.occurrences}x in last {item.monthsAnalyzed} months</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-mono text-stone-200">
                {formatCurrency(item.avgAmount, 'INR')}
              </p>
              <p className="text-[10px] text-stone-500">avg</p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Annual projection */}
      <div className="mt-4 p-3 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 rounded-lg border border-teal-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="text-teal-400" />
            <span className="text-xs text-stone-400">Annual projection</span>
          </div>
          <span className="text-sm font-display text-teal-400">
            {formatCurrency(totalAnnual, 'INR')}/year
          </span>
        </div>
        <p className="text-[10px] text-stone-500 mt-1">
          Based on {recurringExpenses.length} detected subscriptions
        </p>
      </div>
    </div>
  );
}

// Time filter options for insights
const INSIGHTS_TIME_FILTERS = [
  { id: 'all', label: 'All Time' },
  { id: 'month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: '30d', label: 'Last 30 Days' },
  { id: '90d', label: 'Last 90 Days' },
  { id: '6m', label: 'Last 6 Months' },
];

export default function ESInsights({ expenses }) {
  const [timeFilter, setTimeFilter] = useState('all');

  // Apply time filter
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    return expenses.filter(exp => {
      if (exp.cancelled || exp.isRefund) return false;
      const expDate = parseISO(exp.date);
      switch (timeFilter) {
        case 'month':
          return isWithinInterval(expDate, { start: startOfMonth(now), end: endOfMonth(now) });
        case 'last_month': {
          const lm = subMonths(now, 1);
          return isWithinInterval(expDate, { start: startOfMonth(lm), end: endOfMonth(lm) });
        }
        case '30d':
          return expDate >= subDays(now, 30);
        case '90d':
          return expDate >= subDays(now, 90);
        case '6m':
          return expDate >= subMonths(now, 6);
        default:
          return true;
      }
    });
  }, [expenses, timeFilter]);

  // Calculate monthly trend (6 months) - always uses all expenses for trend
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
    for (const exp of filteredExpenses) {
      breakdown[exp.category] = (breakdown[exp.category] || 0) + exp.amount;
    }
    return Object.entries(breakdown)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredExpenses]);

  // Day of week analysis
  const dayOfWeekData = useMemo(() => {
    const days = DAYS_OF_WEEK.map(day => ({ day, amount: 0, count: 0 }));
    
    for (const exp of filteredExpenses) {
      const dayIndex = getDay(parseISO(exp.date));
      days[dayIndex].amount += exp.amount;
      days[dayIndex].count += 1;
    }
    
    return days;
  }, [filteredExpenses]);

  // Top expenses
  const topExpenses = useMemo(() => {
    return [...filteredExpenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [filteredExpenses]);

  // Detect recurring expenses (subscriptions)
  const recurringExpenses = useMemo(() => {
    const validExpenses = expenses.filter(e => !e.cancelled && !e.isRefund);
    if (validExpenses.length < 5) return [];
    
    // Group expenses by normalized description
    const descriptionGroups = {};
    for (const exp of validExpenses) {
      // Normalize description for grouping
      const normalizedDesc = exp.description.toLowerCase()
        .replace(/[0-9]+/g, '') // Remove numbers
        .replace(/\s+/g, ' ')   // Normalize whitespace
        .trim();
      
      if (!normalizedDesc || normalizedDesc.length < 3) continue;
      
      if (!descriptionGroups[normalizedDesc]) {
        descriptionGroups[normalizedDesc] = {
          description: exp.description, // Use original description
          category: exp.category,
          expenses: [],
        };
      }
      descriptionGroups[normalizedDesc].expenses.push(exp);
    }
    
    const recurring = [];
    const now = new Date();
    const sixMonthsAgo = subMonths(now, 6);
    
    for (const [key, group] of Object.entries(descriptionGroups)) {
      // Need at least 3 occurrences to be considered recurring
      if (group.expenses.length < 3) continue;
      
      // Filter to last 6 months
      const recentExpenses = group.expenses.filter(e => 
        parseISO(e.date) >= sixMonthsAgo
      );
      
      if (recentExpenses.length < 2) continue;
      
      // Sort by date
      recentExpenses.sort((a, b) => a.date.localeCompare(b.date));
      
      // Calculate intervals between expenses
      const intervals = [];
      for (let i = 1; i < recentExpenses.length; i++) {
        const days = differenceInDays(
          parseISO(recentExpenses[i].date),
          parseISO(recentExpenses[i - 1].date)
        );
        intervals.push(days);
      }
      
      if (intervals.length === 0) continue;
      
      // Calculate average interval
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      
      // Determine frequency based on average interval
      let frequency = null;
      if (avgInterval >= 25 && avgInterval <= 35) {
        frequency = 'monthly';
      } else if (avgInterval >= 6 && avgInterval <= 8) {
        frequency = 'weekly';
      } else if (avgInterval >= 13 && avgInterval <= 16) {
        frequency = 'bi-weekly';
      }
      
      if (!frequency) continue;
      
      // Calculate average amount
      const avgAmount = recentExpenses.reduce((sum, e) => sum + e.amount, 0) / recentExpenses.length;
      
      // Check consistency (standard deviation shouldn't be too high)
      const amountVariance = recentExpenses.reduce((sum, e) => 
        sum + Math.pow(e.amount - avgAmount, 2), 0
      ) / recentExpenses.length;
      const amountStdDev = Math.sqrt(amountVariance);
      const coefficientOfVariation = avgAmount > 0 ? (amountStdDev / avgAmount) : 1;
      
      // Only include if amounts are relatively consistent (CV < 0.3)
      if (coefficientOfVariation > 0.3) continue;
      
      recurring.push({
        description: group.description,
        category: group.category,
        frequency,
        occurrences: recentExpenses.length,
        avgAmount: Math.round(avgAmount),
        monthsAnalyzed: 6,
        lastDate: recentExpenses[recentExpenses.length - 1].date,
      });
    }
    
    // Sort by average amount (highest first)
    return recurring.sort((a, b) => b.avgAmount - a.avgAmount).slice(0, 8);
  }, [expenses]);

  // Summary stats
  const stats = useMemo(() => {
    const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const avgExpense = filteredExpenses.length > 0 ? total / filteredExpenses.length : 0;
    
    // Find highest spending day of week
    const highestDayIndex = dayOfWeekData.reduce((maxIdx, day, idx, arr) => 
      day.amount > arr[maxIdx].amount ? idx : maxIdx, 0);
    
    return {
      avgExpense,
      count: filteredExpenses.length,
      highestDay: DAYS_OF_WEEK[highestDayIndex],
      topCategory: categoryData[0]?.name || 'N/A',
    };
  }, [filteredExpenses, dayOfWeekData, categoryData]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-display text-stone-200">Insights</h2>
        <p className="text-xs text-stone-500">Understand your spending patterns</p>
      </div>

      {/* Time Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {INSIGHTS_TIME_FILTERS.map(filter => (
          <button
            key={filter.id}
            onClick={() => setTimeFilter(filter.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all touch-manipulation ${
              timeFilter === filter.id
                ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                : 'bg-stone-800/50 text-stone-400 border border-stone-700/50 hover:bg-stone-800 active:bg-stone-700'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Stats Summary */}
      <StatsSummary stats={stats} />

      {/* Monthly Trend */}
      {monthlyTrend.some(m => m.amount > 0) && (
        <MonthlyTrendChart data={monthlyTrend} />
      )}

      {/* Spending Forecast */}
      <SpendingForecast expenses={expenses} />

      {/* Month vs Month Comparison */}
      <MonthCompare expenses={expenses} />

      {/* Recurring Expenses */}
      <RecurringExpensesCard recurringExpenses={recurringExpenses} />

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
      {filteredExpenses.length === 0 && (
        <div className="text-center py-12 glass-card">
          <BarChart3 size={40} className="mx-auto text-stone-600 mb-4" />
          <p className="text-sm text-stone-500">{expenses.length === 0 ? 'No data yet' : 'No data for this period'}</p>
          <p className="text-xs text-stone-600 mt-1">{expenses.length === 0 ? 'Add expenses to see insights' : 'Try a different time range'}</p>
        </div>
      )}
    </div>
  );
}
