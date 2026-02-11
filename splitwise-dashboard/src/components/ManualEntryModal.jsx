import { useState, useMemo } from 'react';
import { X, Receipt, Calendar, Tag, FileText, AlertCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { getUniqueCategories } from '../utils/analytics';

export default function ManualEntryModal({ 
  onClose, 
  onSave, 
  expenses,
  month,
  currency = 'INR',
}) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Get suggested categories from user's expenses
  const suggestedCategories = ['Other', ...getUniqueCategories(expenses)];

  // Calculate valid date range for the budget month
  const dateRange = useMemo(() => {
    const monthDate = new Date(month + '-01');
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const today = new Date();
    // Don't allow future dates
    const maxDate = end > today ? today : end;
    return {
      min: format(start, 'yyyy-MM-dd'),
      max: format(maxDate, 'yyyy-MM-dd'),
    };
  }, [month]);

  // Check if selected date is within budget month
  const isDateValid = useMemo(() => {
    const selectedDate = new Date(date);
    const monthDate = new Date(month + '-01');
    return isWithinInterval(selectedDate, {
      start: startOfMonth(monthDate),
      end: endOfMonth(monthDate),
    });
  }, [date, month]);

  function handleSave() {
    if (!amount || parseFloat(amount) <= 0 || !isDateValid) return;

    onSave({
      amount: parseFloat(amount),
      description: description || 'Manual expense',
      category: category || 'Other',
      date,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-card w-full sm:max-w-md sm:mx-4 p-4 sm:p-6 animate-slide-up rounded-t-3xl sm:rounded-2xl safe-bottom max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle for mobile */}
        <div className="sm:hidden flex justify-center pb-2">
          <div className="w-10 h-1 rounded-full bg-stone-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <Receipt size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 className="font-display text-lg text-stone-100">Add Manual Entry</h2>
              <p className="text-xs text-stone-500">
                Track cash or non-Splitwise spending
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300 transition-colors p-1 -mr-1 min-touch">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Amount */}
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-stone-400 mb-1.5">
              <Receipt size={12} /> Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">
                {currency === 'INR' ? '₹' : currency}
              </span>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                autoFocus
                className="w-full pl-8 pr-4 py-3 bg-stone-800/80 border border-stone-700/50 rounded-xl text-lg text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-stone-400 mb-1.5">
              <FileText size={12} /> Description
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What was this for?"
              className="w-full px-3 py-3 bg-stone-800/80 border border-stone-700/50 rounded-xl text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
          </div>

          {/* Category */}
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-stone-400 mb-1.5">
              <Tag size={12} /> Category
            </label>
            {!showCategoryPicker ? (
              <button
                onClick={() => setShowCategoryPicker(true)}
                className="w-full px-3 py-3 bg-stone-800/80 border border-stone-700/50 rounded-xl text-sm text-left transition-colors hover:border-stone-600/50"
              >
                <span className={category ? 'text-stone-200' : 'text-stone-600'}>
                  {category || 'Select category...'}
                </span>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 p-3 bg-stone-800/50 border border-stone-700/50 rounded-xl">
                  {suggestedCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => {
                        setCategory(cat);
                        setShowCategoryPicker(false);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                        category === cat
                          ? 'bg-blue-500 text-white'
                          : 'bg-stone-700/50 text-stone-300 hover:bg-stone-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder="Or type custom..."
                    className="flex-1 px-3 py-2 bg-stone-800/80 border border-stone-700/50 rounded-lg text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                  <button
                    onClick={() => setShowCategoryPicker(false)}
                    className="px-3 py-2 text-stone-400 hover:text-stone-200 text-sm transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-stone-400 mb-1.5">
              <Calendar size={12} /> Date
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              min={dateRange.min}
              max={dateRange.max}
              className={`w-full px-3 py-3 bg-stone-800/80 border rounded-xl text-sm text-stone-200 focus:outline-none transition-all ${
                isDateValid 
                  ? 'border-stone-700/50 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20' 
                  : 'border-red-500/50 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20'
              }`}
            />
            {!isDateValid && (
              <p className="flex items-center gap-1 text-xs text-red-400 mt-1">
                <AlertCircle size={10} />
                Date must be within {format(new Date(month + '-01'), 'MMMM yyyy')}
              </p>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="mt-5 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
          <p className="text-xs text-stone-400 leading-relaxed">
            Manual entries are for tracking cash spending or expenses not in Splitwise. 
            They'll be added to your budget tracking for this month.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-sm text-stone-400 hover:text-stone-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!amount || parseFloat(amount) <= 0 || !isDateValid}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-stone-700 disabled:text-stone-500 text-white text-sm rounded-xl transition-colors font-medium"
          >
            Add Entry
          </button>
        </div>
      </div>
    </div>
  );
}
