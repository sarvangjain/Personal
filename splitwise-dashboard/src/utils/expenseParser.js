/**
 * ExpenseSight NLP Parser
 * Parses natural language expense input into structured data
 * 
 * Supports:
 * - Date headers: "16 Feb", "15 feb", "today", "yesterday"
 * - Hashtag tags: "Flight 5690 #kashmir" → tag: kashmir
 * - EMI splitting: "Phone 30000 (emi for 3 months)" → 3 expenses of 10000 each, 1 month apart
 * - Math expressions: "508 + 250"
 * - Comma amounts: "22,500"
 * - Refunds, TBD, cancelled
 */

import { parse, isValid, format, addMonths } from 'date-fns';

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
  'Rent': [
    'rent', 'house rent', 'room rent', 'flat rent', 'apartment', 'monthly rent',
    'accommodation', 'housing', 'pg', 'paying guest'
  ],
  'Utilities': [
    'wifi', 'internet', 'electricity', 'electric', 'water', 'gas', 'cylinder',
    'bill', 'maintenance', 'society', 'airtel', 'jio', 'vodafone',
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
  'dd/MM/yyyy',      // "11/02/2025"
  'dd-MM-yyyy',      // "11-02-2025"
  'yyyy-MM-dd',      // "2025-02-11"
];

function normalizeDateString(text) {
  let normalized = text.trim();
  // Remove ordinal suffixes (1st, 2nd, 3rd, 4th, etc.)
  normalized = normalized.replace(/(\d+)(st|nd|rd|th)\s*/gi, '$1 ');
  // Add space between number and month if missing: "8Jan" -> "8 Jan"
  normalized = normalized.replace(/(\d+)(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/gi, '$1 $2');
  // Capitalize first letter of each month name for date-fns parse compatibility
  // "16 feb" -> "16 Feb", "feb 16" -> "Feb 16"
  normalized = normalized.replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\b/gi, 
    (m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase()
  );
  return normalized.trim();
}

export function isDateLine(line) {
  const trimmed = line.trim();
  const lower = trimmed.toLowerCase();
  
  if (lower.includes('no expense') || lower.includes('nothing')) return false;
  
  // Skip if it contains numbers that look like amounts (3+ digits not at start)
  const hasAmountPattern = /\s\d{3,}/.test(trimmed) || /\d{3,}\s*$/.test(trimmed);
  if (hasAmountPattern) return false;
  
  // Must contain a digit or be a relative keyword
  if (!/\d/.test(lower) && lower !== 'today' && lower !== 'yesterday') return false;
  
  // Should not contain hashtags (that's an expense line, not a date)
  if (lower.includes('#')) return false;
  
  // Pass original (not lowercased) to parseDateString — normalization handles casing
  const parsed = parseDateString(trimmed);
  return parsed !== null;
}

export function parseDateString(text) {
  const normalized = normalizeDateString(text);
  const currentYear = new Date().getFullYear();
  
  for (const fmt of DATE_FORMATS) {
    try {
      const hasYear = fmt.includes('yyyy') || fmt.includes('yy');
      const dateStr = hasYear ? normalized : `${normalized} ${currentYear}`;
      const parseFormat = hasYear ? fmt : `${fmt} yyyy`;
      
      const parsed = parse(dateStr, parseFormat, new Date());
      
      if (isValid(parsed)) {
        if (parsed > new Date()) {
          parsed.setFullYear(parsed.getFullYear() - 1);
        }
        return parsed;
      }
    } catch {
      continue;
    }
  }
  
  const lower = normalized.toLowerCase();
  if (lower === 'today') return new Date();
  if (lower === 'yesterday') {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }
  
  return null;
}

// ─── Tag Extraction ──────────────────────────────────────────────────────────

/**
 * Extract #hashtag tags from a line
 * "Flight to srinagar 5690 #kashmir" → { tags: ['kashmir'], cleanedLine: 'Flight to srinagar 5690' }
 */
export function extractTags(text) {
  const tags = [];
  const tagRegex = /#([a-zA-Z0-9_-]+)/g;
  let match;
  while ((match = tagRegex.exec(text)) !== null) {
    tags.push(match[1].toLowerCase());
  }
  const cleanedLine = text.replace(/#[a-zA-Z0-9_-]+/g, '').replace(/\s{2,}/g, ' ').trim();
  return { tags, cleanedLine };
}

// ─── EMI Detection ───────────────────────────────────────────────────────────

/**
 * Detect EMI patterns in a line
 * Patterns:
 *   "(emi for 3 months)", "(divided into emi for 3 month)", "(emi 6 months)",
 *   "(3 month emi)", "(emi x 3)"
 * Returns { emiMonths: number | null, cleanedLine: string }
 */
export function extractEMI(text) {
  const lower = text.toLowerCase();
  
  // Pattern: (divided into emi for N month(s)) or (emi for N month(s)) or (emi N month(s))
  const emiPatterns = [
    /\(?\s*(?:divided\s+into\s+)?emi\s+(?:for\s+)?(\d+)\s*months?\s*\)?/i,
    /\(?\s*(\d+)\s*months?\s*emi\s*\)?/i,
    /\(?\s*emi\s*[x×]\s*(\d+)\s*\)?/i,
  ];
  
  for (const pattern of emiPatterns) {
    const match = text.match(pattern);
    if (match) {
      const months = parseInt(match[1]);
      if (months >= 2 && months <= 60) {
        const cleanedLine = text.replace(match[0], '').replace(/\s{2,}/g, ' ').trim();
        return { emiMonths: months, cleanedLine };
      }
    }
  }
  
  return { emiMonths: null, cleanedLine: text };
}

// ─── Amount Parsing ──────────────────────────────────────────────────────────

export function parseAmount(text) {
  const trimmed = text.trim().toLowerCase();
  
  if (trimmed.includes('tbd') || trimmed.includes('pending') || trimmed.includes('to be paid')) {
    return { amount: null, isPending: true, isRefund: false };
  }
  
  if (trimmed === 'no expense' || trimmed === 'nothing' || trimmed === 'no expenses') {
    return { amount: null, isPending: false, isRefund: false, skip: true };
  }
  
  const refundMatch = text.match(/(\d+)\s*(?:::|->|refund|returned)\s*.*?-(\d+)/i);
  if (refundMatch && refundMatch[1] === refundMatch[2]) {
    return { amount: 0, isPending: false, isRefund: true, cancelled: true };
  }
  
  const isRefundLine = trimmed.includes('refund') || 
                       trimmed.includes('paid back') ||
                       trimmed.includes('returned') ||
                       trimmed.includes('cashback');
  
  const amountMatch = text.match(/(-?[\d,]+(?:\.\d+)?(?:\s*[+\-]\s*[\d,]+(?:\.\d+)?)*)\s*$/);
  
  if (!amountMatch) {
    return { amount: null, isPending: false, isRefund: false };
  }
  
  const amountStr = amountMatch[1];
  const isRefund = amountStr.startsWith('-') || isRefundLine;
  
  try {
    const sanitized = amountStr.replace(/,/g, '').replace(/[^0-9+\-.\s]/g, '');
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

export function parseDescription(text) {
  const withoutAmount = text.replace(/(-?[\d,]+(?:\.\d+)?(?:\s*[+\-]\s*[\d,]+(?:\.\d+)?)*)\s*$/, '');
  let description = withoutAmount.trim();
  description = description.replace(/\s*(tbd|pending|to be paid)$/i, '').trim();
  return description || 'Expense';
}

// ─── Category Inference ──────────────────────────────────────────────────────

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

function generateId() {
  return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse a single expense line (with tag and EMI support)
 * Returns a single expense OR an array of expenses (for EMI)
 */
export function parseExpenseLine(line, date) {
  const trimmed = line.trim();
  const lower = trimmed.toLowerCase();
  
  if (!trimmed) return null;
  
  if (lower === 'no expense' || lower === 'no expenses' || lower === 'nothing') {
    return { skip: true };
  }
  
  // 1. Extract hashtag tags first
  const { tags, cleanedLine: afterTags } = extractTags(trimmed);
  
  // 2. Extract EMI info
  const { emiMonths, cleanedLine: afterEmi } = extractEMI(afterTags);
  
  // 3. Parse amount from cleaned line
  const { amount, isPending, isRefund, skip, cancelled } = parseAmount(afterEmi);
  
  if (skip) return { skip: true };
  
  const description = parseDescription(afterEmi);
  const category = inferCategory(description);
  
  if (amount === null && !isPending) return null;
  
  const baseDate = date || new Date();
  const baseDateStr = format(baseDate, 'yyyy-MM-dd');
  
  // 4. If EMI, split into multiple expenses
  if (emiMonths && amount > 0) {
    const emiAmount = Math.round(amount / emiMonths);
    const expenses = [];
    
    for (let i = 0; i < emiMonths; i++) {
      const emiDate = addMonths(baseDate, i);
      expenses.push({
        id: generateId(),
        date: format(emiDate, 'yyyy-MM-dd'),
        description: `${description} (EMI ${i + 1}/${emiMonths})`,
        amount: emiAmount,
        category,
        isPending: false,
        isRefund: false,
        cancelled: false,
        rawText: trimmed,
        notes: `EMI: ₹${amount} ÷ ${emiMonths} months`,
        tags: tags.length > 0 ? tags : undefined,
        isEmi: true,
        emiTotal: amount,
        emiMonth: i + 1,
        emiTotalMonths: emiMonths,
      });
    }
    
    return expenses; // Return array
  }
  
  // 5. Normal single expense
  return {
    id: generateId(),
    date: baseDateStr,
    description,
    amount: amount || 0,
    category,
    isPending,
    isRefund,
    cancelled: cancelled || false,
    rawText: trimmed,
    notes: null,
    tags: tags.length > 0 ? tags : undefined,
  };
}

/**
 * Main parser function - parse multi-line expense text with date headers
 * This is the primary parser used by the Quick Add modal
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
      const result = parseExpenseLine(trimmed, currentDate);
      if (result) {
        if (result.skip) continue;
        
        // Handle array (EMI split) or single expense
        if (Array.isArray(result)) {
          expenses.push(...result);
        } else {
          expenses.push(result);
        }
      } else {
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
    _expenseSight: true,
    _isPending: expense.isPending,
    _isRefund: expense.isRefund,
    _cancelled: expense.cancelled || false,
    _rawText: expense.rawText,
  };
}

export function getAllCategories() {
  return Object.keys(CATEGORY_KEYWORDS);
}

export function validateExpenses(expenses) {
  const issues = [];
  
  for (const exp of expenses) {
    if (exp.cancelled) continue;
    
    if (!exp.description || exp.description === 'Expense') {
      issues.push({ expense: exp, issue: 'Missing or generic description' });
    }
    if (exp.amount === 0 && !exp.isPending && !exp.cancelled) {
      issues.push({ expense: exp, issue: 'Zero amount' });
    }
    if (exp.amount > 100000) {
      issues.push({ expense: exp, issue: 'Unusually high amount - please verify' });
    }
  }
  
  return issues;
}

export default parseExpenseText;
