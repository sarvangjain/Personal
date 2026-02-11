/**
 * ExpenseSight NLP Parser
 * Parses natural language expense input into structured data
 */

import { parse, isValid, format } from 'date-fns';

// ─── Category Keywords ───────────────────────────────────────────────────────
const CATEGORY_KEYWORDS = {
  'Groceries': [
    'grocery', 'groceries', 'zepto', 'blinkit', 'bigbasket', 'vegetables', 
    'fruits', 'kitchen', 'milk', 'bread', 'eggs', 'supermarket', 'paneer',
    'items', 'instamart', 'provisions'
  ],
  'Transport': [
    'cab', 'uber', 'ola', 'auto', 'metro', 'bus', 'train', 'flight', 
    'petrol', 'fuel', 'parking', 'toll', 'rapido', 'commute', 'office commute',
    'blabla', 'car pool', 'carpool', 'drop', 'to and from', 'to and fro'
  ],
  'Food & Dining': [
    'food order', 'food', 'zomato', 'swiggy', 'restaurant', 'dinner', 'lunch', 
    'breakfast', 'cafe', 'coffee', 'pizza', 'burger', 'biryani', 'chai', 'tea',
    'drinks', 'bar', 'pub', 'f&b', 'garlic bread', 'dominos', 'mcd', 'thali',
    'kfc', 'order'
  ],
  'Utilities': [
    'wifi', 'internet', 'electricity', 'electric', 'water', 'gas', 'cylinder',
    'rent', 'bill', 'maintenance', 'society', 'airtel', 'jio', 'vodafone',
    'mobile bill', 'recharge', 'icloud'
  ],
  'Shopping': [
    'amazon', 'flipkart', 'myntra', 'cred', 'gift', 'clothes', 'shoes',
    'electronics', 'gadget', 'shampoo', 'powerbank', 'cable', 'cushion',
    'lumbar', 'flowers', 'cover', 'keyboard', 'management'
  ],
  'Entertainment': [
    'movie', 'cinema', 'netflix', 'spotify', 'subscription', 'subs',
    'comedy', 'show', 'concert', 'game', 'party', 'social', 'art',
    'fifa', 'ps5', 'playstation', 'xbox', 'ea', 'membership',
    'badminton', 'cricket', 'pool', 'sports'
  ],
  'Health': [
    'medicine', 'medical', 'doctor', 'hospital', 'pharmacy', 'gym', 
    'fitness', 'health'
  ],
  'Travel': [
    'hotel', 'airbnb', 'trip', 'vacation', 'holiday', 'booking',
    'tourism', 'travel', 'gurgaon', 'ggn', 'jaipur'
  ],
  'Personal': [
    'haircut', 'salon', 'spa', 'grooming', 'maid', 'cleaning', 'laundry'
  ],
  'Payments': [
    'paid back', 'repaid', 'returned', 'settled', 'transfer', 'refund',
    'refunded', 'cashback', 'cash'
  ],
};

// ─── Date Parsing ────────────────────────────────────────────────────────────

// Common date formats to try
const DATE_FORMATS = [
  'd MMM',           // "11 Feb"
  'd MMMM',          // "11 February"
  'MMM d',           // "Feb 11"
  'MMMM d',          // "February 11"
  'd MMM yyyy',      // "11 Feb 2025"
  'd MMMM yyyy',     // "11 February 2025"
  'MMM d yyyy',      // "Feb 11 2025"
  'MMM d, yyyy',     // "Feb 11, 2025"
  'd/M/yyyy',        // "11/2/2025"
  'd-M-yyyy',        // "11-2-2025"
  'yyyy-MM-dd',      // "2025-02-11"
  'dMMM',            // "8Jan" (no space)
];

/**
 * Normalize date string for parsing
 * Handles: "8Jan" -> "8 Jan", "4th Jan" -> "4 Jan", "3rd Jan" -> "3 Jan"
 */
function normalizeDateString(text) {
  let normalized = text.trim();
  
  // Remove ordinal suffixes (1st, 2nd, 3rd, 4th, etc.)
  normalized = normalized.replace(/(\d+)(st|nd|rd|th)\s*/gi, '$1 ');
  
  // Add space between number and month if missing: "8Jan" -> "8 Jan"
  normalized = normalized.replace(/(\d+)(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/gi, '$1 $2');
  
  return normalized.trim();
}

/**
 * Check if a line is a date header
 */
export function isDateLine(line) {
  const trimmed = line.trim().toLowerCase();
  
  // Skip common non-date patterns
  if (trimmed.includes('no expense') || trimmed.includes('nothing')) {
    return false;
  }
  
  // Skip if it contains numbers that look like amounts (3+ digits not at start)
  // But allow dates like "11 Feb" which start with numbers
  const hasAmountPattern = /\s\d{3,}/.test(line) || /\d{3,}\s*$/.test(line);
  if (hasAmountPattern) {
    return false;
  }
  
  // Try to parse as date
  const parsed = parseDateString(trimmed);
  return parsed !== null;
}

/**
 * Parse a date string into a Date object
 */
export function parseDateString(text) {
  const normalized = normalizeDateString(text);
  const currentYear = new Date().getFullYear();
  
  for (const fmt of DATE_FORMATS) {
    try {
      // Try with current year for formats without year
      let dateStr = normalized;
      if (!fmt.includes('yyyy') && !fmt.includes('yy')) {
        dateStr = `${normalized} ${currentYear}`;
      }
      
      const parsed = parse(dateStr, fmt.includes('yyyy') ? fmt : `${fmt} yyyy`, new Date());
      
      if (isValid(parsed)) {
        // If parsed date is in the future, use previous year
        if (parsed > new Date()) {
          parsed.setFullYear(parsed.getFullYear() - 1);
        }
        return parsed;
      }
    } catch {
      continue;
    }
  }
  
  return null;
}

// ─── Amount Parsing ──────────────────────────────────────────────────────────

/**
 * Extract amount from expense line
 * Handles: "182", "-1500", "508 + 250", "TBD", "508 :: refunded -508"
 */
export function parseAmount(text) {
  const trimmed = text.trim().toLowerCase();
  
  // Check for TBD/pending markers
  if (trimmed.includes('tbd') || trimmed.includes('pending') || trimmed.includes('to be paid')) {
    return { amount: null, isPending: true, isRefund: false };
  }
  
  // Check for "no expense" or similar
  if (trimmed === 'no expense' || trimmed === 'nothing' || trimmed === 'no expenses') {
    return { amount: null, isPending: false, isRefund: false, skip: true };
  }
  
  // Check for refund notation: "508 :: refunded -508" or similar
  // If line contains "refund" and has both positive and negative numbers, it's likely a cancelled expense
  const refundMatch = text.match(/(\d+)\s*(?:::|->|refund|returned)\s*.*?-(\d+)/i);
  if (refundMatch && refundMatch[1] === refundMatch[2]) {
    // Amount equals refund - it's a wash, mark as refund with 0 net
    return { amount: 0, isPending: false, isRefund: true, cancelled: true };
  }
  
  // Check if it's explicitly a refund (contains refund keywords with negative amount)
  const isRefundLine = trimmed.includes('refund') || 
                       trimmed.includes('paid back') ||
                       trimmed.includes('returned') ||
                       trimmed.includes('cashback');
  
  // Find all numbers and operators at the end of the line
  // Match patterns like: "182", "-1500", "508 + 250", "508+250"
  const amountMatch = text.match(/(-?\d+(?:\.\d+)?(?:\s*[+\-]\s*\d+(?:\.\d+)?)*)\s*$/);
  
  if (!amountMatch) {
    return { amount: null, isPending: false, isRefund: false };
  }
  
  const amountStr = amountMatch[1];
  
  // Check if it's a refund (negative or contains refund keywords)
  const isRefund = amountStr.startsWith('-') || isRefundLine;
  
  // Evaluate the expression
  try {
    // Safe evaluation - only allow numbers and +/-
    const sanitized = amountStr.replace(/[^0-9+\-.\s]/g, '');
    // eslint-disable-next-line no-eval
    const evaluated = Function('"use strict"; return (' + sanitized + ')')();
    
    return {
      amount: Math.abs(evaluated),
      isPending: false,
      isRefund: isRefund || evaluated < 0,
    };
  } catch {
    return { amount: null, isPending: false, isRefund: false };
  }
}

/**
 * Extract description from expense line (everything before the amount)
 */
export function parseDescription(text) {
  // Remove the amount part from the end
  const withoutAmount = text.replace(/(-?\d+(?:\.\d+)?(?:\s*[+\-]\s*\d+(?:\.\d+)?)*)\s*$/, '');
  
  // Clean up the description
  let description = withoutAmount.trim();
  
  // Remove trailing "TBD" or similar
  description = description.replace(/\s*(tbd|pending|to be paid)$/i, '').trim();
  
  return description || 'Expense';
}

// ─── Category Inference ──────────────────────────────────────────────────────

/**
 * Infer category from expense description
 */
export function inferCategory(description) {
  const lower = description.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return category;
      }
    }
  }
  
  return 'Other';
}

// ─── Main Parser ─────────────────────────────────────────────────────────────

/**
 * Parse a single expense line
 */
export function parseExpenseLine(line, date) {
  const trimmed = line.trim();
  const lower = trimmed.toLowerCase();
  
  if (!trimmed) return null;
  
  // Skip "no expense" type lines
  if (lower === 'no expense' || lower === 'no expenses' || lower === 'nothing') {
    return { skip: true };
  }
  
  const { amount, isPending, isRefund, skip, cancelled } = parseAmount(trimmed);
  
  // Skip lines marked to be skipped
  if (skip) {
    return { skip: true };
  }
  
  const description = parseDescription(trimmed);
  const category = inferCategory(description);
  
  // Skip lines that don't have an amount and aren't pending
  if (amount === null && !isPending) {
    return null;
  }
  
  return {
    id: generateId(),
    date: date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    description,
    amount: amount || 0,
    category,
    isPending,
    isRefund,
    cancelled: cancelled || false,
    rawText: trimmed,
    notes: null,
  };
}

/**
 * Generate a unique ID
 */
function generateId() {
  return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Main parser function - parse multi-line expense text
 */
export function parseExpenseText(text) {
  const lines = text.split('\n');
  const expenses = [];
  const errors = [];
  let currentDate = new Date();
  let lineNumber = 0;
  
  for (const line of lines) {
    lineNumber++;
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) continue;
    
    // Check if it's a date line
    if (isDateLine(trimmed)) {
      const parsedDate = parseDateString(trimmed);
      if (parsedDate) {
        currentDate = parsedDate;
      }
      continue;
    }
    
    // Try to parse as expense
    try {
      const expense = parseExpenseLine(trimmed, currentDate);
      if (expense) {
        // Skip lines that are marked to be skipped (like "No expense")
        if (expense.skip) {
          continue;
        }
        expenses.push(expense);
      } else {
        // Line couldn't be parsed
        errors.push({
          line: lineNumber,
          text: trimmed,
          error: 'Could not parse expense',
        });
      }
    } catch (err) {
      errors.push({
        line: lineNumber,
        text: trimmed,
        error: err.message,
      });
    }
  }
  
  return { expenses, errors };
}

// ─── Utilities ───────────────────────────────────────────────────────────────

/**
 * Convert ExpenseSight expense to Splitwise-like format
 * This allows reusing existing analytics utilities
 */
export function toSplitwiseFormat(expense, userId) {
  return {
    id: expense.id,
    description: expense.description,
    cost: expense.amount.toFixed(2),
    currency_code: 'INR',
    date: expense.date,
    created_at: expense.date + 'T12:00:00Z',
    category: {
      id: 0,
      name: expense.category,
    },
    group_id: 0,
    payment: expense.isRefund,
    deleted_at: expense.cancelled ? new Date().toISOString() : null,
    users: [
      {
        user_id: userId,
        paid_share: expense.amount.toFixed(2),
        owed_share: expense.amount.toFixed(2),
        net_balance: '0.00',
      },
    ],
    // ExpenseSight specific fields
    _expenseSight: true,
    _isPending: expense.isPending,
    _isRefund: expense.isRefund,
    _cancelled: expense.cancelled || false,
    _rawText: expense.rawText,
  };
}

/**
 * Get all unique categories from CATEGORY_KEYWORDS
 */
export function getAllCategories() {
  return Object.keys(CATEGORY_KEYWORDS);
}

/**
 * Validate parsed expenses
 */
export function validateExpenses(expenses) {
  const issues = [];
  
  for (const exp of expenses) {
    // Skip validation for cancelled expenses
    if (exp.cancelled) continue;
    
    if (!exp.description || exp.description === 'Expense') {
      issues.push({
        expense: exp,
        issue: 'Missing or generic description',
      });
    }
    
    if (exp.amount === 0 && !exp.isPending && !exp.cancelled) {
      issues.push({
        expense: exp,
        issue: 'Zero amount',
      });
    }
    
    if (exp.amount > 100000) {
      issues.push({
        expense: exp,
        issue: 'Unusually high amount - please verify',
      });
    }
  }
  
  return issues;
}

export default parseExpenseText;
