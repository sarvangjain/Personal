/**
 * ESActivity - Activity tab with expense list, search, filters, spending heatmap, and edit functionality
 */

import { useState, useMemo, useCallback } from 'react';
import { 
  Search, RefreshCw, Calendar, ChevronDown,
  DollarSign, X, Edit2, Trash2, Check, RotateCcw
} from 'lucide-react';
import { format, parseISO, isToday, isYesterday, isThisWeek, isThisMonth, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { formatCurrency } from '../../../utils/analytics';
import SpendingHeatmap from '../../SpendingHeatmap';
import CategoryQuickCards from '../components/CategoryQuickCards';
import { getCategoryIcon, getCategoryColors, getAllCategories } from '../../../utils/categoryConfig';

// Date range filter options
const DATE_FILTERS = [
  { id: 'all', label: 'All Time' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'month', label: 'This Month' },
];

// Expense group header
function GroupHeader({ title, count, total }) {
  return (
    <div className="flex items-center justify-between py-2 px-1 sticky top-0 bg-stone-950/95 backdrop-blur-sm z-10">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-medium text-stone-400">{title}</h4>
        <span className="text-[10px] text-stone-600">({count})</span>
      </div>
      <span className="text-xs font-mono text-stone-500">{formatCurrency(total, 'INR')}</span>
    </div>
  );
}

// Expense item with edit functionality
function ExpenseItem({ expense, onEdit, onDelete, isEditing, editData, setEditData, onSaveEdit, onCancelEdit }) {
  const CategoryIcon = getCategoryIcon(expense.category);
  const categoryColors = getCategoryColors(expense.category);
  
  // Edit mode
  if (isEditing) {
    const categories = getAllCategories();
    return (
      <div className="p-3 bg-stone-800/60 border border-teal-500/30 rounded-xl space-y-3">
        <input
          type="text"
          value={editData.description}
          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
          className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-200 focus:outline-none focus:border-teal-500"
          placeholder="Description"
        />
        <div className="flex gap-2">
          <input
            type="number"
            value={editData.amount}
            onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) || 0 })}
            className="flex-1 px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-200 focus:outline-none focus:border-teal-500"
            placeholder="Amount"
          />
          <input
            type="date"
            value={editData.date}
            onChange={(e) => setEditData({ ...editData, date: e.target.value })}
            className="flex-1 px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-200 focus:outline-none focus:border-teal-500"
          />
        </div>
        <div className="relative z-30">
          <select
            value={editData.category}
            onChange={(e) => setEditData({ ...editData, category: e.target.value })}
            className="w-full px-3 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-200 focus:outline-none focus:border-teal-500 appearance-none cursor-pointer"
            style={{ 
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 0.5rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.5em 1.5em',
              paddingRight: '2.5rem'
            }}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSaveEdit}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-teal-500/20 text-teal-400 rounded-lg text-sm font-medium hover:bg-teal-500/30 transition-colors"
          >
            <Check size={16} />
            Save
          </button>
          <button
            onClick={onCancelEdit}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-stone-700/50 text-stone-400 rounded-lg text-sm font-medium hover:bg-stone-700 transition-colors"
          >
            <X size={16} />
            Cancel
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors group ${
      expense.isRefund 
        ? 'bg-emerald-500/5 border border-emerald-500/20' 
        : 'bg-stone-800/30 border border-stone-800/50 hover:border-stone-700/50'
    }`}>
      <div className={`w-10 h-10 rounded-xl ${categoryColors.bg} ${categoryColors.border} border flex items-center justify-center`}>
        <CategoryIcon size={18} className={categoryColors.text} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-200 truncate">{expense.description}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[10px] px-1.5 py-0.5 ${categoryColors.bg} ${categoryColors.text} rounded`}>
            {expense.category}
          </span>
          <span className="text-[10px] text-stone-600">
            {format(parseISO(expense.date), 'MMM d')}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className={`text-sm font-mono font-medium ${
            expense.isRefund ? 'text-emerald-400' : 'text-stone-200'
          }`}>
            {expense.isRefund ? '+' : ''}{formatCurrency(expense.amount, 'INR')}
          </p>
        </div>
        {/* Edit/Delete buttons - visible on hover */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(expense)}
            className="p-1.5 rounded-lg bg-stone-700/50 text-stone-400 hover:text-teal-400 hover:bg-stone-700 transition-colors"
            title="Edit expense"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => onDelete(expense.id)}
            className="p-1.5 rounded-lg bg-stone-700/50 text-stone-400 hover:text-red-400 hover:bg-stone-700 transition-colors"
            title="Delete expense"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ESActivity({ expenses, userId, onRefresh, onShowCategoryDetail, onUpdateExpense, onDeleteExpense }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showCategoryCards, setShowCategoryCards] = useState(true);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [editData, setEditData] = useState({ description: '', amount: 0, category: '', date: '' });
  
  // Handle edit expense
  const handleEditExpense = useCallback((expense) => {
    setEditingExpenseId(expense.id);
    setEditData({
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
    });
  }, []);
  
  // Handle save edit
  const handleSaveEdit = useCallback(async () => {
    if (onUpdateExpense && editingExpenseId) {
      await onUpdateExpense(editingExpenseId, editData);
      setEditingExpenseId(null);
      setEditData({ description: '', amount: 0, category: '', date: '' });
    }
  }, [onUpdateExpense, editingExpenseId, editData]);
  
  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditingExpenseId(null);
    setEditData({ description: '', amount: 0, category: '', date: '' });
  }, []);
  
  // Handle delete expense
  const handleDeleteExpense = useCallback(async (expenseId) => {
    if (onDeleteExpense && window.confirm('Are you sure you want to delete this expense?')) {
      await onDeleteExpense(expenseId);
    }
  }, [onDeleteExpense]);

  // Apply date filter (used for category cards)
  const dateFilteredExpenses = useMemo(() => {
    let filtered = expenses.filter(e => !e.cancelled);
    
    // Date filter
    const now = new Date();
    if (dateFilter === '7d') {
      const cutoff = subDays(now, 7);
      filtered = filtered.filter(e => parseISO(e.date) >= cutoff);
    } else if (dateFilter === '30d') {
      const cutoff = subDays(now, 30);
      filtered = filtered.filter(e => parseISO(e.date) >= cutoff);
    } else if (dateFilter === 'month') {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      filtered = filtered.filter(e => {
        const d = parseISO(e.date);
        return d >= start && d <= end;
      });
    }
    
    return filtered;
  }, [expenses, dateFilter]);

  // Filter expenses (with search and category)
  const filteredExpenses = useMemo(() => {
    let filtered = dateFilteredExpenses;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.description.toLowerCase().includes(query) ||
        e.category.toLowerCase().includes(query)
      );
    }
    
    // Category filter
    if (categoryFilter) {
      filtered = filtered.filter(e => e.category === categoryFilter);
    }
    
    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  }, [dateFilteredExpenses, searchQuery, categoryFilter]);

  // Group expenses by date
  const groupedExpenses = useMemo(() => {
    const groups = {
      today: { title: 'Today', expenses: [], total: 0 },
      yesterday: { title: 'Yesterday', expenses: [], total: 0 },
      thisWeek: { title: 'This Week', expenses: [], total: 0 },
      thisMonth: { title: 'This Month', expenses: [], total: 0 },
      older: { title: 'Older', expenses: [], total: 0 },
    };
    
    for (const exp of filteredExpenses) {
      const date = parseISO(exp.date);
      const amount = exp.isRefund ? 0 : exp.amount;
      
      if (isToday(date)) {
        groups.today.expenses.push(exp);
        groups.today.total += amount;
      } else if (isYesterday(date)) {
        groups.yesterday.expenses.push(exp);
        groups.yesterday.total += amount;
      } else if (isThisWeek(date)) {
        groups.thisWeek.expenses.push(exp);
        groups.thisWeek.total += amount;
      } else if (isThisMonth(date)) {
        groups.thisMonth.expenses.push(exp);
        groups.thisMonth.total += amount;
      } else {
        groups.older.expenses.push(exp);
        groups.older.total += amount;
      }
    }
    
    return Object.entries(groups).filter(([_, g]) => g.expenses.length > 0);
  }, [filteredExpenses]);

  // Total for filtered expenses
  const filteredTotal = filteredExpenses.reduce((sum, e) => sum + (e.isRefund ? 0 : e.amount), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display text-stone-200">Activity</h2>
          <p className="text-xs text-stone-500">{filteredExpenses.length} expenses</p>
        </div>
        <button
          onClick={onRefresh}
          className="p-2 rounded-xl bg-stone-800/50 text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search expenses..."
          className="w-full pl-10 pr-4 py-2.5 bg-stone-800/50 border border-stone-700/50 rounded-xl text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-teal-500/50"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Date Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {DATE_FILTERS.map(filter => (
          <button
            key={filter.id}
            onClick={() => setDateFilter(filter.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              dateFilter === filter.id
                ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                : 'bg-stone-800/50 text-stone-400 border border-stone-700/50 hover:bg-stone-800'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Category Quick Cards */}
      <button
        onClick={() => setShowCategoryCards(!showCategoryCards)}
        className="w-full flex items-center justify-between p-3 bg-stone-800/30 rounded-xl text-sm text-stone-400 hover:bg-stone-800/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <DollarSign size={16} />
          Categories
          {categoryFilter && (
            <span className="text-xs text-teal-400 bg-teal-500/20 px-2 py-0.5 rounded-full">
              {categoryFilter}
            </span>
          )}
        </span>
        <ChevronDown size={16} className={`transition-transform ${showCategoryCards ? 'rotate-180' : ''}`} />
      </button>

      {showCategoryCards && (
        <CategoryQuickCards
          expenses={dateFilteredExpenses}
          activeCategory={categoryFilter}
          onCategoryClick={setCategoryFilter}
          onViewAllClick={onShowCategoryDetail}
          maxCards={4}
        />
      )}

      {/* Spending Heatmap Toggle */}
      <button
        onClick={() => setShowHeatmap(!showHeatmap)}
        className="w-full flex items-center justify-between p-3 bg-stone-800/30 rounded-xl text-sm text-stone-400 hover:bg-stone-800/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Calendar size={16} />
          Spending Heatmap
        </span>
        <ChevronDown size={16} className={`transition-transform ${showHeatmap ? 'rotate-180' : ''}`} />
      </button>

      {/* Heatmap */}
      {showHeatmap && (
        <SpendingHeatmap expenses={filteredExpenses} userId={userId} />
      )}

      {/* Summary */}
      <div className="flex items-center justify-between p-3 bg-stone-800/30 rounded-xl">
        <span className="text-sm text-stone-400">Total</span>
        <span className="text-lg font-display text-teal-400">
          {formatCurrency(filteredTotal, 'INR')}
        </span>
      </div>

      {/* Grouped Expense List */}
      <div className="space-y-4">
        {groupedExpenses.length > 0 ? (
          groupedExpenses.map(([key, group]) => (
            <div key={key}>
              <GroupHeader 
                title={group.title} 
                count={group.expenses.length}
                total={group.total}
              />
              <div className="space-y-2">
                {group.expenses.map(expense => (
                  <ExpenseItem 
                    key={expense.id} 
                    expense={expense}
                    onEdit={handleEditExpense}
                    onDelete={handleDeleteExpense}
                    isEditing={editingExpenseId === expense.id}
                    editData={editData}
                    setEditData={setEditData}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-sm text-stone-500">No expenses found</p>
            <p className="text-xs text-stone-600 mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
