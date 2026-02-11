/**
 * QuickAddModal - Modal for quick expense entry with natural language
 */

import { useState, useMemo, useEffect } from 'react';
import { 
  X, Calendar, Sparkles, Save, Trash2, Edit2, Check,
  Loader2, ChevronRight, Plus, ArrowLeft
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { parseExpenseLine, inferCategory, getAllCategories } from '../../utils/expenseParser';
import { formatCurrency } from '../../utils/analytics';
import { addExpenses, clearCache } from '../../firebase/expenseSightService';

const CATEGORIES = getAllCategories();

// Date options for quick selection
const getDateOptions = () => [
  { id: 'today', label: 'Today', date: new Date() },
  { id: 'yesterday', label: 'Yesterday', date: subDays(new Date(), 1) },
  { id: '2days', label: '2 days ago', date: subDays(new Date(), 2) },
];

// Category colors for badges
const CATEGORY_COLORS = {
  'Groceries': 'bg-green-500/20 text-green-400',
  'Transport': 'bg-blue-500/20 text-blue-400',
  'Food & Dining': 'bg-orange-500/20 text-orange-400',
  'Utilities': 'bg-yellow-500/20 text-yellow-400',
  'Shopping': 'bg-pink-500/20 text-pink-400',
  'Entertainment': 'bg-purple-500/20 text-purple-400',
  'Health': 'bg-red-500/20 text-red-400',
  'Travel': 'bg-cyan-500/20 text-cyan-400',
  'Personal': 'bg-indigo-500/20 text-indigo-400',
  'Payments': 'bg-emerald-500/20 text-emerald-400',
  'Other': 'bg-stone-500/20 text-stone-400',
};

function ExpenseCard({ expense, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState(expense);

  const handleSave = () => {
    onUpdate(expense.id, editData);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="p-3 bg-stone-800/60 border border-violet-500/30 rounded-xl space-y-2">
        <input
          type="text"
          value={editData.description}
          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
          className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-200 focus:outline-none focus:border-violet-500"
          placeholder="Description"
        />
        <div className="flex gap-2">
          <input
            type="number"
            value={editData.amount}
            onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) || 0 })}
            className="flex-1 px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-200 focus:outline-none focus:border-violet-500"
            placeholder="Amount"
          />
          <select
            value={editData.category}
            onChange={(e) => setEditData({ ...editData, category: e.target.value })}
            className="flex-1 px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-200 focus:outline-none focus:border-violet-500"
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg flex items-center justify-center gap-1"
          >
            <Check size={14} /> Save
          </button>
          <button
            onClick={() => { setEditData(expense); setEditing(false); }}
            className="flex-1 py-2 bg-stone-700 hover:bg-stone-600 text-stone-300 text-xs rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-stone-800/40 rounded-xl border border-stone-700/30">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-200 truncate">{expense.description}</p>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${CATEGORY_COLORS[expense.category] || CATEGORY_COLORS['Other']}`}>
          {expense.category}
        </span>
      </div>
      <div className="text-right">
        <p className="text-sm font-mono font-medium text-stone-200">
          {formatCurrency(expense.amount, 'INR')}
        </p>
      </div>
      <div className="flex items-center gap-1">
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

function SuccessSummary({ expenses, onAddMore, onClose }) {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const categories = [...new Set(expenses.map(e => e.category))];

  return (
    <div className="text-center py-6 space-y-4">
      <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
        <Check size={32} className="text-emerald-400" />
      </div>
      <div>
        <h3 className="text-lg font-medium text-stone-200">Saved Successfully!</h3>
        <p className="text-sm text-stone-500 mt-1">
          {expenses.length} expense{expenses.length > 1 ? 's' : ''} added
        </p>
      </div>
      
      {/* Summary */}
      <div className="glass-card p-4 text-left space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-stone-500 uppercase tracking-wider">Total</span>
          <span className="text-lg font-display text-emerald-400">{formatCurrency(total, 'INR')}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-stone-500 uppercase tracking-wider">Categories</span>
          <div className="flex flex-wrap gap-1 justify-end">
            {categories.slice(0, 3).map(cat => (
              <span key={cat} className={`text-[10px] px-1.5 py-0.5 rounded ${CATEGORY_COLORS[cat] || CATEGORY_COLORS['Other']}`}>
                {cat}
              </span>
            ))}
            {categories.length > 3 && (
              <span className="text-[10px] text-stone-500">+{categories.length - 3}</span>
            )}
          </div>
        </div>
        <div className="pt-2 border-t border-stone-700/50">
          <p className="text-xs text-stone-500">Expenses breakdown:</p>
          <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
            {expenses.map(exp => (
              <div key={exp.id} className="flex justify-between text-xs">
                <span className="text-stone-400 truncate flex-1">{exp.description}</span>
                <span className="text-stone-300 font-mono ml-2">{formatCurrency(exp.amount, 'INR')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onAddMore}
          className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Add More
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm font-medium rounded-xl"
        >
          Done
        </button>
      </div>
    </div>
  );
}

export default function QuickAddModal({ isOpen, onClose, userId, onSaved }) {
  const [selectedDate, setSelectedDate] = useState('today');
  const [inputText, setInputText] = useState('');
  const [parsedExpenses, setParsedExpenses] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [savedExpenses, setSavedExpenses] = useState(null);

  useBodyScrollLock(isOpen);

  const dateOptions = useMemo(() => getDateOptions(), []);
  const currentDate = dateOptions.find(d => d.id === selectedDate)?.date || new Date();

  // Parse input text into expenses
  const handleParse = () => {
    const lines = inputText.split('\n').filter(line => line.trim());
    const expenses = [];

    for (const line of lines) {
      const expense = parseExpenseLine(line, currentDate);
      if (expense && !expense.skip) {
        expenses.push(expense);
      }
    }

    setParsedExpenses(expenses);
  };

  // Update a parsed expense
  const handleUpdateExpense = (id, newData) => {
    setParsedExpenses(prev => prev.map(exp => 
      exp.id === id ? { ...exp, ...newData } : exp
    ));
  };

  // Delete a parsed expense
  const handleDeleteExpense = (id) => {
    setParsedExpenses(prev => prev.filter(exp => exp.id !== id));
  };

  // Save expenses to Firebase
  const handleSave = async () => {
    if (parsedExpenses.length === 0) return;

    setSaving(true);
    setSaveError(null);

    try {
      const result = await addExpenses(userId, parsedExpenses);
      
      if (result.success) {
        setSavedExpenses([...parsedExpenses]);
        setParsedExpenses([]);
        setInputText('');
        clearCache(userId);
        if (onSaved) onSaved();
      } else {
        throw new Error(result.error || 'Failed to save expenses');
      }
    } catch (err) {
      console.error('Save error:', err);
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Reset to add more
  const handleAddMore = () => {
    setSavedExpenses(null);
    setInputText('');
    setParsedExpenses([]);
  };

  // Handle close
  const handleClose = () => {
    setInputText('');
    setParsedExpenses([]);
    setSavedExpenses(null);
    setSaveError(null);
    onClose();
  };

  // Calculate total
  const total = parsedExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Line count
  const lineCount = inputText.split('\n').filter(l => l.trim()).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-auto bg-stone-900 border border-stone-700/50 rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-display text-stone-200">Quick Add</h2>
              <p className="text-xs text-stone-500">Add expenses naturally</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl hover:bg-stone-800 text-stone-500 hover:text-stone-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {savedExpenses ? (
            <SuccessSummary 
              expenses={savedExpenses}
              onAddMore={handleAddMore}
              onClose={handleClose}
            />
          ) : (
            <div className="space-y-4">
              {/* Date Selector */}
              <div>
                <label className="text-xs text-stone-500 uppercase tracking-wider mb-2 block">
                  Select Date
                </label>
                <div className="flex gap-2">
                  {dateOptions.map(option => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setSelectedDate(option.id);
                        // Re-parse if we have parsed expenses
                        if (parsedExpenses.length > 0) {
                          const lines = inputText.split('\n').filter(line => line.trim());
                          const newExpenses = lines.map(line => {
                            const exp = parseExpenseLine(line, option.date);
                            return exp && !exp.skip ? exp : null;
                          }).filter(Boolean);
                          setParsedExpenses(newExpenses);
                        }
                      }}
                      className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                        selectedDate === option.id
                          ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                          : 'bg-stone-800/50 text-stone-400 border border-stone-700/50 hover:bg-stone-800'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-stone-600 mt-1.5 flex items-center gap-1">
                  <Calendar size={12} />
                  {format(currentDate, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>

              {/* Input Area */}
              {parsedExpenses.length === 0 ? (
                <div>
                  <label className="text-xs text-stone-500 uppercase tracking-wider mb-2 block">
                    Enter Expenses
                  </label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Grocery zepto 350&#10;Cab to office 150&#10;Coffee with friend 80"
                    className="w-full h-40 px-4 py-3 bg-stone-800/50 border border-stone-700/50 rounded-xl text-sm text-stone-200 placeholder-stone-600 font-mono focus:outline-none focus:border-violet-500/50 resize-none"
                  />
                  <div className="flex justify-between mt-1.5">
                    <p className="text-xs text-stone-600">
                      One expense per line
                    </p>
                    <p className="text-xs text-stone-600">
                      {lineCount} line{lineCount !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Parse Button */}
                  <button
                    onClick={handleParse}
                    disabled={lineCount === 0}
                    className="w-full mt-4 py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-stone-700 disabled:text-stone-500 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Sparkles size={16} />
                    Parse {lineCount > 0 ? `${lineCount} Expense${lineCount > 1 ? 's' : ''}` : 'Expenses'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Back to edit */}
                  <button
                    onClick={() => setParsedExpenses([])}
                    className="text-xs text-stone-500 hover:text-stone-300 flex items-center gap-1"
                  >
                    <ArrowLeft size={14} />
                    Back to edit
                  </button>

                  {/* Parsed Expenses */}
                  <div>
                    <label className="text-xs text-stone-500 uppercase tracking-wider mb-2 block">
                      Parsed Expenses ({parsedExpenses.length})
                    </label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {parsedExpenses.map(expense => (
                        <ExpenseCard
                          key={expense.id}
                          expense={expense}
                          onUpdate={handleUpdateExpense}
                          onDelete={handleDeleteExpense}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center p-3 bg-stone-800/30 rounded-xl">
                    <span className="text-sm text-stone-400">Total</span>
                    <span className="text-lg font-display text-violet-400">
                      {formatCurrency(total, 'INR')}
                    </span>
                  </div>

                  {/* Save Error */}
                  {saveError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                      {saveError}
                    </div>
                  )}

                  {/* Save Button */}
                  <button
                    onClick={handleSave}
                    disabled={parsedExpenses.length === 0 || saving}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-700 disabled:text-stone-500 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Save {parsedExpenses.length} Expense{parsedExpenses.length > 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
