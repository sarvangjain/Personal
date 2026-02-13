/**
 * ESBudget - Revamped budget tracking with smart features
 * 
 * Features:
 * - Budget setup wizard
 * - Visual health gauge
 * - Category budgets with icons
 * - Daily/weekly allowance
 * - Spending pace tracker
 * - Budget alerts
 * - Savings goals
 */

import { useState, useMemo, useEffect } from 'react';
import { 
  Wallet, TrendingUp, Calendar, Settings, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle, Target, PiggyBank, Sparkles, ArrowRight,
  Edit3, Save, X, Plus, Minus, Info
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDaysInMonth, isWithinInterval, startOfWeek, endOfWeek } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatCurrency } from '../../../utils/analytics';
import { TOOLTIP_STYLE, STATUS_COLORS } from '../../../utils/chartConfig';
import { getCategoryIcon, getCategoryColors, getAllCategories, getDefaultCategoryBudget } from '../../../utils/categoryConfig';

// ─── Budget Setup Wizard ─────────────────────────────────────────────────────

function BudgetSetupWizard({ onComplete, initialBudget, initialCategoryBudgets }) {
  const [step, setStep] = useState(1);
  const [monthlyBudget, setMonthlyBudget] = useState(initialBudget || 30000);
  const [categoryBudgets, setCategoryBudgets] = useState(initialCategoryBudgets || {});
  
  const categories = getAllCategories().filter(c => c !== 'Other' && c !== 'Payments');
  
  // Calculate remaining budget for distribution
  const allocatedTotal = Object.values(categoryBudgets).reduce((sum, val) => sum + val, 0);
  const unallocated = monthlyBudget - allocatedTotal;
  
  const handleCategoryBudgetChange = (category, delta) => {
    const current = categoryBudgets[category] || getDefaultCategoryBudget(category);
    const newValue = Math.max(0, current + delta);
    setCategoryBudgets(prev => ({ ...prev, [category]: newValue }));
  };

  const handleSave = () => {
    // Ensure all categories have budgets
    const finalBudgets = {};
    for (const cat of getAllCategories()) {
      finalBudgets[cat] = categoryBudgets[cat] || getDefaultCategoryBudget(cat);
    }
    onComplete(monthlyBudget, finalBudgets);
  };

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          step >= 1 ? 'bg-teal-500 text-white' : 'bg-stone-700 text-stone-400'
        }`}>1</div>
        <div className={`w-8 h-1 ${step >= 2 ? 'bg-teal-500' : 'bg-stone-700'}`} />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          step >= 2 ? 'bg-teal-500 text-white' : 'bg-stone-700 text-stone-400'
        }`}>2</div>
      </div>

      {step === 1 && (
        <div className="glass-card p-6 space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-display text-stone-200">Set Monthly Budget</h3>
            <p className="text-xs text-stone-500 mt-1">How much do you want to spend this month?</p>
          </div>
          
          {/* Budget input with increment/decrement */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setMonthlyBudget(prev => Math.max(5000, prev - 5000))}
              className="w-12 h-12 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 flex items-center justify-center"
            >
              <Minus size={20} />
            </button>
            <div className="text-center">
              <input
                type="number"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(Math.max(0, Number(e.target.value)))}
                className="text-3xl font-display text-teal-400 bg-transparent text-center w-40 focus:outline-none"
              />
              <p className="text-xs text-stone-500 mt-1">per month</p>
            </div>
            <button
              onClick={() => setMonthlyBudget(prev => prev + 5000)}
              className="w-12 h-12 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 flex items-center justify-center"
            >
              <Plus size={20} />
            </button>
          </div>
          
          {/* Suggested budgets */}
          <div className="flex flex-wrap justify-center gap-2">
            {[20000, 30000, 40000, 50000].map(amt => (
              <button
                key={amt}
                onClick={() => setMonthlyBudget(amt)}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  monthlyBudget === amt 
                    ? 'bg-teal-500/20 text-teal-400 border border-teal-500/50' 
                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                }`}
              >
                {formatCurrency(amt, 'INR')}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setStep(2)}
            className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl flex items-center justify-center gap-2"
          >
            Continue <ArrowRight size={18} />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="glass-card p-4 space-y-4">
          <div className="text-center mb-2">
            <h3 className="text-lg font-display text-stone-200">Category Limits</h3>
            <p className="text-xs text-stone-500 mt-1">Allocate your budget across categories</p>
          </div>
          
          {/* Unallocated indicator */}
          <div className={`p-3 rounded-lg text-center ${
            unallocated >= 0 ? 'bg-teal-500/10 border border-teal-500/30' : 'bg-red-500/10 border border-red-500/30'
          }`}>
            <p className="text-xs text-stone-500">Unallocated</p>
            <p className={`text-lg font-display ${unallocated >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
              {formatCurrency(Math.abs(unallocated), 'INR')}
              {unallocated < 0 && ' over'}
            </p>
          </div>
          
          {/* Category list */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {categories.map(category => {
              const Icon = getCategoryIcon(category);
              const colors = getCategoryColors(category);
              const budget = categoryBudgets[category] || getDefaultCategoryBudget(category);
              
              return (
                <div key={category} className="flex items-center gap-3 p-2 bg-stone-800/40 rounded-lg">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={14} className={colors.text} />
                  </div>
                  <span className="text-sm text-stone-300 flex-1 truncate">{category}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCategoryBudgetChange(category, -500)}
                      className="w-7 h-7 rounded bg-stone-700 text-stone-400 hover:bg-stone-600 flex items-center justify-center"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      value={budget}
                      onChange={(e) => setCategoryBudgets(prev => ({ ...prev, [category]: Math.max(0, Number(e.target.value)) }))}
                      className="w-16 px-2 py-1 bg-stone-700 border border-stone-600 rounded text-sm text-stone-200 text-center focus:outline-none focus:border-teal-500"
                    />
                    <button
                      onClick={() => handleCategoryBudgetChange(category, 500)}
                      className="w-7 h-7 rounded bg-stone-700 text-stone-400 hover:bg-stone-600 flex items-center justify-center"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-xl"
            >
              Back
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl flex items-center justify-center gap-2"
            >
              <Save size={18} /> Save Budget
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Budget Health Gauge ─────────────────────────────────────────────────────

function BudgetHealthGauge({ spent, budget, daysInMonth, currentDay }) {
  const percentage = budget > 0 ? Math.min((spent / budget) * 100, 120) : 0;
  const remaining = Math.max(budget - spent, 0);
  const expectedPercentage = (currentDay / daysInMonth) * 100;
  
  // Determine status
  let status = 'good';
  let statusColor = STATUS_COLORS.good;
  let statusMessage = 'On Track';
  
  if (percentage >= 100) {
    status = 'over';
    statusColor = STATUS_COLORS.danger;
    statusMessage = 'Over Budget';
  } else if (percentage > expectedPercentage + 10) {
    status = 'warning';
    statusColor = STATUS_COLORS.warning;
    statusMessage = 'Spending Fast';
  } else if (percentage < expectedPercentage - 10) {
    statusMessage = 'Under Budget';
  }
  
  // SVG arc calculation
  const radius = 75;
  const strokeWidth = 14;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(percentage, 100) / 100) * circumference;
  
  return (
    <div className="glass-card p-5">
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
            {/* Expected pace indicator */}
            <circle
              stroke="rgba(120, 113, 108, 0.4)"
              fill="transparent"
              strokeWidth={2}
              strokeDasharray={`${(expectedPercentage / 100) * circumference} ${circumference}`}
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
            <span className="text-xs text-stone-500">of budget</span>
          </div>
        </div>
        
        {/* Status badge */}
        <div className="mt-3">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            status === 'good' ? 'bg-emerald-500/20 text-emerald-400' :
            status === 'warning' ? 'bg-amber-500/20 text-amber-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {status === 'good' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
            {statusMessage}
          </div>
        </div>
        
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-6 mt-5 w-full">
          <div className="text-center">
            <p className="text-lg font-display text-stone-200">
              {formatCurrency(spent, 'INR')}
            </p>
            <p className="text-xs text-stone-500">Spent</p>
          </div>
          <div className="text-center">
            <p className={`text-lg font-display ${remaining > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(remaining, 'INR')}
            </p>
            <p className="text-xs text-stone-500">Remaining</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Daily & Weekly Allowance ────────────────────────────────────────────────

function AllowanceCards({ remaining, daysLeft, expenses, month }) {
  const dailyAllowance = daysLeft > 0 ? remaining / daysLeft : 0;
  
  // Calculate this week's spending
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  
  const thisWeekSpent = expenses.filter(e => {
    if (e.cancelled || e.isRefund) return false;
    const expDate = parseISO(e.date);
    return isWithinInterval(expDate, { start: weekStart, end: weekEnd });
  }).reduce((sum, e) => sum + e.amount, 0);
  
  const weeklyAllowance = dailyAllowance * 7;
  const weekRemaining = Math.max(weeklyAllowance - thisWeekSpent, 0);
  
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-teal-500/20">
            <Wallet size={16} className="text-teal-400" />
          </div>
          <span className="text-xs text-stone-500">Daily</span>
        </div>
        <p className="text-xl font-display text-teal-400">
          {formatCurrency(dailyAllowance, 'INR')}
        </p>
        <p className="text-[10px] text-stone-600 mt-1">{daysLeft} days left</p>
      </div>
      
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-cyan-500/20">
            <Calendar size={16} className="text-cyan-400" />
          </div>
          <span className="text-xs text-stone-500">This Week</span>
        </div>
        <p className="text-xl font-display text-cyan-400">
          {formatCurrency(weekRemaining, 'INR')}
        </p>
        <p className="text-[10px] text-stone-600 mt-1">
          {formatCurrency(thisWeekSpent, 'INR')} spent
        </p>
      </div>
    </div>
  );
}

// ─── Spending Pace Chart ─────────────────────────────────────────────────────

function SpendingPaceChart({ expenses, budget, month }) {
  const data = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const days = eachDayOfInterval({ start, end });
    const totalDays = getDaysInMonth(month);
    const dailyBudget = budget / totalDays;
    const today = new Date();
    
    let cumulative = 0;
    
    return days.map((day, i) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayExpenses = expenses.filter(e => 
        e.date === dateStr && !e.isRefund && !e.cancelled
      );
      const dayTotal = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
      cumulative += dayTotal;
      
      const isPast = day <= today;
      
      return {
        day: format(day, 'd'),
        actual: isPast ? cumulative : null,
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
        <p className="text-xs text-teal-400">
          Actual: {formatCurrency(payload[0]?.payload?.actual || 0, 'INR')}
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
        <TrendingUp size={16} className="text-teal-400" />
        Spending Pace
      </h3>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="esBudgetActualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
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
            <ReferenceLine y={budget} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} />
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
              stroke="#14b8a6"
              fill="url(#esBudgetActualGradient)"
              strokeWidth={2}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-stone-600 mt-2 text-center">
        Dashed = ideal pace • Red line = budget limit
      </p>
    </div>
  );
}

// ─── Category Budgets List ───────────────────────────────────────────────────

function CategoryBudgetsList({ categories, categoryBudgets, onEditBudget }) {
  const [editingCategory, setEditingCategory] = useState(null);
  const [editValue, setEditValue] = useState('');

  const handleStartEdit = (category, currentBudget) => {
    setEditingCategory(category);
    setEditValue(currentBudget.toString());
  };

  const handleSaveEdit = (category) => {
    const newBudget = parseInt(editValue) || 0;
    if (newBudget >= 0) {
      onEditBudget(category, newBudget);
    }
    setEditingCategory(null);
  };

  // Sort: over budget first, then near limit, then by amount
  const sortedCategories = [...categories].sort((a, b) => {
    const aBudget = categoryBudgets[a[0]] || getDefaultCategoryBudget(a[0]);
    const bBudget = categoryBudgets[b[0]] || getDefaultCategoryBudget(b[0]);
    const aPercent = aBudget > 0 ? (a[1] / aBudget) * 100 : 0;
    const bPercent = bBudget > 0 ? (b[1] / bBudget) * 100 : 0;
    
    if (aPercent >= 100 && bPercent < 100) return -1;
    if (bPercent >= 100 && aPercent < 100) return 1;
    return b[1] - a[1];
  });

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-stone-300 flex items-center gap-2">
          <Target size={16} className="text-teal-400" />
          Category Budgets
        </h3>
        <span className="text-[10px] text-stone-500 flex items-center gap-1">
          <Info size={10} /> Tap to edit
        </span>
      </div>
      
      <div className="space-y-2">
        {sortedCategories.slice(0, 8).map(([category, spent]) => {
          const Icon = getCategoryIcon(category);
          const colors = getCategoryColors(category);
          const catBudget = categoryBudgets[category] || getDefaultCategoryBudget(category);
          const percentage = catBudget > 0 ? (spent / catBudget) * 100 : 0;
          const isOverBudget = percentage >= 100;
          const isNearLimit = percentage >= 80 && percentage < 100;
          const isEditing = editingCategory === category;
          
          return (
            <div 
              key={category} 
              className={`p-2.5 rounded-xl transition-all ${
                isOverBudget ? 'bg-red-500/10 border border-red-500/20' :
                isNearLimit ? 'bg-amber-500/10 border border-amber-500/20' :
                'bg-stone-800/40 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={14} className={colors.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-stone-200 truncate">{category}</span>
                    {isOverBudget && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">OVER</span>
                    )}
                    {isNearLimit && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">NEAR</span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-mono ${isOverBudget ? 'text-red-400' : 'text-stone-200'}`}>
                    {formatCurrency(spent, 'INR')}
                  </p>
                  <div className="flex items-center gap-1 justify-end">
                    <span className="text-[10px] text-stone-600">/</span>
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(category)}
                          autoFocus
                          className="w-14 px-1 py-0.5 bg-stone-700 border border-teal-500 rounded text-[10px] text-stone-200 text-right focus:outline-none"
                        />
                        <button onClick={() => handleSaveEdit(category)} className="p-0.5 text-teal-400">
                          <Save size={12} />
                        </button>
                        <button onClick={() => setEditingCategory(null)} className="p-0.5 text-stone-500">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartEdit(category, catBudget)}
                        className="text-[10px] text-stone-500 hover:text-teal-400 flex items-center gap-0.5"
                      >
                        {formatCurrency(catBudget, 'INR')}
                        <Edit3 size={8} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="h-1.5 bg-stone-700/50 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    isOverBudget ? 'bg-red-500' :
                    isNearLimit ? 'bg-amber-500' :
                    colors.bar
                  }`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-stone-600 mt-1">
                {percentage.toFixed(0)}% • {catBudget > spent ? `${formatCurrency(catBudget - spent, 'INR')} left` : 'limit reached'}
              </p>
            </div>
          );
        })}
      </div>
      
      {categories.length > 8 && (
        <p className="text-xs text-stone-500 text-center mt-3">
          +{categories.length - 8} more categories
        </p>
      )}
    </div>
  );
}

// ─── Budget Alerts ───────────────────────────────────────────────────────────

function BudgetAlerts({ categories, categoryBudgets }) {
  const alerts = categories
    .map(([category, spent]) => {
      const budget = categoryBudgets[category] || getDefaultCategoryBudget(category);
      const percentage = budget > 0 ? (spent / budget) * 100 : 0;
      return { category, spent, budget, percentage };
    })
    .filter(item => item.percentage >= 80)
    .sort((a, b) => b.percentage - a.percentage);

  if (alerts.length === 0) return null;

  const overCount = alerts.filter(a => a.percentage >= 100).length;
  const nearCount = alerts.filter(a => a.percentage >= 80 && a.percentage < 100).length;

  return (
    <div className="glass-card p-4 bg-gradient-to-br from-amber-500/5 to-red-500/5 border-amber-500/20">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={16} className="text-amber-400" />
        <h3 className="text-sm font-medium text-amber-400">Budget Alerts</h3>
      </div>
      
      <div className="space-y-2">
        {alerts.slice(0, 4).map(alert => {
          const Icon = getCategoryIcon(alert.category);
          return (
            <div key={alert.category} className="flex items-center gap-2 p-2 bg-stone-800/30 rounded-lg">
              <Icon size={14} className={alert.percentage >= 100 ? 'text-red-400' : 'text-amber-400'} />
              <span className="text-sm text-stone-300 flex-1 truncate">{alert.category}</span>
              <span className={`text-sm font-mono ${alert.percentage >= 100 ? 'text-red-400' : 'text-amber-400'}`}>
                {alert.percentage.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
      
      <p className="text-[10px] text-stone-500 mt-3">
        {overCount > 0 && `${overCount} over budget`}
        {overCount > 0 && nearCount > 0 && ' • '}
        {nearCount > 0 && `${nearCount} near limit`}
      </p>
    </div>
  );
}

// ─── Savings Goal ────────────────────────────────────────────────────────────

function SavingsGoal({ spent, budget }) {
  const savings = Math.max(budget - spent, 0);
  const savingsRate = budget > 0 ? (savings / budget) * 100 : 0;
  
  return (
    <div className="glass-card p-4 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-emerald-500/20">
          <PiggyBank size={20} className="text-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-stone-500">Potential Savings</p>
          <p className="text-xl font-display text-emerald-400">
            {formatCurrency(savings, 'INR')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-display text-emerald-400">
            {savingsRate.toFixed(0)}%
          </p>
          <p className="text-[10px] text-stone-500">of budget</p>
        </div>
      </div>
      
      {savingsRate >= 20 && (
        <div className="mt-3 p-2 bg-emerald-500/10 rounded-lg flex items-center gap-2">
          <Sparkles size={14} className="text-emerald-400" />
          <span className="text-xs text-emerald-400">Great savings rate! Keep it up!</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

// Helper to get default category budgets
function getDefaultCategoryBudgets() {
  const defaults = {};
  for (const cat of getAllCategories()) {
    defaults[cat] = getDefaultCategoryBudget(cat);
  }
  return defaults;
}

// Helper to load budget from localStorage
function loadBudgetFromStorage(userId) {
  if (!userId) return { budget: 30000, categoryBudgets: getDefaultCategoryBudgets() };
  
  try {
    const savedBudget = localStorage.getItem(`expenseSight_budget_${userId}`);
    const savedCategoryBudgets = localStorage.getItem(`expenseSight_categoryBudgets_${userId}`);
    
    return {
      budget: savedBudget ? parseInt(savedBudget, 10) : 30000,
      categoryBudgets: savedCategoryBudgets ? JSON.parse(savedCategoryBudgets) : getDefaultCategoryBudgets(),
    };
  } catch (err) {
    console.error('Error loading budget from storage:', err);
    return { budget: 30000, categoryBudgets: getDefaultCategoryBudgets() };
  }
}

// Helper to save budget to localStorage
function saveBudgetToStorage(userId, budget, categoryBudgets) {
  if (!userId) return;
  
  try {
    localStorage.setItem(`expenseSight_budget_${userId}`, budget.toString());
    localStorage.setItem(`expenseSight_categoryBudgets_${userId}`, JSON.stringify(categoryBudgets));
  } catch (err) {
    console.error('Error saving budget to storage:', err);
  }
}

export default function ESBudget({ expenses, userId }) {
  const [month, setMonth] = useState(new Date());
  const [showSetup, setShowSetup] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Budget state
  const [budget, setBudget] = useState(30000);
  const [categoryBudgets, setCategoryBudgets] = useState(getDefaultCategoryBudgets);

  // Load budget data when userId changes or component mounts
  useEffect(() => {
    if (userId) {
      const { budget: loadedBudget, categoryBudgets: loadedCategoryBudgets } = loadBudgetFromStorage(userId);
      setBudget(loadedBudget);
      setCategoryBudgets(loadedCategoryBudgets);
      setIsInitialized(true);
    }
  }, [userId]);

  // Auto-save budget changes to localStorage (debounced)
  useEffect(() => {
    if (!userId || !isInitialized) return;
    
    const timeoutId = setTimeout(() => {
      saveBudgetToStorage(userId, budget, categoryBudgets);
    }, 500); // Debounce saves by 500ms
    
    return () => clearTimeout(timeoutId);
  }, [userId, budget, categoryBudgets, isInitialized]);

  // Handle budget setup completion
  const handleSetupComplete = (newBudget, newCategoryBudgets) => {
    setBudget(newBudget);
    setCategoryBudgets(newCategoryBudgets);
    // Auto-save effect will handle persisting to localStorage
    setShowSetup(false);
  };

  // Update single category budget
  const handleUpdateCategoryBudget = (category, newBudget) => {
    setCategoryBudgets(prev => ({ ...prev, [category]: newBudget }));
    // Auto-save effect will handle persisting to localStorage
  };

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

  // Calculate totals
  const totalSpent = useMemo(() => {
    return monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [monthExpenses]);

  const categoryBreakdown = useMemo(() => {
    const breakdown = {};
    for (const exp of monthExpenses) {
      breakdown[exp.category] = (breakdown[exp.category] || 0) + exp.amount;
    }
    return Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  }, [monthExpenses]);

  // Calculate remaining days
  const now = new Date();
  const daysInMonth = getDaysInMonth(month);
  const currentDay = Math.min(now.getDate(), daysInMonth);
  const daysLeft = Math.max(daysInMonth - currentDay, 0);

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

  if (showSetup) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display text-stone-200">Budget Setup</h2>
          <button
            onClick={() => setShowSetup(false)}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-200 hover:bg-stone-800/50"
          >
            <X size={18} />
          </button>
        </div>
        <BudgetSetupWizard
          onComplete={handleSetupComplete}
          initialBudget={budget}
          initialCategoryBudgets={categoryBudgets}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display text-stone-200">Budget</h2>
          <p className="text-xs text-stone-500">Track your spending limits</p>
        </div>
        <button
          onClick={() => setShowSetup(true)}
          className="p-2 rounded-xl bg-stone-800/50 text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg bg-stone-800/50 text-stone-400 hover:text-stone-200"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-teal-400" />
          <span className="text-sm font-medium text-stone-200">
            {format(month, 'MMMM yyyy')}
          </span>
        </div>
        <button
          onClick={nextMonth}
          disabled={month >= startOfMonth(new Date())}
          className="p-2 rounded-lg bg-stone-800/50 text-stone-400 hover:text-stone-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Budget Health Gauge */}
      <BudgetHealthGauge 
        spent={totalSpent} 
        budget={budget}
        daysInMonth={daysInMonth}
        currentDay={currentDay}
      />

      {/* Budget Alerts */}
      <BudgetAlerts 
        categories={categoryBreakdown} 
        categoryBudgets={categoryBudgets}
      />

      {/* Allowance Cards */}
      <AllowanceCards 
        remaining={budget - totalSpent} 
        daysLeft={daysLeft}
        expenses={expenses}
        month={month}
      />

      {/* Savings Goal */}
      <SavingsGoal spent={totalSpent} budget={budget} />

      {/* Spending Pace */}
      <SpendingPaceChart 
        expenses={expenses} 
        budget={budget} 
        month={month} 
      />

      {/* Category Budgets */}
      {categoryBreakdown.length > 0 && (
        <CategoryBudgetsList
          categories={categoryBreakdown}
          categoryBudgets={categoryBudgets}
          onEditBudget={handleUpdateCategoryBudget}
        />
      )}
    </div>
  );
}
