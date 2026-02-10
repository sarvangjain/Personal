import { format, parseISO, startOfMonth, subMonths, isAfter, isBefore } from 'date-fns';

export function getUserId() {
  return parseInt(import.meta.env.VITE_SPLITWISE_USER_ID) || 0;
}

export function computeOverallBalances(groups, userId) {
  let totalOwed = 0; // others owe you
  let totalOwe = 0;  // you owe others

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
      id: g.id,
      name: g.name,
      type: g.group_type,
      totalExpenses: 0,
      yourShare: 0,
      memberCount: g.members?.length || 0,
      expenseCount: 0,
    };
  });

  expenses.forEach(exp => {
    if (exp.payment || exp.deleted_at) return;
    const gid = exp.group_id;
    if (!groupMap[gid]) return;

    groupMap[gid].totalExpenses += parseFloat(exp.cost);
    groupMap[gid].expenseCount += 1;
    const userEntry = exp.users?.find(u => u.user_id === userId);
    if (userEntry) {
      groupMap[gid].yourShare += parseFloat(userEntry.owed_share);
    }
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

export function formatCurrency(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompact(amount) {
  if (Math.abs(amount) >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (Math.abs(amount) >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${Math.round(amount)}`;
}
