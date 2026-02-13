/**
 * BillForm - Add/Edit bill form modal
 */

import { useState, useEffect } from 'react';
import { X, Calendar, CreditCard, RotateCcw, Zap, Bell, Save } from 'lucide-react';
import { getAllCategories, getCategoryIcon, getCategoryColors } from '../../../utils/categoryConfig';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';

const FREQUENCIES = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'once', label: 'One-time' },
];

const REMINDER_OPTIONS = [
  { days: 1, label: '1 day before' },
  { days: 3, label: '3 days before' },
  { days: 7, label: '1 week before' },
];

export default function BillForm({ isOpen, onClose, onSave, editingBill = null }) {
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: 'Utilities',
    dueDay: 1,
    frequency: 'monthly',
    isAutoPay: false,
    reminderDays: [1],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useBodyScrollLock(isOpen);

  // Populate form when editing
  useEffect(() => {
    if (editingBill) {
      setFormData({
        name: editingBill.name,
        amount: editingBill.amount.toString(),
        category: editingBill.category,
        dueDay: editingBill.dueDay,
        frequency: editingBill.frequency,
        isAutoPay: editingBill.isAutoPay || false,
        reminderDays: editingBill.reminderDays || [1],
      });
    } else {
      setFormData({
        name: '',
        amount: '',
        category: 'Utilities',
        dueDay: 1,
        frequency: 'monthly',
        isAutoPay: false,
        reminderDays: [1],
      });
    }
    setError(null);
  }, [editingBill, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Please enter a bill name');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        ...formData,
        amount: parseFloat(formData.amount),
        dueDay: parseInt(formData.dueDay),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save bill');
    } finally {
      setSaving(false);
    }
  };

  const toggleReminder = (days) => {
    setFormData(prev => {
      const current = prev.reminderDays || [];
      if (current.includes(days)) {
        return { ...prev, reminderDays: current.filter(d => d !== days) };
      }
      return { ...prev, reminderDays: [...current, days].sort((a, b) => a - b) };
    });
  };

  const categories = getAllCategories();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-auto bg-stone-900 border border-stone-700/50 rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
              <CreditCard size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-display text-stone-200">
                {editingBill ? 'Edit Bill' : 'Add Bill'}
              </h2>
              <p className="text-xs text-stone-500">Set up a recurring bill reminder</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-stone-800 text-stone-500 hover:text-stone-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
          {/* Bill Name */}
          <div>
            <label className="text-xs text-stone-500 uppercase tracking-wider mb-2 block">
              Bill Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., House Rent, Netflix, Electricity"
              className="w-full px-4 py-3 bg-stone-800/50 border border-stone-700/50 rounded-xl text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-teal-500/50"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs text-stone-500 uppercase tracking-wider mb-2 block">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500">₹</span>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0"
                className="w-full pl-8 pr-4 py-3 bg-stone-800/50 border border-stone-700/50 rounded-xl text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-teal-500/50"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs text-stone-500 uppercase tracking-wider mb-2 block">
              Category
            </label>
            <div className="grid grid-cols-4 gap-2">
              {categories.slice(0, 8).map(cat => {
                const Icon = getCategoryIcon(cat);
                const colors = getCategoryColors(cat);
                const isSelected = formData.category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat })}
                    className={`p-3 sm:p-2 rounded-xl border transition-all touch-manipulation ${
                      isSelected
                        ? `${colors.bg} ${colors.border} border`
                        : 'bg-stone-800/50 border-stone-700/50 hover:border-stone-600 active:bg-stone-800'
                    }`}
                  >
                    <Icon size={20} className={`mx-auto sm:w-[18px] sm:h-[18px] ${isSelected ? colors.text : 'text-stone-500'}`} />
                    <p className={`text-[10px] sm:text-[9px] mt-1 truncate ${isSelected ? colors.text : 'text-stone-500'}`}>
                      {cat.split(' ')[0]}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Due Day and Frequency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-500 uppercase tracking-wider mb-2 block">
                Due Day
              </label>
              <select
                value={formData.dueDay}
                onChange={(e) => setFormData({ ...formData, dueDay: e.target.value })}
                className="w-full px-4 py-3 bg-stone-800/50 border border-stone-700/50 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-teal-500/50 appearance-none cursor-pointer"
                style={{ 
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                  paddingRight: '2.5rem'
                }}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>Day {day}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-stone-500 uppercase tracking-wider mb-2 block">
                Frequency
              </label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="w-full px-4 py-3 bg-stone-800/50 border border-stone-700/50 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-teal-500/50 appearance-none cursor-pointer"
                style={{ 
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                  paddingRight: '2.5rem'
                }}
              >
                {FREQUENCIES.map(freq => (
                  <option key={freq.id} value={freq.id}>{freq.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Auto-pay Toggle */}
          <div className="flex items-center justify-between p-3 bg-stone-800/30 rounded-xl">
            <div className="flex items-center gap-3">
              <Zap size={18} className="text-blue-400" />
              <div>
                <p className="text-sm text-stone-200">Auto-pay enabled</p>
                <p className="text-xs text-stone-500">Bill is automatically paid</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isAutoPay: !formData.isAutoPay })}
              className={`w-12 h-6 rounded-full transition-colors ${
                formData.isAutoPay ? 'bg-blue-500' : 'bg-stone-700'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                formData.isAutoPay ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Reminder Settings */}
          <div>
            <label className="text-xs text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Bell size={12} />
              Remind me
            </label>
            <div className="flex gap-2">
              {REMINDER_OPTIONS.map(option => {
                const isSelected = formData.reminderDays?.includes(option.days);
                return (
                  <button
                    key={option.days}
                    type="button"
                    onClick={() => toggleReminder(option.days)}
                    className={`flex-1 py-3 sm:py-2 px-3 rounded-lg text-xs font-medium transition-all touch-manipulation ${
                      isSelected
                        ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                        : 'bg-stone-800/50 text-stone-400 border border-stone-700/50 hover:bg-stone-800 active:bg-stone-700'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-stone-700 disabled:text-stone-500 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save size={16} />
                {editingBill ? 'Update Bill' : 'Add Bill'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
