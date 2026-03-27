/**
 * ESMonthView - Dedicated monthly expense view with month navigation
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, Wallet, Target, RotateCcw
} from 'lucide-react';
import { 
  format, parseISO, startOfMonth, endOfMonth, subMonths, addMonths,
  isWithinInterval, eachDayOfInterval, startOfWeek, endOfWeek,
  getDay, isSameMonth, isToday, getDaysInMonth
} from 'date-fns';
import { formatCurrency } from '../../../utils/analytics';
import { getCategoryIcon, getCategoryColors } from '../../../utils/categoryConfig';
import { getBudget } from '../../../firebase/budgetService';

// Month Selector Component
function MonthSelector({ selectedMonth, onMonthChange, onToday }) {
  const touchStartX = useRef(null);
  
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  
  const handleTouchEnd = (e) => {
    if (!touchStartX.current) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        onMonthChange(addMonths(selectedMonth, 1));
      } else {
        onMonthChange(subMonths(selectedMonth, 1));
      }
    }
    touchStartX.current = null;
  };

  const isCurrentMonth = isSameMonth(selectedMonth, new Date());

  return (
    <div 
      className="flex items-center justify-between py-3"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        onClick={() => onMonthChange(subMonths(selectedMonth, 1))}
        className="p-2 rounded-xl bg-stone-800/50 text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors touch-manipulation"
      >
        <ChevronLeft size={20} />
      </button>
      
      <div className="text-center">
        <h2 className="text-xl font-display text-stone-200">
          {format(selectedMonth, 'MMMM yyyy')}
        </h2>
        {!isCurrentMonth && (
          <button
            onClick={onToday}
            className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 mx-auto mt-1"
          >
            <RotateCcw size={10} />
            Back to today
          </button>
        )}
      </div>
      
      <button
        onClick={() => onMonthChange(addMonths(selectedMonth, 1))}
        className="p-2 rounded-xl bg-stone-800/50 text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors touch-manipulation"
        disabled={isCurrentMonth}
      >
        <ChevronRight size={20} className={isCurrentMonth ? 'opacity-30' : ''} />
      </button>
    </div>
  );
}

// Monthly Summary Card
function MonthlySummaryCard({ totalSpent, budget, previousMonthSpent, daysInMonth, daysPassed }) {
  const percentUsed = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0;
  const isOverBudget = budget > 0 && totalSpent > budget;
  const remaining = budget > 0 ? budget - totalSpent : 0;
  
  const percentChange = previousMonthSpent > 0 
    ? Math.round(((totalSpent - previousMonthSpent) / previousMonthSpent) * 100)
    : 0;

  const dailyAvg = daysPassed > 0 ? totalSpent / daysPassed : 0;
  const projectedTotal = dailyAvg * daysInMonth;

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="text-center">
        <p className="text-3xl font-display text-stone-100">
          {formatCurrency(totalSpent, 'INR')}
        </p>
        <p className="text-sm text-stone-500 mt-1">Total spent</p>
      </div>

      {budget > 0 && (
        <div className="space-y-2">
          <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                isOverBudget ? 'bg-gradient-to-r from-red-500 to-rose-500' :
                percentUsed > 80 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                'bg-gradient-to-r from-teal-500 to-cyan-500'
              }`}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className={isOverBudget ? 'text-red-400' : 'text-stone-500'}>
              {percentUsed.toFixed(0)}% used
            </span>
            <span className={remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {remaining >= 0 ? `${formatCurrency(remaining, 'INR')} left` : `${formatCurrency(Math.abs(remaining), 'INR')} over`}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-stone-800/50">
        <div className="text-center">
          <p className="text-sm font-medium text-stone-300">
            {formatCurrency(dailyAvg, 'INR')}
          </p>
          <p className="text-[10px] text-stone-600">Daily avg</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-stone-300">
            {formatCurrency(projectedTotal, 'INR')}
          </p>
          <p className="text-[10px] text-stone-600">Projected</p>
        </div>
        <div className="text-center">
          <div className={`flex items-center justify-center gap-1 text-sm font-medium ${
            percentChange > 0 ? 'text-rose-400' : percentChange < 0 ? 'text-emerald-400' : 'text-stone-400'
          }`}>
            {percentChange !== 0 && (
              percentChange > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />
            )}
            {percentChange !== 0 ? `${Math.abs(percentChange)}%` : '–'}
          </div>
          <p className="text-[10px] text-stone-600">vs last month</p>
        </div>
      </div>
    </div>
  );
}

// Category Breakdown
function CategoryBreakdown({ expenses }) {
  const categoryData = useMemo(() => {
    const categories = {};
    let total = 0;
    
    for (const exp of expenses) {
      if (exp.cancelled || exp.isRefund || exp.isIncome) continue;
      const cat = exp.category || 'Other';
      categories[cat] = (categories[cat] || 0) + exp.amount;
      total += exp.amount;
    }
    
    return Object.entries(categories)
      .map(([name, amount]) => ({ name, amount, percent: total > 0 ? (amount / total) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [expenses]);

  if (categoryData.length === 0) {
    return null;
  }

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-medium text-stone-400 mb-4">Category Breakdown</h3>
      <div className="space-y-3">
        {categoryData.map(cat => {
          const Icon = getCategoryIcon(cat.name);
          const colors = getCategoryColors(cat.name);
          return (
            <div key={cat.name} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-lg ${colors.bg} flex items-center justify-center`}>
                    <Icon size={12} className={colors.text} />
                  </div>
                  <span className="text-xs text-stone-300">{cat.name}</span>
                </div>
                <span className="text-xs font-mono text-stone-400">
                  {formatCurrency(cat.amount, 'INR')}
                </span>
              </div>
              <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full bg-gradient-to-r ${colors.gradient}`}
                  style={{ width: `${cat.percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Calendar Heatmap
function CalendarHeatmap({ expenses, selectedMonth }) {
  const dailyData = useMemo(() => {
    const data = {};
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    
    const days = eachDayOfInterval({ start, end });
    days.forEach(day => {
      data[format(day, 'yyyy-MM-dd')] = 0;
    });
    
    for (const exp of expenses) {
      if (exp.cancelled || exp.isRefund || exp.isIncome) continue;
      if (data[exp.date] !== undefined) {
        data[exp.date] += exp.amount;
      }
    }
    
    return data;
  }, [expenses, selectedMonth]);

  const maxAmount = Math.max(...Object.values(dailyData), 1);
  
  const calendarStart = startOfWeek(startOfMonth(selectedMonth), { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(endOfMonth(selectedMonth), { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  
  const weeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  const getIntensityClass = (amount) => {
    if (amount === 0) return 'bg-stone-800/30';
    const ratio = amount / maxAmount;
    if (ratio < 0.25) return 'bg-emerald-500/30';
    if (ratio < 0.5) return 'bg-emerald-500/50';
    if (ratio < 0.75) return 'bg-amber-500/50';
    return 'bg-rose-500/50';
  };

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-medium text-stone-400 mb-3">Daily Spending</h3>
      
      <div className="flex gap-1 mb-2 px-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="flex-1 text-center text-[9px] text-stone-600">{d}</div>
        ))}
      </div>
      
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex gap-1">
            {week.map((day, di) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const amount = dailyData[dateStr] || 0;
              const isInMonth = isSameMonth(day, selectedMonth);
              const isTodayDate = isToday(day);
              
              return (
                <div
                  key={di}
                  className={`flex-1 aspect-square rounded-md flex items-center justify-center text-[10px] transition-colors ${
                    !isInMonth ? 'opacity-20' : ''
                  } ${getIntensityClass(isInMonth ? amount : 0)} ${
                    isTodayDate ? 'ring-1 ring-teal-400' : ''
                  }`}
                  title={isInMonth ? `${format(day, 'MMM d')}: ${formatCurrency(amount, 'INR')}` : ''}
                >
                  <span className={`${isInMonth ? 'text-stone-400' : 'text-stone-700'}`}>
                    {format(day, 'd')}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      
      <div className="flex items-center justify-center gap-2 mt-3 text-[9px] text-stone-600">
        <span>Less</span>
        <div className="flex gap-0.5">
          <div className="w-3 h-3 rounded bg-stone-800/30" />
          <div className="w-3 h-3 rounded bg-emerald-500/30" />
          <div className="w-3 h-3 rounded bg-emerald-500/50" />
          <div className="w-3 h-3 rounded bg-amber-500/50" />
          <div className="w-3 h-3 rounded bg-rose-500/50" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

// Weekly Expense Group
function WeeklyExpenseGroup({ weekLabel, expenses, total, isExpanded, onToggle }) {
  return (
    <div className="glass-card overflow-hidden">
      <button 
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-stone-800/30 transition-colors"
      >
        <span className="text-sm text-stone-300">{weekLabel}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-stone-400">{formatCurrency(total, 'INR')}</span>
          <ChevronRight size={16} className={`text-stone-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
      </button>
      
      {isExpanded && expenses.length > 0 && (
        <div className="border-t border-stone-800/50">
          {expenses.slice(0, 10).map((exp, i) => {
            const Icon = getCategoryIcon(exp.category);
            const colors = getCategoryColors(exp.category);
            return (
              <div 
                key={exp.id || i}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-stone-800/30 last:border-0"
              >
                <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                  <Icon size={14} className={colors.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-stone-300 truncate">{exp.description}</p>
                  <p className="text-[10px] text-stone-600">{format(parseISO(exp.date), 'EEE, MMM d')}</p>
                </div>
                <p className={`text-xs font-mono ${
                  (exp.isRefund || exp.isIncome) ? 'text-emerald-400' : 'text-stone-400'
                }`}>
                  {(exp.isRefund || exp.isIncome) ? '+' : ''}{formatCurrency(exp.amount, 'INR')}
                </p>
              </div>
            );
          })}
          {expenses.length > 10 && (
            <p className="px-4 py-2 text-[10px] text-stone-600 text-center">
              +{expenses.length - 10} more expenses
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Main Component
export default function ESMonthView({ expenses, userId }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [budget, setBudget] = useState(null);
  const [expandedWeek, setExpandedWeek] = useState(null);

  // Load budget for selected month
  useEffect(() => {
    if (!userId) return;
    const monthStr = format(selectedMonth, 'yyyy-MM');
    getBudget(userId, monthStr).then(setBudget).catch(() => setBudget(null));
  }, [userId, selectedMonth]);

  // Filter expenses for selected month
  const monthExpenses = useMemo(() => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    
    return expenses.filter(exp => {
      const expDate = parseISO(exp.date);
      return isWithinInterval(expDate, { start, end });
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, selectedMonth]);

  // Calculate previous month spent (for comparison)
  const previousMonthSpent = useMemo(() => {
    const prevMonth = subMonths(selectedMonth, 1);
    const start = startOfMonth(prevMonth);
    const end = endOfMonth(prevMonth);
    
    return expenses
      .filter(exp => {
        if (exp.cancelled || exp.isRefund || exp.isIncome) return false;
        const expDate = parseISO(exp.date);
        return isWithinInterval(expDate, { start, end });
      })
      .reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenses, selectedMonth]);

  // Total spent this month (excluding refunds/income)
  const totalSpent = useMemo(() => {
    return monthExpenses
      .filter(exp => !exp.cancelled && !exp.isRefund && !exp.isIncome)
      .reduce((sum, exp) => sum + exp.amount, 0);
  }, [monthExpenses]);

  // Group expenses by week
  const weeklyGroups = useMemo(() => {
    const groups = {};
    
    for (const exp of monthExpenses) {
      const expDate = parseISO(exp.date);
      const weekStart = startOfWeek(expDate, { weekStartsOn: 0 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      
      if (!groups[weekKey]) {
        const weekEnd = endOfWeek(expDate, { weekStartsOn: 0 });
        groups[weekKey] = {
          label: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`,
          expenses: [],
          total: 0,
        };
      }
      
      groups[weekKey].expenses.push(exp);
      if (!exp.cancelled && !exp.isRefund && !exp.isIncome) {
        groups[weekKey].total += exp.amount;
      }
    }
    
    return Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0]));
  }, [monthExpenses]);

  const daysInMonth = getDaysInMonth(selectedMonth);
  const daysPassed = isSameMonth(selectedMonth, new Date()) 
    ? new Date().getDate() 
    : daysInMonth;

  return (
    <div className="space-y-4 pb-4">
      {/* Month Selector */}
      <MonthSelector
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        onToday={() => setSelectedMonth(new Date())}
      />

      {/* Monthly Summary */}
      <MonthlySummaryCard
        totalSpent={totalSpent}
        budget={budget?.overallLimit || 0}
        previousMonthSpent={previousMonthSpent}
        daysInMonth={daysInMonth}
        daysPassed={daysPassed}
      />

      {/* Category Breakdown */}
      <CategoryBreakdown expenses={monthExpenses} />

      {/* Calendar Heatmap */}
      <CalendarHeatmap expenses={monthExpenses} selectedMonth={selectedMonth} />

      {/* Weekly Groups */}
      {weeklyGroups.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-stone-400 px-1">Weekly Summary</h3>
          {weeklyGroups.map(([weekKey, group]) => (
            <WeeklyExpenseGroup
              key={weekKey}
              weekLabel={group.label}
              expenses={group.expenses}
              total={group.total}
              isExpanded={expandedWeek === weekKey}
              onToggle={() => setExpandedWeek(expandedWeek === weekKey ? null : weekKey)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {monthExpenses.length === 0 && (
        <div className="glass-card p-8 text-center">
          <Calendar size={40} className="mx-auto text-stone-600 mb-3" />
          <p className="text-sm text-stone-400">No expenses this month</p>
          <p className="text-xs text-stone-600 mt-1">
            Add expenses to see your monthly breakdown
          </p>
        </div>
      )}
    </div>
  );
}
