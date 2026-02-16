/**
 * QuickAddModal - Modal for quick expense entry with natural language
 * 
 * Default mode: Multi-line with date headers, hashtag tags, and EMI support
 * Example input:
 *   16 Feb
 *   Cab to office 100
 *   Flight to srinagar 5690 #kashmir
 *   15 Feb
 *   Grocery 305
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  X, Calendar, Sparkles, Save, Trash2, Edit2, Check,
  Loader2, Plus, ArrowLeft, AlertTriangle, Eye, History, Hash, CreditCard
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import parseExpenseText, { parseExpenseLine } from '../../utils/expenseParser';
import { formatCurrency } from '../../utils/analytics';
import { addExpenses, clearCache, getRecentExpensesForDuplicateCheck, getFrequentExpenses, getExpenses, getTags, createTag } from '../../firebase/expenseSightService';
import { detectDuplicates, getExpensesToSave, getDuplicateCount, markAsKeepAnyway, unmarkKeepAnyway } from '../../utils/duplicateDetector';
import { getAllCategories, getCategoryBadgeClasses } from '../../utils/categoryConfig';
import TagInput from './components/TagInput';
import TagBadge from './components/TagBadge';

const CATEGORIES = getAllCategories();

// ─── Sub-components ──────────────────────────────────────────────────────────

function DuplicateBadge({ expense, onKeepAnyway }) {
  if (!expense.isDuplicate) return null;
  const isHigh = expense.duplicateConfidence >= 80;
  return (
    <div className={`mt-2 p-2 rounded-lg border ${isHigh ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-amber-500/20 border-amber-500/30 text-amber-400'}`}>
      <div className="flex items-start gap-2">
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium">{isHigh ? 'Likely duplicate' : 'Potential duplicate'}</p>
          <p className="text-[10px] opacity-80 mt-0.5">
            {expense.duplicateReason}
            {expense.duplicateOf && (
              <span className="block mt-0.5">Similar to: {expense.duplicateOf.description} ({formatCurrency(expense.duplicateOf.amount, 'INR')})</span>
            )}
          </p>
        </div>
      </div>
      {!expense.keepAnyway ? (
        <button onClick={(e) => { e.stopPropagation(); onKeepAnyway(expense.id); }}
          className="mt-2 text-[10px] px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 flex items-center gap-1">
          <Eye size={10} /> Keep anyway
        </button>
      ) : (
        <button onClick={(e) => { e.stopPropagation(); onKeepAnyway(expense.id, false); }}
          className="mt-2 text-[10px] px-2 py-1 rounded bg-emerald-600/30 text-emerald-400 flex items-center gap-1">
          <Check size={10} /> Will be saved
        </button>
      )}
    </div>
  );
}

function ExpenseCard({ expense, onUpdate, onDelete, onKeepAnyway, availableTags, onCreateTag }) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState(expense);
  const isDimmed = expense.isDuplicate && !expense.keepAnyway;

  const handleSave = () => { onUpdate(expense.id, editData); setEditing(false); };

  if (editing) {
    return (
      <div className="p-3 bg-stone-800/60 border border-teal-500/30 rounded-xl space-y-3 relative z-20">
        <input type="text" value={editData.description}
          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
          className="w-full px-3 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-200 focus:outline-none focus:border-teal-500" placeholder="Description" />
        <div className="flex gap-2">
          <input type="number" value={editData.amount}
            onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) || 0 })}
            className="flex-1 px-3 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-200 focus:outline-none focus:border-teal-500" placeholder="Amount" />
          <input type="date" value={editData.date}
            onChange={(e) => setEditData({ ...editData, date: e.target.value })}
            className="flex-1 px-3 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-200 focus:outline-none focus:border-teal-500" />
        </div>
        <select value={editData.category}
          onChange={(e) => setEditData({ ...editData, category: e.target.value })}
          className="w-full px-3 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-200 focus:outline-none focus:border-teal-500 appearance-none cursor-pointer"
          style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}>
          {CATEGORIES.map(cat => <option key={cat} value={cat} className="bg-stone-800 text-stone-200">{cat}</option>)}
        </select>
        <div className="relative z-40">
          <label className="text-[10px] text-stone-500 uppercase tracking-wider mb-1 block">Tags</label>
          <TagInput selectedTags={editData.tags || []} availableTags={availableTags}
            onTagsChange={(tags) => setEditData({ ...editData, tags })} onCreateTag={onCreateTag} placeholder="Add tags..." maxTags={3} />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={handleSave} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg flex items-center justify-center gap-1"><Check size={14} /> Save</button>
          <button onClick={() => { setEditData(expense); setEditing(false); }} className="flex-1 py-2.5 bg-stone-700 hover:bg-stone-600 text-stone-300 text-xs rounded-lg">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border transition-all ${isDimmed ? 'bg-stone-800/20 border-amber-500/30 opacity-60' : 'bg-stone-800/40 border-stone-700/30'}`}>
      <div className="flex items-center gap-3 p-3">
        <div className="flex-1 min-w-0">
          <p className={`text-sm truncate ${isDimmed ? 'text-stone-400 line-through' : 'text-stone-200'}`}>{expense.description}</p>
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${getCategoryBadgeClasses(expense.category)}`}>{expense.category}</span>
            <span className="text-[10px] text-stone-600">{format(parseISO(expense.date), 'MMM d')}</span>
            {expense.isEmi && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 flex items-center gap-0.5">
                <CreditCard size={8} /> EMI {expense.emiMonth}/{expense.emiTotalMonths}
              </span>
            )}
            {expense.tags?.length > 0 && expense.tags.map(tagName => {
              const tagData = availableTags?.find(t => t.name === tagName);
              return <TagBadge key={tagName} name={tagName} color={tagData?.color || 'stone'} size="xs" />;
            })}
          </div>
        </div>
        <div className="text-right">
          <p className={`text-sm font-mono font-medium ${isDimmed ? 'text-stone-500' : 'text-stone-200'}`}>{formatCurrency(expense.amount, 'INR')}</p>
          {expense.isEmi && <p className="text-[9px] text-stone-600">of {formatCurrency(expense.emiTotal, 'INR')}</p>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setEditing(true)} className="p-1.5 text-stone-500 hover:text-stone-300"><Edit2 size={14} /></button>
          <button onClick={() => onDelete(expense.id)} className="p-1.5 text-stone-500 hover:text-red-400"><Trash2 size={14} /></button>
        </div>
      </div>
      {expense.isDuplicate && <div className="px-3 pb-3"><DuplicateBadge expense={expense} onKeepAnyway={onKeepAnyway} /></div>}
    </div>
  );
}

function TemplateChip({ template, onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 px-3 py-1.5 bg-stone-800/50 border border-stone-700/50 rounded-lg text-xs hover:bg-stone-800 transition-colors whitespace-nowrap">
      <span className="text-stone-300">{template.description}</span>
      <span className="text-stone-500">~{formatCurrency(template.avgAmount, 'INR')}</span>
    </button>
  );
}

function AutocompleteDropdown({ suggestions, selectedIndex, onSelect, show }) {
  if (!show || suggestions.length === 0) return null;
  return (
    <div className="absolute left-0 right-0 top-full mt-1 bg-stone-900 border border-stone-700/50 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
      <div className="py-1">
        {suggestions.map((s, i) => (
          <button key={i} onClick={() => onSelect(s)}
            className={`w-full flex items-center gap-3 p-2 text-left transition-colors ${i === selectedIndex ? 'bg-teal-500/20' : 'hover:bg-stone-800/50'}`}>
            <History size={14} className="text-stone-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-stone-200 truncate">{s.description}</p>
              <p className="text-[10px] text-stone-500">{s.category}</p>
            </div>
            <span className="text-xs text-stone-400 font-mono">~{formatCurrency(s.avgAmount, 'INR')}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SuccessSummary({ expenses, duplicatesExcluded, onAddMore, onClose }) {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const categories = [...new Set(expenses.map(e => e.category))];
  const dates = [...new Set(expenses.map(e => e.date))].sort();
  const emiCount = expenses.filter(e => e.isEmi).length;

  return (
    <div className="text-center py-6 space-y-4">
      <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
        <Check size={32} className="text-emerald-400" />
      </div>
      <div>
        <h3 className="text-lg font-medium text-stone-200">Saved Successfully!</h3>
        <p className="text-sm text-stone-500 mt-1">
          {expenses.length} expense{expenses.length > 1 ? 's' : ''} added
          {dates.length > 1 && ` across ${dates.length} days`}
          {duplicatesExcluded > 0 && <span className="text-amber-400"> ({duplicatesExcluded} duplicate{duplicatesExcluded > 1 ? 's' : ''} excluded)</span>}
          {emiCount > 0 && <span className="text-cyan-400"> ({emiCount} EMI installments)</span>}
        </p>
      </div>
      
      <div className="glass-card p-4 text-left space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-stone-500 uppercase tracking-wider">Total</span>
          <span className="text-lg font-display text-emerald-400">{formatCurrency(total, 'INR')}</span>
        </div>
        <div className="pt-2 border-t border-stone-700/50">
          <div className="mt-1 space-y-1 max-h-40 overflow-y-auto">
            {expenses.map(exp => (
              <div key={exp.id} className="flex justify-between text-xs">
                <span className="text-stone-400 truncate flex-1">{exp.description}</span>
                <span className="text-stone-600 mx-2">{format(parseISO(exp.date), 'MMM d')}</span>
                <span className="text-stone-300 font-mono">{formatCurrency(exp.amount, 'INR')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onAddMore} className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2"><Plus size={16} /> Add More</button>
        <button onClick={onClose} className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm font-medium rounded-xl">Done</button>
      </div>
    </div>
  );
}

// ─── Main Modal ──────────────────────────────────────────────────────────────

export default function QuickAddModal({ isOpen, onClose, userId, onSaved }) {
  const [inputText, setInputText] = useState('');
  const [parsedExpenses, setParsedExpenses] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [savedExpenses, setSavedExpenses] = useState(null);
  const [duplicatesExcluded, setDuplicatesExcluded] = useState(0);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [parseErrors, setParseErrors] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  
  // Autocomplete state
  const [expenseHistory, setExpenseHistory] = useState([]);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteIndex, setAutocompleteIndex] = useState(0);
  const textareaRef = useRef(null);

  useBodyScrollLock(isOpen);

  // Load templates, history, tags
  useEffect(() => {
    if (isOpen && userId && templates.length === 0) {
      setLoadingTemplates(true);
      Promise.all([
        getFrequentExpenses(userId, 5),
        getExpenses(userId, { limitCount: 200, useCache: true }),
        getTags(userId),
      ]).then(([freq, all, tags]) => {
        setTemplates(freq);
        setAvailableTags(tags);
        const descMap = {};
        for (const exp of all) {
          if (exp.isRefund || exp.cancelled) continue;
          const key = exp.description.toLowerCase().trim();
          if (!descMap[key]) descMap[key] = { description: exp.description, category: exp.category, count: 0, totalAmount: 0 };
          descMap[key].count++;
          descMap[key].totalAmount += exp.amount;
        }
        setExpenseHistory(Object.values(descMap).map(item => ({
          description: item.description, category: item.category,
          avgAmount: Math.round(item.totalAmount / item.count),
        })).sort((a, b) => b.count - a.count));
      }).catch(console.error).finally(() => setLoadingTemplates(false));
    }
  }, [isOpen, userId, templates.length]);
  
  const handleCreateTag = useCallback(async (tagData) => {
    if (!userId) return;
    const result = await createTag(userId, tagData);
    if (result.success) { setAvailableTags(await getTags(userId)); }
    return result;
  }, [userId]);

  // ─── Parse using the full multi-line parser ────────────────────────────────
  const handleParse = useCallback(async () => {
    const { expenses, errors } = parseExpenseText(inputText);
    setParseErrors(errors);

    if (expenses.length === 0) {
      setParsedExpenses([]);
      return;
    }

    // Check for duplicates
    setCheckingDuplicates(true);
    try {
      const recentExpenses = await getRecentExpensesForDuplicateCheck(userId, 14);
      const markedExpenses = detectDuplicates(expenses, recentExpenses);
      setParsedExpenses(markedExpenses);
    } catch (err) {
      console.error('Error checking duplicates:', err);
      setParsedExpenses(expenses.map(exp => ({
        ...exp, isDuplicate: false, duplicateOf: null,
        duplicateConfidence: 0, duplicateReason: null, keepAnyway: false,
      })));
    } finally {
      setCheckingDuplicates(false);
    }
  }, [inputText, userId]);

  const handleUpdateExpense = (id, newData) => {
    setParsedExpenses(prev => prev.map(exp => exp.id === id ? { ...exp, ...newData } : exp));
  };
  const handleDeleteExpense = (id) => {
    setParsedExpenses(prev => prev.filter(exp => exp.id !== id));
  };
  const handleToggleKeepAnyway = (id, keep = true) => {
    setParsedExpenses(prev => keep ? markAsKeepAnyway(prev, id) : unmarkKeepAnyway(prev, id));
  };

  const handleSave = async () => {
    const expensesToSave = getExpensesToSave(parsedExpenses);
    if (expensesToSave.length === 0) { setSaveError('No expenses to save.'); return; }

    setSaving(true);
    setSaveError(null);

    try {
      const cleanExpenses = expensesToSave.map(({ isDuplicate, duplicateOf, duplicateConfidence, duplicateReason, keepAnyway, ...expense }) => expense);
      const result = await addExpenses(userId, cleanExpenses);
      
      if (result.success) {
        setSavedExpenses(cleanExpenses);
        setDuplicatesExcluded(getDuplicateCount(parsedExpenses));
        setParsedExpenses([]);
        setInputText('');
        setParseErrors([]);
        clearCache(userId);
        if (onSaved) onSaved();
      } else {
        throw new Error(result.error || 'Failed to save');
      }
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddMore = () => { setSavedExpenses(null); setDuplicatesExcluded(0); setInputText(''); setParsedExpenses([]); setParseErrors([]); };
  const handleClose = () => { setInputText(''); setParsedExpenses([]); setSavedExpenses(null); setDuplicatesExcluded(0); setSaveError(null); setParseErrors([]); onClose(); };

  const handleTemplateClick = (template) => {
    setInputText(prev => prev ? prev + '\n' + template.description + ' ' : template.description + ' ');
    setShowAutocomplete(false);
  };

  // Autocomplete
  const getCurrentLine = useCallback((text, cursorPos) => {
    const beforeCursor = text.slice(0, cursorPos);
    return beforeCursor.slice(beforeCursor.lastIndexOf('\n') + 1);
  }, []);

  const updateAutocompleteSuggestions = useCallback((text, cursorPos) => {
    const currentLine = getCurrentLine(text, cursorPos).toLowerCase().trim();
    if (currentLine.length < 2) { setAutocompleteSuggestions([]); setShowAutocomplete(false); return; }
    const matches = expenseHistory.filter(item => item.description.toLowerCase().includes(currentLine)).slice(0, 5);
    setAutocompleteSuggestions(matches);
    setShowAutocomplete(matches.length > 0);
    setAutocompleteIndex(0);
  }, [expenseHistory, getCurrentLine]);

  const handleInputChange = (e) => { setInputText(e.target.value); updateAutocompleteSuggestions(e.target.value, e.target.selectionStart); };

  const handleAutocompleteSelect = (suggestion) => {
    const cursorPos = textareaRef.current?.selectionStart || inputText.length;
    const beforeCursor = inputText.slice(0, cursorPos);
    const afterCursor = inputText.slice(cursorPos);
    const lastNewline = beforeCursor.lastIndexOf('\n');
    const beforeLine = beforeCursor.slice(0, lastNewline + 1);
    const newText = beforeLine + suggestion.description + ' ' + afterCursor;
    setInputText(newText);
    setShowAutocomplete(false);
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = beforeLine.length + suggestion.description.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (!showAutocomplete || autocompleteSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setAutocompleteIndex(prev => prev < autocompleteSuggestions.length - 1 ? prev + 1 : 0); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAutocompleteIndex(prev => prev > 0 ? prev - 1 : autocompleteSuggestions.length - 1); }
    else if (e.key === 'Enter' && autocompleteIndex >= 0) { e.preventDefault(); handleAutocompleteSelect(autocompleteSuggestions[autocompleteIndex]); }
    else if (e.key === 'Escape') { setShowAutocomplete(false); }
    else if (e.key === 'Tab' && autocompleteIndex >= 0) { e.preventDefault(); handleAutocompleteSelect(autocompleteSuggestions[autocompleteIndex]); }
  };

  const expensesToSave = getExpensesToSave(parsedExpenses);
  const total = expensesToSave.reduce((sum, exp) => sum + exp.amount, 0);
  const duplicateCount = getDuplicateCount(parsedExpenses);
  const lineCount = inputText.split('\n').filter(l => l.trim()).length;
  const emiCount = parsedExpenses.filter(e => e.isEmi).length;
  const uniqueDates = [...new Set(parsedExpenses.map(e => e.date))];

  // Group parsed expenses by date for display
  // IMPORTANT: This useMemo must be called BEFORE any early returns (React hooks rule)
  const groupedParsed = useMemo(() => {
    const groups = {};
    for (const exp of parsedExpenses) {
      if (!groups[exp.date]) groups[exp.date] = [];
      groups[exp.date].push(exp);
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [parsedExpenses]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-lg mx-auto bg-stone-900 border border-stone-700/50 rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-display text-stone-200">Add Expenses</h2>
              <p className="text-xs text-stone-500">Paste with dates, #tags, EMIs</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-stone-800 text-stone-500 hover:text-stone-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(92vh-80px)]">
          {savedExpenses ? (
            <SuccessSummary expenses={savedExpenses} duplicatesExcluded={duplicatesExcluded} onAddMore={handleAddMore} onClose={handleClose} />
          ) : (
            <div className="space-y-4">
              {/* Input Area */}
              {parsedExpenses.length === 0 ? (
                <div>
                  {/* Templates */}
                  {templates.length > 0 && (
                    <div className="mb-3">
                      <label className="text-xs text-stone-500 uppercase tracking-wider mb-2 block">Quick Templates</label>
                      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                        {templates.map((t, i) => <TemplateChip key={i} template={t} onClick={() => handleTemplateClick(t)} />)}
                      </div>
                    </div>
                  )}

                  <label className="text-xs text-stone-500 uppercase tracking-wider mb-2 block">Enter Expenses</label>
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={inputText}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      onBlur={() => setTimeout(() => setShowAutocomplete(false), 150)}
                      onFocus={(e) => updateAutocompleteSuggestions(inputText, e.target.selectionStart)}
                      placeholder={"16 Feb\nCab to office 100\nFlight to srinagar 5690 #kashmir\nGrocery 180\n\n15 Feb\nCab to home 720\nPhone emi 30000 (emi for 3 months)"}
                      className="w-full h-52 px-4 py-3 bg-stone-800/50 border border-stone-700/50 rounded-xl text-sm text-stone-200 placeholder-stone-600 font-mono focus:outline-none focus:border-teal-500/50 resize-none leading-relaxed"
                    />
                    <AutocompleteDropdown suggestions={autocompleteSuggestions} selectedIndex={autocompleteIndex} onSelect={handleAutocompleteSelect} show={showAutocomplete} />
                  </div>
                  
                  {/* Format hints */}
                  <div className="flex items-start gap-2 mt-2 p-2.5 bg-stone-800/30 rounded-lg">
                    <Sparkles size={12} className="text-teal-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] text-stone-500 leading-relaxed">
                      Start with a date line (e.g. <span className="text-stone-400">16 Feb</span>), then list expenses below.
                      Use <span className="text-cyan-400">#tag</span> for tags.
                      Add <span className="text-amber-400">(emi for N months)</span> to split into installments.
                    </p>
                  </div>

                  <div className="flex justify-between mt-1.5">
                    <p className="text-xs text-stone-600">{lineCount} line{lineCount !== 1 ? 's' : ''}</p>
                  </div>

                  <button onClick={handleParse} disabled={lineCount === 0 || checkingDuplicates}
                    className="w-full mt-3 py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-stone-700 disabled:text-stone-500 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 active:scale-[0.98] touch-manipulation">
                    {checkingDuplicates ? <><Loader2 size={16} className="animate-spin" />Checking duplicates...</> : <><Sparkles size={16} />Parse Expenses</>}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <button onClick={() => { setParsedExpenses([]); setParseErrors([]); }}
                    className="text-xs text-stone-500 hover:text-stone-300 flex items-center gap-1"><ArrowLeft size={14} />Back to edit</button>

                  {/* Summary strip */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-1 bg-stone-800/50 rounded-lg text-stone-400">
                      {parsedExpenses.length} expenses
                    </span>
                    {uniqueDates.length > 1 && (
                      <span className="text-xs px-2 py-1 bg-stone-800/50 rounded-lg text-stone-400 flex items-center gap-1">
                        <Calendar size={10} /> {uniqueDates.length} days
                      </span>
                    )}
                    {emiCount > 0 && (
                      <span className="text-xs px-2 py-1 bg-cyan-500/15 rounded-lg text-cyan-400 flex items-center gap-1">
                        <CreditCard size={10} /> {emiCount} EMI installments
                      </span>
                    )}
                    {duplicateCount > 0 && (
                      <span className="text-xs px-2 py-1 bg-amber-500/15 rounded-lg text-amber-400 flex items-center gap-1">
                        <AlertTriangle size={10} /> {duplicateCount} duplicates
                      </span>
                    )}
                  </div>

                  {/* Parse errors */}
                  {parseErrors.length > 0 && (
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <p className="text-xs text-amber-400 font-medium mb-1">Could not parse {parseErrors.length} line{parseErrors.length > 1 ? 's' : ''}:</p>
                      {parseErrors.slice(0, 3).map((err, i) => (
                        <p key={i} className="text-[10px] text-stone-500 truncate">Line {err.line}: "{err.text}"</p>
                      ))}
                    </div>
                  )}

                  {/* Grouped expense review */}
                  <div className="space-y-4 max-h-[50vh] overflow-y-auto overflow-x-visible pb-1">
                    {groupedParsed.map(([date, exps]) => (
                      <div key={date}>
                        <div className="flex items-center gap-2 mb-2 sticky top-0 bg-stone-900/95 backdrop-blur-sm py-1 z-10">
                          <Calendar size={12} className="text-teal-400" />
                          <span className="text-xs font-medium text-teal-400">{format(parseISO(date), 'EEEE, MMM d')}</span>
                          <span className="text-[10px] text-stone-600">({exps.length})</span>
                          <div className="flex-1 h-px bg-stone-800/50" />
                          <span className="text-[10px] font-mono text-stone-500">{formatCurrency(exps.reduce((s, e) => s + e.amount, 0), 'INR')}</span>
                        </div>
                        <div className="space-y-2">
                          {exps.map(expense => (
                            <ExpenseCard key={expense.id} expense={expense} onUpdate={handleUpdateExpense} onDelete={handleDeleteExpense}
                              onKeepAnyway={handleToggleKeepAnyway} availableTags={availableTags} onCreateTag={handleCreateTag} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center p-3 bg-stone-800/30 rounded-xl">
                    <div>
                      <span className="text-sm text-stone-400">Total to save</span>
                      {duplicateCount > 0 && <p className="text-[10px] text-stone-600">{expensesToSave.length} of {parsedExpenses.length} expenses</p>}
                    </div>
                    <span className="text-lg font-display text-teal-400">{formatCurrency(total, 'INR')}</span>
                  </div>

                  {saveError && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">{saveError}</div>}

                  <button onClick={handleSave} disabled={expensesToSave.length === 0 || saving}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-700 disabled:text-stone-500 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 active:scale-[0.98] touch-manipulation">
                    {saving ? <><Loader2 size={16} className="animate-spin" />Saving...</> : <><Save size={16} />Save {expensesToSave.length} Expense{expensesToSave.length !== 1 ? 's' : ''}{duplicateCount > 0 && <span className="text-emerald-300/70">({duplicateCount} excluded)</span>}</>}
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
