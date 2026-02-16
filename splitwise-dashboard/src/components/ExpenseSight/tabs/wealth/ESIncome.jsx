/**
 * ESIncome - Income tracking tab with list, summary, and add functionality
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, Briefcase, Laptop, Gift, Heart, Percent, TrendingUp, RotateCcw,
  Home, Circle, RefreshCw, Trash2, Edit2, Check, X, Search,
  Calendar, ChevronDown, Wallet, Sparkles, PiggyBank, Target
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { formatCurrency } from '../../../../utils/analytics';
import { 
  getIncome, addIncome, updateIncome, deleteIncome, getIncomeStats,
  getAllocatableGoals, calculateAllocations, executeAllocations,
  INCOME_CATEGORIES 
} from '../../../../firebase/expenseSightService';

// Icon mapping
const ICON_MAP = {
  briefcase: Briefcase,
  laptop: Laptop,
  gift: Gift,
  heart: Heart,
  percent: Percent,
  'trending-up': TrendingUp,
  'rotate-ccw': RotateCcw,
  home: Home,
  circle: Circle,
};

// Color mapping
const COLOR_MAP = {
  emerald: 'bg-emerald-500/20 text-emerald-400',
  cyan: 'bg-cyan-500/20 text-cyan-400',
  amber: 'bg-amber-500/20 text-amber-400',
  pink: 'bg-pink-500/20 text-pink-400',
  blue: 'bg-blue-500/20 text-blue-400',
  purple: 'bg-purple-500/20 text-purple-400',
  teal: 'bg-teal-500/20 text-teal-400',
  orange: 'bg-orange-500/20 text-orange-400',
  stone: 'bg-stone-500/20 text-stone-400',
};

// Summary Card
function SummaryCard({ title, value, subtitle, icon: Icon, color = 'emerald' }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-xl ${COLOR_MAP[color]}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-xl font-display text-stone-200">{value}</p>
      <p className="text-xs text-stone-500 mt-1">{title}</p>
      {subtitle && <p className="text-[10px] text-stone-600 mt-0.5">{subtitle}</p>}
    </div>
  );
}

// Income Item
function IncomeItem({ income, onEdit, onDelete }) {
  const category = INCOME_CATEGORIES.find(c => c.id === income.category) || INCOME_CATEGORIES[8];
  const Icon = ICON_MAP[category.icon] || Circle;
  
  return (
    <div className="flex items-center gap-3 p-3 bg-stone-800/30 rounded-xl hover:bg-stone-800/50 transition-colors group">
      <div className={`p-2 rounded-lg ${COLOR_MAP[category.color]}`}>
        <Icon size={16} />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-200 truncate">{income.source || category.label}</p>
        <p className="text-xs text-stone-500">{format(parseISO(income.date), 'MMM d, yyyy')}</p>
      </div>
      
      <div className="text-right">
        <p className="text-sm font-medium text-emerald-400">+{formatCurrency(income.amount, 'INR')}</p>
        <p className="text-[10px] text-stone-600">{category.label}</p>
      </div>
      
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => onEdit(income)}
          className="p-1.5 rounded-lg bg-stone-700/50 text-stone-400 hover:text-stone-200"
        >
          <Edit2 size={14} />
        </button>
        <button 
          onClick={() => onDelete(income.id)}
          className="p-1.5 rounded-lg bg-stone-700/50 text-stone-400 hover:text-red-400"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// Add/Edit Income Modal
function IncomeForm({ isOpen, onClose, onSave, editingIncome = null }) {
  const [formData, setFormData] = useState({
    amount: '',
    source: '',
    category: 'salary',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    isRecurring: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingIncome) {
      setFormData({
        amount: editingIncome.amount?.toString() || '',
        source: editingIncome.source || '',
        category: editingIncome.category || 'salary',
        date: editingIncome.date || new Date().toISOString().split('T')[0],
        notes: editingIncome.notes || '',
        isRecurring: editingIncome.isRecurring || false,
      });
    } else {
      setFormData({
        amount: '',
        source: '',
        category: 'salary',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        isRecurring: false,
      });
    }
  }, [editingIncome, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount) return;
    
    setSaving(true);
    await onSave({
      ...formData,
      amount: parseFloat(formData.amount),
    });
    setSaving(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md mx-auto bg-stone-900 border border-stone-700/50 rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up">
        <h3 className="text-lg font-display text-stone-200 mb-4">
          {editingIncome ? 'Edit Income' : 'Add Income'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div>
            <label className="text-xs text-stone-500 uppercase tracking-wider">Amount</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="Enter amount"
              className="w-full mt-1 px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>
          
          {/* Source */}
          <div>
            <label className="text-xs text-stone-500 uppercase tracking-wider">Source</label>
            <input
              type="text"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              placeholder="e.g., Acme Corp, Freelance Client"
              className="w-full mt-1 px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
          
          {/* Category */}
          <div>
            <label className="text-xs text-stone-500 uppercase tracking-wider">Category</label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {INCOME_CATEGORIES.map((cat) => {
                const Icon = ICON_MAP[cat.icon] || Circle;
                const isSelected = formData.category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat.id })}
                    className={`p-2 rounded-xl border transition-colors flex flex-col items-center gap-1 ${
                      isSelected 
                        ? `${COLOR_MAP[cat.color]} border-${cat.color}-500/50` 
                        : 'border-stone-700 text-stone-500 hover:border-stone-600'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="text-[10px]">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Date */}
          <div>
            <label className="text-xs text-stone-500 uppercase tracking-wider">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full mt-1 px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-stone-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
          
          {/* Notes */}
          <div>
            <label className="text-xs text-stone-500 uppercase tracking-wider">Notes (optional)</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add a note..."
              className="w-full mt-1 px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
          
          {/* Recurring toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isRecurring}
              onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
              className="w-4 h-4 rounded border-stone-600 bg-stone-800 text-emerald-500 focus:ring-emerald-500"
            />
            <span className="text-sm text-stone-400">This is recurring income</span>
          </label>
          
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
              disabled={saving || !formData.amount}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? 'Saving...' : (editingIncome ? 'Update' : 'Add Income')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Allocation Modal - shown after adding income when goals have auto-allocation enabled
function AllocationModal({ isOpen, onClose, allocations, incomeAmount, onConfirm, onSkip }) {
  const [selectedAllocations, setSelectedAllocations] = useState([]);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    if (isOpen && allocations.length > 0) {
      setSelectedAllocations(allocations.map(a => a.goalId));
    }
  }, [isOpen, allocations]);

  const toggleAllocation = (goalId) => {
    setSelectedAllocations(prev => 
      prev.includes(goalId) 
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId]
    );
  };

  const handleConfirm = async () => {
    const selected = allocations.filter(a => selectedAllocations.includes(a.goalId));
    if (selected.length === 0) {
      onSkip();
      return;
    }
    setExecuting(true);
    await onConfirm(selected);
    setExecuting(false);
    onClose();
  };

  const totalAllocating = allocations
    .filter(a => selectedAllocations.includes(a.goalId))
    .reduce((sum, a) => sum + a.amount, 0);

  if (!isOpen || allocations.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onSkip} />
      
      <div className="relative w-full max-w-md mx-4 bg-stone-900 border border-stone-700/50 rounded-2xl p-6 animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-lg font-display text-stone-200">Auto-Save Suggestion</h3>
            <p className="text-xs text-stone-500">Based on your savings goals</p>
          </div>
        </div>
        
        <p className="text-sm text-stone-400 mb-4">
          You received <span className="text-emerald-400 font-medium">{formatCurrency(incomeAmount, 'INR')}</span>. 
          Would you like to allocate some to your savings goals?
        </p>
        
        <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
          {allocations.map((allocation) => {
            const isSelected = selectedAllocations.includes(allocation.goalId);
            return (
              <button
                key={allocation.goalId}
                onClick={() => toggleAllocation(allocation.goalId)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  isSelected 
                    ? 'bg-teal-500/10 border-teal-500/30' 
                    : 'bg-stone-800/50 border-stone-700/50 hover:border-stone-600'
                }`}
              >
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                  isSelected ? 'bg-teal-500 border-teal-500' : 'border-stone-600'
                }`}>
                  {isSelected && <Check size={12} className="text-white" />}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm text-stone-200">{allocation.goalName}</p>
                  <p className="text-xs text-stone-500">{allocation.percent}% of income</p>
                </div>
                <span className="text-sm font-medium text-emerald-400">
                  {formatCurrency(allocation.amount, 'INR')}
                </span>
              </button>
            );
          })}
        </div>
        
        {totalAllocating > 0 && (
          <div className="p-3 bg-teal-500/10 rounded-xl mb-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-stone-400">Total to save</span>
              <span className="text-lg font-display text-teal-400">
                {formatCurrency(totalAllocating, 'INR')}
              </span>
            </div>
          </div>
        )}
        
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 py-3 bg-stone-800 text-stone-400 rounded-xl hover:bg-stone-700"
          >
            Skip
          </button>
          <button
            onClick={handleConfirm}
            disabled={executing}
            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {executing ? 'Saving...' : (
              <>
                <PiggyBank size={16} />
                {selectedAllocations.length > 0 ? 'Save Now' : 'Skip'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Date Filter Options
const DATE_FILTERS = [
  { id: 'all', label: 'All Time' },
  { id: 'month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: '3months', label: 'Last 3 Months' },
  { id: 'year', label: 'This Year' },
];

// Main Component
export default function ESIncome({ userId, onRefresh }) {
  const [incomeList, setIncomeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [dateFilter, setDateFilter] = useState('month');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Allocation modal state
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [pendingAllocations, setPendingAllocations] = useState([]);
  const [lastAddedIncome, setLastAddedIncome] = useState(null);

  // Load income
  const loadIncome = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getIncome(userId, { useCache: false });
      setIncomeList(data);
    } catch (error) {
      console.error('Error loading income:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadIncome();
  }, [loadIncome]);

  // Filter income by date
  const filteredIncome = useMemo(() => {
    const now = new Date();
    let filtered = [...incomeList];
    
    // Date filter
    if (dateFilter === 'month') {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      filtered = filtered.filter(i => {
        const d = parseISO(i.date);
        return isWithinInterval(d, { start, end });
      });
    } else if (dateFilter === 'last_month') {
      const lastMonth = subMonths(now, 1);
      const start = startOfMonth(lastMonth);
      const end = endOfMonth(lastMonth);
      filtered = filtered.filter(i => {
        const d = parseISO(i.date);
        return isWithinInterval(d, { start, end });
      });
    } else if (dateFilter === '3months') {
      const start = startOfMonth(subMonths(now, 2));
      filtered = filtered.filter(i => parseISO(i.date) >= start);
    } else if (dateFilter === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      filtered = filtered.filter(i => parseISO(i.date) >= startOfYear);
    }
    
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(i => 
        i.source?.toLowerCase().includes(q) ||
        i.notes?.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q)
      );
    }
    
    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  }, [incomeList, dateFilter, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = filteredIncome.reduce((sum, i) => sum + (i.amount || 0), 0);
    const count = filteredIncome.length;
    const avgAmount = count > 0 ? total / count : 0;
    
    // By category
    const byCategory = {};
    for (const income of filteredIncome) {
      const cat = income.category || 'other';
      byCategory[cat] = (byCategory[cat] || 0) + income.amount;
    }
    
    // Find top category
    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
    
    return { total, count, avgAmount, byCategory, topCategory };
  }, [filteredIncome]);

  // Handlers
  const handleSave = async (data) => {
    if (editingIncome) {
      await updateIncome(userId, editingIncome.id, data);
      setEditingIncome(null);
      loadIncome();
      if (onRefresh) onRefresh();
    } else {
      // Adding new income - check for auto-allocation goals
      const result = await addIncome(userId, data);
      loadIncome();
      if (onRefresh) onRefresh();
      
      // Check if there are goals with auto-allocation enabled
      if (result.success) {
        try {
          const goals = await getAllocatableGoals(userId);
          if (goals.length > 0) {
            const allocations = calculateAllocations(data.amount, data.category, goals);
            if (allocations.length > 0) {
              setLastAddedIncome({ ...data, id: result.id });
              setPendingAllocations(allocations);
              setShowAllocationModal(true);
              return; // Don't close form yet
            }
          }
        } catch (error) {
          console.error('Error checking allocations:', error);
        }
      }
    }
  };

  // Handle allocation confirmation
  const handleConfirmAllocations = async (allocations) => {
    if (!lastAddedIncome) return;
    
    await executeAllocations(userId, allocations, lastAddedIncome.id);
    setLastAddedIncome(null);
    setPendingAllocations([]);
    if (onRefresh) onRefresh();
  };

  // Handle allocation skip
  const handleSkipAllocations = () => {
    setShowAllocationModal(false);
    setLastAddedIncome(null);
    setPendingAllocations([]);
  };

  const handleEdit = (income) => {
    setEditingIncome(income);
    setShowForm(true);
  };

  const handleDelete = async (incomeId) => {
    if (window.confirm('Delete this income entry?')) {
      await deleteIncome(userId, incomeId);
      loadIncome();
      if (onRefresh) onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display text-stone-200 flex items-center gap-2">
            <Wallet size={20} className="text-emerald-400" />
            Income
          </h2>
          <p className="text-xs text-stone-500">Track your earnings</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadIncome}
            className="p-2 rounded-xl bg-stone-800/50 text-stone-400 hover:text-stone-200"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => { setEditingIncome(null); setShowForm(true); }}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 flex items-center gap-2 text-sm"
          >
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard
          title="Total Income"
          value={formatCurrency(stats.total, 'INR')}
          subtitle={`${stats.count} entries`}
          icon={TrendingUp}
          color="emerald"
        />
        <SummaryCard
          title="Average"
          value={formatCurrency(stats.avgAmount, 'INR')}
          subtitle="per entry"
          icon={Briefcase}
          color="cyan"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {DATE_FILTERS.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setDateFilter(filter.id)}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
              dateFilter === filter.id
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-stone-800/50 text-stone-400 border border-transparent hover:bg-stone-800'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search income..."
          className="w-full pl-10 pr-4 py-2.5 bg-stone-800/50 border border-stone-700/50 rounded-xl text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      {/* Income List */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-8 text-stone-500">Loading...</div>
        ) : filteredIncome.length === 0 ? (
          <div className="text-center py-8">
            <Wallet size={32} className="mx-auto text-stone-600 mb-2" />
            <p className="text-stone-500 text-sm">No income entries yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-xl text-sm hover:bg-emerald-600/30"
            >
              Add your first income
            </button>
          </div>
        ) : (
          filteredIncome.map((income) => (
            <IncomeItem
              key={income.id}
              income={income}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Add/Edit Form */}
      <IncomeForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingIncome(null); }}
        onSave={handleSave}
        editingIncome={editingIncome}
      />

      {/* Auto-Allocation Modal */}
      <AllocationModal
        isOpen={showAllocationModal}
        onClose={() => setShowAllocationModal(false)}
        allocations={pendingAllocations}
        incomeAmount={lastAddedIncome?.amount || 0}
        onConfirm={handleConfirmAllocations}
        onSkip={handleSkipAllocations}
      />
    </div>
  );
}
