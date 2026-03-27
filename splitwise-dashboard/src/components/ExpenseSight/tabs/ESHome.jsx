/**
 * ESHome - Minimal "Month at a Glance" overview
 * Clean, focused design showing key monthly metrics
 */

import { useState, useMemo, useEffect } from 'react';
import { 
  RefreshCw, Plus, ChevronDown, ChevronUp,
  Calendar, TrendingUp, TrendingDown, Clock, Wallet
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, isWithinInterval, isToday, getDaysInMonth } from 'date-fns';
import { formatCurrency } from '../../../utils/analytics';
import { getCategoryIcon, getCategoryColors } from '../../../utils/categoryConfig';
import { getBudget } from '../../../firebase/budgetService';

// Circular Progress Ring
function ProgressRing({ percent, size = 120, strokeWidth = 8, color = 'teal' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;
  
  const colorMap = {
    teal: { stroke: '#14b8a6', gradient: ['#14b8a6', '#06b6d4'] },
    amber: { stroke: '#f59e0b', gradient: ['#f59e0b', '#f97316'] },
    red: { stroke: '#ef4444', gradient: ['#ef4444', '#f43f5e'] },
  };
  
  const colors = colorMap[color] || colorMap.teal;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <defs>
        <linearGradient id={`progress-gradient-${color}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={colors.gradient[0]} />
          <stop offset="100%" stopColor={colors.gradient[1]} />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(68, 64, 60, 0.3)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={`url(#progress-gradient-${color})`}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

// Hero Card with Monthly Total
function HeroCard({ totalSpent, budget, percentUsed }) {
  const isOverBudget = budget > 0 && totalSpent > budget;
  const remaining = budget > 0 ? budget - totalSpent : 0;
  const progressColor = isOverBudget ? 'red' : percentUsed > 80 ? 'amber' : 'teal';

  return (
    <div className="glass-card p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
      
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-stone-500 mb-1">{format(new Date(), 'MMMM')}</p>
          <p className="text-3xl font-display text-stone-100">
            {formatCurrency(totalSpent, 'INR')}
          </p>
          
          {budget > 0 ? (
            <div className="mt-3 space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-stone-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOverBudget ? 'bg-gradient-to-r from-red-500 to-rose-500' :
                      percentUsed > 80 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                      'bg-gradient-to-r from-teal-500 to-cyan-500'
                    }`}
                    style={{ width: `${Math.min(percentUsed, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-stone-500 w-10 text-right">{percentUsed.toFixed(0)}%</span>
              </div>
              <p className={`text-xs ${remaining >= 0 ? 'text-stone-500' : 'text-red-400'}`}>
                {remaining >= 0 
                  ? `${formatCurrency(remaining, 'INR')} remaining of ${formatCurrency(budget, 'INR')}`
                  : `${formatCurrency(Math.abs(remaining), 'INR')} over budget`
                }
              </p>
            </div>
          ) : (
            <p className="text-xs text-stone-600 mt-2">No budget set</p>
          )}
        </div>
        
        {budget > 0 && (
          <div className="relative flex items-center justify-center">
            <ProgressRing percent={Math.min(percentUsed, 100)} size={80} strokeWidth={6} color={progressColor} />
            <div className="absolute inset-0 flex items-center justify-center">
              <Wallet size={20} className={`${
                isOverBudget ? 'text-red-400' : 
                percentUsed > 80 ? 'text-amber-400' : 'text-teal-400'
              }`} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Mini Stat Card
function MiniStat({ label, value, icon: Icon, trend, trendLabel }) {
  return (
    <div className="glass-card p-3 text-center">
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <Icon size={12} className="text-stone-500" />
        {trend !== undefined && (
          trend > 0 ? (
            <TrendingUp size={10} className="text-rose-400" />
          ) : trend < 0 ? (
            <TrendingDown size={10} className="text-emerald-400" />
          ) : null
        )}
      </div>
      <p className={`text-base font-semibold ${
        trend > 0 ? 'text-rose-400' : 
        trend < 0 ? 'text-emerald-400' : 
        'text-stone-200'
      }`}>
        {value}
      </p>
      <p className="text-[10px] text-stone-600 mt-0.5">{label}</p>
    </div>
  );
}

// Compact Category Bar
function CompactCategoryBar({ categories }) {
  const total = categories.reduce((sum, cat) => sum + cat.amount, 0);
  
  if (categories.length === 0 || total === 0) return null;

  return (
    <div className="glass-card p-4">
      <h3 className="text-xs font-medium text-stone-500 mb-3">Top Categories</h3>
      
      <div className="h-2 rounded-full overflow-hidden flex">
        {categories.map((cat, i) => {
          const colors = getCategoryColors(cat.name);
          const width = (cat.amount / total) * 100;
          return (
            <div
              key={cat.name}
              className={`h-full ${colors.bar} ${i === 0 ? 'rounded-l-full' : ''} ${i === categories.length - 1 ? 'rounded-r-full' : ''}`}
              style={{ width: `${width}%` }}
              title={`${cat.name}: ${formatCurrency(cat.amount, 'INR')}`}
            />
          );
        })}
      </div>
      
      <div className="grid grid-cols-2 gap-2 mt-3">
        {categories.slice(0, 4).map(cat => {
          const Icon = getCategoryIcon(cat.name);
          const colors = getCategoryColors(cat.name);
          return (
            <div key={cat.name} className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded ${colors.bg} flex items-center justify-center`}>
                <Icon size={10} className={colors.text} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-stone-400 truncate">{cat.name}</p>
                <p className="text-xs font-mono text-stone-300">{formatCurrency(cat.amount, 'INR')}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Today's Activity Section
function TodaysActivity({ expenses, isExpanded, onToggle }) {
  const todayExpenses = expenses.filter(exp => 
    !exp.cancelled && isToday(parseISO(exp.date))
  );
  
  const todayTotal = todayExpenses
    .filter(exp => !exp.isRefund && !exp.isIncome)
    .reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-stone-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
            <Calendar size={14} className="text-teal-400" />
          </div>
          <div className="text-left">
            <p className="text-sm text-stone-300">Today</p>
            <p className="text-[10px] text-stone-600">{todayExpenses.length} expense{todayExpenses.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-stone-300">{formatCurrency(todayTotal, 'INR')}</span>
          {isExpanded ? <ChevronUp size={16} className="text-stone-500" /> : <ChevronDown size={16} className="text-stone-500" />}
        </div>
      </button>
      
      {isExpanded && todayExpenses.length > 0 && (
        <div className="border-t border-stone-800/50 px-4 py-2 space-y-2">
          {todayExpenses.slice(0, 5).map(exp => {
            const Icon = getCategoryIcon(exp.category);
            const colors = getCategoryColors(exp.category);
            return (
              <div key={exp.id} className="flex items-center gap-3 py-1">
                <div className={`w-7 h-7 rounded-lg ${colors.bg} flex items-center justify-center`}>
                  <Icon size={12} className={colors.text} />
                </div>
                <p className="flex-1 text-xs text-stone-400 truncate">{exp.description}</p>
                <p className={`text-xs font-mono ${
                  (exp.isRefund || exp.isIncome) ? 'text-emerald-400' : 'text-stone-300'
                }`}>
                  {(exp.isRefund || exp.isIncome) ? '+' : ''}{formatCurrency(exp.amount, 'INR')}
                </p>
              </div>
            );
          })}
          {todayExpenses.length > 5 && (
            <p className="text-[10px] text-stone-600 text-center pt-1">
              +{todayExpenses.length - 5} more
            </p>
          )}
        </div>
      )}
      
      {isExpanded && todayExpenses.length === 0 && (
        <div className="border-t border-stone-800/50 p-4 text-center">
          <p className="text-xs text-stone-600">No expenses today</p>
        </div>
      )}
    </div>
  );
}

export default function ESHome({ expenses, userId, onRefresh, onAddExpense, onNavigateToBills }) {
  const [budget, setBudget] = useState(null);
  const [todayExpanded, setTodayExpanded] = useState(false);

  // Load budget for current month
  useEffect(() => {
    if (!userId) return;
    const month = format(new Date(), 'yyyy-MM');
    getBudget(userId, month).then(setBudget).catch(() => setBudget(null));
  }, [userId]);

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = { start: startOfMonth(now), end: endOfMonth(now) };
    const lastMonth = { 
      start: startOfMonth(subMonths(now, 1)), 
      end: endOfMonth(subMonths(now, 1)) 
    };
    
    let thisMonthSpent = 0;
    let lastMonthSpent = 0;
    
    for (const exp of expenses) {
      if (exp.isPending || exp.cancelled || exp.isRefund || exp.isIncome) continue;
      
      const expDate = parseISO(exp.date);
      
      if (isWithinInterval(expDate, thisMonth)) {
        thisMonthSpent += exp.amount;
      }
      if (isWithinInterval(expDate, lastMonth)) {
        lastMonthSpent += exp.amount;
      }
    }
    
    const daysInMonth = getDaysInMonth(now);
    const daysPassed = now.getDate();
    const daysLeft = daysInMonth - daysPassed;
    const dailyAvg = daysPassed > 0 ? thisMonthSpent / daysPassed : 0;
    
    const percentChange = lastMonthSpent > 0 
      ? Math.round(((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100)
      : 0;

    const budgetLimit = budget?.overallLimit || 0;
    const percentUsed = budgetLimit > 0 ? (thisMonthSpent / budgetLimit) * 100 : 0;
    
    return {
      thisMonthSpent,
      lastMonthSpent,
      dailyAvg,
      daysLeft,
      percentChange,
      budgetLimit,
      percentUsed,
    };
  }, [expenses, budget]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const now = new Date();
    const thisMonth = { start: startOfMonth(now), end: endOfMonth(now) };
    const categories = {};
    
    for (const exp of expenses) {
      if (exp.cancelled || exp.isRefund || exp.isIncome) continue;
      const expDate = parseISO(exp.date);
      if (!isWithinInterval(expDate, thisMonth)) continue;
      
      const cat = exp.category || 'Other';
      categories[cat] = (categories[cat] || 0) + exp.amount;
    }
    
    return Object.entries(categories)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);
  }, [expenses]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display text-stone-200">Overview</h2>
          <p className="text-xs text-stone-500">{format(new Date(), 'EEEE, MMMM d')}</p>
        </div>
        <button
          onClick={onRefresh}
          className="p-2 rounded-xl bg-stone-800/50 text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Hero Card */}
      <HeroCard
        totalSpent={stats.thisMonthSpent}
        budget={stats.budgetLimit}
        percentUsed={stats.percentUsed}
      />

      {/* Mini Stats Row */}
      <div className="grid grid-cols-3 gap-2">
        <MiniStat
          label="Daily avg"
          value={formatCurrency(stats.dailyAvg, 'INR')}
          icon={TrendingUp}
        />
        <MiniStat
          label="Days left"
          value={stats.daysLeft.toString()}
          icon={Clock}
        />
        <MiniStat
          label="vs last month"
          value={stats.percentChange !== 0 ? `${Math.abs(stats.percentChange)}%` : '–'}
          icon={Calendar}
          trend={stats.percentChange}
        />
      </div>

      {/* Compact Category Breakdown */}
      <CompactCategoryBar categories={categoryData} />

      {/* Quick Add Button */}
      <button
        onClick={onAddExpense}
        className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-500/20 active:scale-[0.98]"
      >
        <Plus size={18} />
        Add Expense
      </button>

      {/* Today's Activity */}
      <TodaysActivity
        expenses={expenses}
        isExpanded={todayExpanded}
        onToggle={() => setTodayExpanded(!todayExpanded)}
      />
    </div>
  );
}
