/**
 * ESBudget - Budget tracking tab with gauge, spending pace, and category limits
 */

import { useState, useMemo } from 'react';
import { 
  Wallet, TrendingUp, Calendar, Settings, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle, Target
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDaysInMonth, isWithinInterval } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell } from 'recharts';
import { formatCurrency } from '../../../utils/analytics';
import { CHART_COLORS, TOOLTIP_STYLE, STATUS_COLORS } from '../../../utils/chartConfig';

// Budget Health Gauge
function BudgetHealthGauge({ spent, budget }) {
  const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const remaining = Math.max(budget - spent, 0);
  
  // Determine status color
  let status = 'good';
  let statusColor = STATUS_COLORS.good;
  if (percentage >= 100) {
    status = 'over';
    statusColor = STATUS_COLORS.danger;
  } else if (percentage >= 80) {
    status = 'warning';
    statusColor = STATUS_COLORS.warning;
  }
  
  // SVG arc calculation
  const radius = 70;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="glass-card p-6">
      <div className="flex flex-col items-center">
        <div className="relative w-44 h-44">
          <svg width="176" height="176" className="transform -rotate-90">
            {/* Background circle */}
            <circle
              stroke="rgba(120, 113, 108, 0.2)"
              fill="transparent"
              strokeWidth={strokeWidth}
              r={normalizedRadius}
              cx="88"
              cy="88"
            />
            {/* Progress circle */}
            <circle
              stroke={statusColor}
              fill="transparent"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${circumference} ${circumference}`}
              style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease' }}
              r={normalizedRadius}
              cx="88"
              cy="88"
            />
          </svg>
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-display text-stone-200">
              {percentage.toFixed(0)}%
            </span>
            <span className="text-xs text-stone-500">used</span>
          </div>
        </div>
        
        {/* Status */}
        <div className="mt-4 text-center">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            status === 'good' ? 'bg-emerald-500/20 text-emerald-400' :
            status === 'warning' ? 'bg-amber-500/20 text-amber-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {status === 'good' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
            {status === 'good' ? 'On Track' : status === 'warning' ? 'Near Limit' : 'Over Budget'}
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-6 mt-6 w-full">
          <div className="text-center">
            <p className="text-lg font-display text-stone-200">
              {formatCurrency(spent, 'INR')}
            </p>
            <p className="text-xs text-stone-500">Spent</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-display text-emerald-400">
              {formatCurrency(remaining, 'INR')}
            </p>
            <p className="text-xs text-stone-500">Remaining</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Daily Spending Pace Chart
function SpendingPaceChart({ expenses, budget, month }) {
  const data = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const days = eachDayOfInterval({ start, end });
    const totalDays = getDaysInMonth(month);
    const dailyBudget = budget / totalDays;
    
    let cumulative = 0;
    
    return days.map((day, i) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayExpenses = expenses.filter(e => 
        e.date === dateStr && !e.isRefund && !e.cancelled
      );
      const dayTotal = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
      cumulative += dayTotal;
      
      return {
        day: format(day, 'd'),
        actual: cumulative,
        ideal: dailyBudget * (i + 1),
        dayTotal,
      };
    });
  }, [expenses, budget, month]);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={TOOLTIP_STYLE.contentStyle}>
        <p className="text-xs text-stone-400 mb-1">Day {payload[0]?.payload?.day}</p>
        <p className="text-xs text-violet-400">
          Actual: {formatCurrency(payload[0]?.payload?.actual, 'INR')}
        </p>
        <p className="text-xs text-stone-500">
          Ideal: {formatCurrency(payload[0]?.payload?.ideal, 'INR')}
        </p>
      </div>
    );
  };

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-medium text-stone-300 mb-4 flex items-center gap-2">
        <TrendingUp size={16} className="text-violet-400" />
        Spending Pace
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="day" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#78716c', fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={budget} stroke="#ef4444" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="ideal"
              stroke="#78716c"
              strokeDasharray="5 5"
              fill="none"
              strokeWidth={1}
            />
            <Area
              type="monotone"
              dataKey="actual"
              stroke="#8b5cf6"
              fill="url(#actualGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-stone-600 mt-2 text-center">
        Dashed line = ideal pace • Red line = budget limit
      </p>
    </div>
  );
}

// Category Budget Progress
function CategoryProgress({ categories, budget }) {
  const getStatusColor = (percentage) => {
    if (percentage >= 100) return STATUS_COLORS.danger;
    if (percentage >= 80) return STATUS_COLORS.warning;
    return STATUS_COLORS.good;
  };

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-medium text-stone-300 mb-4 flex items-center gap-2">
        <Target size={16} className="text-violet-400" />
        By Category
      </h3>
      <div className="space-y-3">
        {categories.slice(0, 6).map(([category, spent], i) => {
          const catBudget = budget / 6; // Simple equal distribution
          const percentage = Math.min((spent / catBudget) * 100, 150);
          
          return (
            <div key={category}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-stone-400">{category}</span>
                <span className="text-stone-500">{formatCurrency(spent, 'INR')}</span>
              </div>
              <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min(percentage, 100)}%`,
                    backgroundColor: getStatusColor(percentage)
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Daily Allowance Card
function DailyAllowanceCard({ remaining, daysLeft }) {
  const dailyAllowance = daysLeft > 0 ? remaining / daysLeft : 0;
  
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-emerald-500/20">
          <Wallet size={20} className="text-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-stone-500">Daily Allowance</p>
          <p className="text-xl font-display text-emerald-400">
            {formatCurrency(dailyAllowance, 'INR')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-stone-500">{daysLeft} days left</p>
          <p className="text-sm text-stone-400">this month</p>
        </div>
      </div>
    </div>
  );
}

export default function ESBudget({ expenses, userId }) {
  const [month, setMonth] = useState(new Date());
  const [budget, setBudget] = useState(30000); // Default budget
  const [showSettings, setShowSettings] = useState(false);
  const [tempBudget, setTempBudget] = useState(budget);

  // Filter expenses for current month
  const monthExpenses = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    
    return expenses.filter(e => {
      if (e.cancelled || e.isRefund) return false;
      const expDate = parseISO(e.date);
      return isWithinInterval(expDate, { start, end });
    });
  }, [expenses, month]);

  // Calculate total spent
  const totalSpent = useMemo(() => {
    return monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [monthExpenses]);

  // Calculate category breakdown
  const categoryBreakdown = useMemo(() => {
    const breakdown = {};
    for (const exp of monthExpenses) {
      breakdown[exp.category] = (breakdown[exp.category] || 0) + exp.amount;
    }
    return Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  }, [monthExpenses]);

  // Calculate remaining days
  const daysLeft = useMemo(() => {
    const now = new Date();
    const end = endOfMonth(month);
    if (now > end) return 0;
    return Math.ceil((end - now) / (1000 * 60 * 60 * 24)) + 1;
  }, [month]);

  // Month navigation
  const prevMonth = () => {
    setMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    if (next <= new Date()) {
      setMonth(next);
    }
  };

  const handleSaveBudget = () => {
    setBudget(tempBudget);
    setShowSettings(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display text-stone-200">Budget</h2>
          <p className="text-xs text-stone-500">Track your spending limits</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-xl bg-stone-800/50 text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Budget Settings */}
      {showSettings && (
        <div className="glass-card p-4 space-y-3">
          <label className="text-sm text-stone-400">Monthly Budget</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={tempBudget}
              onChange={(e) => setTempBudget(Number(e.target.value))}
              className="flex-1 px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-200 focus:outline-none focus:border-violet-500"
            />
            <button
              onClick={handleSaveBudget}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg bg-stone-800/50 text-stone-400 hover:text-stone-200 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-violet-400" />
          <span className="text-sm font-medium text-stone-200">
            {format(month, 'MMMM yyyy')}
          </span>
        </div>
        <button
          onClick={nextMonth}
          disabled={month >= startOfMonth(new Date())}
          className="p-2 rounded-lg bg-stone-800/50 text-stone-400 hover:text-stone-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Budget Health Gauge */}
      <BudgetHealthGauge spent={totalSpent} budget={budget} />

      {/* Daily Allowance */}
      <DailyAllowanceCard remaining={budget - totalSpent} daysLeft={daysLeft} />

      {/* Spending Pace Chart */}
      <SpendingPaceChart expenses={expenses} budget={budget} month={month} />

      {/* Category Progress */}
      {categoryBreakdown.length > 0 && (
        <CategoryProgress categories={categoryBreakdown} budget={budget} />
      )}
    </div>
  );
}
