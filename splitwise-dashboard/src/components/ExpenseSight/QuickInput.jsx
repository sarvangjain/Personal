/**
 * QuickInput - Text area for pasting expense data
 */

import { useState } from 'react';
import { FileText, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import parseExpenseText from '../../utils/expenseParser';

const PLACEHOLDER_TEXT = `Paste your expenses here...

Example format:
11 Feb
Grocery 182
Cab to office 120
Food order 160

10 Feb
Rent 22500
Electricity bill 1410`;

export default function QuickInput({ onParsed }) {
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState(null);

  const handleParse = () => {
    if (!text.trim()) {
      setError('Please enter some expense data');
      return;
    }

    setParsing(true);
    setError(null);

    // Small delay for UX feedback
    setTimeout(() => {
      try {
        const result = parseExpenseText(text);
        
        if (result.expenses.length === 0) {
          setError('No expenses could be parsed. Please check the format.');
          setParsing(false);
          return;
        }
        
        onParsed(result);
        setParsing(false);
      } catch (err) {
        setError('Failed to parse expenses: ' + err.message);
        setParsing(false);
      }
    }, 300);
  };

  const handleClear = () => {
    setText('');
    setError(null);
  };

  // Quick stats
  const lineCount = text.split('\n').filter(l => l.trim()).length;
  const hasContent = text.trim().length > 0;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <FileText size={20} className="text-white" />
        </div>
        <div>
          <h3 className="font-display text-base text-stone-200">Quick Input</h3>
          <p className="text-xs text-stone-500">Paste your daily expenses</p>
        </div>
      </div>

      {/* Text Area */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setError(null); }}
          placeholder={PLACEHOLDER_TEXT}
          className="w-full h-64 p-4 bg-stone-800/50 border border-stone-700/50 rounded-xl text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 resize-none font-mono"
          spellCheck={false}
        />
        
        {/* Line count badge */}
        {hasContent && (
          <div className="absolute bottom-3 right-3 px-2 py-1 bg-stone-900/80 rounded text-[10px] text-stone-500">
            {lineCount} lines
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={handleParse}
          disabled={!hasContent || parsing}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-stone-700 disabled:text-stone-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          {parsing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Parsing...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Parse Expenses
            </>
          )}
        </button>
        
        {hasContent && (
          <button
            onClick={handleClear}
            className="px-4 py-3 bg-stone-800/50 hover:bg-stone-800 border border-stone-700/50 text-stone-400 text-sm rounded-xl transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Help text */}
      <div className="mt-4 p-3 bg-stone-800/30 rounded-lg">
        <p className="text-xs text-stone-500 leading-relaxed">
          <strong className="text-stone-400">Tip:</strong> Start each day with a date (e.g., "11 Feb"), 
          then list expenses below it. Amounts are automatically extracted from the end of each line.
          Math expressions like "508 + 250" are supported.
        </p>
      </div>
    </div>
  );
}
