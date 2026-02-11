import { format, parseISO, subMonths } from 'date-fns';

// ── Category → Lifestyle Dimension Mapping ──────────────────────────────────

const DIMENSION_MAP = {
  // 🍽️ Nutrition
  'Food and drink': 'Nutrition',
  'Groceries': 'Nutrition',
  'Dining out': 'Nutrition',
  'Restaurant': 'Nutrition',
  'Liquor': 'Nutrition',
  'Coffee': 'Nutrition',

  // 🎮 Leisure
  'Entertainment': 'Leisure',
  'Games': 'Leisure',
  'Movies': 'Leisure',
  'Music': 'Leisure',
  'Sports': 'Leisure',
  'Gym': 'Leisure',
  'Fitness': 'Leisure',

  // 🏠 Essentials
  'Utilities': 'Essentials',
  'Rent': 'Essentials',
  'Household supplies': 'Essentials',
  'Mortgage': 'Essentials',
  'Insurance': 'Essentials',
  'Electricity': 'Essentials',
  'Water': 'Essentials',
  'Internet': 'Essentials',
  'Phone': 'Essentials',
  'Heat/gas': 'Essentials',
  'Trash': 'Essentials',
  'TV/Phone/Internet': 'Essentials',
  'Cleaning': 'Essentials',
  'Maintenance': 'Essentials',

  // ✈️ Travel & Transport
  'Transportation': 'Travel',
  'Taxi': 'Travel',
  'Bus/train': 'Travel',
  'Car': 'Travel',
  'Gas/fuel': 'Travel',
  'Parking': 'Travel',
  'Plane': 'Travel',
  'Hotel': 'Travel',
  'Bicycle': 'Travel',
  'Ride share': 'Travel',

  // 🛍️ Shopping & Personal
  'Shopping': 'Personal',
  'Clothing': 'Personal',
  'Electronics': 'Personal',
  'Gifts': 'Personal',
  'General': 'Personal',
  'Education': 'Personal',
  'Medical expenses': 'Personal',
  'Pets': 'Personal',
  'Childcare': 'Personal',
  'Taxes': 'Personal',
  'Books': 'Personal',
};

// Dimension metadata with colors and icons
export const DIMENSIONS = {
  Nutrition:  { emoji: '🍽️', color: '#f59e0b', label: 'Nutrition',  description: 'Food, dining, groceries & drinks' },
  Leisure:    { emoji: '🎮', color: '#8b5cf6', label: 'Leisure',    description: 'Entertainment, sports & hobbies' },
  Essentials: { emoji: '🏠', color: '#10b981', label: 'Essentials', description: 'Rent, utilities & household' },
  Travel:     { emoji: '✈️', color: '#06b6d4', label: 'Travel',     description: 'Transport, flights & hotels' },
  Personal:   { emoji: '🛍️', color: '#ec4899', label: 'Personal',   description: 'Shopping, health & education' },
};

const DIMENSION_KEYS = Object.keys(DIMENSIONS);

/**
 * Map a Splitwise category name to a lifestyle dimension.
 * Falls back to 'Personal' for unknown categories.
 */
export function mapCategoryToDimension(categoryName) {
  if (!categoryName) return 'Personal';
  // Try exact match first
  if (DIMENSION_MAP[categoryName]) return DIMENSION_MAP[categoryName];
  // Try case-insensitive match: category name contains a known key
  // Only one direction: input contains map key (e.g. "Food and drink" contains "food")
  // NOT the reverse, which causes false positives ("Car" matching "Childcare")
  const lower = categoryName.toLowerCase();
  for (const [cat, dim] of Object.entries(DIMENSION_MAP)) {
    if (lower.includes(cat.toLowerCase())) {
      return dim;
    }
  }
  return 'Personal';
}

/**
 * Compute lifestyle dimensions for a given set of expenses in a single month.
 * Returns { dimensionName: { amount, count, percentage } }
 */
function computeDimensionsForExpenses(expenses, userId) {
  const dims = {};
  DIMENSION_KEYS.forEach(d => { dims[d] = { amount: 0, count: 0 }; });

  let total = 0;
  expenses.forEach(exp => {
    if (exp.payment || exp.deleted_at) return;
    const userEntry = exp.users?.find(u => u.user_id === userId);
    const share = userEntry ? parseFloat(userEntry.owed_share) : 0;
    if (share <= 0) return;

    const dim = mapCategoryToDimension(exp.category?.name);
    dims[dim].amount += share;
    dims[dim].count += 1;
    total += share;
  });

  // Compute percentages
  DIMENSION_KEYS.forEach(d => {
    dims[d].percentage = total > 0 ? Math.round((dims[d].amount / total) * 100) : 0;
  });

  return { dimensions: dims, total };
}

/**
 * Compute monthly lifestyle data for the last N months.
 * Returns an array of { month, monthLabel, dimensions, total, radarData }
 */
export function computeMonthlyLifestyle(expenses, userId, months = 6) {
  const now = new Date();

  // Build the set of target month keys
  const monthMeta = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = subMonths(now, i);
    monthMeta.push({
      monthKey: format(d, 'yyyy-MM'),
      monthLabel: format(d, 'MMM yyyy'),
      shortLabel: format(d, 'MMM'),
    });
  }
  const monthKeySet = new Set(monthMeta.map(m => m.monthKey));

  // Pre-compute month key for each expense ONCE (avoids O(N×M) re-parsing)
  const expensesByMonth = {};
  monthMeta.forEach(m => { expensesByMonth[m.monthKey] = []; });

  expenses.forEach(exp => {
    if (exp.payment || exp.deleted_at) return;
    try {
      const key = format(parseISO(exp.date), 'yyyy-MM');
      if (monthKeySet.has(key)) {
        expensesByMonth[key].push(exp);
      }
    } catch { /* skip malformed dates */ }
  });

  // Build result for each month
  return monthMeta.map(({ monthKey, monthLabel, shortLabel }) => {
    const monthExpenses = expensesByMonth[monthKey];
    const { dimensions, total } = computeDimensionsForExpenses(monthExpenses, userId);

    const maxAmount = Math.max(...DIMENSION_KEYS.map(d => dimensions[d].amount), 1);
    const radarData = DIMENSION_KEYS.map(d => ({
      dimension: DIMENSIONS[d].label,
      value: Math.round((dimensions[d].amount / maxAmount) * 100),
      amount: dimensions[d].amount,
      percentage: dimensions[d].percentage,
      fullMark: 100,
    }));

    return { month: monthKey, monthLabel, shortLabel, dimensions, total, radarData };
  });
}

/**
 * Compute an overall "Lifestyle Balance Score" (0–100).
 * Higher score = more evenly distributed across dimensions.
 * Uses Shannon entropy normalized to [0, 100].
 */
export function computeBalanceScore(dimensions) {
  const amounts = DIMENSION_KEYS.map(d => dimensions[d].amount).filter(a => a > 0);
  if (amounts.length <= 1) return amounts.length === 0 ? 0 : 20; // Only one category = low balance

  const total = amounts.reduce((s, a) => s + a, 0);
  if (total === 0) return 0;

  const probs = amounts.map(a => a / total);
  const entropy = -probs.reduce((s, p) => s + (p > 0 ? p * Math.log2(p) : 0), 0);
  const maxEntropy = Math.log2(DIMENSION_KEYS.length); // Max possible with 5 dimensions

  return Math.round((entropy / maxEntropy) * 100);
}

/**
 * Generate smart nudges by comparing current month to trailing average.
 */
export function generateNudges(monthlyData) {
  const nudges = [];
  if (monthlyData.length < 2) return nudges;

  const current = monthlyData[monthlyData.length - 1];
  const previous = monthlyData.slice(0, -1);

  // Compute trailing average per dimension
  const avgDims = {};
  DIMENSION_KEYS.forEach(d => {
    const values = previous.map(m => m.dimensions[d].amount).filter(v => v > 0);
    avgDims[d] = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
  });

  DIMENSION_KEYS.forEach(d => {
    const curr = current.dimensions[d].amount;
    const avg = avgDims[d];
    const meta = DIMENSIONS[d];

    if (avg <= 0 && curr <= 0) return;

    const pctChange = avg > 0 ? ((curr - avg) / avg) * 100 : (curr > 0 ? 100 : 0);

    if (pctChange >= 40) {
      nudges.push({
        type: 'high',
        dimension: d,
        emoji: '📈',
        icon: meta.emoji,
        color: meta.color,
        title: `${meta.label} spending is up`,
        desc: `${meta.label} is ${Math.round(pctChange)}% above your ${previous.length}-month average. Worth keeping an eye on.`,
      });
    } else if (pctChange <= -40 && avg > 0) {
      nudges.push({
        type: 'low',
        dimension: d,
        emoji: '📉',
        icon: meta.emoji,
        color: meta.color,
        title: `${meta.label} dropped off`,
        desc: `Your ${meta.label.toLowerCase()} spending is ${Math.abs(Math.round(pctChange))}% below average — treat yourself?`,
      });
    }
  });

  // Check for consecutive trending
  if (monthlyData.length >= 3) {
    DIMENSION_KEYS.forEach(d => {
      const last3 = monthlyData.slice(-3).map(m => m.dimensions[d].amount);
      const isRising = last3[0] < last3[1] && last3[1] < last3[2] && last3[2] > 0;
      const isFalling = last3[0] > last3[1] && last3[1] > last3[2] && last3[0] > 0;

      if (isRising) {
        // Avoid duplicate if already have a 'high' nudge for this dimension
        if (!nudges.find(n => n.dimension === d && n.type === 'high')) {
          nudges.push({
            type: 'trending_up',
            dimension: d,
            emoji: '🔥',
            icon: DIMENSIONS[d].emoji,
            color: DIMENSIONS[d].color,
            title: `${DIMENSIONS[d].label} trending up 3 months`,
            desc: `${DIMENSIONS[d].label} has been rising for 3 consecutive months.`,
          });
        }
      }
      if (isFalling) {
        if (!nudges.find(n => n.dimension === d && n.type === 'low')) {
          nudges.push({
            type: 'trending_down',
            dimension: d,
            emoji: '💤',
            icon: DIMENSIONS[d].emoji,
            color: DIMENSIONS[d].color,
            title: `${DIMENSIONS[d].label} declining steadily`,
            desc: `${DIMENSIONS[d].label} has been dropping for 3 months in a row.`,
          });
        }
      }
    });
  }

  // Balance nudge
  const currentScore = computeBalanceScore(current.dimensions);
  if (currentScore < 35) {
    const dominant = DIMENSION_KEYS.reduce((max, d) =>
      current.dimensions[d].amount > current.dimensions[max].amount ? d : max,
      DIMENSION_KEYS[0]
    );
    nudges.push({
      type: 'imbalance',
      dimension: null,
      emoji: '⚖️',
      icon: '⚠️',
      color: '#f59e0b',
      title: 'Spending is heavily skewed',
      desc: `Most of your spending is in ${DIMENSIONS[dominant].label}. A more balanced lifestyle tends to feel better!`,
    });
  } else if (currentScore > 75) {
    nudges.push({
      type: 'balanced',
      dimension: null,
      emoji: '🌟',
      icon: '✅',
      color: '#10b981',
      title: 'Great balance!',
      desc: `Your spending is well-distributed this month. Your lifestyle balance score is ${currentScore}/100!`,
    });
  }

  return nudges.slice(0, 4); // Cap at 4 nudges
}
