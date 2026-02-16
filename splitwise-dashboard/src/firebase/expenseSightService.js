/**
 * ExpenseSight Firebase Service
 * CRUD operations for personal expense tracking
 * 
 * Performance optimizations applied:
 * 1. SmartCache with TTL (5 min) + size limit + surgical invalidation
 * 2. Firestore where() date filtering with graceful fallback
 * 3. loadInitialData() for parallel bootstrap
 * 4. Atomic increment() for goal/tag counters
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
  where,
  writeBatch,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';

const COLLECTION_NAME = 'expenseSight';

// ═══════════════════════════════════════════════════════════════════════════════
// IMPROVEMENT 1: Smart Cache with TTL, size limits, and surgical invalidation
// ═══════════════════════════════════════════════════════════════════════════════
//
// Old behavior: plain Map(), no expiry, clearCache() nuked everything.
// New behavior: 
//   - Each entry expires after CACHE_TTL (5 min)
//   - LRU eviction when MAX_CACHE_ENTRIES reached
//   - Keys are domain-prefixed: exp_, tags_, budget_, bills_, goals_, notif_
//   - invalidate(prefix) only clears entries matching that prefix
//   - update/delete mutate cached arrays in-place (no re-fetch needed)

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ENTRIES = 50;

class SmartCache {
  constructor() {
    this._store = new Map();
  }

  get(key) {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL) {
      this._store.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key, data) {
    // LRU eviction: remove oldest entry if at capacity
    if (this._store.size >= MAX_CACHE_ENTRIES && !this._store.has(key)) {
      let oldestKey = null;
      let oldestTs = Infinity;
      for (const [k, v] of this._store) {
        if (v.ts < oldestTs) { oldestTs = v.ts; oldestKey = k; }
      }
      if (oldestKey) this._store.delete(oldestKey);
    }
    this._store.set(key, { data, ts: Date.now() });
  }

  /** Remove all entries whose key starts with `prefix` */
  invalidate(prefix) {
    for (const key of [...this._store.keys()]) {
      if (key.startsWith(prefix)) this._store.delete(key);
    }
  }

  /** Mutate the data array inside every matching cache entry */
  patchArrayEntries(prefix, patchFn) {
    for (const [key, entry] of this._store) {
      if (key.startsWith(prefix) && Array.isArray(entry.data)) {
        entry.data = patchFn(entry.data);
      }
    }
  }

  clear() {
    this._store.clear();
  }
}

const cache = new SmartCache();

// ─── Helper Functions ────────────────────────────────────────────────────────

function normalizeUserId(userId) {
  return String(userId);
}

function userPrefix(userId, domain) {
  return `${domain}_${normalizeUserId(userId)}`;
}

function getUserCollection(userId) {
  return collection(db, COLLECTION_NAME, normalizeUserId(userId), 'expenses');
}

function getExpenseDoc(userId, expenseId) {
  return doc(db, COLLECTION_NAME, normalizeUserId(userId), 'expenses', expenseId);
}

// ─── CRUD Operations ─────────────────────────────────────────────────────────

/**
 * Sanitize an object by removing undefined values (Firestore doesn't accept undefined)
 */
function sanitizeForFirestore(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Add multiple expenses in a batch
 */
export async function addExpenses(userId, expenses) {
  if (!isFirebaseConfigured() || !userId || !expenses.length) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    // Firestore batch limit is 500 operations; chunk to stay safe
    const CHUNK_SIZE = 450;
    for (let i = 0; i < expenses.length; i += CHUNK_SIZE) {
      const chunk = expenses.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      const now = serverTimestamp();
      
      for (const expense of chunk) {
        const docRef = doc(getUserCollection(userId), expense.id);
        // Sanitize expense data to remove any undefined values
        const sanitizedExpense = sanitizeForFirestore({
          ...expense,
          userId,
          tags: expense.tags || [], // Ensure tags is always an array
          createdAt: now,
          updatedAt: now,
        });
        batch.set(docRef, sanitizedExpense);
      }
      
      await batch.commit();
    }
    
    // Surgical invalidation: only expense cache for this user
    cache.invalidate(userPrefix(userId, 'exp'));
    
    return { success: true, count: expenses.length };
  } catch (error) {
    console.error('Error adding expenses:', error);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMPROVEMENT 2: Firestore where() for date range queries
// ═══════════════════════════════════════════════════════════════════════════════
//
// Old behavior: always fetched 500 docs with orderBy+limit, then filtered
//   date ranges in JS memory — wasteful when you only need last 7 days.
// New behavior:
//   - Adds where('date', '>=', startDate) / where('date', '<=', endDate)
//   - Firestore returns only matching docs → less bandwidth, less parsing
//   - Graceful fallback if composite index doesn't exist yet
//     (catches 'failed-precondition' and retries without where())

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

  const uid = normalizeUserId(userId);
  const cacheKey = `${userPrefix(userId, 'exp')}_${startDate || ''}_${endDate || ''}_${category || ''}_${limitCount}`;
  
  if (useCache) {
    const cached = cache.get(cacheKey);
    if (cached) return cached;
  }

  try {
    const constraints = [orderBy('date', 'desc')];
    
    // Apply Firestore-level date filters
    if (startDate) constraints.push(where('date', '>=', startDate));
    if (endDate) constraints.push(where('date', '<=', endDate));
    constraints.push(limit(limitCount));

    const q = query(getUserCollection(userId), ...constraints);
    const snapshot = await getDocs(q);
    let expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Category: still in-memory (composite index would be needed otherwise)
    if (category && category !== 'all') {
      expenses = expenses.filter(e => e.category === category);
    }

    cache.set(cacheKey, expenses);
    return expenses;
  } catch (error) {
    // Graceful fallback when Firestore composite index is missing
    if (error.code === 'failed-precondition') {
      console.warn('Firestore index missing for date range query, falling back to in-memory filter.');
      try {
        const q = query(
          getUserCollection(userId),
          orderBy('date', 'desc'),
          limit(limitCount)
        );
        const snapshot = await getDocs(q);
        let expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (startDate) expenses = expenses.filter(e => e.date >= startDate);
        if (endDate) expenses = expenses.filter(e => e.date <= endDate);
        if (category && category !== 'all') {
          expenses = expenses.filter(e => e.category === category);
        }

        cache.set(cacheKey, expenses);
        return expenses;
      } catch (fallbackErr) {
        console.error('Error fetching expenses (fallback):', fallbackErr);
        return [];
      }
    }
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

  // Check cached expense lists first — avoids a Firestore read
  const prefix = userPrefix(userId, 'exp');
  for (const [key] of cache._store) {
    if (key.startsWith(prefix)) {
      const list = cache.get(key);
      if (Array.isArray(list)) {
        const found = list.find(e => e.id === expenseId);
        if (found) return found;
      }
    }
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
    // Sanitize data to remove undefined values
    const sanitizedData = sanitizeForFirestore({
      ...data,
      updatedAt: serverTimestamp(),
    });
    await setDoc(docRef, sanitizedData, { merge: true });
    
    // Patch cached arrays in-place — no re-fetch needed
    cache.patchArrayEntries(userPrefix(userId, 'exp'), list =>
      list.map(e => e.id === expenseId ? { ...e, ...data } : e)
    );
    
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
    
    // Remove from cached arrays in-place — no re-fetch needed
    cache.patchArrayEntries(userPrefix(userId, 'exp'), list =>
      list.filter(e => e.id !== expenseId)
    );
    
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
    cache.invalidate(userPrefix(userId, 'exp'));
    
    return { success: true, count: expenseIds.length };
  } catch (error) {
    console.error('Error deleting expenses:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete ALL expenses for a user (dangerous operation - use with caution!)
 * This will permanently delete all expense records.
 */
export async function deleteAllExpenses(userId) {
  if (!isFirebaseConfigured() || !userId) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    const collectionRef = getUserCollection(userId);
    const snapshot = await getDocs(collectionRef);
    
    if (snapshot.empty) {
      return { success: true, count: 0 };
    }
    
    // Firestore batch limit is 500 operations; chunk to stay safe
    const CHUNK_SIZE = 450;
    const docs = snapshot.docs;
    let totalDeleted = 0;
    
    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
      const chunk = docs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      
      for (const docSnap of chunk) {
        batch.delete(docSnap.ref);
      }
      
      await batch.commit();
      totalDeleted += chunk.length;
    }
    
    // Clear all expense-related cache for this user
    cache.invalidate(userPrefix(userId, 'exp'));
    
    return { success: true, count: totalDeleted };
  } catch (error) {
    console.error('Error deleting all expenses:', error);
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
      
      const cat = expense.category || 'Other';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + expense.amount;
      
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
    
    const month = expense.date.substring(0, 7);
    monthlyData[month] = (monthlyData[month] || 0) + expense.amount;
  }
  
  const sortedMonths = Object.keys(monthlyData).sort().slice(-months);
  
  return sortedMonths.map(month => ({
    month,
    amount: monthlyData[month],
  }));
}

// ─── Duplicate Detection Support ─────────────────────────────────────────────

/**
 * Get recent expenses for duplicate checking
 * Uses date-range query so Firestore only returns recent docs
 */
export async function getRecentExpensesForDuplicateCheck(userId, days = 7) {
  if (!isFirebaseConfigured() || !userId) {
    return [];
  }

  const now = new Date();
  const startDate = new Date();
  startDate.setDate(now.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = now.toISOString().split('T')[0];
  
  return getExpenses(userId, {
    startDate: startDateStr,
    endDate: endDateStr, // Include upper bound to exclude future-dated expenses
    limitCount: 200,
    useCache: false, // Always fetch fresh for duplicate checking
  });
}

/**
 * Get frequent expense descriptions for templates
 * Reuses the main expense cache — no extra Firestore call if data is warm
 */
export async function getFrequentExpenses(userId, topN = 5) {
  if (!isFirebaseConfigured() || !userId) {
    return [];
  }

  const expenses = await getExpenses(userId, { limitCount: 500, useCache: true });
  
  const descriptionStats = {};
  
  for (const expense of expenses) {
    if (expense.isRefund || expense.cancelled || expense.isPending) continue;
    
    const desc = expense.description.toLowerCase().trim();
    if (!descriptionStats[desc]) {
      descriptionStats[desc] = {
        description: expense.description,
        category: expense.category,
        count: 0,
        totalAmount: 0,
      };
    }
    descriptionStats[desc].count++;
    descriptionStats[desc].totalAmount += expense.amount;
  }
  
  const sorted = Object.values(descriptionStats)
    .map(stat => ({
      description: stat.description,
      category: stat.category,
      count: stat.count,
      avgAmount: Math.round(stat.totalAmount / stat.count),
    }))
    .filter(stat => stat.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
  
  return sorted;
}

// ─── Cache Management ────────────────────────────────────────────────────────

export function clearCache(userId) {
  if (userId) {
    // Cache keys are domain-prefixed: "exp_userId_...", "budget_userId", etc.
    // We need to invalidate all domains for this user
    const uid = normalizeUserId(userId);
    cache.invalidate(`exp_${uid}`);
    cache.invalidate(`budget_${uid}`);
    cache.invalidate(`tags_${uid}`);
    cache.invalidate(`goals_${uid}`);
    cache.invalidate(`bills_${uid}`);
    cache.invalidate(`notif_${uid}`);
  } else {
    cache.clear();
  }
}

// ─── Budget Management ───────────────────────────────────────────────────────

function getBudgetDoc(userId) {
  return doc(db, COLLECTION_NAME, normalizeUserId(userId), 'settings', 'budget');
}

/**
 * Get user's budget settings from Firebase (cached)
 */
export async function getBudgetSettings(userId) {
  if (!isFirebaseConfigured() || !userId) {
    return null;
  }

  const cacheKey = userPrefix(userId, 'budget');
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const docSnap = await getDoc(getBudgetDoc(userId));
    if (docSnap.exists()) {
      const data = docSnap.data();
      cache.set(cacheKey, data);
      return data;
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
    const sanitizedData = sanitizeForFirestore({
      ...budgetData,
      userId: normalizeUserId(userId),
      updatedAt: serverTimestamp(),
    });
    await setDoc(docRef, sanitizedData, { merge: true });
    
    cache.invalidate(userPrefix(userId, 'budget'));
    
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
    const sanitizedData = sanitizeForFirestore({
      ...updates,
      updatedAt: serverTimestamp(),
    });
    await setDoc(docRef, sanitizedData, { merge: true });
    
    cache.invalidate(userPrefix(userId, 'budget'));
    
    return { success: true };
  } catch (error) {
    console.error('Error updating budget settings:', error);
    return { success: false, error: error.message };
  }
}

// ─── Tags Management ─────────────────────────────────────────────────────────

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
 * Get all tags for a user (predefined + custom) — cached
 */
export async function getTags(userId) {
  if (!isFirebaseConfigured() || !userId) {
    return PREDEFINED_TAGS;
  }

  const cacheKey = userPrefix(userId, 'tags');
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const snapshot = await getDocs(getTagsCollection(userId));
    const customTags = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    const customTagNames = new Set(customTags.map(t => t.name.toLowerCase()));
    const predefinedFiltered = PREDEFINED_TAGS.filter(
      t => !customTagNames.has(t.name.toLowerCase())
    );
    
    const merged = [...predefinedFiltered, ...customTags];
    cache.set(cacheKey, merged);
    return merged;
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
    
    cache.invalidate(userPrefix(userId, 'tags'));
    
    return { success: true, id: tagId };
  } catch (error) {
    console.error('Error creating tag:', error);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMPROVEMENT 4: Atomic increment() for counters
// ═══════════════════════════════════════════════════════════════════════════════
//
// Old behavior for incrementTagUsage:
//   1. getDocs(entire tags collection) — reads ALL tag docs
//   2. .find() the one matching tagName
//   3. setDoc({ usageCount: oldCount + 1 }) — full write
//   → 1 collection read + 1 doc write per call; race condition if concurrent
//
// New behavior:
//   1. getTags(userId) — reads from cache (0 Firestore reads if warm)
//   2. increment(1) — atomic single write, no preceding read needed
//   → 0 reads + 1 atomic write; no race condition

/**
 * Update tag usage count — atomic increment, uses cached tag list
 */
export async function incrementTagUsage(userId, tagName) {
  if (!isFirebaseConfigured() || !userId || !tagName) return;

  try {
    // Use the cached tag list to resolve tagName → docId
    const tags = await getTags(userId);
    const tagDoc = tags.find(
      t => t.name.toLowerCase() === tagName.toLowerCase()
    );
    
    if (tagDoc && tagDoc.id) {
      await setDoc(getTagDoc(userId, tagDoc.id), {
        usageCount: increment(1),
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
    cache.invalidate(userPrefix(userId, 'tags'));
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
 * Get all goals for a user (cached)
 */
export async function getGoals(userId) {
  if (!isFirebaseConfigured() || !userId) {
    return [];
  }

  const cacheKey = userPrefix(userId, 'goals');
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const q = query(getGoalsCollection(userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const goals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    cache.set(cacheKey, goals);
    return goals;
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
    
    cache.invalidate(userPrefix(userId, 'goals'));
    
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
    const sanitizedData = sanitizeForFirestore({
      ...updates,
      updatedAt: serverTimestamp(),
    });
    await setDoc(docRef, sanitizedData, { merge: true });
    
    cache.invalidate(userPrefix(userId, 'goals'));
    
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
    cache.invalidate(userPrefix(userId, 'goals'));
    return { success: true };
  } catch (error) {
    console.error('Error deleting goal:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add amount to a savings goal — uses atomic increment()
 *
 * We first verify the goal exists, then use increment() for atomic update.
 * This prevents accidentally creating partial goal documents.
 */
export async function addToGoal(userId, goalId, amount) {
  if (!isFirebaseConfigured() || !userId || !goalId) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    // First check if goal exists BEFORE updating
    const docRef = getGoalDoc(userId, goalId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return { success: false, error: 'Goal not found' };
    }
    
    // Atomic increment — safe since we verified document exists
    await setDoc(docRef, {
      currentAmount: increment(amount),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    // Read back the new value for the UI
    const updatedSnap = await getDoc(docRef);
    const newAmount = updatedSnap.data().currentAmount;
    cache.invalidate(userPrefix(userId, 'goals'));
    
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
 * Get all bills for a user (cached)
 */
export async function getBills(userId) {
  if (!isFirebaseConfigured() || !userId) {
    return [];
  }

  const cacheKey = userPrefix(userId, 'bills');
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const q = query(getBillsCollection(userId), orderBy('dueDay', 'asc'));
    const snapshot = await getDocs(q);
    const bills = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    cache.set(cacheKey, bills);
    return bills;
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
    
    cache.invalidate(userPrefix(userId, 'bills'));
    
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
    const sanitizedData = sanitizeForFirestore({
      ...updates,
      updatedAt: serverTimestamp(),
    });
    await setDoc(docRef, sanitizedData, { merge: true });
    
    cache.invalidate(userPrefix(userId, 'bills'));
    
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
    cache.invalidate(userPrefix(userId, 'bills'));
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
        await setDoc(getBillDoc(userId, billId), {
          lastPaidDate,
          isActive: false,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        cache.invalidate(userPrefix(userId, 'bills'));
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
    
    cache.invalidate(userPrefix(userId, 'bills'));
    
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
 * Get notification settings (cached)
 */
export async function getNotificationSettings(userId) {
  if (!isFirebaseConfigured() || !userId) {
    return null;
  }

  const cacheKey = userPrefix(userId, 'notif');
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const docSnap = await getDoc(getNotificationSettingsDoc(userId));
    if (docSnap.exists()) {
      const data = docSnap.data();
      cache.set(cacheKey, data);
      return data;
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
    const sanitizedData = sanitizeForFirestore({
      ...settings,
      updatedAt: serverTimestamp(),
    });
    await setDoc(docRef, sanitizedData, { merge: true });
    
    cache.invalidate(userPrefix(userId, 'notif'));
    
    return { success: true };
  } catch (error) {
    console.error('Error saving notification settings:', error);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMPROVEMENT 3: Parallel initial data load
// ═══════════════════════════════════════════════════════════════════════════════
//
// Old behavior: ExpenseSightApp calls getExpenses() on mount. Then each tab
//   (ESBudget, ESBills, ESGoals, ESActivity) individually calls its own
//   get*() on mount — creating a waterfall of sequential Firestore reads.
//
// New: loadInitialData() fires all 4 in Promise.all() so they run concurrently.
//   Each result gets cached, so when individual tabs mount they hit cache.

/**
 * Load all essential data in parallel on app startup.
 * Call this once in ExpenseSightApp instead of individual getExpenses().
 * Each result is automatically cached by the individual get* functions.
 */
export async function loadInitialData(userId) {
  if (!isFirebaseConfigured() || !userId) {
    return { expenses: [], budget: null, tags: PREDEFINED_TAGS, bills: [] };
  }

  const [expenses, budget, tags, bills] = await Promise.all([
    getExpenses(userId, { useCache: false }),
    getBudgetSettings(userId),
    getTags(userId),
    getBills(userId),
  ]);

  return { expenses, budget, tags, bills };
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
