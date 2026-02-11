import { useState, useMemo } from 'react';
import { format, isToday, isYesterday, isThisWeek, isThisMonth, parseISO } from 'date-fns';
import { Receipt, Calendar, Search, Filter, ChevronDown, Users, User } from 'lucide-react';
import { formatCurrency } from '../utils/analytics';
import RefreshButton from './RefreshButton';
import SpendingHeatmap from './SpendingHeatmap';

function ExpenseItem({ expense, userId }) {
  const userShare = expense.users?.find(u => u.user_id === userId);
  const owedAmount = userShare ? parseFloat(userShare.owed_share) : 0;
  const paidAmount = userShare ? parseFloat(userShare.paid_share) : 0;
  const currency = expense.currency_code || 'INR';
  const category = expense.category?.name || 'General';
  const isGroupExpense = expense.group_id && expense.group_id !== 0;
  
  // Calculate what user owes or is owed
  const netAmount = paidAmount - owedAmount;
  
  return (
    <div className="flex items-center gap-3 p-3 bg-stone-800/25 rounded-xl border border-stone-800/30 hover:border-stone-700/40 transition-colors">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isGroupExpense ? 'bg-indigo-500/10' : 'bg-teal-500/10'
      }`}>
        {isGroupExpense ? (
          <Users size={16} className="text-indigo-400" />
        ) : (
          <User size={16} className="text-teal-400" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-200 truncate">{expense.description}</p>
        <p className="text-[11px] text-stone-500">
          {category} • {format(parseISO(expense.date), 'MMM d, yyyy')}
        </p>
      </div>
      
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-mono text-stone-200">
          {formatCurrency(parseFloat(expense.cost), currency)}
        </p>
        {owedAmount > 0 && (
          <p className={`text-[10px] font-mono ${netAmount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {netAmount >= 0 ? '+' : ''}{formatCurrency(netAmount, currency)}
          </p>
        )}
      </div>
    </div>
  );
}

function groupExpensesByDate(expenses) {
  const groups = {
    today: [],
    yesterday: [],
    thisWeek: [],
    thisMonth: [],
    older: [],
  };
  
  expenses.forEach(expense => {
    const date = parseISO(expense.date);
    if (isToday(date)) {
      groups.today.push(expense);
    } else if (isYesterday(date)) {
      groups.yesterday.push(expense);
    } else if (isThisWeek(date)) {
      groups.thisWeek.push(expense);
    } else if (isThisMonth(date)) {
      groups.thisMonth.push(expense);
    } else {
      groups.older.push(expense);
    }
  });
  
  return groups;
}

export default function Activity({ expenses, userId, onRefresh, isRefreshing }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set();
    expenses.forEach(e => {
      if (e.category?.name) cats.add(e.category.name);
    });
    return ['all', ...Array.from(cats).sort()];
  }, [expenses]);
  
  // Filter and sort expenses
  const filteredExpenses = useMemo(() => {
    let filtered = expenses.filter(e => !e.payment && !e.deleted_at);
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(e => 
        e.description?.toLowerCase().includes(term) ||
        e.category?.name?.toLowerCase().includes(term)
      );
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(e => e.category?.name === categoryFilter);
    }
    
    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [expenses, searchTerm, categoryFilter]);
  
  const groupedExpenses = useMemo(() => groupExpensesByDate(filteredExpenses), [filteredExpenses]);
  
  // Calculate totals
  const totalSpent = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => {
      const userShare = e.users?.find(u => u.user_id === userId);
      return sum + (userShare ? parseFloat(userShare.owed_share) : 0);
    }, 0);
  }, [filteredExpenses, userId]);
  
  const renderGroup = (title, items) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <h4 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Calendar size={12} />
          {title}
          <span className="text-stone-600">({items.length})</span>
        </h4>
        <div className="space-y-2">
          {items.map(expense => (
            <ExpenseItem key={expense.id} expense={expense} userId={userId} />
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Receipt size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-display text-stone-200">Activity</h2>
            <p className="text-xs text-stone-500">
              {filteredExpenses.length} expenses • {formatCurrency(totalSpent)} total
            </p>
          </div>
        </div>
        <RefreshButton onRefresh={onRefresh} isRefreshing={isRefreshing} />
      </div>
      
      {/* Spending Heatmap */}
      <SpendingHeatmap 
        expenses={expenses} 
        userId={userId} 
      />
      
      {/* Search and Filters */}
      <div className="glass-card p-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search expenses..."
              className="w-full pl-9 pr-3 py-2.5 bg-stone-800/60 border border-stone-700/40 rounded-xl text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2.5 border rounded-xl text-sm transition-all flex items-center gap-2 ${
              showFilters || categoryFilter !== 'all'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-stone-800/60 border-stone-700/40 text-stone-400 hover:text-stone-200'
            }`}
          >
            <Filter size={14} />
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
        
        {/* Filter Options */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-stone-800/50">
            <label className="text-xs text-stone-500 mb-2 block">Category</label>
            <div className="flex flex-wrap gap-2">
              {categories.slice(0, 10).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    categoryFilter === cat
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-stone-800/50 text-stone-400 border border-stone-700/30 hover:text-stone-200'
                  }`}
                >
                  {cat === 'all' ? 'All' : cat}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Expenses List */}
      <div className="glass-card p-4">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-8">
            <Receipt size={32} className="mx-auto text-stone-600 mb-3" />
            <p className="text-sm text-stone-400">No expenses found</p>
            {searchTerm && (
              <p className="text-xs text-stone-600 mt-1">Try a different search term</p>
            )}
          </div>
        ) : (
          <>
            {renderGroup('Today', groupedExpenses.today)}
            {renderGroup('Yesterday', groupedExpenses.yesterday)}
            {renderGroup('This Week', groupedExpenses.thisWeek)}
            {renderGroup('This Month', groupedExpenses.thisMonth)}
            {renderGroup('Older', groupedExpenses.older.slice(0, 50))}
            
            {groupedExpenses.older.length > 50 && (
              <p className="text-center text-xs text-stone-600 pt-4">
                Showing 50 of {groupedExpenses.older.length} older expenses
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Compact version for Overview page
export function RecentActivityPreview({ expenses, userId, limit = 5, onViewAll }) {
  const recentExpenses = useMemo(() => {
    return expenses
      .filter(e => !e.payment && !e.deleted_at)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);
  }, [expenses, limit]);
  
  if (recentExpenses.length === 0) return null;
  
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-stone-300 flex items-center gap-2">
          <Receipt size={14} className="text-purple-400" />
          Recent Activity
        </h3>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            View all →
          </button>
        )}
      </div>
      <div className="space-y-2">
        {recentExpenses.map(expense => (
          <ExpenseItem key={expense.id} expense={expense} userId={userId} />
        ))}
      </div>
    </div>
  );
}
