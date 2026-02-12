/**
 * ExpenseHistory - View and manage saved expenses
 */

import { useState, useMemo } from 'react';
import { format, parseISO, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { 
  Calendar, Search, Filter, Trash2, Edit2, Check, X, 
  ChevronDown, RefreshCw, Download
} from 'lucide-react';
import { formatCurrency } from '../../utils/analytics';
import { getAllCategories } from '../../utils/expenseParser';
import { deleteExpense, updateExpense } from '../../firebase/expenseSightService';

const CATEGORIES = ['all', ...getAllCategories(), 'Other'];

const DATE_FILTERS = [
  { id: 'all', label: 'All Time' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: 'month', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
];

function ExpenseRow({ expense, userId, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState(expense);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const result = await updateExpense(userId, expense.id, editData);
    if (result.success) {
      onUpdate(expense.id, editData);
    }
    setSaving(false);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this expense?')) return;
    const result = await deleteExpense(userId, expense.id);
    if (result.success) {
      onDelete(expense.id);
    }
  };

  if (editing) {
    return (
      <div className="p-3 bg-stone-800/50 border border-teal-500/30 rounded-xl space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            value={editData.date}
            onChange={(e) => setEditData({ ...editData, date: e.target.value })}
            className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-200"
          />
          <input
            type="number"
            value={editData.amount}
            onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) || 0 })}
            className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-200"
          />
        </div>
        <input
          type="text"
          value={editData.description}
          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
          className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-200"
        />
        <select
          value={editData.category}
          onChange={(e) => setEditData({ ...editData, category: e.target.value })}
          className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-200"
        >
          {CATEGORIES.filter(c => c !== 'all').map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-1 py-2 bg-emerald-600 text-white text-xs rounded-lg"
          >
            <Check size={14} /> {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => { setEditData(expense); setEditing(false); }}
            className="flex-1 flex items-center justify-center gap-1 py-2 bg-stone-700 text-stone-300 text-xs rounded-lg"
          >
            <X size={14} /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
      expense.isRefund 
        ? 'bg-emerald-500/5 border-emerald-500/20'
        : 'bg-stone-800/30 border-stone-800/50 hover:border-stone-700/50'
    }`}>
      <div className="w-14 flex-shrink-0 text-center">
        <p className="text-[10px] text-stone-500">{format(parseISO(expense.date), 'MMM d')}</p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-200 truncate">{expense.description}</p>
        <span className="text-[10px] px-1.5 py-0.5 bg-stone-800/80 text-stone-400 rounded">
          {expense.category}
        </span>
      </div>
      <p className={`text-sm font-mono ${expense.isRefund ? 'text-emerald-400' : 'text-stone-200'}`}>
        {expense.isRefund ? '+' : ''}{formatCurrency(expense.amount, 'INR')}
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => setEditing(true)} className="p-1.5 text-stone-500 hover:text-stone-300">
          <Edit2 size={14} />
        </button>
        <button onClick={handleDelete} className="p-1.5 text-stone-500 hover:text-red-400">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export default function ExpenseHistory({ expenses, userId, onRefresh, isRefreshing }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('30d');
  const [showFilters, setShowFilters] = useState(false);
  const [localExpenses, setLocalExpenses] = useState(expenses);

  // Update local expenses when props change
  useMemo(() => {
    setLocalExpenses(expenses);
  }, [expenses]);

  // Apply filters
  const filteredExpenses = useMemo(() => {
    let filtered = [...localExpenses];
    
    // Date filter
    const now = new Date();
    if (dateFilter === '7d') {
      const cutoff = format(subDays(now, 7), 'yyyy-MM-dd');
      filtered = filtered.filter(e => e.date >= cutoff);
    } else if (dateFilter === '30d') {
      const cutoff = format(subDays(now, 30), 'yyyy-MM-dd');
      filtered = filtered.filter(e => e.date >= cutoff);
    } else if (dateFilter === 'month') {
      const start = format(startOfMonth(now), 'yyyy-MM-dd');
      const end = format(endOfMonth(now), 'yyyy-MM-dd');
      filtered = filtered.filter(e => e.date >= start && e.date <= end);
    } else if (dateFilter === 'lastMonth') {
      const lastMonth = subMonths(now, 1);
      const start = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
      filtered = filtered.filter(e => e.date >= start && e.date <= end);
    }
    
    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(e => e.category === categoryFilter);
    }
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(e => 
        e.description.toLowerCase().includes(term) ||
        e.category.toLowerCase().includes(term)
      );
    }
    
    // Sort by date descending
    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  }, [localExpenses, dateFilter, categoryFilter, searchTerm]);

  // Calculate totals
  const totals = useMemo(() => {
    let total = 0;
    let refunds = 0;
    for (const exp of filteredExpenses) {
      if (exp.isRefund) refunds += exp.amount;
      else total += exp.amount;
    }
    return { total, refunds, net: total - refunds };
  }, [filteredExpenses]);

  // Group by date
  const groupedExpenses = useMemo(() => {
    const groups = {};
    for (const exp of filteredExpenses) {
      if (!groups[exp.date]) groups[exp.date] = [];
      groups[exp.date].push(exp);
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredExpenses]);

  const handleUpdate = (id, data) => {
    setLocalExpenses(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
  };

  const handleDelete = (id) => {
    setLocalExpenses(prev => prev.filter(e => e.id !== id));
  };

  const handleExport = () => {
    const csv = [
      'Date,Description,Amount,Category,Type',
      ...filteredExpenses.map(e => 
        `${e.date},"${e.description}",${e.amount},${e.category},${e.isRefund ? 'Refund' : 'Expense'}`
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-display text-stone-200">Expense History</h3>
          <p className="text-xs text-stone-500">
            {filteredExpenses.length} expenses • {formatCurrency(totals.net, 'INR')} net
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="p-2 text-stone-500 hover:text-stone-300"
            title="Export CSV"
          >
            <Download size={16} />
          </button>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 text-stone-500 hover:text-stone-300"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="glass-card p-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 bg-stone-800/60 border border-stone-700/40 rounded-lg text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-teal-500/50"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 border rounded-lg text-sm flex items-center gap-1 ${
              showFilters ? 'bg-teal-500/10 border-teal-500/30 text-teal-400' : 'bg-stone-800/60 border-stone-700/40 text-stone-400'
            }`}
          >
            <Filter size={14} />
            <ChevronDown size={14} className={showFilters ? 'rotate-180' : ''} />
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 pt-3 border-t border-stone-800/50 space-y-3">
            <div>
              <label className="text-[10px] text-stone-500 uppercase mb-1.5 block">Date Range</label>
              <div className="flex flex-wrap gap-1.5">
                {DATE_FILTERS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setDateFilter(f.id)}
                    className={`px-2.5 py-1 rounded text-xs ${
                      dateFilter === f.id 
                        ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30'
                        : 'bg-stone-800/50 text-stone-400 border border-stone-700/30'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-stone-500 uppercase mb-1.5 block">Category</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.slice(0, 8).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded text-xs ${
                      categoryFilter === cat
                        ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30'
                        : 'bg-stone-800/50 text-stone-400 border border-stone-700/30'
                    }`}
                  >
                    {cat === 'all' ? 'All' : cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-3 text-center">
          <p className="text-base font-display text-stone-200">{formatCurrency(totals.total, 'INR')}</p>
          <p className="text-[10px] text-stone-500">Spent</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-base font-display text-emerald-400">{formatCurrency(totals.refunds, 'INR')}</p>
          <p className="text-[10px] text-stone-500">Refunds</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-base font-display text-teal-400">{formatCurrency(totals.net, 'INR')}</p>
          <p className="text-[10px] text-stone-500">Net</p>
        </div>
      </div>

      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Calendar size={32} className="mx-auto text-stone-600 mb-3" />
          <p className="text-sm text-stone-400">No expenses found</p>
          <p className="text-xs text-stone-600 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedExpenses.map(([date, dayExpenses]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={12} className="text-stone-500" />
                <span className="text-xs text-stone-400">{format(parseISO(date), 'EEEE, MMM d')}</span>
                <span className="text-[10px] text-stone-600">({dayExpenses.length})</span>
              </div>
              <div className="space-y-2">
                {dayExpenses.map(expense => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    userId={userId}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
