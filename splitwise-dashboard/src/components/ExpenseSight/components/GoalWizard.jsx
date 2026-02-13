/**
 * GoalWizard - Multi-step goal creation wizard
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  X, Target, Calendar, Sparkles, ChevronRight, ChevronLeft,
  TrendingDown, PiggyBank, Wallet, Check, ArrowRight
} from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { formatCurrency } from '../../../utils/analytics';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';

const GOAL_TEMPLATES = [
  { id: 'vacation', name: 'Vacation Fund', icon: '✈️', suggestedAmount: 50000 },
  { id: 'emergency', name: 'Emergency Fund', icon: '🏥', suggestedAmount: 100000 },
  { id: 'gadget', name: 'New Gadget', icon: '📱', suggestedAmount: 30000 },
  { id: 'gift', name: 'Gift Fund', icon: '🎁', suggestedAmount: 10000 },
  { id: 'education', name: 'Education/Course', icon: '📚', suggestedAmount: 25000 },
  { id: 'custom', name: 'Custom Goal', icon: '🎯', suggestedAmount: 0 },
];

// Calculate suggested cutbacks based on expense data
function calculateCutbacks(categorySpending, targetAmount, monthsToGoal) {
  const monthlySavingsNeeded = targetAmount / monthsToGoal;
  
  // Non-essential categories to suggest cutting back
  const cutbackCandidates = [
    'Entertainment',
    'Shopping',
    'Food & Dining',
    'Personal Care',
    'Subscriptions',
  ];
  
  const suggestions = [];
  
  for (const category of cutbackCandidates) {
    const spending = categorySpending[category] || 0;
    if (spending > 0) {
      // Suggest cutting 20-30% of the category spending
      const cutbackPercent = spending > monthlySavingsNeeded ? 0.2 : 0.3;
      const potentialSavings = Math.round(spending * cutbackPercent);
      
      if (potentialSavings >= 500) { // Only suggest if savings are meaningful
        suggestions.push({
          category,
          currentSpending: spending,
          potentialSavings,
          cutbackPercent: Math.round(cutbackPercent * 100),
        });
      }
    }
  }
  
  return suggestions
    .sort((a, b) => b.potentialSavings - a.potentialSavings)
    .slice(0, 3);
}

export default function GoalWizard({ 
  isOpen, 
  onClose, 
  onSave, 
  editingGoal = null,
  categorySpending = {} // Pass current month's category breakdown
}) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    deadline: '',
    trackingType: 'savings',
    suggestedCutbacks: [],
  });
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useBodyScrollLock(isOpen);

  // Reset form when opening/closing or when editing changes
  useEffect(() => {
    if (isOpen) {
      if (editingGoal) {
        setFormData({
          name: editingGoal.name,
          targetAmount: editingGoal.targetAmount.toString(),
          deadline: editingGoal.deadline || '',
          trackingType: editingGoal.trackingType || 'savings',
          suggestedCutbacks: editingGoal.suggestedCutbacks || [],
        });
        setStep(2); // Skip template selection when editing
        setSelectedTemplate(null);
      } else {
        setFormData({
          name: '',
          targetAmount: '',
          deadline: '',
          trackingType: 'savings',
          suggestedCutbacks: [],
        });
        setStep(1);
        setSelectedTemplate(null);
      }
      setError(null);
    }
  }, [isOpen, editingGoal]);

  // Calculate cutbacks when amount and deadline change
  const suggestedCutbacks = useMemo(() => {
    if (!formData.targetAmount || !formData.deadline) return [];
    
    const targetAmount = parseFloat(formData.targetAmount);
    const deadline = new Date(formData.deadline);
    const monthsToGoal = Math.max(1, Math.ceil((deadline - new Date()) / (30 * 24 * 60 * 60 * 1000)));
    
    return calculateCutbacks(categorySpending, targetAmount, monthsToGoal);
  }, [formData.targetAmount, formData.deadline, categorySpending]);

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template.id);
    if (template.id !== 'custom') {
      setFormData(prev => ({
        ...prev,
        name: template.name,
        targetAmount: template.suggestedAmount.toString(),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        name: '',
        targetAmount: '',
      }));
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Please enter a goal name');
      return;
    }
    if (!formData.targetAmount || parseFloat(formData.targetAmount) <= 0) {
      setError('Please enter a valid target amount');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        name: formData.name.trim(),
        targetAmount: parseFloat(formData.targetAmount),
        deadline: formData.deadline || null,
        trackingType: formData.trackingType,
        suggestedCutbacks: suggestedCutbacks.map(c => c.category),
        currentAmount: editingGoal?.currentAmount || 0,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save goal');
    } finally {
      setSaving(false);
    }
  };

  const canProceedStep2 = formData.name.trim() && formData.targetAmount;
  const totalSteps = 3;

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
              <Target size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-display text-stone-200">
                {editingGoal ? 'Edit Goal' : 'Create Goal'}
              </h2>
              <p className="text-xs text-stone-500">
                Step {step} of {totalSteps}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-stone-800 text-stone-500 hover:text-stone-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-stone-800">
          <div 
            className="h-full bg-teal-500 transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Step 1: Choose template */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-medium text-stone-200 mb-1">What are you saving for?</h3>
                <p className="text-xs text-stone-500">Choose a template or create a custom goal</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {GOAL_TEMPLATES.map(template => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selectedTemplate === template.id
                        ? 'bg-teal-500/20 border-teal-500/30'
                        : 'bg-stone-800/30 border-stone-700/30 hover:border-stone-600'
                    }`}
                  >
                    <span className="text-2xl mb-2 block">{template.icon}</span>
                    <p className="text-sm font-medium text-stone-200">{template.name}</p>
                    {template.suggestedAmount > 0 && (
                      <p className="text-xs text-stone-500 mt-1">
                        ~{formatCurrency(template.suggestedAmount, 'INR')}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Goal details */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-medium text-stone-200 mb-1">Goal Details</h3>
                <p className="text-xs text-stone-500">Set your target amount and deadline</p>
              </div>

              {/* Goal name */}
              <div>
                <label className="text-xs text-stone-500 uppercase tracking-wider mb-2 block">
                  Goal Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Vacation Fund"
                  className="w-full px-4 py-3 bg-stone-800/50 border border-stone-700/50 rounded-xl text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-teal-500/50"
                />
              </div>

              {/* Target amount */}
              <div>
                <label className="text-xs text-stone-500 uppercase tracking-wider mb-2 block">
                  Target Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500">₹</span>
                  <input
                    type="number"
                    value={formData.targetAmount}
                    onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                    placeholder="0"
                    className="w-full pl-8 pr-4 py-3 bg-stone-800/50 border border-stone-700/50 rounded-xl text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-teal-500/50"
                  />
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label className="text-xs text-stone-500 uppercase tracking-wider mb-2 block">
                  Target Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full px-4 py-3 bg-stone-800/50 border border-stone-700/50 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-teal-500/50"
                />
                {/* Quick date buttons */}
                <div className="flex gap-2 mt-2">
                  {[3, 6, 12].map(months => (
                    <button
                      key={months}
                      type="button"
                      onClick={() => setFormData({ 
                        ...formData, 
                        deadline: format(addMonths(new Date(), months), 'yyyy-MM-dd') 
                      })}
                      className="flex-1 py-1.5 text-xs bg-stone-800/50 text-stone-400 rounded-lg hover:bg-stone-800 transition-colors"
                    >
                      {months} months
                    </button>
                  ))}
                </div>
              </div>

              {/* Goal type */}
              <div>
                <label className="text-xs text-stone-500 uppercase tracking-wider mb-2 block">
                  Goal Type
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, trackingType: 'savings' })}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                      formData.trackingType === 'savings'
                        ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                        : 'bg-stone-800/50 text-stone-400 border border-stone-700/50'
                    }`}
                  >
                    <PiggyBank size={16} />
                    Savings Goal
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, trackingType: 'spending_limit' })}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                      formData.trackingType === 'spending_limit'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-stone-800/50 text-stone-400 border border-stone-700/50'
                    }`}
                  >
                    <TrendingDown size={16} />
                    Spending Limit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review & suggestions */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-medium text-stone-200 mb-1">Review Your Goal</h3>
                <p className="text-xs text-stone-500">Here's what you're aiming for</p>
              </div>

              {/* Goal summary */}
              <div className="p-4 bg-stone-800/30 rounded-xl space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center">
                    <Target size={24} className="text-teal-400" />
                  </div>
                  <div>
                    <p className="font-medium text-stone-200">{formData.name}</p>
                    <p className="text-xs text-stone-500">
                      {formData.trackingType === 'savings' ? 'Savings Goal' : 'Spending Limit'}
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-3 border-t border-stone-700/30">
                  <span className="text-sm text-stone-400">Target</span>
                  <span className="text-lg font-display text-teal-400">
                    {formatCurrency(parseFloat(formData.targetAmount) || 0, 'INR')}
                  </span>
                </div>
                
                {formData.deadline && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-stone-400">Deadline</span>
                    <span className="text-sm text-stone-200">
                      {format(new Date(formData.deadline), 'MMMM d, yyyy')}
                    </span>
                  </div>
                )}
              </div>

              {/* Cutback suggestions */}
              {suggestedCutbacks.length > 0 && formData.trackingType === 'savings' && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={16} className="text-amber-400" />
                    <span className="text-sm font-medium text-amber-400">Smart Suggestions</span>
                  </div>
                  <p className="text-xs text-stone-400 mb-3">
                    Based on your spending, consider cutting back on these categories:
                  </p>
                  <div className="space-y-2">
                    {suggestedCutbacks.map(cutback => (
                      <div 
                        key={cutback.category}
                        className="flex items-center justify-between p-2 bg-stone-900/50 rounded-lg"
                      >
                        <span className="text-sm text-stone-300">{cutback.category}</span>
                        <div className="text-right">
                          <span className="text-sm text-amber-400">
                            −{formatCurrency(cutback.potentialSavings, 'INR')}/mo
                          </span>
                          <span className="text-[10px] text-stone-500 ml-1">
                            ({cutback.cutbackPercent}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-stone-500 mt-3">
                    Total potential savings: {formatCurrency(
                      suggestedCutbacks.reduce((sum, c) => sum + c.potentialSavings, 0),
                      'INR'
                    )}/month
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
            >
              <ChevronLeft size={16} />
              Back
            </button>
          )}
          
          {step < totalSteps ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 2 && !canProceedStep2}
              className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-stone-700 disabled:text-stone-500 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              Continue
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-stone-700 disabled:text-stone-500 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                'Saving...'
              ) : (
                <>
                  <Check size={16} />
                  {editingGoal ? 'Update Goal' : 'Create Goal'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
