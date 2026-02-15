/**
 * ExpenseSightApp - Main app shell for the standalone ExpenseSight experience
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import ESHeader from './components/ESHeader';
import ESBottomNav from './components/ESBottomNav';
import ESHome from './tabs/ESHome';
import ESActivity from './tabs/ESActivity';
import ESBudget from './tabs/ESBudget';
import ESInsights from './tabs/ESInsights';
import ESLabs from './tabs/ESLabs';
import ESBills from './tabs/ESBills';
import ESGoals from './tabs/ESGoals';
import ESCategoryDetail from './tabs/ESCategoryDetail';
import QuickAddModal from './QuickAddModal';
import { getExpenses, clearCache, updateExpense, deleteExpense } from '../../firebase/expenseSightService';
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

  // Load expenses
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

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Reset category detail when switching tabs
  useEffect(() => {
    setShowCategoryDetail(false);
  }, [activeTab]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    clearCache(userId);
    loadExpenses(true);
  }, [userId, loadExpenses, isRefreshing]);

  // Handle quick add saved
  const handleQuickAddSaved = () => {
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
  
  // Handle delete expense
  const handleDeleteExpense = useCallback(async (expenseId) => {
    if (!userId) return;
    
    const result = await deleteExpense(userId, expenseId);
    if (result.success) {
      // Remove from local state immediately
      setExpenses(prev => prev.filter(exp => exp.id !== expenseId));
    }
    return result;
  }, [userId]);

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
          />
        );
      case 'bills':
        return (
          <ESBills 
            userId={userId}
          />
        );
      case 'goals':
        return (
          <ESGoals 
            userId={userId}
            expenses={expenses}
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
