/**
 * Duplicate Detection Utility for ExpenseSight
 * Provides fuzzy matching to detect potential duplicate expenses
 */

/**
 * Calculate word overlap percentage between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Percentage of word overlap (0-100)
 */
export function calculateWordOverlap(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const words1 = str1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const words2 = str2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  let matchCount = 0;
  for (const word of set1) {
    if (set2.has(word)) matchCount++;
  }
  
  // Calculate overlap as percentage of the smaller set
  const minSize = Math.min(set1.size, set2.size);
  return minSize > 0 ? (matchCount / minSize) * 100 : 0;
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Edit distance
 */
export function levenshteinDistance(str1, str2) {
  if (!str1 || !str2) return Math.max(str1?.length || 0, str2?.length || 0);
  
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;
  
  const matrix = [];
  
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2[i - 1] === s1[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[s2.length][s1.length];
}

/**
 * Check if two descriptions are similar
 * @param {string} desc1 - First description
 * @param {string} desc2 - Second description
 * @returns {{ isSimilar: boolean, confidence: number, reason: string }}
 */
export function areDescriptionsSimilar(desc1, desc2) {
  if (!desc1 || !desc2) return { isSimilar: false, confidence: 0, reason: 'Missing description' };
  
  const d1 = desc1.toLowerCase().trim();
  const d2 = desc2.toLowerCase().trim();
  
  // Exact match
  if (d1 === d2) {
    return { isSimilar: true, confidence: 100, reason: 'Exact match' };
  }
  
  // Word overlap check (primary method)
  const wordOverlap = calculateWordOverlap(desc1, desc2);
  if (wordOverlap >= 70) {
    return { isSimilar: true, confidence: wordOverlap, reason: 'Similar words' };
  }
  
  // Levenshtein distance for short descriptions
  if (d1.length < 20 && d2.length < 20) {
    const distance = levenshteinDistance(d1, d2);
    const maxLen = Math.max(d1.length, d2.length);
    const similarity = ((maxLen - distance) / maxLen) * 100;
    
    if (distance <= 3 || similarity >= 70) {
      return { isSimilar: true, confidence: similarity, reason: 'Similar spelling' };
    }
  }
  
  // Check if one contains the other (substring match)
  if (d1.includes(d2) || d2.includes(d1)) {
    const shorter = d1.length < d2.length ? d1 : d2;
    const longer = d1.length < d2.length ? d2 : d1;
    const confidence = (shorter.length / longer.length) * 100;
    
    if (confidence >= 50) {
      return { isSimilar: true, confidence, reason: 'Substring match' };
    }
  }
  
  return { isSimilar: false, confidence: Math.max(wordOverlap, 0), reason: 'No match' };
}

/**
 * Check if two amounts are similar (within threshold)
 * @param {number} amount1 - First amount
 * @param {number} amount2 - Second amount
 * @param {number} threshold - Maximum difference to consider similar (default ₹5)
 * @returns {boolean}
 */
export function areAmountsSimilar(amount1, amount2, threshold = 5) {
  if (typeof amount1 !== 'number' || typeof amount2 !== 'number') return false;
  return Math.abs(amount1 - amount2) <= threshold;
}

/**
 * Check if a single expense is a duplicate of another
 * @param {Object} expense1 - First expense
 * @param {Object} expense2 - Second expense
 * @returns {{ isDuplicate: boolean, confidence: number, reason: string }}
 */
export function checkDuplicate(expense1, expense2) {
  // Must be on the same date
  if (expense1.date !== expense2.date) {
    return { isDuplicate: false, confidence: 0, reason: 'Different dates' };
  }
  
  // Skip if either is cancelled or a refund
  if (expense1.cancelled || expense2.cancelled) {
    return { isDuplicate: false, confidence: 0, reason: 'Cancelled expense' };
  }
  
  // Check description similarity
  const descSimilarity = areDescriptionsSimilar(expense1.description, expense2.description);
  
  // Check amount similarity
  const amountMatch = areAmountsSimilar(expense1.amount, expense2.amount);
  
  // Strong duplicate: same date + similar description + similar amount
  if (descSimilarity.isSimilar && amountMatch) {
    return {
      isDuplicate: true,
      confidence: Math.min(100, descSimilarity.confidence + 20),
      reason: `${descSimilarity.reason} with matching amount`,
    };
  }
  
  // Likely duplicate: same date + very similar description (even if amount differs)
  if (descSimilarity.isSimilar && descSimilarity.confidence >= 85) {
    return {
      isDuplicate: true,
      confidence: descSimilarity.confidence,
      reason: descSimilarity.reason,
    };
  }
  
  // Potential duplicate: same date + same amount (even if description differs slightly)
  if (amountMatch && expense1.amount > 0) {
    // Only flag if amounts are exact and non-trivial
    if (expense1.amount === expense2.amount && expense1.amount >= 50) {
      return {
        isDuplicate: true,
        confidence: 60,
        reason: 'Same amount on same date',
      };
    }
  }
  
  return { isDuplicate: false, confidence: 0, reason: 'No duplicate detected' };
}

/**
 * Detect duplicates in a batch of new expenses
 * Checks against both existing expenses and within the batch itself
 * @param {Array} newExpenses - Array of new expenses to check
 * @param {Array} existingExpenses - Array of existing expenses from DB
 * @returns {Array} - New expenses with duplicate flags added
 */
export function detectDuplicates(newExpenses, existingExpenses = []) {
  const markedExpenses = newExpenses.map(expense => ({
    ...expense,
    isDuplicate: false,
    duplicateOf: null,
    duplicateConfidence: 0,
    duplicateReason: null,
    keepAnyway: false,
  }));
  
  // Check each new expense against existing expenses
  for (let i = 0; i < markedExpenses.length; i++) {
    const newExp = markedExpenses[i];
    
    // Check against existing expenses from DB
    for (const existingExp of existingExpenses) {
      const result = checkDuplicate(newExp, existingExp);
      
      if (result.isDuplicate && result.confidence > (newExp.duplicateConfidence || 0)) {
        markedExpenses[i] = {
          ...markedExpenses[i],
          isDuplicate: true,
          duplicateOf: {
            id: existingExp.id,
            description: existingExp.description,
            amount: existingExp.amount,
            date: existingExp.date,
            source: 'existing',
          },
          duplicateConfidence: result.confidence,
          duplicateReason: result.reason,
        };
      }
    }
    
    // Check against other expenses in the current batch (only check previous items to avoid double-flagging)
    for (let j = 0; j < i; j++) {
      const batchExp = markedExpenses[j];
      const result = checkDuplicate(newExp, batchExp);
      
      if (result.isDuplicate && result.confidence > (markedExpenses[i].duplicateConfidence || 0)) {
        markedExpenses[i] = {
          ...markedExpenses[i],
          isDuplicate: true,
          duplicateOf: {
            id: batchExp.id,
            description: batchExp.description,
            amount: batchExp.amount,
            date: batchExp.date,
            source: 'batch',
          },
          duplicateConfidence: result.confidence,
          duplicateReason: result.reason,
        };
      }
    }
  }
  
  return markedExpenses;
}

/**
 * Get expenses that should be saved (excluding duplicates unless marked as "keep anyway")
 * @param {Array} expenses - Array of expenses with duplicate flags
 * @returns {Array} - Filtered array of expenses to save
 */
export function getExpensesToSave(expenses) {
  return expenses.filter(exp => !exp.isDuplicate || exp.keepAnyway);
}

/**
 * Get count of duplicates that will be excluded
 * @param {Array} expenses - Array of expenses with duplicate flags
 * @returns {number}
 */
export function getDuplicateCount(expenses) {
  return expenses.filter(exp => exp.isDuplicate && !exp.keepAnyway).length;
}

/**
 * Mark an expense as "keep anyway" (override duplicate detection)
 * @param {Array} expenses - Array of expenses
 * @param {string} expenseId - ID of expense to mark
 * @returns {Array} - Updated expenses array
 */
export function markAsKeepAnyway(expenses, expenseId) {
  return expenses.map(exp => 
    exp.id === expenseId 
      ? { ...exp, keepAnyway: true }
      : exp
  );
}

/**
 * Unmark an expense from "keep anyway"
 * @param {Array} expenses - Array of expenses
 * @param {string} expenseId - ID of expense to unmark
 * @returns {Array} - Updated expenses array
 */
export function unmarkKeepAnyway(expenses, expenseId) {
  return expenses.map(exp => 
    exp.id === expenseId 
      ? { ...exp, keepAnyway: false }
      : exp
  );
}
