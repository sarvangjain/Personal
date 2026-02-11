import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Copy, Wallet, Loader2 } from 'lucide-react';
import { formatCurrency, getUniqueCategories } from '../utils/analytics';
import { copyBudgetFromPreviousMonth } from '../firebase/budgetService';
import { format } from 'date-fns';

export default function BudgetSetupModal({ 
  onClose, 
  onSave, 
  existingBudget,
  expenses,
  userId,
  month,
  currency = 'INR',
}) {
  const [overallLimit, setOverallLimit] = useState('');
  const [categoryLimits, setCategoryLimits] = useState({});
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [copying, setCopying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Get suggested categories from user's expenses
  const suggestedCategories = getUniqueCategories(expenses);

  // Initialize from existing budget
  useEffect(() => {
    if (existingBudget) {
      setOverallLimit(String(existingBudget.overallLimit || ''));
      setCategoryLimits(existingBudget.categoryLimits || {});
      setSelectedCategories(Object.keys(existingBudget.categoryLimits || {}));
    }
  }, [existingBudget]);

  // Handle copy from previous month
  async function handleCopyFromPrevious() {
    setCopying(true);
    try {
      const result = await copyBudgetFromPreviousMonth(userId, month);
      
      if (result) {
        // Reload the modal with copied data - trigger parent to refetch
        onSave({ copied: true });
      } else {
        alert('No budget found for the previous month');
      }
    } catch (error) {
      console.error('Error copying budget:', error);
    } finally {
      setCopying(false);
    }
  }

  // Add a category
  function handleAddCategory(category) {
    if (!category || selectedCategories.includes(category)) return;
    setSelectedCategories([...selectedCategories, category]);
    setCategoryLimits({ ...categoryLimits, [category]: '' });
    setNewCategory('');
    setShowCategoryPicker(false);
  }

  // Remove a category
  function handleRemoveCategory(category) {
    setSelectedCategories(selectedCategories.filter(c => c !== category));
    const newLimits = { ...categoryLimits };
    delete newLimits[category];
    setCategoryLimits(newLimits);
  }

  // Update category limit
  function handleCategoryLimitChange(category, value) {
    setCategoryLimits({ ...categoryLimits, [category]: value });
  }

  // Save budget
  async function handleSave() {
    setError(null);
    setSaving(true);
    
    try {
      // Build category limits object with only non-zero values
      const finalCategoryLimits = {};
      Object.entries(categoryLimits).forEach(([cat, limit]) => {
        const numLimit = parseFloat(limit);
        if (numLimit > 0) {
          finalCategoryLimits[cat] = numLimit;
        }
      });

      await onSave({
        overallLimit: parseFloat(overallLimit) || 0,
        currency,
        categoryLimits: finalCategoryLimits,
      });
    } catch (err) {
      console.error('Error saving budget:', err);
      setError(err.message || 'Failed to save budget. Please try again.');
      setSaving(false);
    }
  }

  // Categories not yet added
  const availableCategories = suggestedCategories.filter(
    c => !selectedCategories.includes(c)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-card w-full sm:max-w-lg sm:mx-4 p-4 sm:p-6 animate-slide-up rounded-t-3xl sm:rounded-2xl safe-bottom max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle for mobile */}
        <div className="sm:hidden flex justify-center pb-2">
          <div className="w-10 h-1 rounded-full bg-stone-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10">
              <Wallet size={20} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="font-display text-lg text-stone-100">
                {existingBudget ? 'Edit Budget' : 'Set Budget'}
              </h2>
              <p className="text-xs text-stone-500">
                {format(new Date(month + '-01'), 'MMMM yyyy')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300 transition-colors p-1 -mr-1 min-touch">
            <X size={18} />
          </button>
        </div>

        {/* Copy from previous month */}
        {!existingBudget && (
          <button
            onClick={handleCopyFromPrevious}
            disabled={copying}
            className="w-full flex items-center justify-center gap-2 p-3 mb-5 bg-stone-800/50 hover:bg-stone-800 border border-stone-700/50 rounded-xl text-sm text-stone-300 transition-colors disabled:opacity-50"
          >
            <Copy size={14} />
            {copying ? 'Copying...' : 'Copy from previous month'}
          </button>
        )}

        {/* Overall Budget */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-stone-300 mb-2">
            Overall Monthly Budget
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">
              {currency === 'INR' ? '₹' : currency}
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={overallLimit}
              onChange={e => setOverallLimit(e.target.value)}
              placeholder="25000"
              className="w-full pl-8 pr-4 py-3 bg-stone-800/80 border border-stone-700/50 rounded-xl text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
            />
          </div>
          <p className="text-xs text-stone-500 mt-1.5">
            Your total spending limit for the month
          </p>
        </div>

        {/* Category Budgets */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-stone-300">
              Category Budgets
              <span className="text-stone-500 font-normal ml-1">(optional)</span>
            </label>
          </div>

          {/* Selected categories */}
          {selectedCategories.length > 0 && (
            <div className="space-y-2 mb-3">
              {selectedCategories.map(category => (
                <div key={category} className="flex items-center gap-2">
                  <span className="flex-1 text-sm text-stone-300 truncate">
                    {category}
                  </span>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-500 text-xs">
                      {currency === 'INR' ? '₹' : currency}
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={categoryLimits[category] || ''}
                      onChange={e => handleCategoryLimitChange(category, e.target.value)}
                      placeholder="0"
                      className="w-28 pl-6 pr-2 py-2 bg-stone-800/80 border border-stone-700/50 rounded-lg text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                  <button
                    onClick={() => handleRemoveCategory(category)}
                    className="p-2 text-stone-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add category button */}
          {!showCategoryPicker ? (
            <button
              onClick={() => setShowCategoryPicker(true)}
              className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <Plus size={14} /> Add category budget
            </button>
          ) : (
            <div className="space-y-2">
              {/* Suggested categories */}
              {availableCategories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {availableCategories.slice(0, 8).map(cat => (
                    <button
                      key={cat}
                      onClick={() => handleAddCategory(cat)}
                      className="px-3 py-1.5 bg-stone-800/50 hover:bg-stone-700/50 border border-stone-700/50 rounded-lg text-xs text-stone-300 transition-colors"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
              
              {/* Custom category input */}
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCategory(newCategory)}
                  placeholder="Custom category..."
                  className="flex-1 px-3 py-2 bg-stone-800/80 border border-stone-700/50 rounded-lg text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                />
                <button
                  onClick={() => handleAddCategory(newCategory)}
                  disabled={!newCategory}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-700 disabled:text-stone-500 text-white text-sm rounded-lg transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowCategoryPicker(false)}
                  className="px-3 py-2 text-stone-400 hover:text-stone-200 text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        {(overallLimit || Object.values(categoryLimits).some(v => v)) && (
          <div className="p-3 bg-stone-800/30 border border-stone-800/40 rounded-xl mb-5">
            <p className="text-xs text-stone-500 mb-2">Budget Preview</p>
            <div className="text-sm text-stone-300">
              <span className="font-medium">Overall:</span>{' '}
              {formatCurrency(parseFloat(overallLimit) || 0, currency)}
            </div>
            {selectedCategories.length > 0 && (
              <div className="mt-1 text-xs text-stone-400">
                {selectedCategories.length} category limit{selectedCategories.length !== 1 ? 's' : ''} set
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-3 text-sm text-stone-400 hover:text-stone-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!overallLimit || parseFloat(overallLimit) <= 0 || saving}
            className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-700 disabled:text-stone-500 text-white text-sm rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              'Save Budget'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
