/**
 * ExpenseSightApp - Main app shell for the standalone ExpenseSight experience
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import ESHeader from './components/ESHeader';
import ESBottomNav from './components/ESBottomNav';
import ESHome from './tabs/ESHome';
import ESActivity from './tabs/ESActivity';
import ESBudget from './tabs/ESBudget';
import ESInsights from './tabs/ESInsights';
import ESLabs from './tabs/ESLabs';
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
  
  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const mainRef = useRef(null);
  const touchStartY = useRef(0);
  const touchStartScrollTop = useRef(0);
  const isScrolling = useRef(false);
  
  const PULL_THRESHOLD = 80; // pixels to pull before triggering refresh

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

  // Custom pull-to-refresh implementation
  useEffect(() => {
    const mainEl = mainRef.current;
    if (!mainEl) return;

    const handleTouchStart = (e) => {
      // Only track if at the top of the scroll container
      if (mainEl.scrollTop <= 0) {
        touchStartY.current = e.touches[0].clientY;
        touchStartScrollTop.current = mainEl.scrollTop;
        isScrolling.current = false;
      }
    };

    const handleTouchMove = (e) => {
      // If we're not at the top, allow normal scrolling
      if (mainEl.scrollTop > 5) {
        setPullDistance(0);
        setIsPulling(false);
        return;
      }

      const currentY = e.touches[0].clientY;
      const diff = currentY - touchStartY.current;

      // Only consider it a pull if starting from top and pulling down
      if (touchStartScrollTop.current <= 0 && diff > 0 && !isRefreshing) {
        // Prevent native scroll/refresh behavior
        e.preventDefault();
        
        // Apply resistance to pull distance
        const resistance = 0.4;
        const pulledDistance = Math.min(diff * resistance, PULL_THRESHOLD * 1.5);
        
        setPullDistance(pulledDistance);
        setIsPulling(true);
      }
    };

    const handleTouchEnd = () => {
      if (isPulling && pullDistance >= PULL_THRESHOLD && !isRefreshing) {
        // Trigger refresh
        handleRefresh();
      }
      
      // Reset pull state
      setPullDistance(0);
      setIsPulling(false);
    };

    // Use passive: false for touchmove to allow preventDefault
    mainEl.addEventListener('touchstart', handleTouchStart, { passive: true });
    mainEl.addEventListener('touchmove', handleTouchMove, { passive: false });
    mainEl.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      mainEl.removeEventListener('touchstart', handleTouchStart);
      mainEl.removeEventListener('touchmove', handleTouchMove);
      mainEl.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, pullDistance, isRefreshing]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setPullDistance(0);
    setIsPulling(false);
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
      default:
        return null;
    }
  };

  // Calculate pull indicator styles
  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const showPullIndicator = isPulling || isRefreshing;

  return (
    <div className="h-screen h-[100dvh] bg-stone-950 flex flex-col overflow-hidden">
      {/* Header */}
      <ESHeader 
        onClose={onClose}
        onAddExpense={() => setQuickAddOpen(true)}
        activeTab={activeTab}
        onNavigate={handleTabChange}
        recentTabs={recentTabs}
      />

      {/* Pull-to-refresh indicator */}
      {showPullIndicator && (
        <div 
          className="flex items-center justify-center py-2 bg-stone-900/80 border-b border-stone-800/50"
          style={{ 
            transform: `translateY(${isRefreshing ? 0 : pullDistance - 40}px)`,
            opacity: isRefreshing ? 1 : pullProgress,
            transition: isRefreshing ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          <div className={`flex items-center gap-2 ${isRefreshing ? 'animate-pulse' : ''}`}>
            <RefreshCw 
              size={16} 
              className={`text-teal-400 ${isRefreshing ? 'animate-spin' : ''}`}
              style={{ 
                transform: isRefreshing ? 'none' : `rotate(${pullProgress * 180}deg)` 
              }}
            />
            <span className="text-xs text-stone-400">
              {isRefreshing ? 'Refreshing...' : pullProgress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        </div>
      )}

      {/* Main content - scrollable area */}
      <main 
        ref={mainRef}
        className="flex-1 overflow-y-auto px-4 pt-4 pb-4"
        style={{ 
          overscrollBehavior: 'none',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
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
