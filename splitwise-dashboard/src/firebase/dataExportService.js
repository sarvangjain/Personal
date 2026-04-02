/**
 * Data Export/Import Service for ExpenseSight
 * Handles full data backup and restore functionality
 */

import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';

const COLLECTION_NAME = 'expenseSight';
const EXPORT_VERSION = '1.0';
const APP_NAME = 'ExpenseSight';

function normalizeUserId(userId) {
  return String(userId);
}

/**
 * Export all user data from ExpenseSight
 * @param {string} userId - User ID
 * @param {function} onProgress - Progress callback (stage, percent)
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function exportAllData(userId, onProgress = () => {}) {
  if (!isFirebaseConfigured() || !db || !userId) {
    return { success: false, error: 'Firebase not configured or invalid user' };
  }

  const uid = normalizeUserId(userId);
  const exportData = {
    meta: {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      app: APP_NAME,
      userId: uid,
    },
    data: {
      expenses: [],
      tags: [],
      goals: [],
      bills: [],
      income: [],
      investments: [],
      budgets: [],
    },
    stats: {
      totalExpenses: 0,
      totalTags: 0,
      totalGoals: 0,
      totalBills: 0,
      totalIncome: 0,
      totalInvestments: 0,
      totalBudgets: 0,
    },
  };

  try {
    const stages = [
      { name: 'expenses', path: 'expenses' },
      { name: 'tags', path: 'tags' },
      { name: 'goals', path: 'goals' },
      { name: 'bills', path: 'bills' },
      { name: 'income', path: 'income' },
      { name: 'investments', path: 'investments' },
    ];

    let completedStages = 0;
    const totalStages = stages.length + 2; // +2 for settings and budgets

    // Export each collection
    for (const stage of stages) {
      onProgress(stage.name, Math.round((completedStages / totalStages) * 100));
      
      const collRef = collection(db, COLLECTION_NAME, uid, stage.path);
      const snapshot = await getDocs(collRef);
      
      const items = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      // For goals, also export contributions
      if (stage.name === 'goals') {
        for (const goal of items) {
          const contribRef = collection(db, COLLECTION_NAME, uid, 'goals', goal.id, 'contributions');
          const contribSnapshot = await getDocs(contribRef);
          goal.contributions = contribSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        }
      }

      // For investments, also export transactions
      if (stage.name === 'investments') {
        for (const inv of items) {
          const txRef = collection(db, COLLECTION_NAME, uid, 'investments', inv.id, 'transactions');
          const txSnapshot = await getDocs(txRef);
          inv.transactions = txSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        }
      }

      exportData.data[stage.name] = items;
      exportData.stats[`total${stage.name.charAt(0).toUpperCase() + stage.name.slice(1)}`] = items.length;
      completedStages++;
    }

    // Export settings (budget settings from expenseSight)
    onProgress('settings', Math.round((completedStages / totalStages) * 100));
    const budgetSettingsRef = doc(db, COLLECTION_NAME, uid, 'settings', 'budget');
    const budgetSettingsSnap = await getDoc(budgetSettingsRef);
    if (budgetSettingsSnap.exists()) {
      exportData.data.budgetSettings = { id: 'budget', ...budgetSettingsSnap.data() };
    }
    completedStages++;

    // Export monthly budgets from users/{userId}/budgets
    onProgress('budgets', Math.round((completedStages / totalStages) * 100));
    try {
      const budgetsRef = collection(db, 'users', uid, 'budgets');
      const budgetsSnapshot = await getDocs(budgetsRef);
      exportData.data.budgets = budgetsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      exportData.stats.totalBudgets = exportData.data.budgets.length;
    } catch (err) {
      console.warn('Could not export budgets:', err.message);
      exportData.data.budgets = [];
    }
    completedStages++;

    onProgress('complete', 100);
    
    return { success: true, data: exportData };
  } catch (error) {
    console.error('Export error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Validate import data structure
 * @param {object} jsonData - Parsed JSON data
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validateImportData(jsonData) {
  const errors = [];
  const warnings = [];

  if (!jsonData || typeof jsonData !== 'object') {
    errors.push('Invalid JSON structure');
    return { valid: false, errors, warnings };
  }

  // Check meta
  if (!jsonData.meta) {
    errors.push('Missing meta information');
  } else {
    if (!jsonData.meta.version) {
      warnings.push('Missing version information');
    }
    if (jsonData.meta.app !== APP_NAME) {
      warnings.push(`Data was exported from "${jsonData.meta.app || 'unknown'}", not ${APP_NAME}`);
    }
  }

  // Check data
  if (!jsonData.data) {
    errors.push('Missing data section');
    return { valid: false, errors, warnings };
  }

  const expectedCollections = ['expenses', 'tags', 'goals', 'bills', 'income', 'investments', 'budgets'];
  
  for (const col of expectedCollections) {
    if (jsonData.data[col] && !Array.isArray(jsonData.data[col])) {
      errors.push(`${col} should be an array`);
    }
  }

  // Validate expense structure (spot check)
  if (jsonData.data.expenses?.length > 0) {
    const sample = jsonData.data.expenses[0];
    if (!sample.id) {
      warnings.push('Some expenses may be missing IDs');
    }
    if (sample.amount === undefined) {
      warnings.push('Some expenses may be missing amount field');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Import data with merge mode (skip existing IDs)
 * @param {string} userId - User ID
 * @param {object} jsonData - Validated import data
 * @param {function} onProgress - Progress callback (stage, percent, details)
 * @returns {Promise<{success: boolean, summary?: object, error?: string}>}
 */
export async function importData(userId, jsonData, onProgress = () => {}) {
  if (!isFirebaseConfigured() || !db || !userId) {
    return { success: false, error: 'Firebase not configured or invalid user' };
  }

  const uid = normalizeUserId(userId);
  const summary = {
    expenses: { imported: 0, skipped: 0 },
    tags: { imported: 0, skipped: 0 },
    goals: { imported: 0, skipped: 0 },
    bills: { imported: 0, skipped: 0 },
    income: { imported: 0, skipped: 0 },
    investments: { imported: 0, skipped: 0 },
    budgets: { imported: 0, skipped: 0 },
  };

  try {
    const collections = [
      { name: 'expenses', path: 'expenses' },
      { name: 'tags', path: 'tags' },
      { name: 'goals', path: 'goals' },
      { name: 'bills', path: 'bills' },
      { name: 'income', path: 'income' },
      { name: 'investments', path: 'investments' },
    ];

    let completedStages = 0;
    const totalStages = collections.length + 1; // +1 for budgets

    for (const col of collections) {
      const items = jsonData.data[col.name] || [];
      if (items.length === 0) {
        completedStages++;
        continue;
      }

      onProgress(col.name, Math.round((completedStages / totalStages) * 100), { 
        total: items.length 
      });

      // Get existing IDs
      const existingRef = collection(db, COLLECTION_NAME, uid, col.path);
      const existingSnapshot = await getDocs(existingRef);
      const existingIds = new Set(existingSnapshot.docs.map(d => d.id));

      // Filter out existing items
      const newItems = items.filter(item => !existingIds.has(item.id));
      summary[col.name].skipped = items.length - newItems.length;

      // Batch write new items
      const BATCH_SIZE = 450;
      for (let i = 0; i < newItems.length; i += BATCH_SIZE) {
        const chunk = newItems.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);

        for (const item of chunk) {
          const docRef = doc(db, COLLECTION_NAME, uid, col.path, item.id);
          const { contributions, transactions, ...itemData } = item;
          batch.set(docRef, {
            ...itemData,
            importedAt: serverTimestamp(),
          });
        }

        await batch.commit();
        summary[col.name].imported += chunk.length;

        onProgress(col.name, Math.round((completedStages / totalStages) * 100), {
          total: items.length,
          imported: summary[col.name].imported,
          skipped: summary[col.name].skipped,
        });
      }

      // Import nested collections (contributions for goals, transactions for investments)
      if (col.name === 'goals') {
        for (const goal of newItems) {
          if (goal.contributions?.length > 0) {
            const contribBatch = writeBatch(db);
            for (const contrib of goal.contributions) {
              const contribRef = doc(db, COLLECTION_NAME, uid, 'goals', goal.id, 'contributions', contrib.id);
              contribBatch.set(contribRef, contrib);
            }
            await contribBatch.commit();
          }
        }
      }

      if (col.name === 'investments') {
        for (const inv of newItems) {
          if (inv.transactions?.length > 0) {
            const txBatch = writeBatch(db);
            for (const tx of inv.transactions) {
              const txRef = doc(db, COLLECTION_NAME, uid, 'investments', inv.id, 'transactions', tx.id);
              txBatch.set(txRef, tx);
            }
            await txBatch.commit();
          }
        }
      }

      completedStages++;
    }

    // Import monthly budgets
    onProgress('budgets', Math.round((completedStages / totalStages) * 100));
    const budgets = jsonData.data.budgets || [];
    if (budgets.length > 0) {
      const existingBudgetsRef = collection(db, 'users', uid, 'budgets');
      const existingBudgetsSnap = await getDocs(existingBudgetsRef);
      const existingBudgetIds = new Set(existingBudgetsSnap.docs.map(d => d.id));

      const newBudgets = budgets.filter(b => !existingBudgetIds.has(b.id));
      summary.budgets.skipped = budgets.length - newBudgets.length;

      const BATCH_SIZE = 450;
      for (let i = 0; i < newBudgets.length; i += BATCH_SIZE) {
        const chunk = newBudgets.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);

        for (const budget of chunk) {
          const docRef = doc(db, 'users', uid, 'budgets', budget.id);
          batch.set(docRef, {
            ...budget,
            importedAt: serverTimestamp(),
          });
        }

        await batch.commit();
        summary.budgets.imported += chunk.length;
      }
    }
    completedStages++;

    // Import budget settings if present
    if (jsonData.data.budgetSettings) {
      const settingsRef = doc(db, COLLECTION_NAME, uid, 'settings', 'budget');
      const existingSettings = await getDoc(settingsRef);
      if (!existingSettings.exists()) {
        await setDoc(settingsRef, {
          ...jsonData.data.budgetSettings,
          importedAt: serverTimestamp(),
        });
      }
    }

    onProgress('complete', 100, summary);

    return { success: true, summary };
  } catch (error) {
    console.error('Import error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Download data as JSON file
 * @param {object} data - Data to export
 * @param {string} filename - Filename without extension
 */
export function downloadAsJSON(data, filename = 'expensesight-export') {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read and parse JSON file
 * @param {File} file - File object from input
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export function readJSONFile(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve({ success: false, error: 'No file provided' });
      return;
    }

    if (!file.name.endsWith('.json')) {
      resolve({ success: false, error: 'File must be a JSON file' });
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve({ success: true, data });
      } catch (err) {
        resolve({ success: false, error: 'Invalid JSON file: ' + err.message });
      }
    };

    reader.onerror = () => {
      resolve({ success: false, error: 'Failed to read file' });
    };

    reader.readAsText(file);
  });
}
