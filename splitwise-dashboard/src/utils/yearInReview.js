import { format, parseISO, getDay, getMonth, startOfYear, endOfYear, differenceInDays } from 'date-fns';

/**
 * Compute comprehensive Year in Review statistics
 * @param {Array} expenses - All expenses for the year
 * @param {Array} groups - User's groups
 * @param {Array} friends - User's friends
 * @param {number} userId - Current user's ID
 * @param {number} year - The year to analyze (default: current year)
 */
export function computeYearInReview(expenses, groups, friends, userId, year = new Date().getFullYear()) {
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 11, 31));
  
  // Filter expenses for the specified year
  const yearExpenses = expenses.filter(exp => {
    if (exp.payment || exp.deleted_at) return false;
    const date = parseISO(exp.date);
    return date >= yearStart && date <= yearEnd;
  });

  if (yearExpenses.length === 0) {
    return null; // No data for this year
  }

  // Basic stats
  const totalStats = computeTotalStats(yearExpenses, userId);
  
  // Category breakdown
  const categoryStats = computeCategoryStats(yearExpenses, userId);
  
  // Monthly journey
  const monthlyStats = computeMonthlyStats(yearExpenses, userId, year);
  
  // Social stats
  const socialStats = computeSocialStats(yearExpenses, groups, friends, userId);
  
  // Time patterns
  const timePatterns = computeTimePatterns(yearExpenses, userId);
  
  // Notable expenses
  const notableExpenses = computeNotableExpenses(yearExpenses, userId);
  
  // Personality
  const personality = computePersonality(categoryStats, timePatterns, totalStats);
  
  // Fun facts
  const funFacts = computeFunFacts(yearExpenses, userId, totalStats, socialStats);

  return {
    year,
    totalStats,
    categoryStats,
    monthlyStats,
    socialStats,
    timePatterns,
    notableExpenses,
    personality,
    funFacts,
    generatedAt: new Date().toISOString(),
  };
}

function computeTotalStats(expenses, userId) {
  let totalExpenseCount = 0;
  let totalYourShare = 0;
  let totalYouPaid = 0;
  let totalGroupSpend = 0;
  const uniqueGroups = new Set();
  const uniquePeople = new Set();

  expenses.forEach(exp => {
    totalExpenseCount++;
    totalGroupSpend += parseFloat(exp.cost);
    
    if (exp.group_id) uniqueGroups.add(exp.group_id);
    
    exp.users?.forEach(u => {
      if (u.user_id !== userId) uniquePeople.add(u.user_id);
      if (u.user_id === userId) {
        totalYourShare += parseFloat(u.owed_share) || 0;
        totalYouPaid += parseFloat(u.paid_share) || 0;
      }
    });
  });

  return {
    totalExpenseCount,
    totalYourShare,
    totalYouPaid,
    totalGroupSpend,
    netContribution: totalYouPaid - totalYourShare,
    uniqueGroupsCount: uniqueGroups.size,
    uniquePeopleCount: uniquePeople.size,
    averageExpense: totalExpenseCount > 0 ? totalYourShare / totalExpenseCount : 0,
  };
}

function computeCategoryStats(expenses, userId) {
  const categories = {};

  expenses.forEach(exp => {
    const catName = exp.category?.name || 'Other';
    const userEntry = exp.users?.find(u => u.user_id === userId);
    const share = userEntry ? parseFloat(userEntry.owed_share) : 0;
    
    if (!categories[catName]) {
      categories[catName] = { name: catName, amount: 0, count: 0 };
    }
    categories[catName].amount += share;
    categories[catName].count++;
  });

  const sorted = Object.values(categories).sort((a, b) => b.amount - a.amount);
  const total = sorted.reduce((s, c) => s + c.amount, 0);
  
  return {
    categories: sorted.map(c => ({
      ...c,
      percentage: total > 0 ? (c.amount / total) * 100 : 0,
    })),
    topCategory: sorted[0] || null,
    totalCategories: sorted.length,
  };
}

function computeMonthlyStats(expenses, userId, year) {
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i,
    name: format(new Date(year, i, 1), 'MMM'),
    fullName: format(new Date(year, i, 1), 'MMMM'),
    amount: 0,
    count: 0,
  }));

  expenses.forEach(exp => {
    const date = parseISO(exp.date);
    const monthIdx = getMonth(date);
    const userEntry = exp.users?.find(u => u.user_id === userId);
    const share = userEntry ? parseFloat(userEntry.owed_share) : 0;
    
    months[monthIdx].amount += share;
    months[monthIdx].count++;
  });

  const maxMonth = months.reduce((max, m) => m.amount > max.amount ? m : max, months[0]);
  const minMonth = months.filter(m => m.amount > 0).reduce((min, m) => m.amount < min.amount ? m : min, maxMonth);
  const totalMonthsActive = months.filter(m => m.count > 0).length;

  return {
    months,
    busiestMonth: maxMonth,
    quietestMonth: minMonth,
    totalMonthsActive,
    averageMonthlySpend: months.reduce((s, m) => s + m.amount, 0) / Math.max(totalMonthsActive, 1),
  };
}

function computeSocialStats(expenses, groups, friends, userId) {
  const friendStats = {};
  const groupStats = {};
  const paidForYou = {};
  const youPaidFor = {};

  expenses.forEach(exp => {
    // Track group activity
    if (exp.group_id && exp.group_id !== 0) {
      if (!groupStats[exp.group_id]) {
        const group = groups.find(g => g.id === exp.group_id);
        groupStats[exp.group_id] = {
          id: exp.group_id,
          name: group?.name || 'Unknown Group',
          count: 0,
          totalSpend: 0,
          yourShare: 0,
        };
      }
      groupStats[exp.group_id].count++;
      groupStats[exp.group_id].totalSpend += parseFloat(exp.cost);
      
      const userEntry = exp.users?.find(u => u.user_id === userId);
      if (userEntry) {
        groupStats[exp.group_id].yourShare += parseFloat(userEntry.owed_share);
      }
    }

    // Track friend interactions
    exp.users?.forEach(u => {
      if (u.user_id === userId) return;
      
      const friendId = u.user_id;
      const friendName = `${u.user?.first_name || ''} ${u.user?.last_name || ''}`.trim() || 'Unknown';
      const friendPic = u.user?.picture?.medium;
      
      if (!friendStats[friendId]) {
        friendStats[friendId] = {
          id: friendId,
          name: friendName,
          picture: friendPic,
          expenseCount: 0,
          totalShared: 0,
        };
      }
      friendStats[friendId].expenseCount++;
      friendStats[friendId].totalShared += parseFloat(exp.cost);

      // Who paid for whom
      const paidShare = parseFloat(u.paid_share) || 0;
      const owedShare = parseFloat(u.owed_share) || 0;
      
      if (paidShare > owedShare) {
        // This person paid more than their share (they covered others)
        if (!paidForYou[friendId]) {
          paidForYou[friendId] = { id: friendId, name: friendName, picture: friendPic, amount: 0 };
        }
        // Check if they paid for current user
        const myEntry = exp.users?.find(x => x.user_id === userId);
        if (myEntry && parseFloat(myEntry.paid_share) === 0) {
          paidForYou[friendId].amount += parseFloat(myEntry.owed_share);
        }
      }
    });

    // Track when current user paid
    const myEntry = exp.users?.find(u => u.user_id === userId);
    if (myEntry && parseFloat(myEntry.paid_share) > parseFloat(myEntry.owed_share)) {
      exp.users?.forEach(u => {
        if (u.user_id === userId) return;
        if (parseFloat(u.paid_share) === 0 && parseFloat(u.owed_share) > 0) {
          const friendId = u.user_id;
          const friendName = `${u.user?.first_name || ''} ${u.user?.last_name || ''}`.trim();
          const friendPic = u.user?.picture?.medium;
          if (!youPaidFor[friendId]) {
            youPaidFor[friendId] = { id: friendId, name: friendName, picture: friendPic, amount: 0 };
          }
          youPaidFor[friendId].amount += parseFloat(u.owed_share);
        }
      });
    }
  });

  const sortedFriends = Object.values(friendStats).sort((a, b) => b.expenseCount - a.expenseCount);
  const sortedGroups = Object.values(groupStats).sort((a, b) => b.count - a.count);
  const sortedPaidForYou = Object.values(paidForYou).sort((a, b) => b.amount - a.amount);
  const sortedYouPaidFor = Object.values(youPaidFor).sort((a, b) => b.amount - a.amount);

  return {
    topFriend: sortedFriends[0] || null,
    topFriends: sortedFriends.slice(0, 5),
    topGroup: sortedGroups[0] || null,
    topGroups: sortedGroups.slice(0, 5),
    mostGenerousFriend: sortedPaidForYou[0] || null,
    friendYouTreatedMost: sortedYouPaidFor[0] || null,
    totalFriendsInteracted: sortedFriends.length,
    totalGroupsActive: sortedGroups.length,
  };
}

function computeTimePatterns(expenses, userId) {
  const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => ({
    day: d,
    amount: 0,
    count: 0,
  }));

  const hourOfDay = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    label: i === 0 ? '12am' : i < 12 ? `${i}am` : i === 12 ? '12pm' : `${i - 12}pm`,
    amount: 0,
    count: 0,
  }));

  expenses.forEach(exp => {
    const date = parseISO(exp.date);
    const dayIdx = getDay(date);
    const hour = date.getHours();
    
    const userEntry = exp.users?.find(u => u.user_id === userId);
    const share = userEntry ? parseFloat(userEntry.owed_share) : 0;
    
    dayOfWeek[dayIdx].amount += share;
    dayOfWeek[dayIdx].count++;
    
    hourOfDay[hour].amount += share;
    hourOfDay[hour].count++;
  });

  const busiestDay = dayOfWeek.reduce((max, d) => d.amount > max.amount ? d : max, dayOfWeek[0]);
  const quietestDay = dayOfWeek.filter(d => d.count > 0).reduce((min, d) => d.amount < min.amount ? d : min, busiestDay);
  
  const weekdayTotal = dayOfWeek.slice(1, 6).reduce((s, d) => s + d.amount, 0);
  const weekendTotal = dayOfWeek[0].amount + dayOfWeek[6].amount;

  return {
    dayOfWeek,
    hourOfDay,
    busiestDay,
    quietestDay,
    weekdayTotal,
    weekendTotal,
    isWeekendSpender: weekendTotal > weekdayTotal * 0.4, // If weekend is >40% of weekday, they're a weekend spender
  };
}

function computeNotableExpenses(expenses, userId) {
  let biggestExpense = null;
  let biggestShare = 0;
  
  const descriptionCounts = {};
  
  expenses.forEach(exp => {
    const userEntry = exp.users?.find(u => u.user_id === userId);
    const share = userEntry ? parseFloat(userEntry.owed_share) : 0;
    
    if (share > biggestShare) {
      biggestShare = share;
      biggestExpense = {
        description: exp.description,
        amount: share,
        totalCost: parseFloat(exp.cost),
        date: exp.date,
        category: exp.category?.name || 'Other',
      };
    }
    
    // Track description frequency
    const desc = exp.description?.toLowerCase().trim();
    if (desc) {
      descriptionCounts[desc] = (descriptionCounts[desc] || 0) + 1;
    }
  });

  // Find most frequent expense
  const sortedDescriptions = Object.entries(descriptionCounts)
    .sort((a, b) => b[1] - a[1]);
  
  const mostFrequent = sortedDescriptions[0] 
    ? { description: sortedDescriptions[0][0], count: sortedDescriptions[0][1] }
    : null;

  // First and last expense
  const sorted = [...expenses].sort((a, b) => new Date(a.date) - new Date(b.date));
  const firstExpense = sorted[0] ? {
    description: sorted[0].description,
    date: sorted[0].date,
    amount: sorted[0].users?.find(u => u.user_id === userId)?.owed_share || 0,
  } : null;
  
  const lastExpense = sorted[sorted.length - 1] ? {
    description: sorted[sorted.length - 1].description,
    date: sorted[sorted.length - 1].date,
    amount: sorted[sorted.length - 1].users?.find(u => u.user_id === userId)?.owed_share || 0,
  } : null;

  return {
    biggestExpense,
    mostFrequentExpense: mostFrequent,
    firstExpense,
    lastExpense,
    uniqueDescriptions: Object.keys(descriptionCounts).length,
  };
}

function computePersonality(categoryStats, timePatterns, totalStats) {
  const topCategories = categoryStats.categories.slice(0, 3).map(c => c.name.toLowerCase());
  
  let type = 'Balanced Splitter';
  let emoji = '⚖️';
  let description = 'You have a well-rounded spending pattern across different categories.';
  let traits = [];

  // Determine personality based on top categories
  if (topCategories.some(c => c.includes('food') || c.includes('restaurant') || c.includes('dining'))) {
    type = 'Foodie';
    emoji = '🍕';
    description = 'Your taste buds lead your wallet! You love sharing meals and culinary experiences.';
    traits.push('Culinary Explorer');
  } else if (topCategories.some(c => c.includes('entertainment') || c.includes('movie') || c.includes('game'))) {
    type = 'Fun Seeker';
    emoji = '🎮';
    description = 'Life is about experiences! You prioritize entertainment and good times.';
    traits.push('Entertainment Enthusiast');
  } else if (topCategories.some(c => c.includes('travel') || c.includes('transport') || c.includes('taxi'))) {
    type = 'Wanderer';
    emoji = '✈️';
    description = 'Adventure calls! You invest in travel and getting places.';
    traits.push('Travel Lover');
  } else if (topCategories.some(c => c.includes('utilities') || c.includes('rent') || c.includes('household'))) {
    type = 'Homebody';
    emoji = '🏠';
    description = 'Home is where the heart is. You focus on keeping your living space comfortable.';
    traits.push('Domestic Champion');
  } else if (topCategories.some(c => c.includes('shopping') || c.includes('clothes'))) {
    type = 'Shopaholic';
    emoji = '🛍️';
    description = 'Retail therapy is real therapy! You enjoy shopping experiences.';
    traits.push('Shopping Enthusiast');
  }

  // Add traits based on patterns
  if (timePatterns.isWeekendSpender) {
    traits.push('Weekend Warrior');
  }
  
  if (totalStats.netContribution > 0) {
    traits.push('Generous Giver');
  }
  
  if (totalStats.uniquePeopleCount > 10) {
    traits.push('Social Butterfly');
  }
  
  if (totalStats.averageExpense > 500) {
    traits.push('Big Spender');
  } else if (totalStats.averageExpense < 100) {
    traits.push('Penny Wise');
  }

  return {
    type,
    emoji,
    description,
    traits: traits.slice(0, 4),
  };
}

function computeFunFacts(expenses, userId, totalStats, socialStats) {
  const facts = [];
  
  // Days between first and last expense
  if (expenses.length >= 2) {
    const sorted = [...expenses].sort((a, b) => new Date(a.date) - new Date(b.date));
    const daySpan = differenceInDays(parseISO(sorted[sorted.length - 1].date), parseISO(sorted[0].date));
    const avgPerDay = totalStats.totalYourShare / Math.max(daySpan, 1);
    facts.push({
      icon: '📅',
      text: `You averaged ₹${Math.round(avgPerDay)} per day over ${daySpan} days`,
    });
  }

  // Expense frequency
  if (totalStats.totalExpenseCount > 0) {
    const expPerWeek = (totalStats.totalExpenseCount / 52).toFixed(1);
    facts.push({
      icon: '⚡',
      text: `You split about ${expPerWeek} expenses per week`,
    });
  }

  // Social reach
  if (socialStats.totalFriendsInteracted > 0) {
    facts.push({
      icon: '🤝',
      text: `You shared expenses with ${socialStats.totalFriendsInteracted} different people`,
    });
  }

  // Net contribution
  if (totalStats.netContribution > 100) {
    facts.push({
      icon: '💚',
      text: `You contributed ₹${Math.round(totalStats.netContribution)} more than your share`,
    });
  } else if (totalStats.netContribution < -100) {
    facts.push({
      icon: '🙏',
      text: `Friends covered ₹${Math.abs(Math.round(totalStats.netContribution))} for you`,
    });
  }

  // Group activity
  if (socialStats.totalGroupsActive > 0) {
    facts.push({
      icon: '👥',
      text: `You were active in ${socialStats.totalGroupsActive} different groups`,
    });
  }

  return facts;
}

/**
 * Format currency for Year in Review (more compact)
 */
export function formatYIRCurrency(amount) {
  if (Math.abs(amount) >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (Math.abs(amount) >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${Math.round(amount)}`;
}

/**
 * Get gradient colors based on category
 */
export function getCategoryGradient(category) {
  const gradients = {
    food: ['#f97316', '#ea580c'],
    restaurant: ['#f97316', '#ea580c'],
    dining: ['#f97316', '#ea580c'],
    entertainment: ['#8b5cf6', '#7c3aed'],
    travel: ['#06b6d4', '#0891b2'],
    transport: ['#06b6d4', '#0891b2'],
    utilities: ['#10b981', '#059669'],
    rent: ['#6366f1', '#4f46e5'],
    shopping: ['#ec4899', '#db2777'],
    default: ['#10b981', '#14b8a6'],
  };

  const key = Object.keys(gradients).find(k => 
    category?.toLowerCase().includes(k)
  ) || 'default';
  
  return gradients[key];
}
