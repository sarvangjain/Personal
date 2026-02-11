import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { format, subMonths } from 'date-fns';

/**
 * Generate budget document ID
 * @param {string|number} userId - User ID
 * @param {string} month - Month in YYYY-MM format
 */
const getBudgetDocId = (userId, month) => `${userId}_${month}`;

// ============================================
// In-memory cache for faster tab switching
// ============================================
const budgetCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_NOT_FOUND = Symbol('CACHE_NOT_FOUND');

function getCacheKey(userId, month) {
  return `${userId}_${month}`;
}

/**
 * Get cached budget data
 * @returns {object} { found: boolean, data: any }
 */
function getCachedBudget(userId, month) {
  const key = getCacheKey(userId, month);
  const cached = budgetCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    // Return object with found flag to distinguish "no cache" from "cached null"
    return { found: true, data: cached.data };
  }
  return { found: false, data: null };
}

function setCachedBudget(userId, month, data) {
  const key = getCacheKey(userId, month);
  budgetCache.set(key, { data, timestamp: Date.now() });
  console.log('Budget cached for:', key);
}

function invalidateCache(userId, month) {
  const key = getCacheKey(userId, month);
  budgetCache.delete(key);
  console.log('Cache invalidated for:', key);
}

// Export for use in components
export { getCachedBudget, setCachedBudget, invalidateCache };

/**
 * Wrap a promise with a timeout
 * @param {Promise} promise - The promise to wrap
 * @param {number} ms - Timeout in milliseconds
 * @param {string} operation - Operation name for error message
 */
function withTimeout(promise, ms = 15000, operation = 'Operation') {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`${operation} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]);
}

/**
 * Retry a function with exponential backoff
 */
async function withRetry(fn, maxRetries = 2, baseDelay = 1000) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries && !error.message?.includes('permission')) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1} after ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Get a user-friendly error message
 */
function getErrorMessage(error) {
  const code = error?.code || '';
  
  if (code === 'permission-denied') {
    return 'Permission denied. Please check Firestore security rules allow write access.';
  }
  if (code === 'not-found') {
    return 'Firestore database not found. Please create a Firestore database in Firebase Console.';
  }
  if (code === 'unavailable') {
    return 'Firestore is temporarily unavailable. Please try again.';
  }
  if (error?.message?.includes('timed out')) {
    return 'Request timed out. Please check your internet connection and try again.';
  }
  return error?.message || 'An unexpected error occurred';
}

/**
 * Get budget for a specific month
 * @param {string|number} userId - Splitwise user ID
 * @param {string} month - Month in YYYY-MM format (e.g., "2026-02")
 * @returns {Object|null} Budget data or null if not found
 */
export async function getBudget(userId, month, options = {}) {
  const { skipCache = false } = options;
  const startTime = Date.now();
  console.log('getBudget called:', { userId, month, skipCache });
  
  if (!isFirebaseConfigured() || !db || !userId || !month) {
    console.log('getBudget early return - missing config/params');
    return null;
  }

  // Check cache first (unless explicitly skipped)
  if (!skipCache) {
    const cached = getCachedBudget(userId, month);
    if (cached.found) {
      console.log(`getBudget cache hit in ${Date.now() - startTime}ms`);
      return cached.data;
    }
  }

  const budgetRef = doc(db, 'users', String(userId), 'budgets', getBudgetDocId(userId, month));

  try {
    const budgetDoc = await withTimeout(
      getDoc(budgetRef), 
      15000, 
      'getBudget'
    );
    console.log(`getBudget completed in ${Date.now() - startTime}ms, exists: ${budgetDoc.exists()}`);
    
    const result = budgetDoc.exists() ? { id: budgetDoc.id, ...budgetDoc.data() } : null;
    
    // Update cache
    setCachedBudget(userId, month, result);
    
    return result;
  } catch (error) {
    console.error('Could not get budget:', error.message);
    // Return cached data if available even if stale
    const staleCache = getCachedBudget(userId, month);
    if (staleCache.found) {
      console.log('Returning stale cache due to error');
      return staleCache.data;
    }
    return null;
  }
}

/**
 * Create or update budget for a month
 * @param {string|number} userId - Splitwise user ID
 * @param {string} month - Month in YYYY-MM format
 * @param {Object} budgetData - Budget configuration
 * @param {number} budgetData.overallLimit - Overall spending limit
 * @param {string} budgetData.currency - Currency code (e.g., "INR")
 * @param {Object} budgetData.categoryLimits - Category-specific limits { "Food & Drink": 5000, ... }
 * @returns {string|null} Budget document ID or null on failure
 */
export async function createOrUpdateBudget(userId, month, budgetData) {
  console.log('createOrUpdateBudget called:', { userId, month, budgetData });
  
  if (!isFirebaseConfigured()) {
    console.error('Firebase not configured');
    return null;
  }
  
  if (!db) {
    console.error('Firestore db not initialized');
    return null;
  }
  
  if (!userId || !month) {
    console.error('Missing userId or month:', { userId, month });
    return null;
  }

  const budgetId = getBudgetDocId(userId, month);
  const budgetRef = doc(db, 'users', String(userId), 'budgets', budgetId);
  console.log('Budget ref path:', `users/${String(userId)}/budgets/${budgetId}`);

  try {
    // Use retry for the entire save operation
    await withRetry(async () => {
      // Check if doc exists (with timeout)
      let existingDoc;
      try {
        existingDoc = await withTimeout(getDoc(budgetRef), 10000, 'Check existing budget');
        console.log('Existing doc exists:', existingDoc.exists());
      } catch (checkError) {
        console.warn('Could not check existing doc, creating new:', checkError.message);
        existingDoc = { exists: () => false };
      }
      
      const now = serverTimestamp();

      if (existingDoc.exists()) {
        // Update existing budget
        console.log('Updating existing budget...');
        await withTimeout(
          updateDoc(budgetRef, {
            overallLimit: budgetData.overallLimit,
            currency: budgetData.currency || 'INR',
            categoryLimits: budgetData.categoryLimits || {},
            updatedAt: now,
          }),
          15000,
          'Update budget'
        );
      } else {
        // Create new budget
        console.log('Creating new budget...');
        await withTimeout(
          setDoc(budgetRef, {
            month,
            overallLimit: budgetData.overallLimit,
            currency: budgetData.currency || 'INR',
            categoryLimits: budgetData.categoryLimits || {},
            manualEntries: [],
            createdAt: now,
            updatedAt: now,
          }),
          15000,
          'Create budget'
        );
      }
    }, 2); // Retry up to 2 times

    console.log('Budget saved successfully:', budgetId);
    
    // Invalidate cache so next read fetches fresh data
    invalidateCache(userId, month);
    
    return budgetId;
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    console.error('Error creating/updating budget:', errorMsg);
    console.error('Error details:', error.code, error.message, error);
    // Throw with user-friendly message
    throw new Error(errorMsg);
  }
}

/**
 * Add a manual spending entry to a budget
 * @param {string|number} userId - Splitwise user ID
 * @param {string} month - Month in YYYY-MM format
 * @param {Object} entry - Manual entry data
 * @param {string} entry.description - Entry description
 * @param {number} entry.amount - Entry amount
 * @param {string} entry.category - Category name
 * @param {string} entry.date - Date in YYYY-MM-DD format
 * @returns {string|null} Entry ID or null on failure
 */
export async function addManualEntry(userId, month, entry) {
  if (!isFirebaseConfigured() || !db || !userId || !month || !entry) return null;

  const budgetId = getBudgetDocId(userId, month);
  const budgetRef = doc(db, 'users', String(userId), 'budgets', budgetId);

  try {
    // Generate unique entry ID
    const entryId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newEntry = {
      id: entryId,
      description: entry.description || 'Manual entry',
      amount: entry.amount,
      category: entry.category || 'Other',
      date: entry.date,
      createdAt: new Date().toISOString(),
    };

    // Check if budget exists
    const budgetDoc = await getDoc(budgetRef);
    
    if (budgetDoc.exists()) {
      // Add entry to existing budget
      await updateDoc(budgetRef, {
        manualEntries: arrayUnion(newEntry),
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create budget with default values and the entry
      await setDoc(budgetRef, {
        month,
        overallLimit: 0,
        currency: 'INR',
        categoryLimits: {},
        manualEntries: [newEntry],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Invalidate cache
    invalidateCache(userId, month);
    
    return entryId;
  } catch (error) {
    console.error('Error adding manual entry:', error);
    return null;
  }
}

/**
 * Delete a manual entry from a budget
 * @param {string|number} userId - Splitwise user ID
 * @param {string} month - Month in YYYY-MM format
 * @param {string} entryId - Entry ID to delete
 * @returns {boolean} Success status
 */
export async function deleteManualEntry(userId, month, entryId) {
  if (!isFirebaseConfigured() || !db || !userId || !month || !entryId) return false;

  const budgetId = getBudgetDocId(userId, month);
  const budgetRef = doc(db, 'users', String(userId), 'budgets', budgetId);

  try {
    const budgetDoc = await getDoc(budgetRef);
    
    if (!budgetDoc.exists()) return false;

    const budget = budgetDoc.data();
    const entryToRemove = budget.manualEntries?.find(e => e.id === entryId);
    
    if (!entryToRemove) return false;

    await updateDoc(budgetRef, {
      manualEntries: arrayRemove(entryToRemove),
      updatedAt: serverTimestamp(),
    });

    // Invalidate cache
    invalidateCache(userId, month);
    
    return true;
  } catch (error) {
    console.error('Error deleting manual entry:', error);
    return false;
  }
}

/**
 * Get budget history for the last N months
 * @param {string|number} userId - Splitwise user ID
 * @param {number} months - Number of months to fetch (default: 6)
 * @returns {Array} Array of budget objects
 */
export async function getBudgetHistory(userId, months = 6) {
  if (!isFirebaseConfigured() || !db || !userId) return [];

  try {
    const budgets = [];
    const now = new Date();

    // Fetch budgets for each month
    for (let i = 0; i < months; i++) {
      const monthDate = subMonths(now, i);
      const month = format(monthDate, 'yyyy-MM');
      const budget = await getBudget(userId, month);
      
      if (budget) {
        budgets.push(budget);
      }
    }

    return budgets;
  } catch (error) {
    console.debug('Could not get budget history:', error.message);
    return [];
  }
}

/**
 * Delete a budget for a specific month
 * @param {string|number} userId - Splitwise user ID
 * @param {string} month - Month in YYYY-MM format
 * @returns {boolean} Success status
 */
export async function deleteBudget(userId, month) {
  if (!isFirebaseConfigured() || !db || !userId || !month) return false;

  const budgetId = getBudgetDocId(userId, month);
  const budgetRef = doc(db, 'users', String(userId), 'budgets', budgetId);

  try {
    await deleteDoc(budgetRef);
    
    // Invalidate cache
    invalidateCache(userId, month);
    
    return true;
  } catch (error) {
    console.error('Error deleting budget:', error);
    return false;
  }
}

/**
 * Copy budget from previous month to current month
 * @param {string|number} userId - Splitwise user ID
 * @param {string} targetMonth - Target month in YYYY-MM format
 * @returns {string|null} New budget ID or null on failure
 */
export async function copyBudgetFromPreviousMonth(userId, targetMonth) {
  if (!isFirebaseConfigured() || !db || !userId || !targetMonth) return null;

  try {
    // Parse target month and get previous month
    const [year, monthNum] = targetMonth.split('-').map(Number);
    const targetDate = new Date(year, monthNum - 1);
    const prevDate = subMonths(targetDate, 1);
    const prevMonth = format(prevDate, 'yyyy-MM');

    // Get previous month's budget
    const prevBudget = await getBudget(userId, prevMonth);
    
    if (!prevBudget) return null;

    // Create new budget with previous month's limits (but no manual entries)
    return await createOrUpdateBudget(userId, targetMonth, {
      overallLimit: prevBudget.overallLimit,
      currency: prevBudget.currency,
      categoryLimits: prevBudget.categoryLimits,
    });
  } catch (error) {
    console.error('Error copying budget:', error);
    return null;
  }
}
