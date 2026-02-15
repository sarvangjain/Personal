/**
 * ESHome - Home tab with overview cards, recent expenses, and smart insights
 */

import { useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Calendar,
  RefreshCw, Plus, Sparkles, DollarSign, Wallet, PiggyBank,
  Zap, ArrowUpRight
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, subDays, isWithinInterval, isToday } from 'date-fns';
import { formatCurrency } from '../../../utils/analytics';
import { getCategoryIcon, getCategoryColors } from '../../../utils/categoryConfig';
import UpcomingBills from '../components/UpcomingBills';

// Stat Card Component
function StatCard({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'teal' }) {
  const colorClasses = {
    teal: 'from-teal-500/20 to-cyan-500/20 text-teal-400',
    emerald: 'from-emerald-500/20 to-teal-500/20 text-emerald-400',
    amber: 'from-amber-500/20 to-orange-500/20 text-amber-400',
    rose: 'from-rose-500/20 to-pink-500/20 text-rose-400',
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-xl bg-gradient-to-br ${colorClasses[color]}`}>
          <Icon size={18} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs ${
            trend === 'up' ? 'text-rose-400' : 'text-emerald-400'
          }`}>
            {trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trendValue}
          </div>
        )}
      </div>
      <p className="text-xl font-display text-stone-200">{value}</p>
      <p className="text-xs text-stone-500 mt-1">{title}</p>
      {subtitle && <p className="text-[10px] text-stone-600 mt-0.5">{subtitle}</p>}
    </div>
  );
}

// Recent Expense Item
function RecentExpenseItem({ expense }) {
  const CatIcon = getCategoryIcon(expense.category);
  const colors = getCategoryColors(expense.category);
  
  return (
    <div className="flex items-center gap-3 py-3 border-b border-stone-800/50 last:border-0">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}>
        <CatIcon size={18} className={colors.text} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-200 truncate">{expense.description}</p>
        <p className="text-xs text-stone-500">
          {expense.category} • {format(parseISO(expense.date), 'MMM d')}
        </p>
      </div>
      <p className={`text-sm font-mono font-medium ${
        expense.isRefund ? 'text-emerald-400' : 'text-stone-200'
      }`}>
        {expense.isRefund ? '+' : ''}{formatCurrency(expense.amount, 'INR')}
      </p>
    </div>
  );
}

// Smart Insight Card
function InsightCard({ insight }) {
  return (
    <div className="p-3 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-500/20 rounded-xl">
      <div className="flex items-start gap-2">
        <Sparkles size={14} className="text-teal-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-stone-300">{insight}</p>
      </div>
    </div>
  );
}

// Mini Sparkline - tiny 7-day trend chart
function MiniSparkline({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const width = 120;
  const height = 32;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * (height - 4) - 2;
    return `${x},${y}`;
  });
  const polyline = points.join(' ');
  const fillPoints = `0,${height} ${polyline} ${width},${height}`;
  const isUp = data.length >= 2 && data[data.length - 1] > data[data.length - 2];

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isUp ? '#f59e0b' : '#10b981'} stopOpacity="0.3" />
          <stop offset="100%" stopColor={isUp ? '#f59e0b' : '#10b981'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill="url(#sparkFill)" />
      <polyline points={polyline} fill="none" stroke={isUp ? '#f59e0b' : '#10b981'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dot on the last point */}
      {data.length > 0 && (
        <circle cx={width} cy={height - (data[data.length - 1] / max) * (height - 4) - 2} r="2.5" fill={isUp ? '#f59e0b' : '#10b981'} />
      )}
    </svg>
  );
}

// Biggest Expense Today callout
function BiggestExpenseTodayCard({ expense }) {
  if (!expense) return null;
  const Icon = getCategoryIcon(expense.category);
  const colors = getCategoryColors(expense.category);
  return (
    <div className="glass-card p-3 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center flex-shrink-0`}>
        <Icon size={18} className={colors.text} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-amber-400 uppercase tracking-wider flex items-center gap-1">
          <ArrowUpRight size={10} />
          Biggest spend today
        </p>
        <p className="text-sm text-stone-200 truncate">{expense.description}</p>
      </div>
      <p className="text-sm font-mono font-medium text-amber-400">
        {formatCurrency(expense.amount, 'INR')}
      </p>
    </div>
  );
}

export default function ESHome({ expenses, userId, onRefresh, onAddExpense, onNavigateToBills }) {
  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = { start: startOfMonth(now), end: endOfMonth(now) };
    const lastMonth = { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
    
    let totalSpent = 0;
    let thisMonthSpent = 0;
    let lastMonthSpent = 0;
    let refunds = 0;
    let expenseCount = 0;
    
    for (const exp of expenses) {
      if (exp.isPending || exp.cancelled) continue;
      
      const expDate = parseISO(exp.date);
      
      if (exp.isRefund) {
        refunds += exp.amount;
      } else {
        totalSpent += exp.amount;
        expenseCount++;
        
        if (isWithinInterval(expDate, thisMonth)) {
          thisMonthSpent += exp.amount;
        }
        if (isWithinInterval(expDate, lastMonth)) {
          lastMonthSpent += exp.amount;
        }
      }
    }
    
    const daysInMonth = now.getDate();
    const dailyAvg = daysInMonth > 0 ? thisMonthSpent / daysInMonth : 0;
    
    // Calculate month-over-month change
    const monthChange = lastMonthSpent > 0 
      ? ((thisMonthSpent - lastMonthSpent) / lastMonthSpent * 100).toFixed(0)
      : 0;
    
    return {
      totalSpent,
      thisMonthSpent,
      dailyAvg,
      refunds,
      expenseCount,
      monthChange: Number(monthChange),
    };
  }, [expenses]);

  // Get recent expenses (last 5)
  const recentExpenses = useMemo(() => {
    return [...expenses]
      .filter(e => !e.cancelled)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [expenses]);

  // Generate smart insights
  const insights = useMemo(() => {
    const insightsList = [];
    
    if (stats.monthChange > 20) {
      insightsList.push(`Your spending is up ${stats.monthChange}% compared to last month. Consider reviewing your expenses.`);
    } else if (stats.monthChange < -10) {
      insightsList.push(`Great job! You've reduced spending by ${Math.abs(stats.monthChange)}% this month.`);
    }
    
    if (stats.dailyAvg > 0) {
      insightsList.push(`You're averaging ${formatCurrency(stats.dailyAvg, 'INR')} per day this month.`);
    }
    
    if (stats.refunds > 0) {
      insightsList.push(`You've received ${formatCurrency(stats.refunds, 'INR')} in refunds/cashback.`);
    }
    
    if (expenses.length === 0) {
      insightsList.push('Start tracking your expenses to get personalized insights!');
    }
    
    return insightsList.slice(0, 2);
  }, [stats, expenses]);

  // 7-day sparkline data
  const sparklineData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const dateStr = format(day, 'yyyy-MM-dd');
      let total = 0;
      for (const exp of expenses) {
        if (exp.cancelled || exp.isRefund) continue;
        if (exp.date === dateStr) total += exp.amount;
      }
      data.push(total);
    }
    return data;
  }, [expenses]);

  // Biggest expense today
  const biggestToday = useMemo(() => {
    let biggest = null;
    for (const exp of expenses) {
      if (exp.cancelled || exp.isRefund) continue;
      if (!isToday(parseISO(exp.date))) continue;
      if (!biggest || exp.amount > biggest.amount) biggest = exp;
    }
    return biggest;
  }, [expenses]);

  // Today's total for velocity context
  const todayTotal = useMemo(() => {
    let total = 0;
    for (const exp of expenses) {
      if (exp.cancelled || exp.isRefund) continue;
      if (isToday(parseISO(exp.date))) total += exp.amount;
    }
    return total;
  }, [expenses]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display text-stone-200">Overview</h2>
          <p className="text-xs text-stone-500">{format(new Date(), 'MMMM yyyy')}</p>
        </div>
        <button
          onClick={onRefresh}
          className="p-2 rounded-xl bg-stone-800/50 text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="This Month"
          value={formatCurrency(stats.thisMonthSpent, 'INR')}
          icon={Calendar}
          color="teal"
          trend={stats.monthChange > 0 ? 'up' : stats.monthChange < 0 ? 'down' : undefined}
          trendValue={stats.monthChange !== 0 ? `${Math.abs(stats.monthChange)}%` : undefined}
        />
        <StatCard
          title="Daily Average"
          value={formatCurrency(stats.dailyAvg, 'INR')}
          subtitle="This month"
          icon={TrendingUp}
          color="amber"
        />
        <StatCard
          title="Total Spent"
          value={formatCurrency(stats.totalSpent, 'INR')}
          subtitle={`${stats.expenseCount} expenses`}
          icon={Wallet}
          color="emerald"
        />
        <StatCard
          title="Refunds"
          value={formatCurrency(stats.refunds, 'INR')}
          subtitle="Cashback & returns"
          icon={PiggyBank}
          color="rose"
        />
      </div>

      {/* 7-Day Sparkline + Today's Spend */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-500">Last 7 Days</p>
            <p className="text-lg font-display text-stone-200 mt-1">
              {formatCurrency(sparklineData.reduce((a, b) => a + b, 0), 'INR')}
            </p>
            {todayTotal > 0 && (
              <p className="text-[10px] text-stone-500 mt-0.5 flex items-center gap-1">
                <Zap size={10} className="text-amber-400" />
                {formatCurrency(todayTotal, 'INR')} spent today
              </p>
            )}
          </div>
          <MiniSparkline data={sparklineData} />
        </div>
      </div>

      {/* Biggest expense today */}
      <BiggestExpenseTodayCard expense={biggestToday} />

      {/* Smart Insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-stone-400 flex items-center gap-2">
            <Sparkles size={14} className="text-teal-400" />
            Smart Insights
          </h3>
          {insights.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}
        </div>
      )}

      {/* Quick Add Button */}
      <button
        onClick={onAddExpense}
        className="w-full py-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-500/20"
      >
        <Plus size={18} />
        Add Expense
      </button>

      {/* Upcoming Bills */}
      <UpcomingBills 
        userId={userId} 
        onViewAll={onNavigateToBills}
        limit={3}
      />

      {/* Recent Expenses */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-stone-300">Recent Expenses</h3>
          <span className="text-xs text-stone-500">{recentExpenses.length} of {expenses.length}</span>
        </div>
        
        {recentExpenses.length > 0 ? (
          <div>
            {recentExpenses.map(expense => (
              <RecentExpenseItem key={expense.id} expense={expense} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-stone-500">No expenses yet</p>
            <p className="text-xs text-stone-600 mt-1">Add your first expense to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
