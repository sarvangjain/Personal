/**
 * QuickAddModal - Modal for quick expense entry with natural language
 * Features: Natural language parsing, duplicate detection, expense templates
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  X, Calendar, Sparkles, Save, Trash2, Edit2, Check,
  Loader2, Plus, ArrowLeft, AlertTriangle, Eye, History
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { parseExpenseLine } from '../../utils/expenseParser';
import { formatCurrency } from '../../utils/analytics';
import { addExpenses, clearCache, getRecentExpensesForDuplicateCheck, getFrequentExpenses, getExpenses } from '../../firebase/expenseSightService';
import { detectDuplicates, getExpensesToSave, getDuplicateCount, markAsKeepAnyway, unmarkKeepAnyway } from '../../utils/duplicateDetector';
import { getAllCategories, getCategoryBadgeClasses } from '../../utils/categoryConfig';

const CATEGORIES = getAllCategories();

// Date options for quick selection
const getDateOptions = () => [
  { id: 'today', label: 'Today', date: new Date() },
  { id: 'yesterday', label: 'Yesterday', date: subDays(new Date(), 1) },
  { id: '2days', label: '2 days ago', date: subDays(new Date(), 2) },
];

// Duplicate Warning Badge
function DuplicateBadge({ expense, onKeepAnyway }) {
  if (!expense.isDuplicate) return null;
  
  const confidenceColor = expense.duplicateConfidence >= 80 
    ? 'bg-red-500/20 border-red-500/30 text-red-400'
    : 'bg-amber-500/20 border-amber-500/30 text-amber-400';
  
  return (
    <div className={`mt-2 p-2 rounded-lg border ${confidenceColor}`}>
      <div className="flex items-start gap-2">
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium">
            {expense.duplicateConfidence >= 80 ? 'Likely duplicate' : 'Potential duplicate'}
          </p>
          <p className="text-[10px] opacity-80 mt-0.5">
            {expense.duplicateReason}
            {expense.duplicateOf && (
              <span className="block mt-0.5">
                Similar to: {expense.duplicateOf.description} ({formatCurrency(expense.duplicateOf.amount, 'INR')})
              </span>
            )}
          </p>
        </div>
      </div>
      {!expense.keepAnyway ? (
        <button
          onClick={(e) => { e.stopPropagation(); onKeepAnyway(expense.id); }}
          className="mt-2 text-[10px] px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 transition-colors flex items-center gap-1"
        >
          <Eye size={10} /> Keep anyway
        </button>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); onKeepAnyway(expense.id, false); }}
          className="mt-2 text-[10px] px-2 py-1 rounded bg-emerald-600/30 text-emerald-400 hover:bg-emerald-600/40 transition-colors flex items-center gap-1"
        >
          <Check size={10} /> Will be saved
        </button>
      )}
    </div>
  );
}

// Expense Card with duplicate support
function ExpenseCard({ expense, onUpdate, onDelete, onKeepAnyway }) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState(expense);

  const handleSave = () => {
    onUpdate(expense.id, editData);
    setEditing(false);
  };

  const isDimmed = expense.isDuplicate && !expense.keepAnyway;

  if (editing) {
    return (
      <div className="p-3 bg-stone-800/60 border border-teal-500/30 rounded-xl space-y-2">
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
          <select
            value={editData.category}
            onChange={(e) => setEditData({ ...editData, category: e.target.value })}
            className="flex-1 px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-200 focus:outline-none focus:border-teal-500"
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
    <div className={`rounded-xl border transition-all ${
      isDimmed 
        ? 'bg-stone-800/20 border-amber-500/30 opacity-60' 
        : 'bg-stone-800/40 border-stone-700/30'
    }`}>
      <div className="flex items-center gap-3 p-3">
        <div className="flex-1 min-w-0">
          <p className={`text-sm truncate ${isDimmed ? 'text-stone-400 line-through' : 'text-stone-200'}`}>
            {expense.description}
          </p>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${getCategoryBadgeClasses(expense.category)}`}>
            {expense.category}
          </span>
        </div>
        <div className="text-right">
          <p className={`text-sm font-mono font-medium ${isDimmed ? 'text-stone-500' : 'text-stone-200'}`}>
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
      
      {/* Duplicate warning */}
      {expense.isDuplicate && (
        <div className="px-3 pb-3">
          <DuplicateBadge expense={expense} onKeepAnyway={onKeepAnyway} />
        </div>
      )}
    </div>
  );
}

// Template chip for frequent expenses
function TemplateChip({ template, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 bg-stone-800/50 border border-stone-700/50 rounded-lg text-xs hover:bg-stone-800 transition-colors whitespace-nowrap"
    >
      <span className="text-stone-300">{template.description}</span>
      <span className="text-stone-500">~{formatCurrency(template.avgAmount, 'INR')}</span>
    </button>
  );
}

// Autocomplete suggestion item
function AutocompleteSuggestion({ suggestion, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-2 text-left transition-colors ${
        isSelected 
          ? 'bg-teal-500/20' 
          : 'hover:bg-stone-800/50'
      }`}
    >
      <History size={14} className="text-stone-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-200 truncate">{suggestion.description}</p>
        <p className="text-[10px] text-stone-500">{suggestion.category}</p>
      </div>
      <span className="text-xs text-stone-400 font-mono">
        ~{formatCurrency(suggestion.avgAmount, 'INR')}
      </span>
    </button>
  );
}

// Autocomplete dropdown
function AutocompleteDropdown({ suggestions, selectedIndex, onSelect, show }) {
  if (!show || suggestions.length === 0) return null;
  
  return (
    <div className="absolute left-0 right-0 top-full mt-1 bg-stone-900 border border-stone-700/50 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
      <div className="py-1">
        {suggestions.map((suggestion, i) => (
          <AutocompleteSuggestion
            key={i}
            suggestion={suggestion}
            isSelected={i === selectedIndex}
            onClick={() => onSelect(suggestion)}
          />
        ))}
      </div>
      <div className="border-t border-stone-800 px-3 py-1.5">
        <p className="text-[10px] text-stone-600">
          ↑↓ Navigate • Enter to select • Esc to close
        </p>
      </div>
    </div>
  );
}

function SuccessSummary({ expenses, duplicatesExcluded, onAddMore, onClose }) {
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
          {duplicatesExcluded > 0 && (
            <span className="text-amber-400"> ({duplicatesExcluded} duplicate{duplicatesExcluded > 1 ? 's' : ''} excluded)</span>
          )}
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
              <span key={cat} className={`text-[10px] px-1.5 py-0.5 rounded ${getCategoryBadgeClasses(cat)}`}>
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
          className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2"
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
  const [duplicatesExcluded, setDuplicatesExcluded] = useState(0);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  
  // Autocomplete state
  const [expenseHistory, setExpenseHistory] = useState([]);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteIndex, setAutocompleteIndex] = useState(0);
  const textareaRef = useRef(null);

  useBodyScrollLock(isOpen);

  const dateOptions = useMemo(() => getDateOptions(), []);
  const currentDate = dateOptions.find(d => d.id === selectedDate)?.date || new Date();

  // Load templates and expense history on mount
  useEffect(() => {
    if (isOpen && userId && templates.length === 0) {
      setLoadingTemplates(true);
      Promise.all([
        getFrequentExpenses(userId, 5),
        getExpenses(userId, { limitCount: 200, useCache: true }),
      ])
        .then(([frequentExpenses, allExpenses]) => {
          setTemplates(frequentExpenses);
          
          // Build unique expense descriptions with average amounts
          const descMap = {};
          for (const exp of allExpenses) {
            if (exp.isRefund || exp.cancelled) continue;
            const key = exp.description.toLowerCase().trim();
            if (!descMap[key]) {
              descMap[key] = {
                description: exp.description,
                category: exp.category,
                count: 0,
                totalAmount: 0,
              };
            }
            descMap[key].count++;
            descMap[key].totalAmount += exp.amount;
          }
          
          const history = Object.values(descMap)
            .map(item => ({
              description: item.description,
              category: item.category,
              avgAmount: Math.round(item.totalAmount / item.count),
            }))
            .sort((a, b) => b.count - a.count);
          
          setExpenseHistory(history);
        })
        .catch(console.error)
        .finally(() => setLoadingTemplates(false));
    }
  }, [isOpen, userId, templates.length]);

  // Parse input text into expenses with duplicate detection
  const handleParse = useCallback(async () => {
    const lines = inputText.split('\n').filter(line => line.trim());
    const expenses = [];

    for (const line of lines) {
      const expense = parseExpenseLine(line, currentDate);
      if (expense && !expense.skip) {
        expenses.push(expense);
      }
    }

    if (expenses.length === 0) {
      setParsedExpenses([]);
      return;
    }

    // Check for duplicates
    setCheckingDuplicates(true);
    try {
      const recentExpenses = await getRecentExpensesForDuplicateCheck(userId, 7);
      const markedExpenses = detectDuplicates(expenses, recentExpenses);
      setParsedExpenses(markedExpenses);
    } catch (err) {
      console.error('Error checking duplicates:', err);
      // Fall back to expenses without duplicate checking
      setParsedExpenses(expenses.map(exp => ({
        ...exp,
        isDuplicate: false,
        duplicateOf: null,
        duplicateConfidence: 0,
        duplicateReason: null,
        keepAnyway: false,
      })));
    } finally {
      setCheckingDuplicates(false);
    }
  }, [inputText, currentDate, userId]);

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

  // Toggle keep anyway for duplicates
  const handleToggleKeepAnyway = (id, keep = true) => {
    setParsedExpenses(prev => 
      keep ? markAsKeepAnyway(prev, id) : unmarkKeepAnyway(prev, id)
    );
  };

  // Save expenses to Firebase (excluding duplicates unless marked "keep anyway")
  const handleSave = async () => {
    const expensesToSave = getExpensesToSave(parsedExpenses);
    
    if (expensesToSave.length === 0) {
      setSaveError('No expenses to save. All are marked as duplicates.');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      // Clean up duplicate metadata before saving
      const cleanExpenses = expensesToSave.map(({ 
        isDuplicate, duplicateOf, duplicateConfidence, duplicateReason, keepAnyway, 
        ...expense 
      }) => expense);
      
      const result = await addExpenses(userId, cleanExpenses);
      
      if (result.success) {
        const excluded = getDuplicateCount(parsedExpenses);
        setSavedExpenses(cleanExpenses);
        setDuplicatesExcluded(excluded);
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
    setDuplicatesExcluded(0);
    setInputText('');
    setParsedExpenses([]);
  };

  // Handle close
  const handleClose = () => {
    setInputText('');
    setParsedExpenses([]);
    setSavedExpenses(null);
    setDuplicatesExcluded(0);
    setSaveError(null);
    onClose();
  };

  // Handle template click
  const handleTemplateClick = (template) => {
    const line = inputText ? inputText + '\n' + template.description + ' ' : template.description + ' ';
    setInputText(line);
    setShowAutocomplete(false);
  };

  // Get current line being typed (the line where cursor is)
  const getCurrentLine = useCallback((text, cursorPos) => {
    const beforeCursor = text.slice(0, cursorPos);
    const lastNewline = beforeCursor.lastIndexOf('\n');
    return beforeCursor.slice(lastNewline + 1);
  }, []);

  // Update autocomplete suggestions based on current input
  const updateAutocompleteSuggestions = useCallback((text, cursorPos) => {
    const currentLine = getCurrentLine(text, cursorPos).toLowerCase().trim();
    
    // Only show autocomplete if the line has at least 2 characters
    if (currentLine.length < 2) {
      setAutocompleteSuggestions([]);
      setShowAutocomplete(false);
      return;
    }
    
    // Filter expense history based on current line
    const matches = expenseHistory.filter(item => 
      item.description.toLowerCase().includes(currentLine)
    ).slice(0, 5);
    
    setAutocompleteSuggestions(matches);
    setShowAutocomplete(matches.length > 0);
    setAutocompleteIndex(0);
  }, [expenseHistory, getCurrentLine]);

  // Handle input change
  const handleInputChange = (e) => {
    const newText = e.target.value;
    setInputText(newText);
    updateAutocompleteSuggestions(newText, e.target.selectionStart);
  };

  // Handle autocomplete selection
  const handleAutocompleteSelect = (suggestion) => {
    const cursorPos = textareaRef.current?.selectionStart || inputText.length;
    const beforeCursor = inputText.slice(0, cursorPos);
    const afterCursor = inputText.slice(cursorPos);
    const lastNewline = beforeCursor.lastIndexOf('\n');
    const beforeLine = beforeCursor.slice(0, lastNewline + 1);
    
    // Replace current line with suggestion + space for amount
    const newText = beforeLine + suggestion.description + ' ' + afterCursor;
    setInputText(newText);
    setShowAutocomplete(false);
    
    // Focus textarea and set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = beforeLine.length + suggestion.description.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Handle keyboard navigation in autocomplete
  const handleKeyDown = (e) => {
    if (!showAutocomplete || autocompleteSuggestions.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setAutocompleteIndex(prev => 
          prev < autocompleteSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setAutocompleteIndex(prev => 
          prev > 0 ? prev - 1 : autocompleteSuggestions.length - 1
        );
        break;
      case 'Enter':
        if (autocompleteIndex >= 0 && autocompleteIndex < autocompleteSuggestions.length) {
          e.preventDefault();
          handleAutocompleteSelect(autocompleteSuggestions[autocompleteIndex]);
        }
        break;
      case 'Escape':
        setShowAutocomplete(false);
        break;
      case 'Tab':
        if (autocompleteIndex >= 0 && autocompleteIndex < autocompleteSuggestions.length) {
          e.preventDefault();
          handleAutocompleteSelect(autocompleteSuggestions[autocompleteIndex]);
        }
        break;
      default:
        break;
    }
  };

  // Calculate totals
  const expensesToSave = getExpensesToSave(parsedExpenses);
  const total = expensesToSave.reduce((sum, exp) => sum + exp.amount, 0);
  const duplicateCount = getDuplicateCount(parsedExpenses);

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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
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
              duplicatesExcluded={duplicatesExcluded}
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
                          setParsedExpenses([]);
                        }
                      }}
                      className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                        selectedDate === option.id
                          ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
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
                  {/* Templates */}
                  {templates.length > 0 && (
                    <div className="mb-3">
                      <label className="text-xs text-stone-500 uppercase tracking-wider mb-2 block">
                        Quick Templates
                      </label>
                      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                        {templates.map((template, i) => (
                          <TemplateChip 
                            key={i} 
                            template={template}
                            onClick={() => handleTemplateClick(template)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <label className="text-xs text-stone-500 uppercase tracking-wider mb-2 block">
                    Enter Expenses
                  </label>
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={inputText}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      onBlur={() => setTimeout(() => setShowAutocomplete(false), 150)}
                      onFocus={(e) => updateAutocompleteSuggestions(inputText, e.target.selectionStart)}
                      placeholder="Grocery zepto 350&#10;Cab to office 150&#10;Coffee with friend 80"
                      className="w-full h-40 px-4 py-3 bg-stone-800/50 border border-stone-700/50 rounded-xl text-sm text-stone-200 placeholder-stone-600 font-mono focus:outline-none focus:border-teal-500/50 resize-none"
                    />
                    
                    {/* Autocomplete dropdown */}
                    <AutocompleteDropdown
                      suggestions={autocompleteSuggestions}
                      selectedIndex={autocompleteIndex}
                      onSelect={handleAutocompleteSelect}
                      show={showAutocomplete}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <p className="text-xs text-stone-600">
                      One expense per line • Type to search history
                    </p>
                    <p className="text-xs text-stone-600">
                      {lineCount} line{lineCount !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Parse Button */}
                  <button
                    onClick={handleParse}
                    disabled={lineCount === 0 || checkingDuplicates}
                    className="w-full mt-4 py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-stone-700 disabled:text-stone-500 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {checkingDuplicates ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Checking duplicates...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Parse {lineCount > 0 ? `${lineCount} Expense${lineCount > 1 ? 's' : ''}` : 'Expenses'}
                      </>
                    )}
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

                  {/* Duplicate Summary */}
                  {duplicateCount > 0 && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-400" />
                        <p className="text-sm text-amber-400">
                          {duplicateCount} potential duplicate{duplicateCount > 1 ? 's' : ''} detected
                        </p>
                      </div>
                      <p className="text-xs text-stone-500 mt-1">
                        Duplicates will be excluded unless you mark them to keep.
                      </p>
                    </div>
                  )}

                  {/* Parsed Expenses */}
                  <div>
                    <label className="text-xs text-stone-500 uppercase tracking-wider mb-2 block">
                      Review Expenses ({parsedExpenses.length})
                    </label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {parsedExpenses.map(expense => (
                        <ExpenseCard
                          key={expense.id}
                          expense={expense}
                          onUpdate={handleUpdateExpense}
                          onDelete={handleDeleteExpense}
                          onKeepAnyway={handleToggleKeepAnyway}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center p-3 bg-stone-800/30 rounded-xl">
                    <div>
                      <span className="text-sm text-stone-400">Total to save</span>
                      {duplicateCount > 0 && (
                        <p className="text-[10px] text-stone-600">
                          {expensesToSave.length} of {parsedExpenses.length} expenses
                        </p>
                      )}
                    </div>
                    <span className="text-lg font-display text-teal-400">
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
                    disabled={expensesToSave.length === 0 || saving}
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
                        Save {expensesToSave.length} Expense{expensesToSave.length !== 1 ? 's' : ''}
                        {duplicateCount > 0 && (
                          <span className="text-emerald-300/70">
                            ({duplicateCount} excluded)
                          </span>
                        )}
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
