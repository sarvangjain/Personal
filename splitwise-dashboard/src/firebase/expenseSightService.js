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
