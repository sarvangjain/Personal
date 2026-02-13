/**
 * useNotifications - Hook for managing push notifications
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  getNotificationSettings, 
  saveNotificationSettings,
  getUpcomingBills,
  getGoals,
  getExpenses
} from '../firebase/expenseSightService';
import { formatCurrency } from '../utils/analytics';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval, isToday, differenceInDays } from 'date-fns';

// Check if browser supports notifications
const isNotificationSupported = () => {
  return 'Notification' in window && 'serviceWorker' in navigator;
};

// Default notification settings
const DEFAULT_SETTINGS = {
  enabled: false,
  dailySummary: { enabled: true, time: '21:00' },
  weeklyCheckin: { enabled: true, day: 'sunday' },
  budgetWarnings: { enabled: true, threshold: 80 },
  billReminders: { enabled: true, daysBefore: 1 },
  goalUpdates: { enabled: true },
};

export default function useNotifications(userId) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [permission, setPermission] = useState('default');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check notification permission status
  useEffect(() => {
    if (isNotificationSupported()) {
      setPermission(Notification.permission);
    }
  }, []);

  // Load notification settings
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getNotificationSettings(userId)
      .then(data => {
        if (data) {
          setSettings({ ...DEFAULT_SETTINGS, ...data });
        }
      })
      .catch(err => {
        console.error('Error loading notification settings:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!isNotificationSupported()) {
      setError('Notifications are not supported in this browser');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        // Save enabled state
        const newSettings = { ...settings, enabled: true };
        setSettings(newSettings);
        await saveNotificationSettings(userId, newSettings);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      setError(err.message);
      return false;
    }
  }, [userId, settings]);

  // Update settings
  const updateSettings = useCallback(async (updates) => {
    if (!userId) return false;

    try {
      const newSettings = { ...settings, ...updates };
      setSettings(newSettings);
      await saveNotificationSettings(userId, newSettings);
      return true;
    } catch (err) {
      console.error('Error updating notification settings:', err);
      setError(err.message);
      return false;
    }
  }, [userId, settings]);

  // Disable notifications
  const disableNotifications = useCallback(async () => {
    const newSettings = { ...settings, enabled: false };
    setSettings(newSettings);
    await saveNotificationSettings(userId, newSettings);
  }, [userId, settings]);

  // Show a notification
  const showNotification = useCallback((title, options = {}) => {
    if (permission !== 'granted' || !settings.enabled) return;

    try {
      // Use service worker to show notification if available
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, {
            icon: '/logo192.png',
            badge: '/logo192.png',
            vibrate: [200, 100, 200],
            tag: options.tag || 'expensesight',
            ...options,
          });
        });
      } else {
        // Fallback to regular notification
        new Notification(title, {
          icon: '/logo192.png',
          ...options,
        });
      }
    } catch (err) {
      console.error('Error showing notification:', err);
    }
  }, [permission, settings.enabled]);

  // Generate and show daily summary notification
  const showDailySummary = useCallback(async () => {
    if (!settings.dailySummary.enabled || !userId) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const expenses = await getExpenses(userId, { 
        startDate: today, 
        endDate: today,
        useCache: false 
      });
      
      const totalSpent = expenses
        .filter(e => !e.isRefund && !e.cancelled)
        .reduce((sum, e) => sum + e.amount, 0);
      
      const count = expenses.filter(e => !e.isRefund && !e.cancelled).length;

      if (count > 0) {
        showNotification('Daily Spending Summary', {
          body: `You spent ${formatCurrency(totalSpent, 'INR')} today across ${count} expense${count > 1 ? 's' : ''}.`,
          tag: 'daily-summary',
          data: { type: 'daily-summary', date: today },
        });
      }
    } catch (err) {
      console.error('Error generating daily summary:', err);
    }
  }, [userId, settings.dailySummary.enabled, showNotification]);

  // Generate and show weekly check-in notification
  const showWeeklyCheckin = useCallback(async () => {
    if (!settings.weeklyCheckin.enabled || !userId) return;

    try {
      // Get this month's expenses
      const now = new Date();
      const monthInterval = { start: startOfMonth(now), end: endOfMonth(now) };
      
      const expenses = await getExpenses(userId, { useCache: false });
      const monthExpenses = expenses.filter(e => {
        if (e.isRefund || e.cancelled) return false;
        const expDate = parseISO(e.date);
        return isWithinInterval(expDate, monthInterval);
      });
      
      const monthlySpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

      showNotification('Weekly Budget Check-in', {
        body: `This month so far: ${formatCurrency(monthlySpent, 'INR')} spent. How's your budget looking?`,
        tag: 'weekly-checkin',
        data: { type: 'weekly-checkin' },
      });
    } catch (err) {
      console.error('Error generating weekly check-in:', err);
    }
  }, [userId, settings.weeklyCheckin.enabled, showNotification]);

  // Show budget warning notification
  const showBudgetWarning = useCallback((category, percentage, spent, budget) => {
    if (!settings.budgetWarnings.enabled) return;
    if (percentage < settings.budgetWarnings.threshold) return;

    showNotification('Budget Warning', {
      body: `${category} is at ${Math.round(percentage)}% of your budget (${formatCurrency(spent, 'INR')} of ${formatCurrency(budget, 'INR')})`,
      tag: `budget-warning-${category.toLowerCase().replace(/\s/g, '-')}`,
      data: { type: 'budget-warning', category },
    });
  }, [settings.budgetWarnings, showNotification]);

  // Show bill reminder notification
  const showBillReminder = useCallback(async () => {
    if (!settings.billReminders.enabled || !userId) return;

    try {
      const bills = await getUpcomingBills(userId, settings.billReminders.daysBefore + 1);
      
      for (const bill of bills) {
        const dueDate = parseISO(bill.nextDueDate);
        const daysUntil = differenceInDays(dueDate, new Date());
        
        if (daysUntil <= settings.billReminders.daysBefore) {
          const dueText = isToday(dueDate) 
            ? 'due today' 
            : daysUntil === 1 
              ? 'due tomorrow' 
              : `due in ${daysUntil} days`;
          
          showNotification('Bill Reminder', {
            body: `${bill.name} (${formatCurrency(bill.amount, 'INR')}) is ${dueText}`,
            tag: `bill-reminder-${bill.id}`,
            data: { type: 'bill-reminder', billId: bill.id },
          });
        }
      }
    } catch (err) {
      console.error('Error generating bill reminders:', err);
    }
  }, [userId, settings.billReminders, showNotification]);

  // Show goal progress notification
  const showGoalProgress = useCallback(async () => {
    if (!settings.goalUpdates.enabled || !userId) return;

    try {
      const goals = await getGoals(userId);
      const activeGoals = goals.filter(g => g.isActive !== false && g.currentAmount < g.targetAmount);
      
      if (activeGoals.length === 0) return;

      // Pick a random goal to highlight
      const goal = activeGoals[Math.floor(Math.random() * activeGoals.length)];
      const progress = Math.round((goal.currentAmount / goal.targetAmount) * 100);
      const remaining = goal.targetAmount - goal.currentAmount;

      showNotification('Goal Progress', {
        body: `${goal.name}: ${progress}% complete! ${formatCurrency(remaining, 'INR')} to go.`,
        tag: `goal-progress-${goal.id}`,
        data: { type: 'goal-progress', goalId: goal.id },
      });
    } catch (err) {
      console.error('Error generating goal progress notification:', err);
    }
  }, [userId, settings.goalUpdates.enabled, showNotification]);

  // Schedule notification checks (called periodically by the app)
  const checkScheduledNotifications = useCallback(async () => {
    if (!settings.enabled || permission !== 'granted') return;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // Daily summary at configured time (default 9 PM)
    if (settings.dailySummary.enabled) {
      const [targetHour] = settings.dailySummary.time.split(':').map(Number);
      if (currentHour === targetHour && currentMinute === 0) {
        await showDailySummary();
      }
    }

    // Weekly check-in on configured day (default Sunday at 6 PM)
    if (settings.weeklyCheckin.enabled) {
      if (currentDay === settings.weeklyCheckin.day && currentHour === 18 && currentMinute === 0) {
        await showWeeklyCheckin();
      }
    }

    // Bill reminders - check in the morning
    if (settings.billReminders.enabled && currentHour === 9 && currentMinute === 0) {
      await showBillReminder();
    }

    // Goal progress - weekly on Saturday
    if (settings.goalUpdates.enabled && currentDay === 'saturday' && currentHour === 10 && currentMinute === 0) {
      await showGoalProgress();
    }
  }, [
    settings, 
    permission, 
    showDailySummary, 
    showWeeklyCheckin, 
    showBillReminder, 
    showGoalProgress
  ]);

  return {
    // State
    settings,
    permission,
    loading,
    error,
    isSupported: isNotificationSupported(),
    isEnabled: settings.enabled && permission === 'granted',
    
    // Actions
    requestPermission,
    updateSettings,
    disableNotifications,
    
    // Manual triggers
    showNotification,
    showDailySummary,
    showWeeklyCheckin,
    showBudgetWarning,
    showBillReminder,
    showGoalProgress,
    checkScheduledNotifications,
  };
}
