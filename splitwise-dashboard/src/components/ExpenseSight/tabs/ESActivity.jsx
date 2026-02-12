/**
 * ESActivity - Activity tab with expense list, search, filters, and spending heatmap
 */

import { useState, useMemo } from 'react';
import { 
  Search, RefreshCw, Calendar, ChevronDown,
  DollarSign, X
} from 'lucide-react';
import { format, parseISO, isToday, isYesterday, isThisWeek, isThisMonth, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { formatCurrency } from '../../../utils/analytics';
import SpendingHeatmap from '../../SpendingHeatmap';

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

// Expense item
function ExpenseItem({ expense }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
      expense.isRefund 
        ? 'bg-emerald-500/5 border border-emerald-500/20' 
        : 'bg-stone-800/30 border border-stone-800/50'
    }`}>
      <div className="w-10 h-10 rounded-xl bg-stone-800/50 flex items-center justify-center text-stone-400">
        <DollarSign size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-200 truncate">{expense.description}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] px-1.5 py-0.5 bg-stone-800/80 text-stone-400 rounded">
            {expense.category}
          </span>
          <span className="text-[10px] text-stone-600">
            {format(parseISO(expense.date), 'MMM d')}
          </span>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-mono font-medium ${
          expense.isRefund ? 'text-emerald-400' : 'text-stone-200'
        }`}>
          {expense.isRefund ? '+' : ''}{formatCurrency(expense.amount, 'INR')}
        </p>
      </div>
    </div>
  );
}

// Category filter chip
function CategoryChip({ category, isActive, onClick, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
        isActive
          ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
          : 'bg-stone-800/50 text-stone-400 border border-stone-700/50 hover:bg-stone-800'
      }`}
    >
      {category}
      <span className={`text-[10px] ${isActive ? 'text-violet-400' : 'text-stone-600'}`}>
        {count}
      </span>
    </button>
  );
}

export default function ESActivity({ expenses, userId, onRefresh }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(true);

  // Get unique categories with counts
  const categories = useMemo(() => {
    const counts = {};
    for (const exp of expenses) {
      if (!exp.cancelled) {
        counts[exp.category] = (counts[exp.category] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [expenses]);

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    let filtered = expenses.filter(e => !e.cancelled);
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.description.toLowerCase().includes(query) ||
        e.category.toLowerCase().includes(query)
      );
    }
    
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
    
    // Category filter
    if (categoryFilter) {
      filtered = filtered.filter(e => e.category === categoryFilter);
    }
    
    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, searchQuery, dateFilter, categoryFilter]);

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
          className="w-full pl-10 pr-4 py-2.5 bg-stone-800/50 border border-stone-700/50 rounded-xl text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-violet-500/50"
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
                ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                : 'bg-stone-800/50 text-stone-400 border border-stone-700/50 hover:bg-stone-800'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Category Chips */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          <CategoryChip
            category="All"
            isActive={!categoryFilter}
            onClick={() => setCategoryFilter(null)}
            count={expenses.filter(e => !e.cancelled).length}
          />
          {categories.map(([cat, count]) => (
            <CategoryChip
              key={cat}
              category={cat}
              isActive={categoryFilter === cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
              count={count}
            />
          ))}
        </div>
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
        <span className="text-lg font-display text-violet-400">
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
                  <ExpenseItem key={expense.id} expense={expense} />
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
