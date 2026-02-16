/**
 * ESSavings - Enhanced savings goals with contributions history and auto-allocation
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, PiggyBank, Target, Plane, Car, Home, Gift, GraduationCap, Heart,
  Smartphone, Laptop, Umbrella, Briefcase, Star, RefreshCw, Trash2, Edit2,
  ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, Check, Settings,
  Calendar, Percent, Sparkles, History
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { formatCurrency } from '../../../../utils/analytics';
import { 
  getGoals, createGoal, updateGoal, deleteGoal, addContribution, getContributions,
  deleteContribution, GOAL_ICONS, GOAL_COLORS
} from '../../../../firebase/expenseSightService';

// Icon mapping
const ICON_MAP = {
  plane: Plane,
  car: Car,
  home: Home,
  gift: Gift,
  'graduation-cap': GraduationCap,
  heart: Heart,
  smartphone: Smartphone,
  laptop: Laptop,
  'piggy-bank': PiggyBank,
  umbrella: Umbrella,
  briefcase: Briefcase,
  star: Star,
};

// Color mapping
const COLOR_MAP = {
  teal: { bg: 'bg-teal-500/20', text: 'text-teal-400', bar: 'bg-teal-500' },
  cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', bar: 'bg-cyan-500' },
  emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', bar: 'bg-emerald-500' },
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', bar: 'bg-blue-500' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', bar: 'bg-purple-500' },
  pink: { bg: 'bg-pink-500/20', text: 'text-pink-400', bar: 'bg-pink-500' },
  amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', bar: 'bg-amber-500' },
  orange: { bg: 'bg-orange-500/20', text: 'text-orange-400', bar: 'bg-orange-500' },
  red: { bg: 'bg-red-500/20', text: 'text-red-400', bar: 'bg-red-500' },
  indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', bar: 'bg-indigo-500' },
  rose: { bg: 'bg-rose-500/20', text: 'text-rose-400', bar: 'bg-rose-500' },
  lime: { bg: 'bg-lime-500/20', text: 'text-lime-400', bar: 'bg-lime-500' },
};

// Goal Card with contributions
function GoalCard({ goal, onEdit, onDelete, onAddContribution, onViewHistory }) {
  const [showDetails, setShowDetails] = useState(false);
  const Icon = ICON_MAP[goal.icon] || PiggyBank;
  const colors = COLOR_MAP[goal.color] || COLOR_MAP.teal;
  
  const progress = goal.targetAmount > 0 
    ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) 
    : 0;
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  
  // Days until deadline
  const daysLeft = goal.deadline 
    ? differenceInDays(parseISO(goal.deadline), new Date())
    : null;

  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${colors.bg} ${colors.text}`}>
            <Icon size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-stone-200">{goal.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {goal.autoAllocatePercent > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center gap-1">
                  <Sparkles size={8} /> Auto {goal.autoAllocatePercent}%
                </span>
              )}
              {daysLeft !== null && (
                <span className={`text-[10px] ${daysLeft < 30 ? 'text-amber-400' : 'text-stone-500'}`}>
                  {daysLeft > 0 ? `${daysLeft}d left` : 'Deadline passed'}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="p-1 text-stone-500 hover:text-stone-300"
        >
          {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      
      {/* Progress */}
      <div className="mt-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span className={colors.text}>{formatCurrency(goal.currentAmount, 'INR')}</span>
          <span className="text-stone-500">{formatCurrency(goal.targetAmount, 'INR')}</span>
        </div>
        <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
          <div 
            className={`h-full ${colors.bar} transition-all duration-500`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-stone-500 mt-1.5">
          {progress.toFixed(1)}% complete • {formatCurrency(remaining, 'INR')} to go
        </p>
      </div>
      
      {/* Quick Add */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onAddContribution(goal, 1000)}
          className="flex-1 py-2 bg-stone-800/50 text-stone-400 rounded-lg text-xs hover:bg-stone-800"
        >
          +₹1K
        </button>
        <button
          onClick={() => onAddContribution(goal, 5000)}
          className="flex-1 py-2 bg-stone-800/50 text-stone-400 rounded-lg text-xs hover:bg-stone-800"
        >
          +₹5K
        </button>
        <button
          onClick={() => onAddContribution(goal, 10000)}
          className="flex-1 py-2 bg-stone-800/50 text-stone-400 rounded-lg text-xs hover:bg-stone-800"
        >
          +₹10K
        </button>
        <button
          onClick={() => onAddContribution(goal, 'custom')}
          className={`flex-1 py-2 ${colors.bg} ${colors.text} rounded-lg text-xs hover:opacity-80`}
        >
          Custom
        </button>
      </div>
      
      {showDetails && (
        <div className="mt-4 pt-3 border-t border-stone-800 space-y-3">
          {/* Auto-allocation info */}
          {goal.autoAllocatePercent > 0 && (
            <div className="p-2 bg-emerald-500/10 rounded-lg text-xs">
              <p className="text-emerald-400 flex items-center gap-1">
                <Sparkles size={12} /> Auto-allocation enabled
              </p>
              <p className="text-stone-400 mt-1">
                {goal.autoAllocatePercent}% of income from {(goal.linkedIncomeCategories || []).join(', ')}
              </p>
            </div>
          )}
          
          <div className="flex gap-2">
            <button
              onClick={() => onViewHistory(goal)}
              className="flex-1 py-2 bg-stone-800 text-stone-400 rounded-lg text-xs hover:bg-stone-700 flex items-center justify-center gap-1"
            >
              <History size={12} /> History
            </button>
            <button
              onClick={() => onEdit(goal)}
              className="flex-1 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs hover:bg-cyan-500/30 flex items-center justify-center gap-1"
            >
              <Edit2 size={12} /> Edit
            </button>
            <button
              onClick={() => onDelete(goal.id)}
              className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-lg text-xs hover:bg-red-500/30 flex items-center justify-center gap-1"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Goal Form Modal
function GoalForm({ isOpen, onClose, onSave, editingGoal = null }) {
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
    icon: 'piggy-bank',
    color: 'teal',
    autoAllocatePercent: '0',
    linkedIncomeCategories: ['salary', 'freelance', 'bonus'],
    priority: '1',
  });
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (editingGoal) {
      setFormData({
        name: editingGoal.name || '',
        targetAmount: editingGoal.targetAmount?.toString() || '',
        currentAmount: editingGoal.currentAmount?.toString() || '0',
        deadline: editingGoal.deadline || '',
        icon: editingGoal.icon || 'piggy-bank',
        color: editingGoal.color || 'teal',
        autoAllocatePercent: editingGoal.autoAllocatePercent?.toString() || '0',
        linkedIncomeCategories: editingGoal.linkedIncomeCategories || ['salary', 'freelance', 'bonus'],
        priority: editingGoal.priority?.toString() || '1',
      });
      setShowAdvanced(editingGoal.autoAllocatePercent > 0);
    } else {
      setFormData({
        name: '',
        targetAmount: '',
        currentAmount: '0',
        deadline: '',
        icon: 'piggy-bank',
        color: 'teal',
        autoAllocatePercent: '0',
        linkedIncomeCategories: ['salary', 'freelance', 'bonus'],
        priority: '1',
      });
      setShowAdvanced(false);
    }
  }, [editingGoal, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.targetAmount) return;
    
    setSaving(true);
    await onSave({
      ...formData,
      targetAmount: parseFloat(formData.targetAmount),
      currentAmount: parseFloat(formData.currentAmount) || 0,
      autoAllocatePercent: parseInt(formData.autoAllocatePercent) || 0,
      priority: parseInt(formData.priority) || 1,
    });
    setSaving(false);
    onClose();
  };

  const toggleCategory = (cat) => {
    const current = formData.linkedIncomeCategories;
    if (current.includes(cat)) {
      setFormData({ ...formData, linkedIncomeCategories: current.filter(c => c !== cat) });
    } else {
      setFormData({ ...formData, linkedIncomeCategories: [...current, cat] });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md mx-auto bg-stone-900 border border-stone-700/50 rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto animate-slide-up">
        <h3 className="text-lg font-display text-stone-200 mb-4">
          {editingGoal ? 'Edit Goal' : 'Create Goal'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs text-stone-500 uppercase tracking-wider">Goal Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Vacation to Goa"
              className="w-full mt-1 px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-teal-500"
              required
            />
          </div>
          
          {/* Icon & Color */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-500 uppercase tracking-wider">Icon</label>
              <div className="grid grid-cols-4 gap-1 mt-1">
                {GOAL_ICONS.map((icon) => {
                  const IconComp = ICON_MAP[icon] || PiggyBank;
                  return (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`p-2 rounded-lg border ${
                        formData.icon === icon
                          ? 'border-teal-500 bg-teal-500/20 text-teal-400'
                          : 'border-stone-700 text-stone-500 hover:border-stone-600'
                      }`}
                    >
                      <IconComp size={16} />
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div>
              <label className="text-xs text-stone-500 uppercase tracking-wider">Color</label>
              <div className="grid grid-cols-4 gap-1 mt-1">
                {GOAL_COLORS.map((color) => {
                  const colors = COLOR_MAP[color] || COLOR_MAP.teal;
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`p-2 rounded-lg border ${
                        formData.color === color
                          ? `border-${color}-500 ${colors.bg}`
                          : 'border-stone-700 hover:border-stone-600'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full ${colors.bar}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Amounts */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-500 uppercase tracking-wider">Target Amount</label>
              <input
                type="number"
                value={formData.targetAmount}
                onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                placeholder="Goal amount"
                className="w-full mt-1 px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-teal-500"
                required
              />
            </div>
            <div>
              <label className="text-xs text-stone-500 uppercase tracking-wider">Current Saved</label>
              <input
                type="number"
                value={formData.currentAmount}
                onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                placeholder="0"
                className="w-full mt-1 px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
          
          {/* Deadline */}
          <div>
            <label className="text-xs text-stone-500 uppercase tracking-wider">Deadline (optional)</label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="w-full mt-1 px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-stone-200 focus:outline-none focus:border-teal-500"
            />
          </div>
          
          {/* Advanced: Auto-allocation */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between py-2 text-sm text-stone-400 hover:text-stone-300"
          >
            <span className="flex items-center gap-2">
              <Sparkles size={14} />
              Auto-allocation settings
            </span>
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          {showAdvanced && (
            <div className="space-y-3 p-3 bg-stone-800/50 rounded-xl">
              <div>
                <label className="text-xs text-stone-500 uppercase tracking-wider flex items-center gap-1">
                  <Percent size={10} /> Auto-allocate percent
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.autoAllocatePercent}
                  onChange={(e) => setFormData({ ...formData, autoAllocatePercent: e.target.value })}
                  placeholder="0"
                  className="w-full mt-1 px-4 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 text-sm focus:outline-none focus:border-teal-500"
                />
                <p className="text-[10px] text-stone-600 mt-1">% of income to auto-save (0 = manual only)</p>
              </div>
              
              <div>
                <label className="text-xs text-stone-500 uppercase tracking-wider">From income types</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {['salary', 'freelance', 'bonus', 'dividend', 'interest', 'other'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`px-2 py-1 rounded text-[10px] ${
                        formData.linkedIncomeCategories.includes(cat)
                          ? 'bg-teal-500/20 text-teal-400'
                          : 'bg-stone-700 text-stone-500'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-xs text-stone-500 uppercase tracking-wider">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full mt-1 px-4 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 text-sm focus:outline-none focus:border-teal-500"
                >
                  <option value="1">1 (Highest)</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5 (Lowest)</option>
                </select>
                <p className="text-[10px] text-stone-600 mt-1">Higher priority goals get funded first</p>
              </div>
            </div>
          )}
          
          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-stone-800 text-stone-400 rounded-xl hover:bg-stone-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.name || !formData.targetAmount}
              className="flex-1 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : (editingGoal ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Custom Contribution Modal
function ContributionModal({ isOpen, onClose, goal, onSave }) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('manual');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setType('manual');
      setNotes('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !goal) return;
    
    setSaving(true);
    await onSave(goal.id, {
      amount: type === 'withdrawal' ? -Math.abs(parseFloat(amount)) : parseFloat(amount),
      type,
      notes,
    });
    setSaving(false);
    onClose();
  };

  if (!isOpen || !goal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-sm mx-4 bg-stone-900 border border-stone-700/50 rounded-2xl p-6 animate-slide-up">
        <h3 className="text-lg font-display text-stone-200 mb-2">Add to {goal.name}</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType('manual')}
              className={`flex-1 py-2 rounded-lg text-xs ${
                type === 'manual' ? 'bg-teal-500/20 text-teal-400' : 'bg-stone-800 text-stone-400'
              }`}
            >
              Deposit
            </button>
            <button
              type="button"
              onClick={() => setType('withdrawal')}
              className={`flex-1 py-2 rounded-lg text-xs ${
                type === 'withdrawal' ? 'bg-red-500/20 text-red-400' : 'bg-stone-800 text-stone-400'
              }`}
            >
              Withdrawal
            </button>
          </div>
          
          <div>
            <label className="text-xs text-stone-500 uppercase tracking-wider">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full mt-1 px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-stone-200 focus:outline-none focus:border-teal-500"
              required
              autoFocus
            />
          </div>
          
          <div>
            <label className="text-xs text-stone-500 uppercase tracking-wider">Note (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note..."
              className="w-full mt-1 px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-teal-500"
            />
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-stone-800 text-stone-400 rounded-xl hover:bg-stone-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !amount}
              className={`flex-1 py-3 rounded-xl text-white disabled:opacity-50 ${
                type === 'withdrawal' ? 'bg-red-600 hover:bg-red-500' : 'bg-teal-600 hover:bg-teal-500'
              }`}
            >
              {saving ? 'Saving...' : (type === 'withdrawal' ? 'Withdraw' : 'Add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Contribution History Modal
function ContributionHistoryModal({ isOpen, onClose, goal, userId }) {
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && goal) {
      setLoading(true);
      getContributions(userId, goal.id)
        .then(setContributions)
        .finally(() => setLoading(false));
    }
  }, [isOpen, goal, userId]);

  if (!isOpen || !goal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md mx-auto bg-stone-900 border border-stone-700/50 rounded-t-3xl sm:rounded-3xl p-6 max-h-[80vh] overflow-hidden animate-slide-up">
        <h3 className="text-lg font-display text-stone-200 mb-2">Contribution History</h3>
        <p className="text-sm text-stone-400 mb-4">{goal.name}</p>
        
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {loading ? (
            <p className="text-center text-stone-500 py-4">Loading...</p>
          ) : contributions.length === 0 ? (
            <p className="text-center text-stone-500 py-4">No contributions yet</p>
          ) : (
            contributions.map((contrib) => (
              <div key={contrib.id} className="flex items-center justify-between p-3 bg-stone-800/50 rounded-lg">
                <div>
                  <p className={`text-sm font-medium ${
                    contrib.type === 'withdrawal' ? 'text-red-400' : 
                    contrib.type === 'auto' ? 'text-emerald-400' : 'text-teal-400'
                  }`}>
                    {contrib.type === 'withdrawal' ? 'Withdrawal' : 
                     contrib.type === 'auto' ? 'Auto-allocated' : 'Manual deposit'}
                  </p>
                  <p className="text-xs text-stone-500">{contrib.date}</p>
                  {contrib.notes && (
                    <p className="text-xs text-stone-600 mt-0.5">{contrib.notes}</p>
                  )}
                </div>
                <p className={`text-sm font-medium ${
                  contrib.amount < 0 ? 'text-red-400' : 'text-emerald-400'
                }`}>
                  {contrib.amount >= 0 ? '+' : ''}{formatCurrency(contrib.amount, 'INR')}
                </p>
              </div>
            ))
          )}
        </div>
        
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 bg-stone-800 text-stone-400 rounded-xl hover:bg-stone-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// Main Component
export default function ESSavings({ userId, onRefresh }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [contributionGoal, setContributionGoal] = useState(null);
  const [historyGoal, setHistoryGoal] = useState(null);

  // Load goals
  const loadGoals = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getGoals(userId);
      setGoals(data.filter(g => g.isActive));
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  // Stats
  const stats = useMemo(() => {
    const totalTarget = goals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);
    const totalSaved = goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
    const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
    const autoGoals = goals.filter(g => (g.autoAllocatePercent || 0) > 0).length;
    
    return { totalTarget, totalSaved, overallProgress, count: goals.length, autoGoals };
  }, [goals]);

  // Handlers
  const handleSave = async (data) => {
    if (editingGoal) {
      await updateGoal(userId, editingGoal.id, data);
    } else {
      await createGoal(userId, data);
    }
    setEditingGoal(null);
    loadGoals();
    if (onRefresh) onRefresh();
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setShowForm(true);
  };

  const handleDelete = async (goalId) => {
    if (window.confirm('Delete this goal?')) {
      await deleteGoal(userId, goalId);
      loadGoals();
      if (onRefresh) onRefresh();
    }
  };

  const handleAddContribution = async (goal, amount) => {
    if (amount === 'custom') {
      setContributionGoal(goal);
      return;
    }
    
    await addContribution(userId, goal.id, { amount, type: 'manual' });
    loadGoals();
    if (onRefresh) onRefresh();
  };

  const handleSaveContribution = async (goalId, data) => {
    await addContribution(userId, goalId, data);
    loadGoals();
    if (onRefresh) onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display text-stone-200 flex items-center gap-2">
            <Target size={20} className="text-teal-400" />
            Savings Goals
          </h2>
          <p className="text-xs text-stone-500">Track your savings progress</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadGoals}
            className="p-2 rounded-xl bg-stone-800/50 text-stone-400 hover:text-stone-200"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => { setEditingGoal(null); setShowForm(true); }}
            className="px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-500 flex items-center gap-2 text-sm"
          >
            <Plus size={16} /> New Goal
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="glass-card p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-xs text-stone-500">Total Saved</p>
            <p className="text-xl font-display text-stone-200">
              {formatCurrency(stats.totalSaved, 'INR')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-stone-500">Target</p>
            <p className="text-sm text-stone-400">{formatCurrency(stats.totalTarget, 'INR')}</p>
          </div>
        </div>
        
        <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500"
            style={{ width: `${Math.min(100, stats.overallProgress)}%` }}
          />
        </div>
        
        <div className="flex justify-between mt-2 text-xs text-stone-500">
          <span>{stats.overallProgress.toFixed(1)}% overall</span>
          <span>{stats.count} goals • {stats.autoGoals} auto-saving</span>
        </div>
      </div>

      {/* Goals List */}
      {loading ? (
        <div className="text-center py-8 text-stone-500">Loading...</div>
      ) : goals.length === 0 ? (
        <div className="text-center py-8">
          <PiggyBank size={32} className="mx-auto text-stone-600 mb-2" />
          <p className="text-stone-500 text-sm">No savings goals yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 px-4 py-2 bg-teal-600/20 text-teal-400 rounded-xl text-sm hover:bg-teal-600/30"
          >
            Create your first goal
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAddContribution={handleAddContribution}
              onViewHistory={(g) => setHistoryGoal(g)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <GoalForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingGoal(null); }}
        onSave={handleSave}
        editingGoal={editingGoal}
      />
      
      <ContributionModal
        isOpen={!!contributionGoal}
        onClose={() => setContributionGoal(null)}
        goal={contributionGoal}
        onSave={handleSaveContribution}
      />
      
      <ContributionHistoryModal
        isOpen={!!historyGoal}
        onClose={() => setHistoryGoal(null)}
        goal={historyGoal}
        userId={userId}
      />
    </div>
  );
}
