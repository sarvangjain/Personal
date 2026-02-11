/**
 * ExpensePreview - Review and edit parsed expenses before saving
 */

import { useState, useMemo } from 'react';
import { 
  ArrowLeft, Save, Trash2, Edit2, Check, X, AlertTriangle,
  Calendar, Tag, DollarSign, Loader2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '../../utils/analytics';
import { getAllCategories, validateExpenses } from '../../utils/expenseParser';

const CATEGORIES = getAllCategories();

function ExpenseRow({ expense, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState(expense);

  const handleSave = () => {
    onUpdate(expense.id, editData);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditData(expense);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="p-3 bg-stone-800/50 border border-violet-500/30 rounded-xl space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-stone-500 uppercase tracking-wider mb-1 block">Date</label>
            <input
              type="date"
              value={editData.date}
              onChange={(e) => setEditData({ ...editData, date: e.target.value })}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-200 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="text-[10px] text-stone-500 uppercase tracking-wider mb-1 block">Amount</label>
            <input
              type="number"
              value={editData.amount}
              onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-200 focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>
        
        <div>
          <label className="text-[10px] text-stone-500 uppercase tracking-wider mb-1 block">Description</label>
          <input
            type="text"
            value={editData.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-200 focus:outline-none focus:border-violet-500"
          />
        </div>
        
        <div>
          <label className="text-[10px] text-stone-500 uppercase tracking-wider mb-1 block">Category</label>
          <select
            value={editData.category}
            onChange={(e) => setEditData({ ...editData, category: e.target.value })}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-200 focus:outline-none focus:border-violet-500"
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-stone-400">
            <input
              type="checkbox"
              checked={editData.isRefund}
              onChange={(e) => setEditData({ ...editData, isRefund: e.target.checked })}
              className="rounded border-stone-600"
            />
            Refund/Income
          </label>
        </div>
        
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg"
          >
            <Check size={14} /> Save
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 flex items-center justify-center gap-1 py-2 bg-stone-700 hover:bg-stone-600 text-stone-300 text-xs rounded-lg"
          >
            <X size={14} /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
      expense.cancelled
        ? 'bg-stone-800/20 border-stone-700/30 opacity-60'
        : expense.isPending 
          ? 'bg-amber-500/5 border-amber-500/20' 
          : expense.isRefund 
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-stone-800/30 border-stone-800/50 hover:border-stone-700/50'
    }`}>
      {/* Date */}
      <div className="w-16 flex-shrink-0 text-center">
        <p className="text-xs text-stone-500">
          {format(parseISO(expense.date), 'MMM d')}
        </p>
      </div>
      
      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${expense.cancelled ? 'text-stone-500 line-through' : 'text-stone-200'}`}>
          {expense.description}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[10px] px-1.5 py-0.5 bg-stone-800/80 text-stone-400 rounded">
            {expense.category}
          </span>
          {expense.cancelled && (
            <span className="text-[10px] px-1.5 py-0.5 bg-stone-600/20 text-stone-500 rounded">
              Cancelled
            </span>
          )}
          {expense.isPending && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
              Pending
            </span>
          )}
          {expense.isRefund && !expense.cancelled && (
            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">
              Refund
            </span>
          )}
        </div>
      </div>
      
      {/* Amount */}
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-mono font-medium ${
          expense.cancelled 
            ? 'text-stone-500 line-through' 
            : expense.isRefund 
              ? 'text-emerald-400' 
              : 'text-stone-200'
        }`}>
          {expense.isRefund && !expense.cancelled ? '+' : ''}{formatCurrency(expense.amount, 'INR')}
        </p>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="p-1.5 text-stone-500 hover:text-stone-300 transition-colors"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={() => onDelete(expense.id)}
          className="p-1.5 text-stone-500 hover:text-red-400 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export default function ExpensePreview({ parseResult, onBack, onSave }) {
  const [expenses, setExpenses] = useState(parseResult.expenses);
  const [saving, setSaving] = useState(false);

  // Group expenses by date
  const groupedExpenses = useMemo(() => {
    const groups = {};
    for (const exp of expenses) {
      if (!groups[exp.date]) {
        groups[exp.date] = [];
      }
      groups[exp.date].push(exp);
    }
    // Sort by date descending
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [expenses]);

  // Calculate totals
  const totals = useMemo(() => {
    let total = 0;
    let refunds = 0;
    let pending = 0;
    let cancelled = 0;
    
    for (const exp of expenses) {
      if (exp.cancelled) {
        cancelled++;
        continue; // Don't count cancelled expenses in totals
      }
      if (exp.isPending) {
        pending++;
      } else if (exp.isRefund) {
        refunds += exp.amount;
      } else {
        total += exp.amount;
      }
    }
    
    return { total, refunds, pending, cancelled, net: total - refunds };
  }, [expenses]);

  // Validation issues
  const issues = useMemo(() => validateExpenses(expenses), [expenses]);

  const handleUpdate = (id, newData) => {
    setExpenses(prev => prev.map(exp => exp.id === id ? { ...exp, ...newData } : exp));
  };

  const handleDelete = (id) => {
    setExpenses(prev => prev.filter(exp => exp.id !== id));
  };

  const handleSave = async () => {
    if (expenses.length === 0) return;
    
    setSaving(true);
    try {
      await onSave(expenses);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl bg-stone-800/60 hover:bg-stone-800 border border-stone-700/50 text-stone-400 hover:text-stone-200 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-display text-stone-200">Review Expenses</h2>
          <p className="text-xs text-stone-500">
            {expenses.length} expenses parsed • Edit before saving
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-display text-stone-200">
              {formatCurrency(totals.total, 'INR')}
            </p>
            <p className="text-[10px] text-stone-500 uppercase tracking-wider">Total Spent</p>
          </div>
          <div>
            <p className="text-lg font-display text-emerald-400">
              {formatCurrency(totals.refunds, 'INR')}
            </p>
            <p className="text-[10px] text-stone-500 uppercase tracking-wider">Refunds</p>
          </div>
          <div>
            <p className="text-lg font-display text-violet-400">
              {formatCurrency(totals.net, 'INR')}
            </p>
            <p className="text-[10px] text-stone-500 uppercase tracking-wider">Net Spend</p>
          </div>
        </div>
      </div>

      {/* Validation Issues */}
      {issues.length > 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <div className="flex items-center gap-2 text-amber-400 text-sm mb-2">
            <AlertTriangle size={16} />
            <span className="font-medium">Review suggested</span>
          </div>
          <ul className="text-xs text-amber-300/80 space-y-1">
            {issues.slice(0, 3).map((issue, i) => (
              <li key={i}>• {issue.expense.description}: {issue.issue}</li>
            ))}
            {issues.length > 3 && (
              <li className="text-amber-500">+ {issues.length - 3} more</li>
            )}
          </ul>
        </div>
      )}

      {/* Parse Errors */}
      {parseResult.errors.length > 0 && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-sm text-red-400 mb-2">
            {parseResult.errors.length} line(s) could not be parsed:
          </p>
          <ul className="text-xs text-red-300/80 space-y-1">
            {parseResult.errors.slice(0, 3).map((err, i) => (
              <li key={i}>Line {err.line}: "{err.text}"</li>
            ))}
          </ul>
        </div>
      )}

      {/* Expenses List */}
      <div className="space-y-4">
        {groupedExpenses.map(([date, dayExpenses]) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={12} className="text-stone-500" />
              <h4 className="text-xs font-medium text-stone-400">
                {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
              </h4>
              <span className="text-[10px] text-stone-600">
                ({dayExpenses.length} items)
              </span>
            </div>
            <div className="space-y-2">
              {dayExpenses.map(expense => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-stone-950 via-stone-950/95 to-transparent -mx-3 px-3">
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-3 bg-stone-800/50 hover:bg-stone-800 border border-stone-700/50 text-stone-400 text-sm font-medium rounded-xl transition-colors"
          >
            Back to Edit
          </button>
          <button
            onClick={handleSave}
            disabled={expenses.length === 0 || saving}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-700 disabled:text-stone-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save {expenses.length} Expenses
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
