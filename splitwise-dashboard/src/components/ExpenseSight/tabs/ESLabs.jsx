/**
 * ESLabs - Experimental features: Year in Review, Lifestyle Score, Streaks
 */

import { useMemo } from 'react';
import { 
  FlaskConical, Sparkles, Target, Flame,
  Star, Heart, Coffee, ShoppingBag, Home
} from 'lucide-react';
import { format, parseISO, startOfYear, endOfYear, isWithinInterval, subDays, eachDayOfInterval } from 'date-fns';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../../utils/analytics';
import { CHART_COLORS } from '../../../utils/chartConfig';

// Category to lifestyle dimension mapping
const CATEGORY_DIMENSIONS = {
  'Groceries': 'necessities',
  'Utilities': 'necessities',
  'Transport': 'necessities',
  'Food & Dining': 'leisure',
  'Entertainment': 'leisure',
  'Shopping': 'lifestyle',
  'Personal': 'lifestyle',
  'Health': 'growth',
  'Travel': 'social',
  'Payments': 'other',
  'Other': 'other',
};

// Lifestyle dimension icons
const DIMENSION_ICONS = {
  necessities: Home,
  leisure: Coffee,
  lifestyle: ShoppingBag,
  growth: Target,
  social: Heart,
};

// Year in Review Card
function YearInReviewCard({ expenses, year }) {
  const stats = useMemo(() => {
    const start = startOfYear(new Date(year, 0, 1));
    const end = endOfYear(new Date(year, 0, 1));
    
    const yearExpenses = expenses.filter(e => {
      if (e.cancelled || e.isRefund) return false;
      const expDate = parseISO(e.date);
      return isWithinInterval(expDate, { start, end });
    });
    
    const total = yearExpenses.reduce((sum, e) => sum + e.amount, 0);
    const count = yearExpenses.length;
    
    // Category breakdown
    const categories = {};
    for (const exp of yearExpenses) {
      categories[exp.category] = (categories[exp.category] || 0) + exp.amount;
    }
    const topCategories = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    // Monthly breakdown
    const months = {};
    for (const exp of yearExpenses) {
      const month = format(parseISO(exp.date), 'MMM');
      months[month] = (months[month] || 0) + exp.amount;
    }
    const peakMonth = Object.entries(months)
      .sort((a, b) => b[1] - a[1])[0];
    
    // Biggest expense
    const biggest = yearExpenses.sort((a, b) => b.amount - a.amount)[0];
    
    return {
      total,
      count,
      avgPerExpense: count > 0 ? total / count : 0,
      topCategories,
      peakMonth: peakMonth ? { month: peakMonth[0], amount: peakMonth[1] } : null,
      biggest,
      monthlyAvg: total / 12,
    };
  }, [expenses, year]);

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-violet-400" />
        <h3 className="text-sm font-medium text-stone-200">{year} Year in Review</h3>
      </div>
      
      {stats.count > 0 ? (
        <>
          {/* Total */}
          <div className="text-center py-4 bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-xl">
            <p className="text-xs text-stone-500 mb-1">Total Spent</p>
            <p className="text-3xl font-display text-violet-400">
              {formatCurrency(stats.total, 'INR')}
            </p>
            <p className="text-xs text-stone-500 mt-1">
              across {stats.count} expenses
            </p>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-stone-800/30 p-3 rounded-xl">
              <p className="text-[10px] text-stone-500 uppercase">Monthly Avg</p>
              <p className="text-sm font-medium text-stone-200">
                {formatCurrency(stats.monthlyAvg, 'INR')}
              </p>
            </div>
            <div className="bg-stone-800/30 p-3 rounded-xl">
              <p className="text-[10px] text-stone-500 uppercase">Per Expense</p>
              <p className="text-sm font-medium text-stone-200">
                {formatCurrency(stats.avgPerExpense, 'INR')}
              </p>
            </div>
          </div>
          
          {/* Top Categories */}
          <div>
            <p className="text-xs text-stone-500 mb-2">Top Categories</p>
            <div className="space-y-2">
              {stats.topCategories.map(([cat, amount], i) => (
                <div key={cat} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium"
                    style={{ backgroundColor: `${CHART_COLORS[i]}30`, color: CHART_COLORS[i] }}>
                    {i + 1}
                  </span>
                  <span className="flex-1 text-xs text-stone-300">{cat}</span>
                  <span className="text-xs text-stone-500">{formatCurrency(amount, 'INR')}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Highlights */}
          {stats.biggest && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <p className="text-[10px] text-amber-400 uppercase mb-1">Biggest Expense</p>
              <p className="text-sm text-stone-200">{stats.biggest.description}</p>
              <p className="text-xs text-stone-500">
                {formatCurrency(stats.biggest.amount, 'INR')} • {format(parseISO(stats.biggest.date), 'MMM d')}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-sm text-stone-500">No data for {year}</p>
        </div>
      )}
    </div>
  );
}

// Lifestyle Score Radar
function LifestyleScoreCard({ expenses }) {
  const dimensions = useMemo(() => {
    const totals = { necessities: 0, leisure: 0, lifestyle: 0, growth: 0, social: 0 };
    let grandTotal = 0;
    
    for (const exp of expenses) {
      if (exp.cancelled || exp.isRefund) continue;
      const dimension = CATEGORY_DIMENSIONS[exp.category] || 'other';
      if (dimension !== 'other') {
        totals[dimension] += exp.amount;
        grandTotal += exp.amount;
      }
    }
    
    // Convert to percentages (0-100 scale for radar)
    const data = Object.entries(totals).map(([name, value]) => ({
      dimension: name.charAt(0).toUpperCase() + name.slice(1),
      value: grandTotal > 0 ? Math.round((value / grandTotal) * 100) : 0,
      amount: value,
    }));
    
    return { data, total: grandTotal };
  }, [expenses]);

  // Calculate balance score (how evenly distributed)
  const balanceScore = useMemo(() => {
    const values = dimensions.data.map(d => d.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    const maxVariance = Math.pow(100 - 20, 2); // Max variance if all in one category
    return Math.round(100 - (variance / maxVariance) * 100);
  }, [dimensions]);

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={18} className="text-emerald-400" />
          <h3 className="text-sm font-medium text-stone-200">Lifestyle Score</h3>
        </div>
        <div className="px-2 py-1 bg-emerald-500/20 rounded-full">
          <span className="text-xs font-medium text-emerald-400">{balanceScore}/100</span>
        </div>
      </div>
      
      {/* Radar Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={dimensions.data}>
            <PolarGrid stroke="#44403c" />
            <PolarAngleAxis 
              dataKey="dimension" 
              tick={{ fill: '#a8a29e', fontSize: 10 }}
            />
            <Radar
              name="Spending"
              dataKey="value"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.3}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Dimension Breakdown */}
      <div className="grid grid-cols-2 gap-2">
        {dimensions.data.map((d, i) => {
          const Icon = DIMENSION_ICONS[d.dimension.toLowerCase()] || Star;
          return (
            <div key={d.dimension} className="flex items-center gap-2 p-2 bg-stone-800/30 rounded-lg">
              <Icon size={14} className="text-stone-500" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-stone-500">{d.dimension}</p>
                <p className="text-xs text-stone-300">{d.value}%</p>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Insight */}
      <div className="p-3 bg-stone-800/30 rounded-xl">
        <p className="text-xs text-stone-400">
          {balanceScore >= 70 
            ? "Great balance! Your spending is well-distributed across life areas."
            : balanceScore >= 40
            ? "Room for improvement. Consider diversifying your spending."
            : "Your spending is concentrated in few areas. Try to balance more."}
        </p>
      </div>
    </div>
  );
}

// Spending Streaks Card
function SpendingStreaksCard({ expenses }) {
  const streaks = useMemo(() => {
    if (expenses.length === 0) return { noSpendStreak: 0, spendStreak: 0, currentStreak: 0 };
    
    const today = new Date();
    const days = eachDayOfInterval({
      start: subDays(today, 90),
      end: today,
    });
    
    const expenseDates = new Set(
      expenses
        .filter(e => !e.cancelled && !e.isRefund)
        .map(e => e.date)
    );
    
    let maxNoSpendStreak = 0;
    let maxSpendStreak = 0;
    let currentNoSpend = 0;
    let currentSpend = 0;
    let currentStreak = 0;
    let lastWasSpend = null;
    
    for (const day of days) {
      const dateStr = format(day, 'yyyy-MM-dd');
      const hasExpense = expenseDates.has(dateStr);
      
      if (hasExpense) {
        currentSpend++;
        maxSpendStreak = Math.max(maxSpendStreak, currentSpend);
        currentNoSpend = 0;
      } else {
        currentNoSpend++;
        maxNoSpendStreak = Math.max(maxNoSpendStreak, currentNoSpend);
        currentSpend = 0;
      }
      
      // Track current streak (from today backwards)
      if (lastWasSpend === null) {
        lastWasSpend = hasExpense;
        currentStreak = 1;
      } else if (hasExpense === lastWasSpend) {
        currentStreak++;
      }
    }
    
    return {
      noSpendStreak: maxNoSpendStreak,
      spendStreak: maxSpendStreak,
      currentStreak,
      currentType: lastWasSpend ? 'spending' : 'no-spend',
    };
  }, [expenses]);

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Flame size={18} className="text-orange-400" />
        <h3 className="text-sm font-medium text-stone-200">Streaks</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
          <p className="text-2xl font-display text-emerald-400">{streaks.noSpendStreak}</p>
          <p className="text-[10px] text-stone-500 mt-1">No-Spend Days Record</p>
        </div>
        <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-center">
          <p className="text-2xl font-display text-orange-400">{streaks.spendStreak}</p>
          <p className="text-[10px] text-stone-500 mt-1">Spending Days Record</p>
        </div>
      </div>
      
      <div className="p-3 bg-stone-800/30 rounded-xl">
        <p className="text-xs text-stone-400">
          Current streak: <span className="text-stone-200 font-medium">{streaks.currentStreak} days</span>
          {' '}of {streaks.currentType === 'spending' ? 'spending' : 'no spending'}
        </p>
      </div>
    </div>
  );
}

// Spending Personality Card
function SpendingPersonalityCard({ expenses }) {
  const personality = useMemo(() => {
    const categories = {};
    for (const exp of expenses) {
      if (exp.cancelled || exp.isRefund) continue;
      categories[exp.category] = (categories[exp.category] || 0) + exp.amount;
    }
    
    const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    const topCategory = sorted[0]?.[0] || 'Unknown';
    
    const personalities = {
      'Food & Dining': { name: 'Foodie', emoji: '🍽️', desc: 'You appreciate good food and dining experiences' },
      'Entertainment': { name: 'Fun Seeker', emoji: '🎮', desc: 'Life is too short not to have fun!' },
      'Shopping': { name: 'Retail Enthusiast', emoji: '🛍️', desc: 'You love finding great deals and new items' },
      'Transport': { name: 'On-the-Go', emoji: '🚗', desc: 'Always moving, always exploring' },
      'Groceries': { name: 'Home Chef', emoji: '🏠', desc: 'You prefer cooking at home' },
      'Travel': { name: 'Wanderer', emoji: '✈️', desc: 'Adventure is your middle name' },
      'Health': { name: 'Wellness Warrior', emoji: '💪', desc: 'Health is your top priority' },
      'Utilities': { name: 'Practical Pro', emoji: '⚡', desc: 'You focus on essentials first' },
      'Personal': { name: 'Self-Care Star', emoji: '✨', desc: 'You invest in yourself' },
    };
    
    return personalities[topCategory] || { name: 'Explorer', emoji: '🌟', desc: 'Your spending is unique!' };
  }, [expenses]);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Star size={18} className="text-yellow-400" />
        <h3 className="text-sm font-medium text-stone-200">Your Spending Personality</h3>
      </div>
      
      <div className="text-center py-4">
        <span className="text-4xl">{personality.emoji}</span>
        <p className="text-lg font-display text-violet-400 mt-2">{personality.name}</p>
        <p className="text-xs text-stone-500 mt-1">{personality.desc}</p>
      </div>
    </div>
  );
}

export default function ESLabs({ expenses, userId }) {
  const currentYear = new Date().getFullYear();
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-display text-stone-200 flex items-center gap-2">
          <FlaskConical size={20} className="text-fuchsia-400" />
          Labs
        </h2>
        <p className="text-xs text-stone-500">Experimental insights and features</p>
      </div>

      {/* Spending Personality */}
      <SpendingPersonalityCard expenses={expenses} />

      {/* Lifestyle Score */}
      <LifestyleScoreCard expenses={expenses} />

      {/* Spending Streaks */}
      <SpendingStreaksCard expenses={expenses} />

      {/* Year in Review */}
      <YearInReviewCard expenses={expenses} year={currentYear} />
      
      {/* Previous Year */}
      <YearInReviewCard expenses={expenses} year={currentYear - 1} />
    </div>
  );
}
