/**
 * ESHistory - Advanced expense history screen with rich filters
 *
 * Filters: custom date range (with presets), multi-select category,
 * free-text search, transaction type, amount min/max, multi-select tags.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Calendar, Search, Filter, ChevronDown, RefreshCw, Download,
  Edit2, Trash2, Check, X, Clock, XCircle, Tag as TagIcon,
} from 'lucide-react';
import {
  format, parseISO, subDays, subMonths, startOfMonth, endOfMonth,
  differenceInCalendarDays,
} from 'date-fns';
import { formatCurrency } from '../../../utils/analytics';
import { getAllCategories } from '../../../utils/expenseParser';
import { getTags } from '../../../firebase/expenseSightService';

const ALL_CATEGORIES = [...getAllCategories(), 'Other'];

const DATE_PRESETS = [
  { id: 'all', label: 'All Time' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: 'month', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
  { id: 'custom', label: 'Custom' },
];

const TYPE_OPTIONS = [
  { id: 'expense', label: 'Expense' },
  { id: 'refund', label: 'Refund' },
  { id: 'income', label: 'Income' },
];

function classifyType(exp) {
  if (exp.isIncome) return 'income';
  if (exp.isRefund) return 'refund';
  return 'expense';
}

function computeDateBounds(preset, customStart, customEnd) {
  const now = new Date();
  switch (preset) {
    case '7d':
      return { start: format(subDays(now, 7), 'yyyy-MM-dd'), end: null };
    case '30d':
      return { start: format(subDays(now, 30), 'yyyy-MM-dd'), end: null };
    case 'month':
      return {
        start: format(startOfMonth(now), 'yyyy-MM-dd'),
        end: format(endOfMonth(now), 'yyyy-MM-dd'),
      };
    case 'lastMonth': {
      const lm = subMonths(now, 1);
      return {
        start: format(startOfMonth(lm), 'yyyy-MM-dd'),
        end: format(endOfMonth(lm), 'yyyy-MM-dd'),
      };
    }
    case 'custom':
      return { start: customStart || null, end: customEnd || null };
    case 'all':
    default:
      return { start: null, end: null };
  }
}

function ExpenseRow({ expense, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState(expense);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditData(expense);
  }, [expense]);

  const handleSave = async () => {
    setSaving(true);
    const result = await onUpdate(expense.id, editData);
    setSaving(false);
    if (result?.success) setEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this expense?')) return;
    await onDelete(expense.id);
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
          {ALL_CATEGORIES.map(cat => (
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

  const isPositive = expense.isRefund || expense.isIncome;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
      expense.isRefund
        ? 'bg-emerald-500/5 border-emerald-500/20'
        : expense.isIncome
          ? 'bg-teal-500/5 border-teal-500/20'
          : 'bg-stone-800/30 border-stone-800/50 hover:border-stone-700/50'
    }`}>
      <div className="w-14 flex-shrink-0 text-center">
        <p className="text-[10px] text-stone-500">{format(parseISO(expense.date), 'MMM d')}</p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-200 truncate">{expense.description}</p>
        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
          <span className="text-[10px] px-1.5 py-0.5 bg-stone-800/80 text-stone-400 rounded">
            {expense.category}
          </span>
          {Array.isArray(expense.tags) && expense.tags.slice(0, 3).map(t => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 bg-indigo-500/10 text-indigo-300 rounded">
              #{t}
            </span>
          ))}
        </div>
      </div>
      <p className={`text-sm font-mono ${isPositive ? 'text-emerald-400' : 'text-stone-200'}`}>
        {isPositive ? '+' : ''}{formatCurrency(expense.amount, 'INR')}
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

export default function ESHistory({
  expenses,
  userId,
  onRefresh,
  isRefreshing,
  onUpdateExpense,
  onDeleteExpense,
}) {
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [datePreset, setDatePreset] = useState('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categories, setCategories] = useState(() => new Set());
  const [types, setTypes] = useState(() => new Set());
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState(() => new Set());
  const [showFilters, setShowFilters] = useState(true);
  const [availableTags, setAvailableTags] = useState([]);

  // Load available tags once
  useEffect(() => {
    let cancelled = false;
    if (!userId) return undefined;
    getTags(userId).then(tags => {
      if (!cancelled) setAvailableTags(tags || []);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [userId]);

  // Toggle helpers for multi-select sets
  const toggleInSet = useCallback((setter, value) => {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }, []);

  // Apply all filters
  const filteredExpenses = useMemo(() => {
    const { start, end } = computeDateBounds(datePreset, customStart, customEnd);
    const minAmt = amountMin === '' ? null : parseFloat(amountMin);
    const maxAmt = amountMax === '' ? null : parseFloat(amountMax);
    const searchLower = searchTerm.trim().toLowerCase();

    const result = [];
    for (const exp of expenses) {
      if (exp.cancelled) continue;
      if (start && exp.date < start) continue;
      if (end && exp.date > end) continue;
      if (types.size > 0 && !types.has(classifyType(exp))) continue;
      if (categories.size > 0 && !categories.has(exp.category)) continue;
      if (selectedTagIds.size > 0) {
        const expTags = Array.isArray(exp.tags) ? exp.tags : [];
        let hit = false;
        for (const t of expTags) {
          if (selectedTagIds.has(t)) { hit = true; break; }
        }
        if (!hit) continue;
      }
      if (minAmt !== null && !Number.isNaN(minAmt) && exp.amount < minAmt) continue;
      if (maxAmt !== null && !Number.isNaN(maxAmt) && exp.amount > maxAmt) continue;
      if (searchLower) {
        const hay = `${exp.description || ''} ${exp.category || ''}`.toLowerCase();
        if (!hay.includes(searchLower)) continue;
      }
      result.push(exp);
    }
    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, datePreset, customStart, customEnd, categories, types, amountMin, amountMax, selectedTagIds, searchTerm]);

  // Totals
  const totals = useMemo(() => {
    let spent = 0, refunds = 0, income = 0;
    for (const exp of filteredExpenses) {
      if (exp.isRefund) refunds += exp.amount;
      else if (exp.isIncome) income += exp.amount;
      else spent += exp.amount;
    }
    const net = spent - refunds;

    // Average per day over selected range (if bounded)
    const { start, end } = computeDateBounds(datePreset, customStart, customEnd);
    let days = null;
    if (start) {
      const endDate = end ? parseISO(end) : new Date();
      days = Math.max(1, differenceInCalendarDays(endDate, parseISO(start)) + 1);
    }
    const avgPerDay = days ? spent / days : null;

    return { spent, refunds, income, net, avgPerDay };
  }, [filteredExpenses, datePreset, customStart, customEnd]);

  // Group by date
  const grouped = useMemo(() => {
    const groups = {};
    for (const exp of filteredExpenses) {
      if (!groups[exp.date]) groups[exp.date] = [];
      groups[exp.date].push(exp);
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredExpenses]);

  const activeFilterCount = (
    (datePreset !== 'all' ? 1 : 0) +
    (categories.size > 0 ? 1 : 0) +
    (types.size > 0 ? 1 : 0) +
    (selectedTagIds.size > 0 ? 1 : 0) +
    (amountMin !== '' || amountMax !== '' ? 1 : 0) +
    (searchTerm ? 1 : 0)
  );

  const clearAll = () => {
    setSearchTerm('');
    setDatePreset('all');
    setCustomStart('');
    setCustomEnd(format(new Date(), 'yyyy-MM-dd'));
    setCategories(new Set());
    setTypes(new Set());
    setAmountMin('');
    setAmountMax('');
    setSelectedTagIds(new Set());
  };

  const handleExport = () => {
    const csv = [
      'Date,Description,Amount,Category,Type,Tags',
      ...filteredExpenses.map(e => {
        const type = e.isRefund ? 'Refund' : e.isIncome ? 'Income' : 'Expense';
        const tags = Array.isArray(e.tags) ? e.tags.join('|') : '';
        const desc = (e.description || '').replaceAll('"', '""');
        return `${e.date},"${desc}",${e.amount},${e.category},${type},"${tags}"`;
      }),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-display text-stone-200 flex items-center gap-2">
            <Clock size={16} className="text-indigo-400" />
            Expense History
          </h3>
          <p className="text-xs text-stone-500">
            {filteredExpenses.length} result{filteredExpenses.length === 1 ? '' : 's'} • {formatCurrency(totals.net, 'INR')} net
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="p-2 text-stone-500 hover:text-stone-300"
            title="Export CSV"
            disabled={filteredExpenses.length === 0}
          >
            <Download size={16} />
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 text-stone-500 hover:text-stone-300"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter toggle */}
      <div className="glass-card p-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search description or category..."
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
            {activeFilterCount > 0 && (
              <span className="text-[10px] px-1 rounded bg-teal-500/20 text-teal-300">{activeFilterCount}</span>
            )}
            <ChevronDown size={14} className={showFilters ? 'rotate-180' : ''} />
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 pt-3 border-t border-stone-800/50 space-y-4">
            {/* Date Range */}
            <div>
              <label className="text-[10px] text-stone-500 uppercase mb-1.5 block">Date Range</label>
              <div className="flex flex-wrap gap-1.5">
                {DATE_PRESETS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setDatePreset(f.id)}
                    className={`px-2.5 py-1 rounded text-xs ${
                      datePreset === f.id
                        ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30'
                        : 'bg-stone-800/50 text-stone-400 border border-stone-700/30'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {datePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="text-[9px] text-stone-600 uppercase block mb-1">Start</label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full px-2 py-1.5 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-200"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-stone-600 uppercase block mb-1">End</label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full px-2 py-1.5 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-200"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="text-[10px] text-stone-500 uppercase mb-1.5 block">Category</label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setCategories(new Set())}
                  className={`px-2.5 py-1 rounded text-xs ${
                    categories.size === 0
                      ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30'
                      : 'bg-stone-800/50 text-stone-400 border border-stone-700/30'
                  }`}
                >
                  All
                </button>
                {ALL_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => toggleInSet(setCategories, cat)}
                    className={`px-2.5 py-1 rounded text-xs ${
                      categories.has(cat)
                        ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30'
                        : 'bg-stone-800/50 text-stone-400 border border-stone-700/30'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="text-[10px] text-stone-500 uppercase mb-1.5 block">Type</label>
              <div className="flex flex-wrap gap-1.5">
                {TYPE_OPTIONS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => toggleInSet(setTypes, t.id)}
                    className={`px-2.5 py-1 rounded text-xs ${
                      types.has(t.id)
                        ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30'
                        : 'bg-stone-800/50 text-stone-400 border border-stone-700/30'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="text-[10px] text-stone-500 uppercase mb-1.5 block">Amount (INR)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Min"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  className="px-3 py-2 bg-stone-800/60 border border-stone-700/40 rounded-lg text-xs text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-teal-500/50"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Max"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  className="px-3 py-2 bg-stone-800/60 border border-stone-700/40 rounded-lg text-xs text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-teal-500/50"
                />
              </div>
            </div>

            {/* Tags */}
            {availableTags.length > 0 && (
              <div>
                <label className="text-[10px] text-stone-500 uppercase mb-1.5 block flex items-center gap-1">
                  <TagIcon size={10} /> Tags
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {availableTags.map(tag => {
                    const active = selectedTagIds.has(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleInSet(setSelectedTagIds, tag.id)}
                        className={`px-2.5 py-1 rounded text-xs ${
                          active
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                            : 'bg-stone-800/50 text-stone-400 border border-stone-700/30'
                        }`}
                      >
                        #{tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Clear all */}
            {activeFilterCount > 0 && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1 text-xs text-stone-400 hover:text-red-400"
              >
                <XCircle size={12} /> Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-4 gap-2">
        <div className="glass-card p-3 text-center">
          <p className="text-sm font-display text-stone-200">{formatCurrency(totals.spent, 'INR')}</p>
          <p className="text-[10px] text-stone-500">Spent</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-sm font-display text-emerald-400">{formatCurrency(totals.refunds, 'INR')}</p>
          <p className="text-[10px] text-stone-500">Refunds</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-sm font-display text-teal-400">{formatCurrency(totals.net, 'INR')}</p>
          <p className="text-[10px] text-stone-500">Net</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-sm font-display text-stone-200">
            {totals.avgPerDay != null ? formatCurrency(totals.avgPerDay, 'INR') : '—'}
          </p>
          <p className="text-[10px] text-stone-500">Avg/day</p>
        </div>
      </div>

      {/* Expenses list */}
      {filteredExpenses.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Calendar size={32} className="mx-auto text-stone-600 mb-3" />
          <p className="text-sm text-stone-400">No expenses found</p>
          <p className="text-xs text-stone-600 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, dayExpenses]) => (
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
                    onUpdate={onUpdateExpense}
                    onDelete={onDeleteExpense}
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
