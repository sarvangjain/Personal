import { format, parseISO, subMonths, differenceInDays } from 'date-fns';
import { getUserId as getConfigUserId } from './config';

export function getUserId() {
  return getConfigUserId();
}

export function computeOverallBalances(groups, userId) {
  let totalOwed = 0;
  let totalOwe = 0;

  groups.forEach(group => {
    if (!group.members) return;
    const me = group.members.find(m => m.id === userId);
    if (!me || !me.balance) return;
    me.balance.forEach(b => {
      const amt = parseFloat(b.amount);
      if (amt > 0) totalOwed += amt;
      else totalOwe += Math.abs(amt);
    });
  });

  return { totalOwed, totalOwe, netBalance: totalOwed - totalOwe };
}

export function computeFriendBalances(friends, userId) {
  return friends
    .filter(f => f.balance && f.balance.length > 0)
    .map(f => {
      const bal = f.balance.reduce((sum, b) => sum + parseFloat(b.amount), 0);
      return {
        id: f.id,
        name: `${f.first_name} ${f.last_name || ''}`.trim(),
        picture: f.picture?.medium,
        balance: bal,
        currency: f.balance[0]?.currency_code || 'INR',
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
      desc: `Outstanding: ${formatCurrency(topOwer.balance)}`,
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

export function computeSettleUpSuggestions(groups, userId) {
  const suggestions = [];

  groups.forEach(group => {
    const debts = group.simplified_debts || group.original_debts || [];
    debts.forEach(debt => {
      const fromId = debt.from;
      const toId = debt.to;
      const amount = parseFloat(debt.amount);
      if (amount < 1) return;

      const fromMember = group.members?.find(m => m.id === fromId);
      const toMember = group.members?.find(m => m.id === toId);

      if (fromId === userId || toId === userId) {
        suggestions.push({
          groupId: group.id,
          groupName: group.name,
          from: fromId,
          fromName: fromMember ? `${fromMember.first_name} ${fromMember.last_name || ''}`.trim() : 'Unknown',
          to: toId,
          toName: toMember ? `${toMember.first_name} ${toMember.last_name || ''}`.trim() : 'Unknown',
          amount,
          currency: debt.currency_code || 'INR',
          youPay: fromId === userId,
        });
      }
    });
  });

  return suggestions.sort((a, b) => b.amount - a.amount);
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
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency, maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompact(amount) {
  if (Math.abs(amount) >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (Math.abs(amount) >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${Math.round(amount)}`;
}
