import { format, parseISO, subMonths, differenceInDays } from 'date-fns';
import { getUserId as getConfigUserId } from './config';

export function getUserId() {
  return getConfigUserId();
}

export function computeOverallBalances(groups, userId) {
  const byCurrency = {};

  groups.forEach(group => {
    if (!group.members) return;
    const me = group.members.find(m => m.id === userId);
    if (!me || !me.balance) return;
    me.balance.forEach(b => {
      const currency = b.currency_code || 'INR';
      const amt = parseFloat(b.amount);
      if (!byCurrency[currency]) byCurrency[currency] = { owed: 0, owe: 0 };
      if (amt > 0) byCurrency[currency].owed += amt;
      else byCurrency[currency].owe += Math.abs(amt);
    });
  });

  // Build per-currency array sorted by total activity
  const currencies = Object.entries(byCurrency)
    .map(([code, { owed, owe }]) => ({ code, owed, owe, net: owed - owe }))
    .sort((a, b) => (b.owed + b.owe) - (a.owed + a.owe));

  const primary = currencies[0] || { code: 'INR', owed: 0, owe: 0, net: 0 };

  return {
    currencies,
    primaryCurrency: primary.code,
    // Legacy shortcuts for the primary currency (used by settle-up, insights, etc.)
    totalOwed: primary.owed,
    totalOwe: primary.owe,
    netBalance: primary.net,
  };
}

export function computeFriendBalances(friends, userId) {
  return friends
    .filter(f => f.balance && f.balance.length > 0)
    .map(f => {
      // Build per-currency balance array
      const allBalances = f.balance
        .map(b => ({ amount: parseFloat(b.amount), currency: b.currency_code || 'INR' }))
        .filter(b => Math.abs(b.amount) > 0.01);

      // Primary = largest absolute amount (for sorting and backward-compat)
      const primary = allBalances.reduce(
        (best, b) => Math.abs(b.amount) > Math.abs(best.amount) ? b : best,
        { amount: 0, currency: allBalances[0]?.currency || 'INR' }
      );

      return {
        id: f.id,
        name: `${f.first_name} ${f.last_name || ''}`.trim(),
        picture: f.picture?.medium,
        balance: primary.amount,       // primary currency amount (for sorting)
        currency: primary.currency,    // primary currency code
        allBalances,                   // all per-currency balances
      };
    })
    .filter(f => Math.abs(f.balance) > 0.5)
    .sort((a, b) => b.balance - a.balance);
}

export function computeExpensesByCategory(expenses, userId) {
  const categories = {};

  expenses.forEach(exp => {
    if (exp.payment || exp.deleted_at) return;
    const catName = exp.category?.name || 'Other';
    const userShare = exp.users?.find(u => u.user_id === userId);
    const amount = userShare ? parseFloat(userShare.owed_share) : 0;
    if (amount <= 0) return;

    if (!categories[catName]) {
      categories[catName] = { name: catName, amount: 0, count: 0 };
    }
    categories[catName].amount += amount;
    categories[catName].count += 1;
  });

  return Object.values(categories).sort((a, b) => b.amount - a.amount);
}

export function computeMonthlySpending(expenses, userId, months = 12) {
  const now = new Date();
  const monthMap = {};

  for (let i = months - 1; i >= 0; i--) {
    const d = subMonths(now, i);
    const key = format(d, 'yyyy-MM');
    monthMap[key] = { month: format(d, 'MMM yyyy'), shortMonth: format(d, 'MMM'), total: 0, paid: 0, share: 0 };
  }

  expenses.forEach(exp => {
    if (exp.payment || exp.deleted_at) return;
    const date = parseISO(exp.date);
    const key = format(date, 'yyyy-MM');
    if (!monthMap[key]) return;

    const totalCost = parseFloat(exp.cost);
    const userEntry = exp.users?.find(u => u.user_id === userId);
    const paidShare = userEntry ? parseFloat(userEntry.paid_share) : 0;
    const owedShare = userEntry ? parseFloat(userEntry.owed_share) : 0;

    monthMap[key].total += totalCost;
    monthMap[key].paid += paidShare;
    monthMap[key].share += owedShare;
  });

  return Object.values(monthMap);
}

export function computeGroupSpending(groups, expenses, userId) {
  const groupMap = {};

  groups.forEach(g => {
    if (g.id === 0) return;
    groupMap[g.id] = {
      id: g.id, name: g.name, type: g.group_type,
      totalExpenses: 0, yourShare: 0,
      memberCount: g.members?.length || 0, expenseCount: 0,
    };
  });

  expenses.forEach(exp => {
    if (exp.payment || exp.deleted_at) return;
    const gid = exp.group_id;
    if (!groupMap[gid]) return;

    groupMap[gid].totalExpenses += parseFloat(exp.cost);
    groupMap[gid].expenseCount += 1;
    const userEntry = exp.users?.find(u => u.user_id === userId);
    if (userEntry) groupMap[gid].yourShare += parseFloat(userEntry.owed_share);
  });

  return Object.values(groupMap)
    .filter(g => g.totalExpenses > 0)
    .sort((a, b) => b.totalExpenses - a.totalExpenses);
}

export function computeTopPayers(expenses) {
  const payers = {};

  expenses.forEach(exp => {
    if (exp.payment || exp.deleted_at) return;
    exp.users?.forEach(u => {
      const paid = parseFloat(u.paid_share);
      if (paid <= 0) return;
      const name = `${u.user?.first_name || ''} ${u.user?.last_name || ''}`.trim();
      if (!payers[u.user_id]) {
        payers[u.user_id] = { id: u.user_id, name, totalPaid: 0, count: 0, picture: u.user?.picture?.medium };
      }
      payers[u.user_id].totalPaid += paid;
      payers[u.user_id].count += 1;
    });
  });

  return Object.values(payers).sort((a, b) => b.totalPaid - a.totalPaid);
}

export function computeRecentExpenses(expenses, limit = 15) {
  return expenses
    .filter(e => !e.payment && !e.deleted_at)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
}

export function computeDayOfWeekSpending(expenses, userId) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayMap = days.map(d => ({ day: d, amount: 0, count: 0 }));

  expenses.forEach(exp => {
    if (exp.payment || exp.deleted_at) return;
    const date = parseISO(exp.date);
    const dayIdx = date.getDay();
    const userEntry = exp.users?.find(u => u.user_id === userId);
    const share = userEntry ? parseFloat(userEntry.owed_share) : 0;
    dayMap[dayIdx].amount += share;
    dayMap[dayIdx].count += 1;
  });

  return dayMap;
}

// ── New analytics for enhanced features ──

export function computeMonthlyComparison(expenses, userId) {
  const now = new Date();
  const thisMonth = format(now, 'yyyy-MM');
  const lastMonth = format(subMonths(now, 1), 'yyyy-MM');

  let thisTotal = 0, lastTotal = 0;

  expenses.forEach(exp => {
    if (exp.payment || exp.deleted_at) return;
    const key = format(parseISO(exp.date), 'yyyy-MM');
    const userEntry = exp.users?.find(u => u.user_id === userId);
    const share = userEntry ? parseFloat(userEntry.owed_share) : 0;
    if (key === thisMonth) thisTotal += share;
    if (key === lastMonth) lastTotal += share;
  });

  const pctChange = lastTotal > 0 ? ((thisTotal - lastTotal) / lastTotal) * 100 : 0;
  return { thisMonth: thisTotal, lastMonth: lastTotal, pctChange };
}

export function computeCategoryTrend(expenses, userId, months = 4) {
  const now = new Date();
  const monthKeys = [];
  for (let i = months - 1; i >= 0; i--) {
    monthKeys.push(format(subMonths(now, i), 'yyyy-MM'));
  }

  const catMonthMap = {};
  expenses.forEach(exp => {
    if (exp.payment || exp.deleted_at) return;
    const key = format(parseISO(exp.date), 'yyyy-MM');
    if (!monthKeys.includes(key)) return;
    const catName = exp.category?.name || 'Other';
    const userEntry = exp.users?.find(u => u.user_id === userId);
    const share = userEntry ? parseFloat(userEntry.owed_share) : 0;
    if (share <= 0) return;

    if (!catMonthMap[key]) catMonthMap[key] = {};
    catMonthMap[key][catName] = (catMonthMap[key][catName] || 0) + share;
  });

  // Get top 5 categories across all months
  const catTotals = {};
  Object.values(catMonthMap).forEach(cm => {
    Object.entries(cm).forEach(([cat, amt]) => {
      catTotals[cat] = (catTotals[cat] || 0) + amt;
    });
  });
  const topCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);

  return monthKeys.map(key => {
    const row = { month: format(parseISO(key + '-01'), 'MMM') };
    topCats.forEach(cat => {
      row[cat] = catMonthMap[key]?.[cat] || 0;
    });
    return row;
  });
}

export function computeSmartInsights(expenses, friends, groups, userId) {
  const insights = [];
  const validExpenses = expenses.filter(e => !e.payment && !e.deleted_at);

  // Top spending category
  const cats = computeExpensesByCategory(validExpenses, userId);
  if (cats.length > 0) {
    const topCat = cats[0];
    const total = cats.reduce((s, c) => s + c.amount, 0);
    const pct = total > 0 ? Math.round((topCat.amount / total) * 100) : 0;
    insights.push({
      type: 'category',
      icon: '📊',
      title: `${topCat.name} dominates`,
      desc: `${pct}% of your spending (${formatCurrency(topCat.amount)}) goes to ${topCat.name}. That's ${topCat.count} expenses.`,
    });
  }

  // Biggest single expense
  let maxExp = null;
  let maxShare = 0;
  validExpenses.forEach(exp => {
    const u = exp.users?.find(x => x.user_id === userId);
    const share = u ? parseFloat(u.owed_share) : 0;
    if (share > maxShare) { maxShare = share; maxExp = exp; }
  });
  if (maxExp) {
    insights.push({
      type: 'expense',
      icon: '💰',
      title: 'Biggest expense',
      desc: `"${maxExp.description}" — your share was ${formatCurrency(maxShare)}`,
    });
  }

  // Month comparison
  const comparison = computeMonthlyComparison(validExpenses, userId);
  if (comparison.lastMonth > 0) {
    const direction = comparison.pctChange > 0 ? 'up' : 'down';
    const emoji = comparison.pctChange > 0 ? '📈' : '📉';
    insights.push({
      type: 'trend',
      icon: emoji,
      title: `Spending ${direction} ${Math.abs(Math.round(comparison.pctChange))}%`,
      desc: `This month: ${formatCurrency(comparison.thisMonth)} vs last month: ${formatCurrency(comparison.lastMonth)}`,
    });
  }

  // Most active group
  const groupCounts = {};
  validExpenses.forEach(exp => {
    const gid = exp.group_id;
    if (!gid) return;
    groupCounts[gid] = (groupCounts[gid] || 0) + 1;
  });
  const topGroupId = Object.entries(groupCounts).sort((a, b) => b[1] - a[1])[0];
  if (topGroupId) {
    const g = groups.find(g => g.id === parseInt(topGroupId[0]));
    if (g) {
      insights.push({
        type: 'group',
        icon: '👥',
        title: `Most active: ${g.name}`,
        desc: `${topGroupId[1]} expenses in this group recently`,
      });
    }
  }

  // Who owes you most
  const friendBalances = computeFriendBalances(friends, userId);
  const topOwer = friendBalances.find(f => f.balance > 0);
  if (topOwer) {
    insights.push({
      type: 'friend',
      icon: '🤝',
      title: `${topOwer.name} owes you the most`,
      desc: `Outstanding: ${formatCurrency(topOwer.balance, topOwer.currency)}`,
    });
  }

  // Average expense
  if (validExpenses.length > 0) {
    let totalShare = 0;
    validExpenses.forEach(exp => {
      const u = exp.users?.find(x => x.user_id === userId);
      totalShare += u ? parseFloat(u.owed_share) : 0;
    });
    insights.push({
      type: 'average',
      icon: '📐',
      title: 'Average expense share',
      desc: `${formatCurrency(totalShare / validExpenses.length)} across ${validExpenses.length} expenses`,
    });
  }

  // Spending velocity
  if (validExpenses.length >= 2) {
    const sorted = [...validExpenses].sort((a, b) => new Date(a.date) - new Date(b.date));
    const firstDate = parseISO(sorted[0].date);
    const lastDate = parseISO(sorted[sorted.length - 1].date);
    const days = differenceInDays(lastDate, firstDate) || 1;
    let totalShare = 0;
    validExpenses.forEach(exp => {
      const u = exp.users?.find(x => x.user_id === userId);
      totalShare += u ? parseFloat(u.owed_share) : 0;
    });
    const perDay = totalShare / days;
    insights.push({
      type: 'velocity',
      icon: '⚡',
      title: `${formatCurrency(perDay)}/day`,
      desc: `Average daily spending rate over ${days} days`,
    });
  }

  return insights;
}

export function computeSettleUpSuggestions(groups, userId, friends = [], currentUser = null) {
  const suggestions = [];

  // Build a lookup map for resolving user names
  // Priority: group members -> friends -> current user
  const buildNameLookup = (group) => {
    const lookup = {};
    
    // Add group members
    group.members?.forEach(m => {
      lookup[m.id] = `${m.first_name} ${m.last_name || ''}`.trim();
    });
    
    // Add friends (for non-group expenses where members might be empty)
    friends.forEach(f => {
      if (!lookup[f.id]) {
        lookup[f.id] = `${f.first_name} ${f.last_name || ''}`.trim();
      }
    });
    
    // Add current user
    if (currentUser && !lookup[userId]) {
      lookup[userId] = `${currentUser.first_name} ${currentUser.last_name || ''}`.trim();
    }
    
    return lookup;
  };

  groups.forEach(group => {
    const debts = group.simplified_debts || group.original_debts || [];
    const nameLookup = buildNameLookup(group);
    
    debts.forEach(debt => {
      const fromId = debt.from;
      const toId = debt.to;
      const amount = parseFloat(debt.amount);
      if (amount < 1) return;

      if (fromId === userId || toId === userId) {
        suggestions.push({
          groupId: group.id,
          groupName: group.id === 0 ? 'Non-group expenses' : group.name,
          from: fromId,
          fromName: nameLookup[fromId] || 'Unknown',
          to: toId,
          toName: nameLookup[toId] || 'Unknown',
          amount,
          currency: debt.currency_code || 'INR',
          youPay: fromId === userId,
        });
      }
    });
  });

  return suggestions.sort((a, b) => b.amount - a.amount);
}

// ── Budget Helpers ──

/**
 * Compute expenses by category for a specific month
 * @param {Array} expenses - All expenses
 * @param {number} userId - Current user ID
 * @param {string} month - Month in YYYY-MM format
 * @returns {Object} Category spending { "Food & Drink": { amount, count }, ... }
 */
export function computeMonthlyExpensesByCategory(expenses, userId, month) {
  const categories = {};

  expenses.forEach(exp => {
    if (exp.payment || exp.deleted_at) return;
    
    // Filter to the specific month
    const expMonth = format(parseISO(exp.date), 'yyyy-MM');
    if (expMonth !== month) return;

    const catName = exp.category?.name || 'Other';
    const userShare = exp.users?.find(u => u.user_id === userId);
    const amount = userShare ? parseFloat(userShare.owed_share) : 0;
    if (amount <= 0) return;

    if (!categories[catName]) {
      categories[catName] = { name: catName, amount: 0, count: 0 };
    }
    categories[catName].amount += amount;
    categories[catName].count += 1;
  });

  return categories;
}

/**
 * Compute overall spending for a specific month
 * @param {Array} expenses - All expenses
 * @param {number} userId - Current user ID
 * @param {string} month - Month in YYYY-MM format
 * @returns {number} Total spending for the month
 */
export function computeMonthlyTotal(expenses, userId, month) {
  let total = 0;

  expenses.forEach(exp => {
    if (exp.payment || exp.deleted_at) return;
    
    const expMonth = format(parseISO(exp.date), 'yyyy-MM');
    if (expMonth !== month) return;

    const userShare = exp.users?.find(u => u.user_id === userId);
    const amount = userShare ? parseFloat(userShare.owed_share) : 0;
    if (amount > 0) total += amount;
  });

  return total;
}

/**
 * Compute budget status with alerts
 * @param {Object} budget - Budget configuration from Firestore
 * @param {Object} splitwiseSpending - Category spending from computeMonthlyExpensesByCategory
 * @param {number} splitwiseTotal - Total Splitwise spending
 * @returns {Object} Budget status with overall and per-category status
 */
export function computeBudgetStatus(budget, splitwiseSpending, splitwiseTotal) {
  if (!budget) return null;

  // Calculate manual entries totals
  const manualByCategory = {};
  let manualTotal = 0;
  
  (budget.manualEntries || []).forEach(entry => {
    const cat = entry.category || 'Other';
    manualByCategory[cat] = (manualByCategory[cat] || 0) + entry.amount;
    manualTotal += entry.amount;
  });

  // Overall status
  const overallSpent = splitwiseTotal + manualTotal;
  const overallLimit = budget.overallLimit || 0;
  const overallPercentage = overallLimit > 0 ? (overallSpent / overallLimit) * 100 : 0;
  const overallRemaining = overallLimit - overallSpent;

  // Category statuses
  const categoryStatuses = {};
  const allCategories = new Set([
    ...Object.keys(budget.categoryLimits || {}),
    ...Object.keys(splitwiseSpending || {}),
    ...Object.keys(manualByCategory),
  ]);

  allCategories.forEach(cat => {
    const limit = budget.categoryLimits?.[cat] || 0;
    const splitwiseAmount = splitwiseSpending?.[cat]?.amount || 0;
    const manualAmount = manualByCategory[cat] || 0;
    const spent = splitwiseAmount + manualAmount;
    const percentage = limit > 0 ? (spent / limit) * 100 : (spent > 0 ? 100 : 0);
    const remaining = limit - spent;

    categoryStatuses[cat] = {
      name: cat,
      limit,
      spent,
      splitwiseAmount,
      manualAmount,
      percentage: Math.round(percentage),
      remaining,
      status: getAlertStatus(percentage, limit),
      hasLimit: limit > 0,
    };
  });

  return {
    overall: {
      limit: overallLimit,
      spent: overallSpent,
      splitwiseAmount: splitwiseTotal,
      manualAmount: manualTotal,
      percentage: Math.round(overallPercentage),
      remaining: overallRemaining,
      status: getAlertStatus(overallPercentage, overallLimit),
    },
    categories: categoryStatuses,
    currency: budget.currency || 'INR',
  };
}

/**
 * Get alert status based on percentage
 * @param {number} percentage - Spending percentage
 * @param {number} limit - Budget limit
 * @returns {string} Status: 'on_track', 'warning', 'critical', 'over_budget', 'no_limit'
 */
function getAlertStatus(percentage, limit) {
  if (limit <= 0) return 'no_limit';
  if (percentage > 100) return 'over_budget';
  if (percentage >= 90) return 'critical';
  if (percentage >= 70) return 'warning';
  return 'on_track';
}

/**
 * Get unique categories from expenses
 * @param {Array} expenses - All expenses
 * @returns {Array} Sorted array of unique category names
 */
export function getUniqueCategories(expenses) {
  const categories = new Set();
  
  expenses.forEach(exp => {
    if (exp.payment || exp.deleted_at) return;
    const catName = exp.category?.name;
    if (catName) categories.add(catName);
  });

  return Array.from(categories).sort();
}

// ── Search ──

export function searchEverything(query, { groups, friends, expenses, userId }) {
  const q = query.toLowerCase().trim();
  if (!q) return { groups: [], friends: [], expenses: [] };

  const matchedGroups = (groups || []).filter(g =>
    g.id !== 0 && g.name?.toLowerCase().includes(q)
  ).slice(0, 8);

  const matchedFriends = (friends || []).filter(f => {
    const name = `${f.first_name} ${f.last_name || ''}`.toLowerCase();
    return name.includes(q) || f.email?.toLowerCase().includes(q);
  }).slice(0, 8);

  const matchedExpenses = (expenses || []).filter(e => {
    if (e.payment || e.deleted_at) return false;
    return (
      e.description?.toLowerCase().includes(q) ||
      e.category?.name?.toLowerCase().includes(q) ||
      e.users?.some(u => {
        const name = `${u.user?.first_name || ''} ${u.user?.last_name || ''}`.toLowerCase();
        return name.includes(q);
      })
    );
  }).slice(0, 12);

  return { groups: matchedGroups, friends: matchedFriends, expenses: matchedExpenses };
}

// ── Formatters ──

export function formatCurrency(amount, currency = 'INR') {
  // Use locale appropriate to the currency
  const localeMap = { INR: 'en-IN', USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', AUD: 'en-AU', CAD: 'en-CA', SGD: 'en-SG', AED: 'en-AE', JPY: 'ja-JP' };
  const locale = localeMap[currency] || 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency', currency, maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompact(amount, currency = 'INR') {
  const symbol = getCurrencySymbol(currency);
  const abs = Math.abs(amount);
  // Use Lakh notation only for INR; K/M for everything else
  if (currency === 'INR') {
    if (abs >= 100000) return `${symbol}${(amount / 100000).toFixed(1)}L`;
    if (abs >= 1000) return `${symbol}${(amount / 1000).toFixed(1)}K`;
  } else {
    if (abs >= 1000000) return `${symbol}${(amount / 1000000).toFixed(1)}M`;
    if (abs >= 1000) return `${symbol}${(amount / 1000).toFixed(1)}K`;
  }
  return `${symbol}${Math.round(amount)}`;
}

/** Get the symbol for a currency code */
export function getCurrencySymbol(currency = 'INR') {
  try {
    // Use Intl to reliably extract just the symbol
    const parts = new Intl.NumberFormat('en', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).formatToParts(0);
    return parts.find(p => p.type === 'currency')?.value || currency;
  } catch {
    return currency;
  }
}

/**
 * Compute per-currency balances for a group member array.
 * Returns an array of { amount, currency } sorted by |amount| desc.
 */
export function computeMemberBalances(members, userId) {
  const me = members?.find(m => m.id === userId);
  if (!me?.balance || me.balance.length === 0) return [];
  return me.balance
    .map(b => ({ amount: parseFloat(b.amount), currency: b.currency_code || 'INR' }))
    .filter(b => Math.abs(b.amount) > 0.01)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
}
