/**
 * ExpenseSight Firebase Service
 * CRUD operations for personal expense tracking
 */

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy, 
  limit,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';

const COLLECTION_NAME = 'expenseSight';

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Ensure userId is a string for Firestore paths
 */
function normalizeUserId(userId) {
  return String(userId);
}

function getUserCollection(userId) {
  return collection(db, COLLECTION_NAME, normalizeUserId(userId), 'expenses');
}

function getExpenseDoc(userId, expenseId) {
  return doc(db, COLLECTION_NAME, normalizeUserId(userId), 'expenses', expenseId);
}

// ─── CRUD Operations ─────────────────────────────────────────────────────────

/**
 * Add multiple expenses in a batch
 */
export async function addExpenses(userId, expenses) {
  if (!isFirebaseConfigured() || !userId || !expenses.length) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    const batch = writeBatch(db);
    const now = serverTimestamp();
    
    for (const expense of expenses) {
      const docRef = doc(getUserCollection(userId), expense.id);
      batch.set(docRef, {
        ...expense,
        userId,
        createdAt: now,
        updatedAt: now,
      });
    }
    
    await batch.commit();
    
    // Invalidate cache
    clearCache(userId);
    
    return { success: true, count: expenses.length };
  } catch (error) {
    console.error('Error adding expenses:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get expenses for a user with optional filters
 */
export async function getExpenses(userId, options = {}) {
  if (!isFirebaseConfigured() || !userId) {
    return [];
  }

  const { 
    startDate, 
    endDate, 
    category, 
    limitCount = 500,
    useCache = true 
  } = options;

  // Check cache
  const normalizedId = normalizeUserId(userId);
  const cacheKey = `${normalizedId}_${startDate || ''}_${endDate || ''}_${category || ''}_${limitCount}`;
  if (useCache && expenseSightCache.has(cacheKey)) {
    return expenseSightCache.get(cacheKey);
  }

  try {
    let q = query(
      getUserCollection(userId),
      orderBy('date', 'desc'),
      limit(limitCount)
    );

    // Note: Firestore requires composite indexes for multiple where clauses
    // For now, we'll filter in memory after fetching
    
    const snapshot = await getDocs(q);
    let expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Apply filters in memory
    if (startDate) {
      expenses = expenses.filter(e => e.date >= startDate);
    }
    if (endDate) {
      expenses = expenses.filter(e => e.date <= endDate);
    }
    if (category && category !== 'all') {
      expenses = expenses.filter(e => e.category === category);
    }

    // Cache results
    expenseSightCache.set(cacheKey, expenses);
    
    return expenses;
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return [];
  }
}

/**
 * Get a single expense by ID
 */
export async function getExpense(userId, expenseId) {
  if (!isFirebaseConfigured() || !userId || !expenseId) {
    return null;
  }

  try {
    const docSnap = await getDoc(getExpenseDoc(userId, expenseId));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error fetching expense:', error);
    return null;
  }
}

/**
 * Update an expense
 */
export async function updateExpense(userId, expenseId, data) {
  if (!isFirebaseConfigured() || !userId || !expenseId) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    const docRef = getExpenseDoc(userId, expenseId);
    await setDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    // Invalidate cache
    clearCache(userId);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating expense:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete an expense
 */
export async function deleteExpense(userId, expenseId) {
  if (!isFirebaseConfigured() || !userId || !expenseId) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    await deleteDoc(getExpenseDoc(userId, expenseId));
    
    // Invalidate cache
    clearCache(userId);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting expense:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete multiple expenses
 */
export async function deleteExpenses(userId, expenseIds) {
  if (!isFirebaseConfigured() || !userId || !expenseIds.length) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    const batch = writeBatch(db);
    
    for (const expenseId of expenseIds) {
      batch.delete(getExpenseDoc(userId, expenseId));
    }
    
    await batch.commit();
    
    // Invalidate cache
    clearCache(userId);
    
    return { success: true, count: expenseIds.length };
  } catch (error) {
    console.error('Error deleting expenses:', error);
    return { success: false, error: error.message };
  }
}

// ─── Analytics Queries ───────────────────────────────────────────────────────

/**
 * Get expense statistics for a user
 */
export async function getExpenseStats(userId, options = {}) {
  const expenses = await getExpenses(userId, options);
  
  if (!expenses.length) {
    return {
      totalSpent: 0,
      totalRefunds: 0,
      netSpent: 0,
      expenseCount: 0,
      categoryBreakdown: {},
      dailyTotals: {},
      averageExpense: 0,
    };
  }

  let totalSpent = 0;
  let totalRefunds = 0;
  const categoryBreakdown = {};
  const dailyTotals = {};

  for (const expense of expenses) {
    if (expense.isPending) continue;
    
    if (expense.isRefund) {
      totalRefunds += expense.amount;
    } else {
      totalSpent += expense.amount;
      
      // Category breakdown
      const cat = expense.category || 'Other';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + expense.amount;
      
      // Daily totals
      const date = expense.date;
      dailyTotals[date] = (dailyTotals[date] || 0) + expense.amount;
    }
  }

  const nonRefundExpenses = expenses.filter(e => !e.isRefund && !e.isPending);
  
  return {
    totalSpent,
    totalRefunds,
    netSpent: totalSpent - totalRefunds,
    expenseCount: nonRefundExpenses.length,
    categoryBreakdown,
    dailyTotals,
    averageExpense: nonRefundExpenses.length > 0 
      ? totalSpent / nonRefundExpenses.length 
      : 0,
  };
}

/**
 * Get expenses by month for trend analysis
 */
export async function getMonthlyTrend(userId, months = 6) {
  const expenses = await getExpenses(userId, { limitCount: 1000 });
  
  const monthlyData = {};
  
  for (const expense of expenses) {
    if (expense.isPending || expense.isRefund) continue;
    
    const month = expense.date.substring(0, 7); // "2025-02"
    monthlyData[month] = (monthlyData[month] || 0) + expense.amount;
  }
  
  // Sort by month and take last N months
  const sortedMonths = Object.keys(monthlyData).sort().slice(-months);
  
  return sortedMonths.map(month => ({
    month,
    amount: monthlyData[month],
  }));
}

// ─── Duplicate Detection Support ─────────────────────────────────────────────

/**
 * Get recent expenses for duplicate checking
 * Fetches expenses from the last N days for comparison
 */
export async function getRecentExpensesForDuplicateCheck(userId, days = 7) {
  if (!isFirebaseConfigured() || !userId) {
    return [];
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  return getExpenses(userId, {
    startDate: startDateStr,
    endDate: endDateStr,
    limitCount: 200,
    useCache: false, // Always fetch fresh for duplicate checking
  });
}

/**
 * Get frequent expense descriptions for templates
 * Returns top N most common expense descriptions with their average amounts
 */
export async function getFrequentExpenses(userId, topN = 5) {
  if (!isFirebaseConfigured() || !userId) {
    return [];
  }

  const expenses = await getExpenses(userId, { limitCount: 500, useCache: true });
  
  // Count occurrences and sum amounts per description
  const descriptionStats = {};
  
  for (const expense of expenses) {
    if (expense.isRefund || expense.cancelled || expense.isPending) continue;
    
    const desc = expense.description.toLowerCase().trim();
    if (!descriptionStats[desc]) {
      descriptionStats[desc] = {
        description: expense.description, // Keep original casing from first occurrence
        category: expense.category,
        count: 0,
        totalAmount: 0,
      };
    }
    descriptionStats[desc].count++;
    descriptionStats[desc].totalAmount += expense.amount;
  }
  
  // Convert to array, calculate averages, and sort by count
  const sorted = Object.values(descriptionStats)
    .map(stat => ({
      description: stat.description,
      category: stat.category,
      count: stat.count,
      avgAmount: Math.round(stat.totalAmount / stat.count),
    }))
    .filter(stat => stat.count >= 2) // Only show if used at least twice
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
  
  return sorted;
}

// ─── Cache Management ────────────────────────────────────────────────────────

const expenseSightCache = new Map();

export function clearCache(userId) {
  if (userId) {
    // Clear all cache entries for this user
    const normalizedId = normalizeUserId(userId);
    for (const key of expenseSightCache.keys()) {
      if (key.startsWith(normalizedId)) {
        expenseSightCache.delete(key);
      }
    }
  } else {
    expenseSightCache.clear();
  }
}

// ─── Budget Management ───────────────────────────────────────────────────────

/**
 * Get budget settings subcollection reference
 */
function getBudgetDoc(userId) {
  return doc(db, COLLECTION_NAME, normalizeUserId(userId), 'settings', 'budget');
}

/**
 * Get user's budget settings from Firebase
 */
export async function getBudgetSettings(userId) {
  if (!isFirebaseConfigured() || !userId) {
    return null;
  }

  try {
    const docSnap = await getDoc(getBudgetDoc(userId));
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Error fetching budget settings:', error);
    return null;
  }
}

/**
 * Save budget settings to Firebase
 */
export async function saveBudgetSettings(userId, budgetData) {
  if (!isFirebaseConfigured() || !userId) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    const docRef = getBudgetDoc(userId);
    await setDoc(docRef, {
      ...budgetData,
      userId: normalizeUserId(userId),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error('Error saving budget settings:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update specific budget fields
 */
export async function updateBudgetSettings(userId, updates) {
  if (!isFirebaseConfigured() || !userId) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    const docRef = getBudgetDoc(userId);
    await setDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating budget settings:', error);
    return { success: false, error: error.message };
  }
}

// ─── Tags Management ─────────────────────────────────────────────────────────

/**
 * Predefined tags with their colors
 */
export const PREDEFINED_TAGS = [
  { name: 'work', color: 'blue', isCustom: false },
  { name: 'personal', color: 'purple', isCustom: false },
  { name: 'gift', color: 'pink', isCustom: false },
  { name: 'reimbursable', color: 'green', isCustom: false },
  { name: 'recurring', color: 'orange', isCustom: false },
  { name: 'splurge', color: 'red', isCustom: false },
  { name: 'essential', color: 'teal', isCustom: false },
];

function getTagsCollection(userId) {
  return collection(db, COLLECTION_NAME, normalizeUserId(userId), 'tags');
}

function getTagDoc(userId, tagId) {
  return doc(db, COLLECTION_NAME, normalizeUserId(userId), 'tags', tagId);
}

/**
 * Get all tags for a user (predefined + custom)
 */
export async function getTags(userId) {
  if (!isFirebaseConfigured() || !userId) {
    return PREDEFINED_TAGS;
  }

  try {
    const snapshot = await getDocs(getTagsCollection(userId));
    const customTags = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    // Merge predefined with custom (custom can override predefined)
    const customTagNames = new Set(customTags.map(t => t.name.toLowerCase()));
    const predefinedFiltered = PREDEFINED_TAGS.filter(
      t => !customTagNames.has(t.name.toLowerCase())
    );
    
    return [...predefinedFiltered, ...customTags];
  } catch (error) {
    console.error('Error fetching tags:', error);
    return PREDEFINED_TAGS;
  }
}

/**
 * Create a custom tag
 */
export async function createTag(userId, tagData) {
  if (!isFirebaseConfigured() || !userId || !tagData.name) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    const tagId = `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const docRef = getTagDoc(userId, tagId);
    
    await setDoc(docRef, {
      id: tagId,
      name: tagData.name.toLowerCase().trim(),
      color: tagData.color || 'stone',
      isCustom: true,
      usageCount: 0,
      createdAt: serverTimestamp(),
    });
    
    return { success: true, id: tagId };
  } catch (error) {
    console.error('Error creating tag:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update tag usage count
 */
export async function incrementTagUsage(userId, tagName) {
  if (!isFirebaseConfigured() || !userId || !tagName) return;

  try {
    // Find the tag by name
    const snapshot = await getDocs(getTagsCollection(userId));
    const tagDoc = snapshot.docs.find(
      doc => doc.data().name.toLowerCase() === tagName.toLowerCase()
    );
    
    if (tagDoc) {
      await setDoc(getTagDoc(userId, tagDoc.id), {
        usageCount: (tagDoc.data().usageCount || 0) + 1,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
  } catch (error) {
    console.error('Error incrementing tag usage:', error);
  }
}

/**
 * Delete a custom tag
 */
export async function deleteTag(userId, tagId) {
  if (!isFirebaseConfigured() || !userId || !tagId) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    await deleteDoc(getTagDoc(userId, tagId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting tag:', error);
    return { success: false, error: error.message };
  }
}

// ─── Goals Management ────────────────────────────────────────────────────────

function getGoalsCollection(userId) {
  return collection(db, COLLECTION_NAME, normalizeUserId(userId), 'goals');
}

function getGoalDoc(userId, goalId) {
  return doc(db, COLLECTION_NAME, normalizeUserId(userId), 'goals', goalId);
}

/**
 * Get all goals for a user
 */
export async function getGoals(userId) {
  if (!isFirebaseConfigured() || !userId) {
    return [];
  }

  try {
    const q = query(getGoalsCollection(userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching goals:', error);
    return [];
  }
}

/**
 * Create a new goal
 */
export async function createGoal(userId, goalData) {
  if (!isFirebaseConfigured() || !userId || !goalData.name) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    const goalId = `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const docRef = getGoalDoc(userId, goalId);
    
    await setDoc(docRef, {
      id: goalId,
      name: goalData.name,
      targetAmount: goalData.targetAmount || 0,
      currentAmount: goalData.currentAmount || 0,
      deadline: goalData.deadline || null,
      category: goalData.category || null,
      trackingType: goalData.trackingType || 'savings',
      suggestedCutbacks: goalData.suggestedCutbacks || [],
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return { success: true, id: goalId };
  } catch (error) {
    console.error('Error creating goal:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a goal
 */
export async function updateGoal(userId, goalId, updates) {
  if (!isFirebaseConfigured() || !userId || !goalId) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    const docRef = getGoalDoc(userId, goalId);
    await setDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating goal:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a goal
 */
export async function deleteGoal(userId, goalId) {
  if (!isFirebaseConfigured() || !userId || !goalId) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    await deleteDoc(getGoalDoc(userId, goalId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting goal:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add amount to a savings goal
 */
export async function addToGoal(userId, goalId, amount) {
  if (!isFirebaseConfigured() || !userId || !goalId) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    const docSnap = await getDoc(getGoalDoc(userId, goalId));
    if (!docSnap.exists()) {
      return { success: false, error: 'Goal not found' };
    }
    
    const goal = docSnap.data();
    const newAmount = (goal.currentAmount || 0) + amount;
    
    await setDoc(getGoalDoc(userId, goalId), {
      currentAmount: newAmount,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    return { success: true, newAmount };
  } catch (error) {
    console.error('Error adding to goal:', error);
    return { success: false, error: error.message };
  }
}

// ─── Bills Management ────────────────────────────────────────────────────────

function getBillsCollection(userId) {
  return collection(db, COLLECTION_NAME, normalizeUserId(userId), 'bills');
}

function getBillDoc(userId, billId) {
  return doc(db, COLLECTION_NAME, normalizeUserId(userId), 'bills', billId);
}

/**
 * Get all bills for a user
 */
export async function getBills(userId) {
  if (!isFirebaseConfigured() || !userId) {
    return [];
  }

  try {
    const q = query(getBillsCollection(userId), orderBy('dueDay', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching bills:', error);
    return [];
  }
}

/**
 * Create a new bill reminder
 */
export async function createBill(userId, billData) {
  if (!isFirebaseConfigured() || !userId || !billData.name) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    const billId = `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const docRef = getBillDoc(userId, billId);
    
    // Calculate next due date
    const today = new Date();
    let nextDueDate = new Date(today.getFullYear(), today.getMonth(), billData.dueDay || 1);
    if (nextDueDate <= today) {
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    }
    
    await setDoc(docRef, {
      id: billId,
      name: billData.name,
      amount: billData.amount || 0,
      category: billData.category || 'Utilities',
      dueDay: billData.dueDay || 1,
      frequency: billData.frequency || 'monthly',
      isAutoPay: billData.isAutoPay || false,
      reminderDays: billData.reminderDays || [1],
      lastPaidDate: null,
      nextDueDate: nextDueDate.toISOString().split('T')[0],
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return { success: true, id: billId };
  } catch (error) {
    console.error('Error creating bill:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a bill
 */
export async function updateBill(userId, billId, updates) {
  if (!isFirebaseConfigured() || !userId || !billId) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    const docRef = getBillDoc(userId, billId);
    await setDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating bill:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a bill
 */
export async function deleteBill(userId, billId) {
  if (!isFirebaseConfigured() || !userId || !billId) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    await deleteDoc(getBillDoc(userId, billId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting bill:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark a bill as paid and calculate next due date
 */
export async function markBillPaid(userId, billId, paidDate = null) {
  if (!isFirebaseConfigured() || !userId || !billId) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    const docSnap = await getDoc(getBillDoc(userId, billId));
    if (!docSnap.exists()) {
      return { success: false, error: 'Bill not found' };
    }
    
    const bill = docSnap.data();
    const lastPaidDate = paidDate || new Date().toISOString().split('T')[0];
    
    // Calculate next due date based on frequency
    const currentDue = new Date(bill.nextDueDate);
    let nextDue = new Date(currentDue);
    
    switch (bill.frequency) {
      case 'monthly':
        nextDue.setMonth(nextDue.getMonth() + 1);
        break;
      case 'quarterly':
        nextDue.setMonth(nextDue.getMonth() + 3);
        break;
      case 'yearly':
        nextDue.setFullYear(nextDue.getFullYear() + 1);
        break;
      case 'once':
        // One-time bill - mark as inactive
        await setDoc(getBillDoc(userId, billId), {
          lastPaidDate,
          isActive: false,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        return { success: true, nextDueDate: null };
      default:
        nextDue.setMonth(nextDue.getMonth() + 1);
    }
    
    const nextDueDate = nextDue.toISOString().split('T')[0];
    
    await setDoc(getBillDoc(userId, billId), {
      lastPaidDate,
      nextDueDate,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    return { success: true, nextDueDate };
  } catch (error) {
    console.error('Error marking bill as paid:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get upcoming bills (due within N days)
 */
export async function getUpcomingBills(userId, days = 7) {
  const bills = await getBills(userId);
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + days);
  
  return bills
    .filter(bill => {
      if (!bill.isActive) return false;
      const dueDate = new Date(bill.nextDueDate);
      return dueDate >= today && dueDate <= futureDate;
    })
    .sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate));
}

// ─── Notification Settings ───────────────────────────────────────────────────

function getNotificationSettingsDoc(userId) {
  return doc(db, COLLECTION_NAME, normalizeUserId(userId), 'settings', 'notifications');
}

/**
 * Get notification settings
 */
export async function getNotificationSettings(userId) {
  if (!isFirebaseConfigured() || !userId) {
    return null;
  }

  try {
    const docSnap = await getDoc(getNotificationSettingsDoc(userId));
    if (docSnap.exists()) {
      return docSnap.data();
    }
    // Return defaults
    return {
      enabled: false,
      dailySummary: { enabled: true, time: '21:00' },
      weeklyCheckin: { enabled: true, day: 'sunday' },
      budgetWarnings: { enabled: true, threshold: 80 },
      billReminders: { enabled: true, daysBefore: 1 },
      goalUpdates: { enabled: true },
    };
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return null;
  }
}

/**
 * Save notification settings
 */
export async function saveNotificationSettings(userId, settings) {
  if (!isFirebaseConfigured() || !userId) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    const docRef = getNotificationSettingsDoc(userId);
    await setDoc(docRef, {
      ...settings,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error('Error saving notification settings:', error);
    return { success: false, error: error.message };
  }
}

// ─── Export for Analytics Integration ────────────────────────────────────────

/**
 * Get expenses in Splitwise-compatible format for merged analytics
 */
export async function getExpensesForAnalytics(userId) {
  const { toSplitwiseFormat } = await import('../utils/expenseParser');
  const expenses = await getExpenses(userId, { useCache: true });
  
  return expenses
    .filter(e => !e.isPending)
    .map(e => toSplitwiseFormat(e, userId));
}
