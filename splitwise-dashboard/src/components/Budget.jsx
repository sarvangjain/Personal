import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, subMonths, getDaysInMonth, differenceInDays } from 'date-fns';
import { 
  Wallet, 
  Plus, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  Trash2,
  History,
  Receipt,
  TrendingUp,
  AlertCircle,
  Calendar,
  Zap,
  RefreshCw
} from 'lucide-react';
import { 
  getBudget, 
  createOrUpdateBudget, 
  addManualEntry, 
  deleteManualEntry,
  deleteBudget,
  getBudgetHistory,
  getCachedBudget
} from '../firebase/budgetService';
import { 
  computeMonthlyExpensesByCategory, 
  computeMonthlyTotal,
  computeBudgetStatus,
  formatCurrency 
} from '../utils/analytics';
import { isFirebaseConfigured } from '../firebase/config';
import BudgetProgressCard, { CategoryProgressList } from './BudgetProgressCard';
import BudgetSetupModal from './BudgetSetupModal';
import ManualEntryModal from './ManualEntryModal';

export default function Budget({ expenses, userId }) {
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [budgetHistory, setBudgetHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check if Firebase is configured
  const firebaseEnabled = isFirebaseConfigured();

  // Compute days remaining and daily rate
  const budgetPace = useMemo(() => {
    const now = new Date();
    const currentMonthKey = format(now, 'yyyy-MM');
    
    if (currentMonth !== currentMonthKey) {
      return null; // Only show for current month
    }

    const totalDays = getDaysInMonth(now);
    const daysPassed = now.getDate();
    const daysRemaining = totalDays - daysPassed;

    return {
      totalDays,
      daysPassed,
      daysRemaining,
    };
  }, [currentMonth]);

  // Fetch budget for current month with stale-while-revalidate pattern
  const fetchBudget = useCallback(async (forceRefresh = false) => {
    if (!firebaseEnabled || !userId) {
      setLoading(false);
      return;
    }
    
    // Check cache first for instant display
    const cached = getCachedBudget(userId, currentMonth);
    if (cached.found && !forceRefresh) {
      console.log('Using cached budget data');
      setBudget(cached.data);
      setLoading(false);
      // Still fetch in background to ensure fresh data
      setIsRefreshing(true);
      getBudget(userId, currentMonth, { skipCache: true }).then(freshData => {
        setBudget(freshData);
      }).catch(() => {/* ignore background refresh errors */})
        .finally(() => setIsRefreshing(false));
      return;
    }
    
    setLoading(true);
    try {
      const budgetData = await getBudget(userId, currentMonth);
      setBudget(budgetData);
    } catch (error) {
      console.error('Error fetching budget:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, currentMonth, firebaseEnabled]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  // Calculate Splitwise spending for current month
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

  // Navigate months
  function handlePrevMonth() {
    const prevMonth = format(subMonths(new Date(currentMonth + '-01'), 1), 'yyyy-MM');
    setCurrentMonth(prevMonth);
  }

  function handleNextMonth() {
    const now = new Date();
    const current = new Date(currentMonth + '-01');
    if (current < now) {
      const nextMonth = new Date(current);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setCurrentMonth(format(nextMonth, 'yyyy-MM'));
    }
  }

  const isCurrentMonth = currentMonth === format(new Date(), 'yyyy-MM');

  // Handle budget save
  async function handleSaveBudget(budgetData) {
    if (budgetData.copied) {
      // Budget was copied, just refetch
      setShowSetupModal(false);
      fetchBudget();
      return;
    }

    console.log('Saving budget:', budgetData);
    // createOrUpdateBudget now throws on error with user-friendly message
    const result = await createOrUpdateBudget(userId, currentMonth, budgetData);
    console.log('Save result:', result);
    
    // If we got here without throwing, save was successful
    setShowSetupModal(false);
    fetchBudget();
  }

  // Handle manual entry save
  async function handleSaveManualEntry(entryData) {
    const result = await addManualEntry(userId, currentMonth, entryData);
    if (result) {
      setShowManualEntryModal(false);
      fetchBudget();
    }
  }

  // Handle manual entry delete with confirmation
  function confirmDeleteEntry(entry) {
    setEntryToDelete(entry);
  }

  async function handleDeleteManualEntry() {
    if (!entryToDelete) return;
    const result = await deleteManualEntry(userId, currentMonth, entryToDelete.id);
    if (result) {
      fetchBudget();
    }
    setEntryToDelete(null);
  }

  // Handle budget delete
  async function handleDeleteBudget() {
    const result = await deleteBudget(userId, currentMonth);
    if (result) {
      setBudget(null);
      setShowDeleteConfirm(false);
    }
  }

  // Load budget history
  async function handleToggleHistory() {
    if (!showHistory) {
      setHistoryLoading(true);
      try {
        const history = await getBudgetHistory(userId, 6);
        setBudgetHistory(history);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setHistoryLoading(false);
      }
    }
    setShowHistory(!showHistory);
  }

  // Get currency from budget or default
  const currency = budget?.currency || 'INR';

  // No Firebase configured
  if (!firebaseEnabled) {
    return (
      <div className="glass-card p-6 text-center">
        <AlertCircle size={40} className="mx-auto text-amber-400 mb-4" />
        <h3 className="text-lg font-medium text-stone-200 mb-2">Firebase Not Configured</h3>
        <p className="text-sm text-stone-400 max-w-md mx-auto">
          Budget tracking requires Firebase to be configured. Please add your Firebase 
          configuration to the environment variables to enable this feature.
        </p>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="glass-card p-6 animate-pulse">
          <div className="h-6 bg-stone-700 rounded w-1/3 mb-4" />
          <div className="h-10 bg-stone-700 rounded w-1/2 mb-3" />
          <div className="h-4 bg-stone-700 rounded-full w-full" />
        </div>
        <div className="glass-card p-4 animate-pulse">
          <div className="h-4 bg-stone-700 rounded w-1/4 mb-3" />
          <div className="space-y-2">
            <div className="h-12 bg-stone-700 rounded" />
            <div className="h-12 bg-stone-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // No budget set - show setup prompt
  if (!budget || !budget.overallLimit) {
    return (
      <div className="space-y-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <button onClick={handlePrevMonth} className="p-2 text-stone-400 hover:text-stone-200 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h2 className="font-display text-lg text-stone-200">
            {format(new Date(currentMonth + '-01'), 'MMMM yyyy')}
          </h2>
          <button 
            onClick={handleNextMonth} 
            disabled={isCurrentMonth}
            className="p-2 text-stone-400 hover:text-stone-200 transition-colors disabled:opacity-30"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Setup prompt */}
        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <Wallet size={32} className="text-emerald-400" />
          </div>
          <h3 className="text-xl font-display text-stone-100 mb-2">
            Set Up Your Budget
          </h3>
          <p className="text-sm text-stone-400 mb-6 max-w-sm mx-auto">
            Track your spending against monthly limits. Set an overall budget and 
            optionally add limits for specific categories.
          </p>
          <button
            onClick={() => setShowSetupModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors font-medium"
          >
            <Plus size={18} /> Create Budget
          </button>

          {/* Splitwise spending preview */}
          {splitwiseTotal > 0 && (
            <div className="mt-6 pt-6 border-t border-stone-800/50">
              <p className="text-xs text-stone-500 mb-2">Your Splitwise spending this month</p>
              <p className="text-2xl font-display text-stone-200">
                {formatCurrency(splitwiseTotal, currency)}
              </p>
            </div>
          )}
        </div>

        {showSetupModal && (
          <BudgetSetupModal
            onClose={() => setShowSetupModal(false)}
            onSave={handleSaveBudget}
            existingBudget={budget}
            expenses={expenses}
            userId={userId}
            month={currentMonth}
            currency={currency}
          />
        )}
      </div>
    );
  }

  // Budget exists - show dashboard
  return (
    <div className="space-y-4">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={handlePrevMonth} className="p-2 text-stone-400 hover:text-stone-200 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <h2 className="font-display text-lg text-stone-200 flex items-center gap-2 justify-center">
            {format(new Date(currentMonth + '-01'), 'MMMM yyyy')}
            {isRefreshing && (
              <RefreshCw size={14} className="text-stone-500 animate-spin" />
            )}
          </h2>
          {!isCurrentMonth && (
            <p className="text-xs text-stone-500">Viewing past budget</p>
          )}
        </div>
        <button 
          onClick={handleNextMonth} 
          disabled={isCurrentMonth}
          className="p-2 text-stone-400 hover:text-stone-200 transition-colors disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowSetupModal(true)}
          className="flex-1 flex items-center justify-center gap-2 p-3 bg-stone-800/50 hover:bg-stone-800 border border-stone-700/50 rounded-xl text-sm text-stone-300 transition-colors"
        >
          <Settings size={14} /> Edit
        </button>
        <button
          onClick={() => setShowManualEntryModal(true)}
          className="flex-1 flex items-center justify-center gap-2 p-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-sm text-blue-400 transition-colors"
        >
          <Plus size={14} /> Manual
        </button>
        <button
          onClick={handleToggleHistory}
          className={`p-3 border rounded-xl text-sm transition-colors ${
            showHistory 
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
              : 'bg-stone-800/50 border-stone-700/50 text-stone-400 hover:bg-stone-800'
          }`}
          title="Budget History"
        >
          <History size={14} />
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="p-3 bg-stone-800/50 hover:bg-red-500/10 border border-stone-700/50 hover:border-red-500/20 rounded-xl text-sm text-stone-500 hover:text-red-400 transition-colors"
          title="Delete Budget"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Overall Budget Card */}
      {budgetStatus && (
        <BudgetProgressCard
          title="Overall Budget"
          spent={budgetStatus.overall.spent}
          limit={budgetStatus.overall.limit}
          percentage={budgetStatus.overall.percentage}
          status={budgetStatus.overall.status}
          currency={budgetStatus.currency}
          splitwiseAmount={budgetStatus.overall.splitwiseAmount}
          manualAmount={budgetStatus.overall.manualAmount}
          showBreakdown
        />
      )}

      {/* Spending Pace Indicator (only for current month with a budget) */}
      {budgetStatus && budgetPace && budgetStatus.overall.limit > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Zap size={16} className="text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-stone-200">Spending Pace</p>
                <p className="text-xs text-stone-500">
                  {budgetPace.daysRemaining} days left this month
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-stone-200">
                {formatCurrency(budgetStatus.overall.remaining / Math.max(budgetPace.daysRemaining, 1), currency)}
                <span className="text-stone-500 font-normal">/day</span>
              </p>
              <p className="text-xs text-stone-500">
                safe to spend
              </p>
            </div>
          </div>
          
          {/* Pace comparison */}
          {budgetPace.daysPassed > 0 && (
            <div className="mt-3 pt-3 border-t border-stone-800/50">
              {(() => {
                const idealPct = (budgetPace.daysPassed / budgetPace.totalDays) * 100;
                const actualPct = budgetStatus.overall.percentage;
                const diff = actualPct - idealPct;
                const isAhead = diff > 5;
                const isBehind = diff < -5;
                
                return (
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar size={12} className="text-stone-500" />
                    <span className="text-stone-400">
                      Day {budgetPace.daysPassed} of {budgetPace.totalDays}:
                    </span>
                    {isAhead ? (
                      <span className="text-amber-400">
                        Spending {Math.round(diff)}% faster than ideal
                      </span>
                    ) : isBehind ? (
                      <span className="text-emerald-400">
                        Under budget pace by {Math.abs(Math.round(diff))}%
                      </span>
                    ) : (
                      <span className="text-stone-400">On track</span>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Category Progress */}
      {budgetStatus && Object.keys(budgetStatus.categories).length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-medium text-stone-300 mb-3 flex items-center gap-2">
            <TrendingUp size={14} className="text-stone-500" />
            Category Spending
          </h3>
          <CategoryProgressList 
            categories={budgetStatus.categories} 
            currency={budgetStatus.currency}
          />
        </div>
      )}

      {/* Manual Entries */}
      {budget.manualEntries && budget.manualEntries.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-medium text-stone-300 mb-3 flex items-center gap-2">
            <Receipt size={14} className="text-blue-400" />
            Manual Entries
            <span className="text-xs text-stone-500 font-normal">
              ({budget.manualEntries.length})
            </span>
          </h3>
          <div className="space-y-2">
            {budget.manualEntries.map(entry => (
              <div 
                key={entry.id} 
                className="flex items-center justify-between p-3 bg-stone-800/30 rounded-xl"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-200 truncate">{entry.description}</p>
                  <p className="text-xs text-stone-500">
                    {entry.category} • {format(new Date(entry.date), 'MMM d')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-stone-200">
                    {formatCurrency(entry.amount, currency)}
                  </span>
                  <button
                    onClick={() => confirmDeleteEntry(entry)}
                    className="p-1.5 text-stone-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budget History */}
      {showHistory && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-medium text-stone-300 mb-3 flex items-center gap-2">
            <History size={14} className="text-amber-400" />
            Budget History
          </h3>
          {historyLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-12 bg-stone-700 rounded" />
              <div className="h-12 bg-stone-700 rounded" />
            </div>
          ) : budgetHistory.length === 0 ? (
            <p className="text-sm text-stone-500 text-center py-4">
              No budget history found
            </p>
          ) : (
            <div className="space-y-2">
              {budgetHistory.map(histBudget => {
                const histSpending = computeMonthlyExpensesByCategory(expenses, userId, histBudget.month);
                const histTotal = computeMonthlyTotal(expenses, userId, histBudget.month);
                const histStatus = computeBudgetStatus(histBudget, histSpending, histTotal);
                
                return (
                  <div 
                    key={histBudget.month}
                    className="flex items-center justify-between p-3 bg-stone-800/30 rounded-xl"
                  >
                    <div>
                      <p className="text-sm font-medium text-stone-200">
                        {format(new Date(histBudget.month + '-01'), 'MMMM yyyy')}
                      </p>
                      <p className="text-xs text-stone-500">
                        Limit: {formatCurrency(histBudget.overallLimit, histBudget.currency)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        histStatus?.overall.status === 'over_budget' 
                          ? 'text-red-400' 
                          : 'text-stone-200'
                      }`}>
                        {formatCurrency(histStatus?.overall.spent || 0, histBudget.currency)}
                      </p>
                      <p className="text-xs text-stone-500">
                        {histStatus?.overall.percentage || 0}% used
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showSetupModal && (
        <BudgetSetupModal
          onClose={() => setShowSetupModal(false)}
          onSave={handleSaveBudget}
          existingBudget={budget}
          expenses={expenses}
          userId={userId}
          month={currentMonth}
          currency={currency}
        />
      )}

      {showManualEntryModal && (
        <ManualEntryModal
          onClose={() => setShowManualEntryModal(false)}
          onSave={handleSaveManualEntry}
          expenses={expenses}
          month={currentMonth}
          currency={currency}
        />
      )}

      {/* Delete Entry Confirmation */}
      {entryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEntryToDelete(null)}>
          <div className="glass-card p-5 mx-4 max-w-sm animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-medium text-stone-100 mb-2">Delete Entry?</h3>
            <p className="text-sm text-stone-400 mb-4">
              Remove "{entryToDelete.description}" ({formatCurrency(entryToDelete.amount, currency)})?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setEntryToDelete(null)}
                className="flex-1 px-4 py-2 text-sm text-stone-400 hover:text-stone-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteManualEntry}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Budget Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)}>
          <div className="glass-card p-5 mx-4 max-w-sm animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-medium text-stone-100 mb-2">Delete Budget?</h3>
            <p className="text-sm text-stone-400 mb-4">
              This will remove your budget and all manual entries for {format(new Date(currentMonth + '-01'), 'MMMM yyyy')}. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 text-sm text-stone-400 hover:text-stone-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBudget}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors font-medium"
              >
                Delete Budget
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
