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
import ESCategoryDetail from './tabs/ESCategoryDetail';
import QuickAddModal from './QuickAddModal';
import { getExpenses, clearCache } from '../../firebase/expenseSightService';
import { isFirebaseConfigured } from '../../firebase/config';

export default function ExpenseSightApp({ userId, onClose }) {
  const [activeTab, setActiveTab] = useState('home');
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [showCategoryDetail, setShowCategoryDetail] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mainRef = useRef(null);

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

  // Prevent native pull-to-refresh on the main container
  useEffect(() => {
    const mainEl = mainRef.current;
    if (!mainEl) return;

    let startY = 0;
    let startScrollTop = 0;

    const handleTouchStart = (e) => {
      startY = e.touches[0].pageY;
      startScrollTop = mainEl.scrollTop;
    };

    const handleTouchMove = (e) => {
      const currentY = e.touches[0].pageY;
      const diff = currentY - startY;

      // If at the top and trying to pull down, prevent default
      // But allow it after a significant threshold (50px) for manual refresh
      if (startScrollTop <= 0 && diff > 0 && diff < 80) {
        e.preventDefault();
      }
    };

    mainEl.addEventListener('touchstart', handleTouchStart, { passive: true });
    mainEl.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      mainEl.removeEventListener('touchstart', handleTouchStart);
      mainEl.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

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
      />

      {/* Main content - scrollable area */}
      <main 
        ref={mainRef}
        className="flex-1 overflow-y-auto overscroll-none px-4 pt-4 pb-4"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Refresh indicator */}
        {isRefreshing && (
          <div className="flex items-center justify-center py-2 -mt-2 mb-2">
            <Loader2 size={20} className="animate-spin text-teal-400" />
            <span className="text-xs text-stone-500 ml-2">Refreshing...</span>
          </div>
        )}
        
        {renderTabContent()}
      </main>

      {/* Bottom navigation */}
      <ESBottomNav 
        activeTab={activeTab}
        onTabChange={setActiveTab}
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
