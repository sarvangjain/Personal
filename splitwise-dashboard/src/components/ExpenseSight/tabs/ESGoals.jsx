/**
 * ESGoals - Smart Goals tab for savings targets and spending limits
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Target, Loader2, RefreshCw, Trophy, 
  Sparkles, TrendingUp
} from 'lucide-react';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { formatCurrency } from '../../../utils/analytics';
import { 
  getGoals, 
  createGoal, 
  updateGoal, 
  deleteGoal, 
  addToGoal 
} from '../../../firebase/expenseSightService';
import GoalCard from '../components/GoalCard';
import GoalWizard from '../components/GoalWizard';

export default function ESGoals({ userId, expenses = [] }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [error, setError] = useState(null);

  // Calculate current month's category spending for cutback suggestions
  const categorySpending = useMemo(() => {
    const now = new Date();
    const monthInterval = { start: startOfMonth(now), end: endOfMonth(now) };
    
    const spending = {};
    
    for (const exp of expenses) {
      if (exp.isRefund || exp.cancelled || exp.isPending) continue;
      
      const expDate = parseISO(exp.date);
      if (!isWithinInterval(expDate, monthInterval)) continue;
      
      const category = exp.category || 'Other';
      spending[category] = (spending[category] || 0) + exp.amount;
    }
    
    return spending;
  }, [expenses]);

  // Load goals
  const loadGoals = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getGoals(userId);
      setGoals(data);
    } catch (err) {
      console.error('Error loading goals:', err);
      setError('Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  // Create or update goal
  const handleSaveGoal = useCallback(async (goalData) => {
    if (!userId) return;
    
    if (editingGoal) {
      const result = await updateGoal(userId, editingGoal.id, goalData);
      if (!result.success) throw new Error(result.error);
    } else {
      const result = await createGoal(userId, goalData);
      if (!result.success) throw new Error(result.error);
    }
    
    await loadGoals();
    setEditingGoal(null);
  }, [userId, editingGoal, loadGoals]);

  // Add amount to goal
  const handleAddAmount = useCallback(async (goalId, amount) => {
    if (!userId) return;
    
    const result = await addToGoal(userId, goalId, amount);
    if (result.success) {
      setGoals(prev => prev.map(g => 
        g.id === goalId ? { ...g, currentAmount: result.newAmount } : g
      ));
    }
  }, [userId]);

  // Delete goal
  const handleDeleteGoal = useCallback(async (goalId) => {
    if (!userId) return;
    if (!window.confirm('Are you sure you want to delete this goal?')) return;
    
    const result = await deleteGoal(userId, goalId);
    if (result.success) {
      setGoals(prev => prev.filter(g => g.id !== goalId));
    }
  }, [userId]);

  // Open edit wizard
  const handleEditGoal = useCallback((goal) => {
    setEditingGoal(goal);
    setShowWizard(true);
  }, []);

  // Calculate cutback suggestions for each goal
  const getGoalCutbacks = useCallback((goal) => {
    if (!goal.deadline || goal.trackingType !== 'savings') return [];
    
    const deadline = new Date(goal.deadline);
    const remaining = goal.targetAmount - goal.currentAmount;
    const monthsToGoal = Math.max(1, Math.ceil((deadline - new Date()) / (30 * 24 * 60 * 60 * 1000)));
    const monthlySavingsNeeded = remaining / monthsToGoal;
    
    // Only suggest cutbacks if monthly savings needed is significant
    if (monthlySavingsNeeded < 1000) return [];
    
    const cutbackCandidates = ['Entertainment', 'Shopping', 'Food & Dining', 'Subscriptions'];
    const suggestions = [];
    
    for (const category of cutbackCandidates) {
      const spending = categorySpending[category] || 0;
      if (spending > 0) {
        const cutbackPercent = 0.25; // 25% reduction
        const potentialSavings = Math.round(spending * cutbackPercent);
        
        if (potentialSavings >= 500) {
          suggestions.push({
            category,
            potentialSavings,
          });
        }
      }
    }
    
    return suggestions.sort((a, b) => b.potentialSavings - a.potentialSavings).slice(0, 2);
  }, [categorySpending]);

  // Stats
  const stats = useMemo(() => {
    const activeGoals = goals.filter(g => g.isActive !== false);
    const completedGoals = activeGoals.filter(g => g.currentAmount >= g.targetAmount);
    const totalTarget = activeGoals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalSaved = activeGoals.reduce((sum, g) => sum + g.currentAmount, 0);
    const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
    
    return {
      total: activeGoals.length,
      completed: completedGoals.length,
      totalTarget,
      totalSaved,
      overallProgress,
    };
  }, [goals]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-teal-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display text-stone-200">Smart Goals</h2>
          <p className="text-xs text-stone-500">{stats.total} active goals</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadGoals}
            className="p-2 rounded-xl bg-stone-800/50 text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => { setEditingGoal(null); setShowWizard(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={16} />
            New Goal
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-stone-800/30 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-teal-400" />
              <p className="text-xs text-stone-500">Total Progress</p>
            </div>
            <p className="text-xl font-display text-stone-200">
              {Math.round(stats.overallProgress)}%
            </p>
            <p className="text-xs text-stone-500 mt-1">
              {formatCurrency(stats.totalSaved, 'INR')} saved
            </p>
          </div>
          <div className="p-4 bg-stone-800/30 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Trophy size={14} className="text-amber-400" />
              <p className="text-xs text-stone-500">Completed</p>
            </div>
            <p className="text-xl font-display text-stone-200">
              {stats.completed}/{stats.total}
            </p>
            <p className="text-xs text-stone-500 mt-1">goals achieved</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center">
            <Target size={36} className="text-teal-400" />
          </div>
          <div>
            <p className="text-stone-300 font-medium">No goals yet</p>
            <p className="text-xs text-stone-500 mt-1">
              Set savings goals and track your progress
            </p>
          </div>
          
          {/* Quick suggestions */}
          <div className="pt-4">
            <p className="text-xs text-stone-500 mb-3">Popular goals to start with:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['Emergency Fund', 'Vacation', 'New Gadget'].map(name => (
                <button
                  key={name}
                  onClick={() => { setEditingGoal(null); setShowWizard(true); }}
                  className="px-3 py-2 bg-stone-800/50 border border-stone-700/50 rounded-lg text-xs text-stone-300 hover:bg-stone-800 hover:border-stone-600 transition-colors"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={() => { setEditingGoal(null); setShowWizard(true); }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={16} />
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active goals */}
          {goals
            .filter(g => g.currentAmount < g.targetAmount)
            .map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onAddAmount={handleAddAmount}
                onEdit={handleEditGoal}
                onDelete={handleDeleteGoal}
                suggestedCutbacks={getGoalCutbacks(goal)}
              />
            ))}
          
          {/* Completed goals */}
          {goals.filter(g => g.currentAmount >= g.targetAmount).length > 0 && (
            <div className="pt-4">
              <h3 className="text-sm font-medium text-emerald-400 flex items-center gap-2 mb-3">
                <Trophy size={16} />
                Completed Goals
              </h3>
              <div className="space-y-3">
                {goals
                  .filter(g => g.currentAmount >= g.targetAmount)
                  .map(goal => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onAddAmount={handleAddAmount}
                      onEdit={handleEditGoal}
                      onDelete={handleDeleteGoal}
                      compact
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tips Section */}
      {goals.length > 0 && goals.some(g => g.currentAmount < g.targetAmount) && (
        <div className="p-4 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-500/20 rounded-xl">
          <div className="flex items-start gap-3">
            <Sparkles size={18} className="text-teal-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-stone-200 mb-1">Tip</p>
              <p className="text-xs text-stone-400">
                Set up automatic transfers to a separate savings account to make reaching your goals easier. 
                Even small regular contributions add up over time!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Goal Wizard Modal */}
      <GoalWizard
        isOpen={showWizard}
        onClose={() => { setShowWizard(false); setEditingGoal(null); }}
        onSave={handleSaveGoal}
        editingGoal={editingGoal}
        categorySpending={categorySpending}
      />
    </div>
  );
}
