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

function getContributionsCollection(userId, goalId) {
  return collection(db, COLLECTION_NAME, normalizeUserId(userId), 'goals', goalId, 'contributions');
}

function getContributionDoc(userId, goalId, contributionId) {
  return doc(db, COLLECTION_NAME, normalizeUserId(userId), 'goals', goalId, 'contributions', contributionId);
}

export const GOAL_ICONS = [
  'plane', 'car', 'home', 'gift', 'graduation-cap', 'heart', 
  'smartphone', 'laptop', 'piggy-bank', 'umbrella', 'briefcase', 'star'
];

export const GOAL_COLORS = [
  'teal', 'cyan', 'emerald', 'blue', 'purple', 'pink', 
  'amber', 'orange', 'red', 'indigo', 'rose', 'lime'
];

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
 * Create a new goal (enhanced with auto-allocation support)
 */
export async function createGoal(userId, goalData) {
  if (!isFirebaseConfigured() || !userId || !goalData.name) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    const goalId = `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const docRef = getGoalDoc(userId, goalId);
    
    const sanitizedData = sanitizeForFirestore({
      id: goalId,
      name: goalData.name,
      targetAmount: goalData.targetAmount || 0,
      currentAmount: goalData.currentAmount || 0,
      deadline: goalData.deadline || null,
      category: goalData.category || null,
      trackingType: goalData.trackingType || 'savings',
      suggestedCutbacks: goalData.suggestedCutbacks || [],
      // NEW fields for enhanced savings
      autoAllocatePercent: goalData.autoAllocatePercent || 0, // 0 = manual only
      linkedIncomeCategories: goalData.linkedIncomeCategories || ['salary', 'freelance', 'bonus'],
      priority: goalData.priority || 1, // Lower = higher priority
      color: goalData.color || 'teal',
      icon: goalData.icon || 'piggy-bank',
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    await setDoc(docRef, sanitizedData);
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

// ─── Goal Contributions (Enhanced Savings Tracking) ───────────────────────────

/**
 * Add a contribution to a goal (with full history tracking)
 * Types: manual, auto, withdrawal
 */
export async function addContribution(userId, goalId, contributionData) {
  if (!isFirebaseConfigured() || !userId || !goalId) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    const contribId = `contrib_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const contribRef = getContributionDoc(userId, goalId, contribId);
    
    const amount = contributionData.amount || 0;
    const isWithdrawal = contributionData.type === 'withdrawal' || amount < 0;
    
    const sanitizedData = sanitizeForFirestore({
      id: contribId,
      date: contributionData.date || new Date().toISOString().split('T')[0],
      amount: Math.abs(amount) * (isWithdrawal ? -1 : 1),
      type: contributionData.type || 'manual', // manual, auto, withdrawal
      sourceIncomeId: contributionData.sourceIncomeId || null, // Link to income if auto-allocated
      notes: contributionData.notes || null,
      createdAt: serverTimestamp(),
    });
    
    await setDoc(contribRef, sanitizedData);
    
    // Update goal's currentAmount
    await addToGoal(userId, goalId, sanitizedData.amount);
    
    return { success: true, id: contribId, contribution: sanitizedData };
  } catch (error) {
    console.error('Error adding contribution:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all contributions for a goal
 */
export async function getContributions(userId, goalId) {
  if (!isFirebaseConfigured() || !userId || !goalId) {
    return [];
  }

  try {
    const q = query(
      getContributionsCollection(userId, goalId),
      orderBy('date', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching contributions:', error);
    return [];
  }
}

/**
 * Delete a contribution (and update goal amount)
 */
export async function deleteContribution(userId, goalId, contributionId) {
  if (!isFirebaseConfigured() || !userId || !goalId || !contributionId) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    // Get the contribution to know the amount to subtract
    const contribRef = getContributionDoc(userId, goalId, contributionId);
    const contribSnap = await getDoc(contribRef);
    
    if (!contribSnap.exists()) {
      return { success: false, error: 'Contribution not found' };
    }
    
    const contribution = contribSnap.data();
    
    // Delete the contribution
    await deleteDoc(contribRef);
    
    // Reverse the amount from the goal (subtract what was added)
    await addToGoal(userId, goalId, -(contribution.amount || 0));
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting contribution:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get goals that have auto-allocation enabled
 */
export async function getAllocatableGoals(userId) {
  if (!isFirebaseConfigured() || !userId) {
    return [];
  }

  try {
    const goals = await getGoals(userId);
    return goals
      .filter(g => g.isActive && (g.autoAllocatePercent || 0) > 0)
      .sort((a, b) => (a.priority || 99) - (b.priority || 99)); // Sort by priority
  } catch (error) {
    console.error('Error fetching allocatable goals:', error);
    return [];
  }
}

/**
 * Calculate suggested allocations based on income amount and goal rules
 * Returns array of { goalId, goalName, amount, percent }
 */
export function calculateAllocations(incomeAmount, incomeCategory, goals) {
  const allocations = [];
  let remainingPercent = 100;
  
  // Filter goals that match the income category
  const eligibleGoals = goals.filter(g => {
    const linkedCategories = g.linkedIncomeCategories || ['salary', 'freelance', 'bonus'];
    return linkedCategories.includes(incomeCategory);
  });
  
  // Sort by priority (lower number = higher priority)
  const sortedGoals = [...eligibleGoals].sort((a, b) => (a.priority || 99) - (b.priority || 99));
  
  for (const goal of sortedGoals) {
    const percent = Math.min(goal.autoAllocatePercent || 0, remainingPercent);
    if (percent <= 0) continue;
    
    const amount = Math.round((incomeAmount * percent) / 100);
    
    // Check if goal would be overfunded
    const remaining = (goal.targetAmount || 0) - (goal.currentAmount || 0);
    const cappedAmount = remaining > 0 ? Math.min(amount, remaining) : amount;
    
    if (cappedAmount > 0) {
      allocations.push({
        goalId: goal.id,
        goalName: goal.name,
        amount: cappedAmount,
        percent,
        goalColor: goal.color || 'teal',
        goalIcon: goal.icon || 'piggy-bank',
      });
      
      remainingPercent -= percent;
    }
  }
  
  return allocations;
}

/**
 * Execute allocations - create contributions for each goal
 */
export async function executeAllocations(userId, allocations, sourceIncomeId = null) {
  if (!isFirebaseConfigured() || !userId || !allocations.length) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    const results = [];
    
    for (const allocation of allocations) {
      const result = await addContribution(userId, allocation.goalId, {
        amount: allocation.amount,
        type: 'auto',
        sourceIncomeId,
        notes: `Auto-allocated ${allocation.percent}% from income`,
      });
      
      results.push({
        goalId: allocation.goalId,
        success: result.success,
        contributionId: result.id,
      });
    }
    
    return { success: true, results };
  } catch (error) {
    console.error('Error executing allocations:', error);
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
// INCOME TRACKING MODULE
// ═══════════════════════════════════════════════════════════════════════════════
//
// Simple income tracking: date, amount, source, category
// Categories: salary, freelance, bonus, gift, interest, dividend, refund, other

// ─── Income Collection Helpers ────────────────────────────────────────────────

function getIncomeCollection(userId) {
  return collection(db, COLLECTION_NAME, normalizeUserId(userId), 'income');
}

function getIncomeDoc(userId, incomeId) {
  return doc(db, COLLECTION_NAME, normalizeUserId(userId), 'income', incomeId);
}

export const INCOME_CATEGORIES = [
  { id: 'salary', label: 'Salary', icon: 'briefcase', color: 'emerald' },
  { id: 'freelance', label: 'Freelance', icon: 'laptop', color: 'cyan' },
  { id: 'bonus', label: 'Bonus', icon: 'gift', color: 'amber' },
  { id: 'gift', label: 'Gift', icon: 'heart', color: 'pink' },
  { id: 'interest', label: 'Interest', icon: 'percent', color: 'blue' },
  { id: 'dividend', label: 'Dividend', icon: 'trending-up', color: 'purple' },
  { id: 'refund', label: 'Refund', icon: 'rotate-ccw', color: 'teal' },
  { id: 'rental', label: 'Rental', icon: 'home', color: 'orange' },
  { id: 'other', label: 'Other', icon: 'circle', color: 'stone' },
];

/**
 * Add a new income entry
 */
export async function addIncome(userId, incomeData) {
  if (!isFirebaseConfigured() || !userId || !incomeData.amount) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    const incomeId = `inc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const docRef = getIncomeDoc(userId, incomeId);
    
    const sanitizedData = sanitizeForFirestore({
      id: incomeId,
      date: incomeData.date || new Date().toISOString().split('T')[0],
      amount: incomeData.amount,
      source: incomeData.source || '',
      category: incomeData.category || 'other',
      isRecurring: incomeData.isRecurring || false,
      notes: incomeData.notes || null,
      tags: incomeData.tags || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    await setDoc(docRef, sanitizedData);
    cache.invalidate(userPrefix(userId, 'inc'));
    
    return { success: true, id: incomeId, income: { ...sanitizedData, id: incomeId } };
  } catch (error) {
    console.error('Error adding income:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all income entries (with optional filtering)
 */
export async function getIncome(userId, options = {}) {
  if (!isFirebaseConfigured() || !userId) {
    return [];
  }

  const { startDate, endDate, category, useCache = true, limitCount = 500 } = options;
  const cacheKey = userPrefix(userId, 'inc') + `_${startDate || 'all'}_${endDate || 'all'}_${category || 'all'}`;
  
  if (useCache) {
    const cached = cache.get(cacheKey);
    if (cached) return cached;
  }

  try {
    const q = query(
      getIncomeCollection(userId),
      orderBy('date', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    let incomeList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Apply filters in memory
    if (startDate) {
      incomeList = incomeList.filter(i => i.date >= startDate);
    }
    if (endDate) {
      incomeList = incomeList.filter(i => i.date <= endDate);
    }
    if (category && category !== 'all') {
      incomeList = incomeList.filter(i => i.category === category);
    }
    
    cache.set(cacheKey, incomeList);
    return incomeList;
  } catch (error) {
    console.error('Error fetching income:', error);
    return [];
  }
}

/**
 * Update an income entry
 */
export async function updateIncome(userId, incomeId, data) {
  if (!isFirebaseConfigured() || !userId || !incomeId) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    const docRef = getIncomeDoc(userId, incomeId);
    const sanitizedData = sanitizeForFirestore({
      ...data,
      updatedAt: serverTimestamp(),
    });
    await setDoc(docRef, sanitizedData, { merge: true });
    
    cache.invalidate(userPrefix(userId, 'inc'));
    
    return { success: true };
  } catch (error) {
    console.error('Error updating income:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete an income entry
 */
export async function deleteIncome(userId, incomeId) {
  if (!isFirebaseConfigured() || !userId || !incomeId) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    await deleteDoc(getIncomeDoc(userId, incomeId));
    cache.invalidate(userPrefix(userId, 'inc'));
    return { success: true };
  } catch (error) {
    console.error('Error deleting income:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get income statistics (monthly/yearly totals)
 */
export async function getIncomeStats(userId, options = {}) {
  if (!isFirebaseConfigured() || !userId) {
    return { monthly: {}, yearly: {}, total: 0, byCategory: {} };
  }

  try {
    const incomeList = await getIncome(userId, { useCache: true });
    
    const stats = {
      monthly: {},   // { '2024-02': 150000, '2024-01': 145000 }
      yearly: {},    // { '2024': 1800000, '2023': 1700000 }
      total: 0,
      byCategory: {},// { salary: 1500000, freelance: 300000 }
      count: incomeList.length,
    };
    
    for (const income of incomeList) {
      const amount = income.amount || 0;
      const month = income.date?.substring(0, 7); // '2024-02'
      const year = income.date?.substring(0, 4);  // '2024'
      const category = income.category || 'other';
      
      stats.total += amount;
      stats.monthly[month] = (stats.monthly[month] || 0) + amount;
      stats.yearly[year] = (stats.yearly[year] || 0) + amount;
      stats.byCategory[category] = (stats.byCategory[category] || 0) + amount;
    }
    
    return stats;
  } catch (error) {
    console.error('Error calculating income stats:', error);
    return { monthly: {}, yearly: {}, total: 0, byCategory: {}, count: 0 };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVESTMENTS PORTFOLIO MODULE
// ═══════════════════════════════════════════════════════════════════════════════
//
// Full portfolio tracking: holdings with units, prices, gains/losses
// Transaction history per holding (buy/sell/dividend)
// Types: stock, mutual_fund, fd, ppf, nps, crypto, gold, real_estate, other

// ─── Investment Collection Helpers ────────────────────────────────────────────

function getInvestmentsCollection(userId) {
  return collection(db, COLLECTION_NAME, normalizeUserId(userId), 'investments');
}

function getInvestmentDoc(userId, investmentId) {
  return doc(db, COLLECTION_NAME, normalizeUserId(userId), 'investments', investmentId);
}

function getInvestmentTransactionsCollection(userId, investmentId) {
  return collection(db, COLLECTION_NAME, normalizeUserId(userId), 'investments', investmentId, 'transactions');
}

function getInvestmentTransactionDoc(userId, investmentId, txId) {
  return doc(db, COLLECTION_NAME, normalizeUserId(userId), 'investments', investmentId, 'transactions', txId);
}

export const INVESTMENT_TYPES = [
  { id: 'stock', label: 'Stocks', icon: 'trending-up', color: 'emerald' },
  { id: 'mutual_fund', label: 'Mutual Funds', icon: 'pie-chart', color: 'blue' },
  { id: 'fd', label: 'Fixed Deposit', icon: 'lock', color: 'amber' },
  { id: 'ppf', label: 'PPF', icon: 'shield', color: 'cyan' },
  { id: 'nps', label: 'NPS', icon: 'building', color: 'purple' },
  { id: 'crypto', label: 'Crypto', icon: 'bitcoin', color: 'orange' },
  { id: 'gold', label: 'Gold', icon: 'gem', color: 'yellow' },
  { id: 'real_estate', label: 'Real Estate', icon: 'home', color: 'stone' },
  { id: 'epf', label: 'EPF', icon: 'briefcase', color: 'teal' },
  { id: 'bonds', label: 'Bonds', icon: 'file-text', color: 'indigo' },
  { id: 'other', label: 'Other', icon: 'circle', color: 'gray' },
];

/**
 * Add a new investment holding
 */
export async function addInvestment(userId, investmentData) {
  if (!isFirebaseConfigured() || !userId || !investmentData.name) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    const investmentId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const docRef = getInvestmentDoc(userId, investmentId);
    
    const units = investmentData.units || 0;
    const avgBuyPrice = investmentData.avgBuyPrice || 0;
    const currentPrice = investmentData.currentPrice || avgBuyPrice;
    const totalInvested = units * avgBuyPrice;
    const currentValue = units * currentPrice;
    const unrealizedGain = currentValue - totalInvested;
    const gainPercent = totalInvested > 0 ? (unrealizedGain / totalInvested) * 100 : 0;
    
    const sanitizedData = sanitizeForFirestore({
      id: investmentId,
      name: investmentData.name,
      type: investmentData.type || 'other',
      symbol: investmentData.symbol || null,
      units,
      avgBuyPrice,
      currentPrice,
      currentValue,
      totalInvested,
      unrealizedGain,
      gainPercent: Math.round(gainPercent * 100) / 100,
      lastUpdated: new Date().toISOString().split('T')[0],
      notes: investmentData.notes || null,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    await setDoc(docRef, sanitizedData);
    cache.invalidate(userPrefix(userId, 'inv'));
    
    return { success: true, id: investmentId, investment: sanitizedData };
  } catch (error) {
    console.error('Error adding investment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all investments
 */
export async function getInvestments(userId, options = {}) {
  if (!isFirebaseConfigured() || !userId) {
    return [];
  }

  const { includeInactive = false, useCache = true } = options;
  const cacheKey = userPrefix(userId, 'inv') + `_${includeInactive ? 'all' : 'active'}`;
  
  if (useCache) {
    const cached = cache.get(cacheKey);
    if (cached) return cached;
  }

  try {
    const q = query(
      getInvestmentsCollection(userId),
      orderBy('name', 'asc')
    );
    
    const snapshot = await getDocs(q);
    let investments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    if (!includeInactive) {
      investments = investments.filter(i => i.isActive !== false);
    }
    
    cache.set(cacheKey, investments);
    return investments;
  } catch (error) {
    console.error('Error fetching investments:', error);
    return [];
  }
}

/**
 * Update an investment (including price updates)
 */
export async function updateInvestment(userId, investmentId, data) {
  if (!isFirebaseConfigured() || !userId || !investmentId) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    const docRef = getInvestmentDoc(userId, investmentId);
    
    // If updating price or units, recalculate values
    let updateData = { ...data };
    if (data.currentPrice !== undefined || data.units !== undefined || data.avgBuyPrice !== undefined) {
      const docSnap = await getDoc(docRef);
      const existing = docSnap.exists() ? docSnap.data() : {};
      
      const units = data.units ?? existing.units ?? 0;
      const avgBuyPrice = data.avgBuyPrice ?? existing.avgBuyPrice ?? 0;
      const currentPrice = data.currentPrice ?? existing.currentPrice ?? avgBuyPrice;
      const totalInvested = units * avgBuyPrice;
      const currentValue = units * currentPrice;
      const unrealizedGain = currentValue - totalInvested;
      const gainPercent = totalInvested > 0 ? (unrealizedGain / totalInvested) * 100 : 0;
      
      updateData = {
        ...updateData,
        units,
        avgBuyPrice,
        currentPrice,
        currentValue,
        totalInvested,
        unrealizedGain,
        gainPercent: Math.round(gainPercent * 100) / 100,
        lastUpdated: new Date().toISOString().split('T')[0],
      };
    }
    
    const sanitizedData = sanitizeForFirestore({
      ...updateData,
      updatedAt: serverTimestamp(),
    });
    await setDoc(docRef, sanitizedData, { merge: true });
    
    cache.invalidate(userPrefix(userId, 'inv'));
    
    return { success: true };
  } catch (error) {
    console.error('Error updating investment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete an investment (or mark as inactive)
 */
export async function deleteInvestment(userId, investmentId, hardDelete = false) {
  if (!isFirebaseConfigured() || !userId || !investmentId) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    if (hardDelete) {
      await deleteDoc(getInvestmentDoc(userId, investmentId));
    } else {
      // Soft delete - mark as inactive
      await setDoc(getInvestmentDoc(userId, investmentId), {
        isActive: false,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
    
    cache.invalidate(userPrefix(userId, 'inv'));
    return { success: true };
  } catch (error) {
    console.error('Error deleting investment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add a transaction to an investment (buy/sell/dividend)
 */
export async function addInvestmentTransaction(userId, investmentId, txData) {
  if (!isFirebaseConfigured() || !userId || !investmentId || !txData.type) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const txRef = getInvestmentTransactionDoc(userId, investmentId, txId);
    
    const sanitizedTx = sanitizeForFirestore({
      id: txId,
      type: txData.type, // buy, sell, dividend, split
      date: txData.date || new Date().toISOString().split('T')[0],
      units: txData.units || 0,
      pricePerUnit: txData.pricePerUnit || 0,
      totalAmount: txData.totalAmount || (txData.units * txData.pricePerUnit) || 0,
      fees: txData.fees || 0,
      notes: txData.notes || null,
      createdAt: serverTimestamp(),
    });
    
    await setDoc(txRef, sanitizedTx);
    
    // Update the investment's units and avg price after buy/sell
    const investmentDoc = await getDoc(getInvestmentDoc(userId, investmentId));
    if (investmentDoc.exists()) {
      const investment = investmentDoc.data();
      let newUnits = investment.units || 0;
      let totalCost = (investment.units || 0) * (investment.avgBuyPrice || 0);
      
      if (txData.type === 'buy') {
        newUnits += txData.units || 0;
        totalCost += (txData.units || 0) * (txData.pricePerUnit || 0);
      } else if (txData.type === 'sell') {
        newUnits -= txData.units || 0;
        // Keep avg buy price the same on sell
      }
      
      const newAvgPrice = newUnits > 0 ? totalCost / newUnits : 0;
      
      await updateInvestment(userId, investmentId, {
        units: Math.max(0, newUnits),
        avgBuyPrice: newAvgPrice,
      });
    }
    
    return { success: true, id: txId };
  } catch (error) {
    console.error('Error adding investment transaction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get transactions for an investment
 */
export async function getInvestmentTransactions(userId, investmentId) {
  if (!isFirebaseConfigured() || !userId || !investmentId) {
    return [];
  }

  try {
    const q = query(
      getInvestmentTransactionsCollection(userId, investmentId),
      orderBy('date', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching investment transactions:', error);
    return [];
  }
}

/**
 * Get portfolio summary (aggregate metrics)
 */
export async function getPortfolioSummary(userId) {
  if (!isFirebaseConfigured() || !userId) {
    return {
      totalInvested: 0,
      currentValue: 0,
      totalGain: 0,
      gainPercent: 0,
      byType: {},
      holdingsCount: 0,
    };
  }

  try {
    const investments = await getInvestments(userId, { useCache: true });
    
    const summary = {
      totalInvested: 0,
      currentValue: 0,
      totalGain: 0,
      gainPercent: 0,
      byType: {},
      holdingsCount: investments.length,
    };
    
    for (const inv of investments) {
      summary.totalInvested += inv.totalInvested || 0;
      summary.currentValue += inv.currentValue || 0;
      
      const type = inv.type || 'other';
      if (!summary.byType[type]) {
        summary.byType[type] = { invested: 0, current: 0, count: 0 };
      }
      summary.byType[type].invested += inv.totalInvested || 0;
      summary.byType[type].current += inv.currentValue || 0;
      summary.byType[type].count += 1;
    }
    
    summary.totalGain = summary.currentValue - summary.totalInvested;
    summary.gainPercent = summary.totalInvested > 0 
      ? Math.round((summary.totalGain / summary.totalInvested) * 10000) / 100 
      : 0;
    
    return summary;
  } catch (error) {
    console.error('Error calculating portfolio summary:', error);
    return {
      totalInvested: 0,
      currentValue: 0,
      totalGain: 0,
      gainPercent: 0,
      byType: {},
      holdingsCount: 0,
    };
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
    return { expenses: [], budget: null, tags: PREDEFINED_TAGS, bills: [], income: [] };
  }

  const [expenses, budget, tags, bills, income] = await Promise.all([
    getExpenses(userId, { useCache: false }),
    getBudgetSettings(userId),
    getTags(userId),
    getBills(userId),
    getIncome(userId, { useCache: false }),
  ]);

  return { expenses, budget, tags, bills, income };
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
