/**
 * ExpenseSightApp - Main app shell for the standalone ExpenseSight experience
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import ESHeader from './components/ESHeader';
import ESBottomNav from './components/ESBottomNav';
import ESHome from './tabs/ESHome';
import ESActivity from './tabs/ESActivity';
import ESBudget from './tabs/ESBudget';
import ESInsights from './tabs/ESInsights';
import ESLabs from './tabs/ESLabs';
import ESBills from './tabs/ESBills';
import ESWealth from './tabs/ESWealth';
import ESCategoryDetail from './tabs/ESCategoryDetail';
import QuickAddModal from './QuickAddModal';
import { getExpenses, clearCache, updateExpense, deleteExpense, addExpenses, loadInitialData } from '../../firebase/expenseSightService';
import { isFirebaseConfigured } from '../../firebase/config';

export default function ExpenseSightApp({ userId, onClose }) {
  const [activeTab, setActiveTab] = useState('home');
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [showCategoryDetail, setShowCategoryDetail] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recentTabs, setRecentTabs] = useState([]);
  
  // Track tab visits
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    setRecentTabs(prev => {
      // Remove if already exists, add to front
      const filtered = prev.filter(t => t !== tabId);
      return [tabId, ...filtered].slice(0, 5); // Keep only last 5
    });
  }, []);

  const firebaseEnabled = isFirebaseConfigured();
  const hasBootstrapped = useRef(false);

  // Load expenses (also used for refresh)
  const loadExpenses = useCallback(async (showRefresh = false) => {
    if (!firebaseEnabled || !userId) {
      setLoading(false);
      return;
    }

    if (!showRefresh) setLoading(true);
    
    try {
      const data = await getExpenses(userId, { useCache: !showRefresh });
      setExpenses(data);
    } catch (err) {
      console.error('Error loading expenses:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [userId, firebaseEnabled]);

  // Initial parallel load: expenses + budget + tags + bills in one go
  // Subsequent tab mounts will hit the warm cache instead of making new requests
  useEffect(() => {
    if (!firebaseEnabled || !userId || hasBootstrapped.current) {
      if (!firebaseEnabled || !userId) setLoading(false);
      return;
    }
    hasBootstrapped.current = true;
    
    setLoading(true);
    loadInitialData(userId)
      .then(({ expenses: data }) => {
        setExpenses(data);
      })
      .catch(err => {
        console.error('Error in initial load:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userId, firebaseEnabled]);

  // Reset category detail when switching tabs
  useEffect(() => {
    setShowCategoryDetail(false);
  }, [activeTab]);

  // Handle refresh - clear cache first, then fetch fresh data
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    
    // Clear cache synchronously before fetching
    clearCache(userId);
    
    try {
      // Fetch fresh data with cache bypass
      const data = await getExpenses(userId, { useCache: false });
      setExpenses(data);
    } catch (err) {
      console.error('Error refreshing expenses:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [userId, isRefreshing]);

  // Handle quick add saved
  const handleQuickAddSaved = () => {
    // Clear cache and reload to ensure new expenses show
    clearCache(userId);
    loadExpenses(true);
  };
  
  // Handle update expense
  const handleUpdateExpense = useCallback(async (expenseId, data) => {
    if (!userId) return;
    
    const result = await updateExpense(userId, expenseId, data);
    if (result.success) {
      // Update local state immediately for snappy UX
      setExpenses(prev => prev.map(exp => 
        exp.id === expenseId ? { ...exp, ...data } : exp
      ));
    }
    return result;
  }, [userId]);
  
  // Handle delete expense - returns the deleted expense for undo
  const handleDeleteExpense = useCallback(async (expenseId) => {
    if (!userId) return { success: false };
    
    // Find the expense before deleting (for potential undo)
    const expenseToDelete = expenses.find(exp => exp.id === expenseId);
    
    const result = await deleteExpense(userId, expenseId);
    if (result.success) {
      // Remove from local state immediately
      setExpenses(prev => prev.filter(exp => exp.id !== expenseId));
      // Return the deleted expense for undo
      return { ...result, deletedExpense: expenseToDelete };
    }
    return result;
  }, [userId, expenses]);
  
  // Handle restore expense (for undo)
  const handleRestoreExpense = useCallback(async (expense) => {
    if (!userId || !expense) return { success: false };
    
    // Re-add the expense to Firebase
    const result = await addExpenses(userId, [expense]);
    if (result.success) {
      // Add back to local state
      setExpenses(prev => [...prev, expense].sort((a, b) => b.date.localeCompare(a.date)));
    }
    return result;
  }, [userId]);
  
  // Handle delete all success
  const handleDeleteAllSuccess = useCallback((count) => {
    // Clear local state
    setExpenses([]);
    console.log(`Deleted ${count} expenses`);
  }, []);

  // Render tab content
  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin text-teal-400 mx-auto mb-4" />
            <p className="text-sm text-stone-400">Loading...</p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'home':
        return (
          <ESHome 
            expenses={expenses} 
            userId={userId}
            onRefresh={handleRefresh}
            onAddExpense={() => setQuickAddOpen(true)}
            onNavigateToBills={() => handleTabChange('bills')}
          />
        );
      case 'activity':
        return showCategoryDetail ? (
          <ESCategoryDetail
            expenses={expenses}
            onClose={() => setShowCategoryDetail(false)}
          />
        ) : (
          <ESActivity 
            expenses={expenses} 
            userId={userId}
            onRefresh={handleRefresh}
            onShowCategoryDetail={() => setShowCategoryDetail(true)}
            onUpdateExpense={handleUpdateExpense}
            onDeleteExpense={handleDeleteExpense}
            onRestoreExpense={handleRestoreExpense}
          />
        );
      case 'budget':
        return (
          <ESBudget 
            expenses={expenses} 
            userId={userId}
          />
        );
      case 'insights':
        return (
          <ESInsights 
            expenses={expenses}
          />
        );
      case 'labs':
        return (
          <ESLabs 
            expenses={expenses}
            userId={userId}
            onDeleteAllSuccess={handleDeleteAllSuccess}
          />
        );
      case 'bills':
        return (
          <ESBills 
            userId={userId}
          />
        );
      case 'wealth':
        return (
          <ESWealth 
            userId={userId}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen h-[100dvh] bg-stone-950 flex flex-col overflow-hidden">
      {/* Header */}
      <ESHeader 
        onClose={onClose}
        onAddExpense={() => setQuickAddOpen(true)}
        activeTab={activeTab}
        onNavigate={handleTabChange}
        recentTabs={recentTabs}
        userId={userId}
      />

      {/* Main content - scrollable area */}
      <main 
        className="flex-1 overflow-y-auto px-4 pt-4 pb-20"
        style={{ 
          overscrollBehavior: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {renderTabContent()}
      </main>

      {/* Bottom navigation */}
      <ESBottomNav 
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        userId={userId}
        onSaved={handleQuickAddSaved}
      />
    </div>
  );
}
