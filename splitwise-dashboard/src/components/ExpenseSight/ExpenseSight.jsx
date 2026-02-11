/**
 * ExpenseSight - Main container component
 * Personal expense tracking with NLP input
 */

import { useState, useEffect, useCallback } from 'react';
import { Eye, PenLine, History, BarChart3, Loader2, AlertCircle } from 'lucide-react';
import QuickInput from './QuickInput';
import ExpensePreview from './ExpensePreview';
import ExpenseHistory from './ExpenseHistory';
import ExpenseSightAnalytics from './ExpenseSightAnalytics';
import { addExpenses, getExpenses, clearCache } from '../../firebase/expenseSightService';
import { isFirebaseConfigured } from '../../firebase/config';

const TABS = [
  { id: 'input', label: 'Add', icon: PenLine },
  { id: 'history', label: 'History', icon: History },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export default function ExpenseSight({ userId }) {
  const [activeTab, setActiveTab] = useState('input');
  const [parseResult, setParseResult] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const firebaseEnabled = isFirebaseConfigured();

  // Load expenses
  const loadExpenses = useCallback(async (showRefresh = false) => {
    if (!firebaseEnabled || !userId) {
      setLoading(false);
      return;
    }

    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const data = await getExpenses(userId, { useCache: !showRefresh });
      setExpenses(data);
      setError(null);
    } catch (err) {
      console.error('Error loading expenses:', err);
      setError('Failed to load expenses');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, firebaseEnabled]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Handle parsed expenses from QuickInput
  const handleParsed = (result) => {
    setParseResult(result);
  };

  // Handle save from ExpensePreview
  const handleSave = async (expensesToSave) => {
    if (!userId) return;
    
    const result = await addExpenses(userId, expensesToSave);
    
    if (result.success) {
      // Clear parse result and refresh
      setParseResult(null);
      clearCache(userId);
      await loadExpenses(true);
      setActiveTab('history');
    } else {
      throw new Error(result.error || 'Failed to save expenses');
    }
  };

  // Handle back from preview
  const handleBackFromPreview = () => {
    setParseResult(null);
  };

  // Handle refresh
  const handleRefresh = () => {
    clearCache(userId);
    loadExpenses(true);
  };

  // Firebase not configured
  if (!firebaseEnabled) {
    return (
      <div className="glass-card p-6 text-center">
        <AlertCircle size={40} className="mx-auto text-amber-400 mb-4" />
        <h3 className="text-lg font-medium text-stone-200 mb-2">Firebase Not Configured</h3>
        <p className="text-sm text-stone-400 max-w-md mx-auto">
          ExpenseSight requires Firebase to be configured. Please add your Firebase 
          configuration to enable personal expense tracking.
        </p>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-violet-400 mx-auto mb-4" />
          <p className="text-sm text-stone-400">Loading ExpenseSight...</p>
        </div>
      </div>
    );
  }

  // Show preview if we have parsed results
  if (parseResult) {
    return (
      <ExpensePreview
        parseResult={parseResult}
        onBack={handleBackFromPreview}
        onSave={handleSave}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Eye size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-display text-stone-200">ExpenseSight</h2>
          <p className="text-xs text-stone-500">Personal expense tracking</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-stone-800/40 rounded-xl">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-violet-500/20 text-violet-400'
                  : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'input' && (
        <QuickInput onParsed={handleParsed} />
      )}

      {activeTab === 'history' && (
        <ExpenseHistory
          expenses={expenses}
          userId={userId}
          onRefresh={handleRefresh}
          isRefreshing={refreshing}
        />
      )}

      {activeTab === 'analytics' && (
        <ExpenseSightAnalytics expenses={expenses} />
      )}
    </div>
  );
}
