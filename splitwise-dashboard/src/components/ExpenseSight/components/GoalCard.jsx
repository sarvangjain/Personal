/**
 * GoalCard - Goal progress card with circular progress indicator
 */

import { useState } from 'react';
import { 
  Target, TrendingDown, Calendar, Edit2, Trash2,
  Plus, Minus, CheckCircle2, Clock, Sparkles
} from 'lucide-react';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';
import { formatCurrency } from '../../../utils/analytics';

// Circular progress indicator
function CircularProgress({ progress, size = 80, strokeWidth = 6, color = 'teal' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  const colorClasses = {
    teal: 'stroke-teal-400',
    emerald: 'stroke-emerald-400',
    amber: 'stroke-amber-400',
    rose: 'stroke-rose-400',
  };
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-stone-800"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={colorClasses[color]}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transition: 'stroke-dashoffset 0.5s ease-in-out',
          }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-display text-stone-200">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}

// Add amount modal
function AddAmountModal({ isOpen, onClose, onAdd, goalName }) {
  const [amount, setAmount] = useState('');
  
  if (!isOpen) return null;
  
  const handleSubmit = (e) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (value > 0) {
      onAdd(value);
      setAmount('');
      onClose();
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-stone-900 border border-stone-700/50 rounded-2xl p-4 w-full max-w-sm mx-4">
        <h3 className="text-lg font-display text-stone-200 mb-3">Add to "{goalName}"</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500">₹</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              autoFocus
              className="w-full pl-8 pr-4 py-3 bg-stone-800/50 border border-stone-700/50 rounded-xl text-lg text-stone-200 placeholder-stone-500 focus:outline-none focus:border-teal-500/50"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Add Amount
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-stone-700 hover:bg-stone-600 text-stone-300 text-sm font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function GoalCard({ 
  goal, 
  onAddAmount, 
  onEdit, 
  onDelete,
  suggestedCutbacks = [],
  compact = false 
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  
  const progress = goal.targetAmount > 0 
    ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) 
    : 0;
  const isCompleted = progress >= 100;
  
  // Calculate days remaining
  const deadline = goal.deadline ? parseISO(goal.deadline) : null;
  const daysRemaining = deadline ? differenceInDays(deadline, new Date()) : null;
  const isOverdue = deadline && isPast(deadline) && !isCompleted;
  
  // Calculate required savings per month if deadline exists
  const remainingAmount = goal.targetAmount - goal.currentAmount;
  const monthsRemaining = deadline 
    ? Math.max(1, Math.ceil(differenceInDays(deadline, new Date()) / 30))
    : null;
  const monthlySavingsNeeded = monthsRemaining ? remainingAmount / monthsRemaining : null;
  
  // Determine card color based on progress/status
  const getColor = () => {
    if (isCompleted) return 'emerald';
    if (isOverdue) return 'rose';
    if (progress >= 75) return 'teal';
    return 'amber';
  };
  
  const color = getColor();

  if (compact) {
    return (
      <div className="flex items-center gap-4 p-4 bg-stone-800/30 border border-stone-700/30 rounded-xl">
        <CircularProgress progress={progress} size={50} strokeWidth={4} color={color} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-stone-200 truncate">{goal.name}</p>
            {isCompleted && <CheckCircle2 size={14} className="text-emerald-400" />}
          </div>
          <p className="text-xs text-stone-500">
            {formatCurrency(goal.currentAmount, 'INR')} of {formatCurrency(goal.targetAmount, 'INR')}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="p-2.5 sm:p-2 rounded-lg bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 active:bg-teal-500/40 transition-colors touch-manipulation"
        >
          <Plus size={18} className="sm:w-4 sm:h-4" />
        </button>
        <AddAmountModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={(amount) => onAddAmount(goal.id, amount)}
          goalName={goal.name}
        />
      </div>
    );
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${
      isCompleted 
        ? 'bg-emerald-500/5 border-emerald-500/30' 
        : isOverdue
          ? 'bg-red-500/5 border-red-500/30'
          : 'bg-stone-800/30 border-stone-700/30'
    }`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          <CircularProgress progress={progress} size={80} color={color} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Target size={14} className="text-stone-500" />
              <span className="text-[10px] text-stone-500 uppercase tracking-wider">
                {goal.trackingType === 'savings' ? 'Savings Goal' : 'Spending Limit'}
              </span>
            </div>
            <h3 className="text-lg font-display text-stone-200">{goal.name}</h3>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-display text-stone-200">
                {formatCurrency(goal.currentAmount, 'INR')}
              </span>
              <span className="text-sm text-stone-500">
                / {formatCurrency(goal.targetAmount, 'INR')}
              </span>
            </div>
          </div>
        </div>
        
        {/* Deadline info */}
        {deadline && (
          <div className={`flex items-center gap-2 mt-3 text-xs ${
            isOverdue ? 'text-red-400' : isCompleted ? 'text-emerald-400' : 'text-stone-400'
          }`}>
            {isCompleted ? (
              <>
                <CheckCircle2 size={14} />
                <span>Goal completed!</span>
              </>
            ) : isOverdue ? (
              <>
                <Clock size={14} />
                <span>Deadline passed - {format(deadline, 'MMM d, yyyy')}</span>
              </>
            ) : (
              <>
                <Calendar size={14} />
                <span>
                  {daysRemaining} days remaining • Due {format(deadline, 'MMM d, yyyy')}
                </span>
              </>
            )}
          </div>
        )}
        
        {/* Monthly savings needed */}
        {monthlySavingsNeeded && !isCompleted && !isOverdue && (
          <div className="mt-3 p-2 bg-stone-800/50 rounded-lg">
            <p className="text-xs text-stone-400">
              Save <span className="text-teal-400 font-medium">{formatCurrency(monthlySavingsNeeded, 'INR')}</span> per month to reach your goal
            </p>
          </div>
        )}
      </div>
      
      {/* Cutback Suggestions */}
      {suggestedCutbacks.length > 0 && !isCompleted && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 text-xs text-stone-500 mb-2">
            <Sparkles size={12} className="text-amber-400" />
            <span>Suggested cutbacks</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedCutbacks.map(cutback => (
              <div 
                key={cutback.category}
                className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs"
              >
                <span className="text-amber-400">{cutback.category}</span>
                <span className="text-stone-500 ml-1">−{formatCurrency(cutback.potentialSavings, 'INR')}/mo</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex items-center border-t border-stone-700/30">
        {!isCompleted && (
          <>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-stone-400 hover:bg-stone-800/50 hover:text-teal-400 transition-colors"
            >
              <Plus size={16} />
              Add Amount
            </button>
            <div className="w-px h-8 bg-stone-700/30" />
          </>
        )}
        <button
          onClick={() => onEdit(goal)}
          className="px-4 py-3 text-stone-400 hover:bg-stone-800/50 hover:text-teal-400 transition-colors"
          title="Edit goal"
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={() => onDelete(goal.id)}
          className="px-4 py-3 text-stone-400 hover:bg-stone-800/50 hover:text-red-400 transition-colors"
          title="Delete goal"
        >
          <Trash2 size={16} />
        </button>
      </div>
      
      <AddAmountModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(amount) => onAddAmount(goal.id, amount)}
        goalName={goal.name}
      />
    </div>
  );
}
