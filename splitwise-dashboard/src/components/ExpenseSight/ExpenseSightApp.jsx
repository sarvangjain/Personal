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
import QuickAddModal from './QuickAddModal';
import { getExpenses, clearCache } from '../../firebase/expenseSightService';
import { isFirebaseConfigured } from '../../firebase/config';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

export default function ExpenseSightApp({ userId, onClose }) {
  const [activeTab, setActiveTab] = useState('home');
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // Lock body scroll when app is open
  useBodyScrollLock(true);

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
    }
  }, [userId, firebaseEnabled]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Handle refresh
  const handleRefresh = () => {
    clearCache(userId);
    loadExpenses(true);
  };

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
            <Loader2 size={32} className="animate-spin text-violet-400 mx-auto mb-4" />
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
        return (
          <ESActivity 
            expenses={expenses} 
            userId={userId}
            onRefresh={handleRefresh}
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
    <div className="min-h-screen bg-stone-950 flex flex-col">
      {/* Header */}
      <ESHeader 
        onClose={onClose}
        onAddExpense={() => setQuickAddOpen(true)}
      />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-24 px-4 pt-4">
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
