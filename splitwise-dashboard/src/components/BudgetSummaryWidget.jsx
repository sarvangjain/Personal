import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Wallet, ChevronRight, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { getBudget } from '../firebase/budgetService';
import { 
  computeMonthlyExpensesByCategory, 
  computeMonthlyTotal,
  computeBudgetStatus,
  formatCurrency 
} from '../utils/analytics';
import { isFirebaseConfigured } from '../firebase/config';

/**
 * Budget summary widget for the Overview tab
 * Shows current month's budget progress with quick stats
 */
export default function BudgetSummaryWidget({ expenses, userId, onNavigate }) {
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentMonth = format(new Date(), 'yyyy-MM');
  const firebaseEnabled = isFirebaseConfigured();

  // Fetch current month's budget
  useEffect(() => {
    async function fetchBudget() {
      if (!firebaseEnabled || !userId) {
        setLoading(false);
        return;
      }
      
      try {
        const budgetData = await getBudget(userId, currentMonth);
        setBudget(budgetData);
      } catch (error) {
        console.debug('Error fetching budget for widget:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchBudget();
  }, [userId, currentMonth, firebaseEnabled]);

  // Calculate spending
  const splitwiseSpending = useMemo(() => {
    return computeMonthlyExpensesByCategory(expenses, userId, currentMonth);
  }, [expenses, userId, currentMonth]);

  const splitwiseTotal = useMemo(() => {
    return computeMonthlyTotal(expenses, userId, currentMonth);
  }, [expenses, userId, currentMonth]);

  // Compute budget status
  const budgetStatus = useMemo(() => {
    if (!budget) return null;
    return computeBudgetStatus(budget, splitwiseSpending, splitwiseTotal);
  }, [budget, splitwiseSpending, splitwiseTotal]);

  // Don't show if Firebase not configured
  if (!firebaseEnabled) return null;

  // Loading state
  if (loading) {
    return (
      <div className="glass-card p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-stone-700 rounded-xl" />
          <div className="flex-1">
            <div className="h-4 bg-stone-700 rounded w-24 mb-2" />
            <div className="h-3 bg-stone-700 rounded w-32" />
          </div>
        </div>
      </div>
    );
  }

  // No budget set - show prompt
  if (!budget || !budget.overallLimit) {
    return (
      <button
        onClick={() => onNavigate('budget')}
        className="glass-card p-4 w-full text-left hover:border-emerald-500/30 transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
              <Wallet size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-stone-200">Set up a budget</p>
              <p className="text-xs text-stone-500">
                {splitwiseTotal > 0 
                  ? `You've spent ${formatCurrency(splitwiseTotal, 'INR')} this month`
                  : 'Track your spending against limits'
                }
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-stone-600 group-hover:text-emerald-400 transition-colors" />
        </div>
      </button>
    );
  }

  // Budget exists - show summary
  const status = budgetStatus?.overall.status;
  const statusConfig = {
    on_track: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    critical: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
    over_budget: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
    no_limit: { icon: Wallet, color: 'text-stone-400', bg: 'bg-stone-500/10' },
  };
  
  const config = statusConfig[status] || statusConfig.no_limit;
  const Icon = config.icon;
  const percentage = budgetStatus?.overall.percentage || 0;
  const spent = budgetStatus?.overall.spent || 0;
  const limit = budgetStatus?.overall.limit || 0;
  const currency = budgetStatus?.currency || 'INR';

  return (
    <button
      onClick={() => onNavigate('budget')}
      className="glass-card p-4 w-full text-left hover:border-emerald-500/30 transition-all group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${config.bg} transition-colors`}>
            <Icon size={18} className={config.color} />
          </div>
          <div>
            <p className="text-sm font-medium text-stone-200">
              {format(new Date(), 'MMMM')} Budget
            </p>
            <p className="text-xs text-stone-500">
              {status === 'over_budget' 
                ? `Over by ${formatCurrency(spent - limit, currency)}`
                : status === 'on_track'
                  ? `${formatCurrency(limit - spent, currency)} remaining`
                  : status === 'warning' || status === 'critical'
                    ? 'Approaching limit'
                    : 'Tracking'
              }
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-stone-200">
            {percentage}%
          </p>
          <ChevronRight size={14} className="text-stone-600 group-hover:text-emerald-400 transition-colors ml-auto" />
        </div>
      </div>

      {/* Mini progress bar */}
      <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ease-out rounded-full ${
            status === 'on_track' ? 'bg-emerald-500' :
            status === 'warning' ? 'bg-amber-500' :
            'bg-red-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      
      <div className="flex justify-between mt-2 text-xs text-stone-500">
        <span>{formatCurrency(spent, currency)}</span>
        <span>{formatCurrency(limit, currency)}</span>
      </div>
    </button>
  );
}
