import { parseISO, differenceInDays, format, differenceInHours } from 'date-fns';

/**
 * Auto-detect trips/events from expenses.
 *
 * Strategy: Group expenses by group_id, then within each group find temporal
 * "clusters" — bursts of ≥3 expenses within a tight time window where
 * the average gap between consecutive expenses is ≤ 3 days.
 *
 * Also detects non-group trips where a burst of expenses happen in quick
 * succession across any context.
 */
export function detectTrips(expenses, groups, userId, minExpenses = 3, maxGapDays = 3) {
  const valid = expenses.filter(e => !e.payment && !e.deleted_at);
  const trips = [];

  // Build a group name lookup
  const groupNames = {};
  groups.forEach(g => { groupNames[g.id] = g.name; });

  // ── Strategy 1: Group-based cluster detection ──
  const byGroup = {};
  valid.forEach(exp => {
    const gid = exp.group_id;
    if (!gid || gid === 0) return;
    if (!byGroup[gid]) byGroup[gid] = [];
    byGroup[gid].push(exp);
  });

  Object.entries(byGroup).forEach(([gid, groupExpenses]) => {
    if (groupExpenses.length < minExpenses) return;

    const sorted = groupExpenses.sort((a, b) => new Date(a.date) - new Date(b.date));
    const clusters = findClusters(sorted, maxGapDays, minExpenses);

    clusters.forEach(cluster => {
      trips.push(buildTrip(cluster, parseInt(gid), groupNames[parseInt(gid)] || 'Unknown Group', userId));
    });
  });

  // Sort by start date descending (most recent first)
  trips.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

  return trips;
}

/**
 * Find temporal clusters in a sorted array of expenses.
 * A cluster is a maximal consecutive subsequence where each pair of
 * adjacent expenses is ≤ maxGapDays apart.
 */
function findClusters(sortedExpenses, maxGapDays, minSize) {
  const clusters = [];
  let current = [sortedExpenses[0]];

  for (let i = 1; i < sortedExpenses.length; i++) {
    const gap = differenceInDays(
      parseISO(sortedExpenses[i].date),
      parseISO(sortedExpenses[i - 1].date)
    );

    if (gap <= maxGapDays) {
      current.push(sortedExpenses[i]);
    } else {
      if (current.length >= minSize) {
        clusters.push([...current]);
      }
      current = [sortedExpenses[i]];
    }
  }

  // Don't forget the last cluster
  if (current.length >= minSize) {
    clusters.push(current);
  }

  return clusters;
}

/**
 * Build a rich trip summary object from a cluster of expenses.
 */
function buildTrip(expenses, groupId, groupName, userId) {
  const sorted = expenses.sort((a, b) => new Date(a.date) - new Date(b.date));
  const startDate = parseISO(sorted[0].date);
  const endDate = parseISO(sorted[sorted.length - 1].date);
  const durationDays = Math.max(differenceInDays(endDate, startDate) + 1, 1);

  // Total group spend & your share
  let totalGroupSpend = 0;
  let yourShare = 0;
  let yourPaid = 0;
  const categorySplit = {};
  const payerMap = {};
  const memberSet = new Set();
  const expenseDetails = [];

  sorted.forEach(exp => {
    const cost = parseFloat(exp.cost);
    totalGroupSpend += cost;

    const catName = exp.category?.name || 'Other';
    categorySplit[catName] = (categorySplit[catName] || 0) + cost;

    exp.users?.forEach(u => {
      memberSet.add(u.user_id);
      const paid = parseFloat(u.paid_share) || 0;
      const owed = parseFloat(u.owed_share) || 0;
      const name = `${u.user?.first_name || ''} ${u.user?.last_name || ''}`.trim();
      const pic = u.user?.picture?.medium;

      if (u.user_id === userId) {
        yourShare += owed;
        yourPaid += paid;
      }

      if (paid > 0) {
        if (!payerMap[u.user_id]) {
          payerMap[u.user_id] = { id: u.user_id, name, picture: pic, totalPaid: 0, count: 0 };
        }
        payerMap[u.user_id].totalPaid += paid;
        payerMap[u.user_id].count += 1;
      }
    });

    expenseDetails.push({
      id: exp.id,
      description: exp.description,
      cost,
      date: exp.date,
      category: catName,
      yourShare: exp.users?.find(u => u.user_id === userId)?.owed_share
        ? parseFloat(exp.users.find(u => u.user_id === userId).owed_share)
        : 0,
    });
  });

  // Top payers sorted by total paid
  const payers = Object.values(payerMap).sort((a, b) => b.totalPaid - a.totalPaid);
  const generousPayer = payers[0] || null;

  // Category split sorted
  const categories = Object.entries(categorySplit)
    .map(([name, amount]) => ({ name, amount, percentage: totalGroupSpend > 0 ? Math.round((amount / totalGroupSpend) * 100) : 0 }))
    .sort((a, b) => b.amount - a.amount);

  // Biggest single expense
  const biggestExpense = expenseDetails.reduce(
    (max, e) => e.cost > max.cost ? e : max,
    expenseDetails[0]
  );

  // Detect trip "vibe" based on top category
  const topCategory = categories[0]?.name?.toLowerCase() || '';
  let vibe = { emoji: '🗺️', label: 'Adventure' };
  if (topCategory.includes('food') || topCategory.includes('restaurant') || topCategory.includes('dining')) {
    vibe = { emoji: '🍕', label: 'Foodie Trip' };
  } else if (topCategory.includes('hotel') || topCategory.includes('rent')) {
    vibe = { emoji: '🏨', label: 'Getaway' };
  } else if (topCategory.includes('transport') || topCategory.includes('taxi') || topCategory.includes('plane')) {
    vibe = { emoji: '✈️', label: 'Road Trip' };
  } else if (topCategory.includes('entertainment') || topCategory.includes('movie') || topCategory.includes('game')) {
    vibe = { emoji: '🎉', label: 'Fun Outing' };
  } else if (topCategory.includes('shopping')) {
    vibe = { emoji: '🛍️', label: 'Shopping Spree' };
  } else if (topCategory.includes('drink') || topCategory.includes('liquor')) {
    vibe = { emoji: '🍻', label: 'Night Out' };
  }

  // Currency (use the most common one)
  const currencyCounts = {};
  sorted.forEach(exp => {
    const c = exp.currency_code || 'INR';
    currencyCounts[c] = (currencyCounts[c] || 0) + 1;
  });
  const currency = Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'INR';

  return {
    id: `${groupId}-${format(startDate, 'yyyyMMdd')}`,
    groupId,
    groupName,
    startDate: sorted[0].date,
    endDate: sorted[sorted.length - 1].date,
    startLabel: format(startDate, 'MMM d'),
    endLabel: format(endDate, 'MMM d, yyyy'),
    dateRange: durationDays === 1
      ? format(startDate, 'MMM d, yyyy')
      : `${format(startDate, 'MMM d')} — ${format(endDate, 'MMM d, yyyy')}`,
    durationDays,
    expenseCount: sorted.length,
    memberCount: memberSet.size,
    totalGroupSpend,
    yourShare,
    yourPaid,
    netContribution: yourPaid - yourShare,
    perDayBurnRate: totalGroupSpend / durationDays,
    yourPerDayRate: yourShare / durationDays,
    categories,
    payers,
    generousPayer,
    biggestExpense,
    expenses: expenseDetails,
    vibe,
    currency,
  };
}

/**
 * Format currency for trip display (more compact).
 */
export function formatTripCurrency(amount, currency = 'INR') {
  if (Math.abs(amount) >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (Math.abs(amount) >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${Math.round(amount)}`;
}
