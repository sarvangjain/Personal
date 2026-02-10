import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Share2, Sparkles, TrendingUp, Users, Calendar, Trophy, Heart, Zap, Download } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, BarChart, Bar } from 'recharts';
import { format, parseISO } from 'date-fns';
import { getExpenses } from '../api/splitwise';
import { getUserId } from '../utils/analytics';
import { computeYearInReview, formatYIRCurrency, getCategoryGradient } from '../utils/yearInReview';
import ShareableReview from './ShareableReview';

const CHART_COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4'];

// Animated number counter
function AnimatedNumber({ value, duration = 1500, prefix = '', suffix = '' }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = 0;
    const end = value;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      setDisplay(Math.round(start + (end - start) * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{prefix}{display.toLocaleString('en-IN')}{suffix}</span>;
}

// Individual slide components
function WelcomeSlide({ data, year }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-6 animate-pulse">
        <Sparkles size={36} className="text-white" />
      </div>
      <h1 className="font-display text-4xl sm:text-5xl text-white mb-2">Your {year}</h1>
      <p className="text-xl text-emerald-400 font-display">Year in Review</p>
      <p className="text-stone-400 mt-4 max-w-sm">
        Let's look back at your shared expenses and discover your spending story.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-xs">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-display text-emerald-400">
            <AnimatedNumber value={data.totalStats.totalExpenseCount} />
          </p>
          <p className="text-[10px] text-stone-500 mt-1">Expenses Split</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-display text-amber-400">
            <AnimatedNumber value={data.totalStats.uniquePeopleCount} />
          </p>
          <p className="text-[10px] text-stone-500 mt-1">People</p>
        </div>
      </div>
    </div>
  );
}

function TotalSpendSlide({ data }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <TrendingUp size={28} className="text-emerald-400 mb-4" />
      <p className="text-stone-400 text-sm mb-2">Your total share of expenses</p>
      <h2 className="font-display text-5xl sm:text-6xl text-white mb-2">
        ₹<AnimatedNumber value={Math.round(data.totalStats.totalYourShare)} />
      </h2>
      <p className="text-stone-500 text-sm">across {data.totalStats.totalExpenseCount} expenses</p>
      
      <div className="mt-8 w-full max-w-sm space-y-3">
        <div className="flex items-center justify-between p-3 glass-card">
          <span className="text-stone-400 text-sm">You paid</span>
          <span className="text-emerald-400 font-mono">{formatYIRCurrency(data.totalStats.totalYouPaid)}</span>
        </div>
        <div className="flex items-center justify-between p-3 glass-card">
          <span className="text-stone-400 text-sm">Your share</span>
          <span className="text-amber-400 font-mono">{formatYIRCurrency(data.totalStats.totalYourShare)}</span>
        </div>
        <div className="flex items-center justify-between p-3 glass-card">
          <span className="text-stone-400 text-sm">Net contribution</span>
          <span className={`font-mono ${data.totalStats.netContribution >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {data.totalStats.netContribution >= 0 ? '+' : ''}{formatYIRCurrency(data.totalStats.netContribution)}
          </span>
        </div>
      </div>
    </div>
  );
}

function CategorySlide({ data }) {
  const topCats = data.categoryStats.categories.slice(0, 5);
  
  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <p className="text-stone-400 text-sm mb-2">Where did your money go?</p>
      <h2 className="font-display text-2xl sm:text-3xl text-white mb-6 text-center">Your Top Categories</h2>
      
      <div className="w-40 h-40 mb-6">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={topCats}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
              dataKey="amount"
              strokeWidth={3}
              stroke="rgba(12,10,9,0.9)"
            >
              {topCats.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="w-full max-w-sm space-y-2">
        {topCats.map((cat, i) => (
          <div key={cat.name} className="flex items-center gap-3 p-2">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0" 
              style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} 
            />
            <span className="text-sm text-stone-300 flex-1 truncate">{cat.name}</span>
            <span className="text-xs text-stone-500">{Math.round(cat.percentage)}%</span>
            <span className="text-sm font-mono text-stone-400">{formatYIRCurrency(cat.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlyJourneySlide({ data }) {
  const chartData = data.monthlyStats.months.map(m => ({
    name: m.name,
    amount: Math.round(m.amount),
  }));

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <Calendar size={28} className="text-indigo-400 mb-4" />
      <p className="text-stone-400 text-sm mb-2">Your spending journey</p>
      <h2 className="font-display text-2xl sm:text-3xl text-white mb-6 text-center">Month by Month</h2>
      
      <div className="w-full max-w-sm h-48 mb-6">
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <defs>
              <linearGradient id="yirGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#78716c' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#78716c' }} axisLine={false} tickLine={false} tickFormatter={v => formatYIRCurrency(v)} />
            <Area type="monotone" dataKey="amount" stroke="#6366f1" fill="url(#yirGradient)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        <div className="glass-card p-3 text-center">
          <p className="text-xs text-stone-500">Busiest Month</p>
          <p className="text-lg font-display text-indigo-400">{data.monthlyStats.busiestMonth.fullName}</p>
          <p className="text-[10px] text-stone-600">{formatYIRCurrency(data.monthlyStats.busiestMonth.amount)}</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-xs text-stone-500">Avg Monthly</p>
          <p className="text-lg font-display text-emerald-400">{formatYIRCurrency(data.monthlyStats.averageMonthlySpend)}</p>
          <p className="text-[10px] text-stone-600">{data.monthlyStats.totalMonthsActive} months active</p>
        </div>
      </div>
    </div>
  );
}

function PersonalitySlide({ data }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div className="text-6xl mb-4">{data.personality.emoji}</div>
      <p className="text-stone-400 text-sm mb-2">Your Splitwise Personality</p>
      <h2 className="font-display text-3xl sm:text-4xl text-white mb-3">{data.personality.type}</h2>
      <p className="text-stone-400 max-w-sm text-sm leading-relaxed mb-6">
        {data.personality.description}
      </p>
      
      <div className="flex flex-wrap justify-center gap-2 max-w-sm">
        {data.personality.traits.map((trait, i) => (
          <span 
            key={i}
            className="px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: `${CHART_COLORS[i % CHART_COLORS.length]}20`,
              color: CHART_COLORS[i % CHART_COLORS.length],
            }}
          >
            {trait}
          </span>
        ))}
      </div>
    </div>
  );
}

function SocialSlide({ data }) {
  const topFriend = data.socialStats.topFriend;
  const topGroup = data.socialStats.topGroup;

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <Users size={28} className="text-pink-400 mb-4" />
      <p className="text-stone-400 text-sm mb-2">Your split squad</p>
      <h2 className="font-display text-2xl sm:text-3xl text-white mb-6 text-center">Social Stats</h2>
      
      <div className="w-full max-w-sm space-y-4">
        {topFriend && (
          <div className="glass-card p-4">
            <p className="text-[10px] text-stone-500 uppercase tracking-wide mb-2">Best Split Buddy</p>
            <div className="flex items-center gap-3">
              {topFriend.picture ? (
                <img src={topFriend.picture} className="w-12 h-12 rounded-full" alt="" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-lg font-medium text-white">
                  {topFriend.name[0]}
                </div>
              )}
              <div className="flex-1">
                <p className="text-lg font-display text-white">{topFriend.name}</p>
                <p className="text-xs text-stone-500">{topFriend.expenseCount} expenses together</p>
              </div>
              <Heart size={20} className="text-pink-400" />
            </div>
          </div>
        )}

        {topGroup && (
          <div className="glass-card p-4">
            <p className="text-[10px] text-stone-500 uppercase tracking-wide mb-2">Most Active Group</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Users size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-lg font-display text-white truncate">{topGroup.name}</p>
                <p className="text-xs text-stone-500">{topGroup.count} expenses · {formatYIRCurrency(topGroup.yourShare)}</p>
              </div>
              <Trophy size={20} className="text-amber-400" />
            </div>
          </div>
        )}

        {data.socialStats.mostGenerousFriend && (
          <div className="glass-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-stone-500">Most generous to you</p>
                <p className="text-sm text-white">{data.socialStats.mostGenerousFriend.name}</p>
              </div>
              <p className="text-emerald-400 font-mono text-sm">+{formatYIRCurrency(data.socialStats.mostGenerousFriend.amount)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NotableSlide({ data }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <Zap size={28} className="text-amber-400 mb-4" />
      <p className="text-stone-400 text-sm mb-2">Memorable moments</p>
      <h2 className="font-display text-2xl sm:text-3xl text-white mb-6 text-center">Notable Expenses</h2>
      
      <div className="w-full max-w-sm space-y-4">
        {data.notableExpenses.biggestExpense && (
          <div className="glass-card p-4 border-l-4 border-amber-500">
            <p className="text-[10px] text-amber-400 uppercase tracking-wide mb-1">Biggest Expense</p>
            <p className="text-lg text-white truncate">{data.notableExpenses.biggestExpense.description}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-stone-500">{data.notableExpenses.biggestExpense.category}</span>
              <span className="text-amber-400 font-mono">{formatYIRCurrency(data.notableExpenses.biggestExpense.amount)}</span>
            </div>
          </div>
        )}

        {data.notableExpenses.mostFrequentExpense && (
          <div className="glass-card p-4 border-l-4 border-indigo-500">
            <p className="text-[10px] text-indigo-400 uppercase tracking-wide mb-1">Most Frequent</p>
            <p className="text-lg text-white capitalize truncate">{data.notableExpenses.mostFrequentExpense.description}</p>
            <p className="text-xs text-stone-500 mt-1">{data.notableExpenses.mostFrequentExpense.count} times this year</p>
          </div>
        )}

        {data.notableExpenses.firstExpense && (
          <div className="glass-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-stone-500">First expense of the year</p>
                <p className="text-sm text-white truncate">{data.notableExpenses.firstExpense.description}</p>
              </div>
              <p className="text-xs text-stone-500">{format(parseISO(data.notableExpenses.firstExpense.date), 'MMM d')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DayPatternSlide({ data }) {
  const chartData = data.timePatterns.dayOfWeek.map(d => ({
    name: d.day,
    amount: Math.round(d.amount),
  }));

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <p className="text-stone-400 text-sm mb-2">When do you spend?</p>
      <h2 className="font-display text-2xl sm:text-3xl text-white mb-6 text-center">Day Patterns</h2>
      
      <div className="w-full max-w-sm h-40 mb-6">
        <ResponsiveContainer>
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#78716c' }} axisLine={false} tickLine={false} tickFormatter={v => formatYIRCurrency(v)} />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={i === 0 || i === 6 ? '#ec4899' : '#6366f1'} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        <div className="glass-card p-3 text-center">
          <p className="text-xs text-stone-500">Weekday Total</p>
          <p className="text-lg font-display text-indigo-400">{formatYIRCurrency(data.timePatterns.weekdayTotal)}</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-xs text-stone-500">Weekend Total</p>
          <p className="text-lg font-display text-pink-400">{formatYIRCurrency(data.timePatterns.weekendTotal)}</p>
        </div>
      </div>

      <p className="text-sm text-stone-500 mt-4">
        {data.timePatterns.isWeekendSpender 
          ? '🎉 You\'re a weekend spender!' 
          : '💼 Most of your spending happens on weekdays'}
      </p>
    </div>
  );
}

function FunFactsSlide({ data }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <Sparkles size={28} className="text-emerald-400 mb-4" />
      <p className="text-stone-400 text-sm mb-2">Did you know?</p>
      <h2 className="font-display text-2xl sm:text-3xl text-white mb-6 text-center">Fun Facts</h2>
      
      <div className="w-full max-w-sm space-y-3">
        {data.funFacts.map((fact, i) => (
          <div key={i} className="glass-card p-4 flex items-center gap-4">
            <span className="text-2xl">{fact.icon}</span>
            <p className="text-sm text-stone-300 flex-1">{fact.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummarySlide({ data, year, userName, onShare }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <div className="glass-card p-6 w-full max-w-sm text-center" id="yir-summary-card">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4">
          <Sparkles size={20} className="text-white" />
        </div>
        <h3 className="font-display text-xl text-white mb-1">{userName}'s {year}</h3>
        <p className="text-xs text-emerald-400 mb-4">SplitSight Year in Review</p>
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-stone-800/50 rounded-xl p-3">
            <p className="text-xl font-display text-white">{formatYIRCurrency(data.totalStats.totalYourShare)}</p>
            <p className="text-[9px] text-stone-500">Total Spent</p>
          </div>
          <div className="bg-stone-800/50 rounded-xl p-3">
            <p className="text-xl font-display text-white">{data.totalStats.totalExpenseCount}</p>
            <p className="text-[9px] text-stone-500">Expenses</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-2xl">{data.personality.emoji}</span>
          <span className="text-sm text-stone-300">{data.personality.type}</span>
        </div>

        <div className="flex flex-wrap justify-center gap-1.5">
          {data.personality.traits.slice(0, 3).map((trait, i) => (
            <span key={i} className="px-2 py-0.5 bg-stone-800/50 rounded-full text-[10px] text-stone-400">
              {trait}
            </span>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-stone-800/50">
          <p className="text-[10px] text-stone-600">Generated with SplitSight</p>
        </div>
      </div>

      {/* Share Button */}
      <button
        onClick={onShare}
        className="mt-6 flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
      >
        <Share2 size={18} />
        Share Your Wrapped
      </button>
      
      <p className="text-stone-500 text-xs mt-3 text-center">
        Create beautiful images to share with friends
      </p>
    </div>
  );
}

// Main Year in Review Component
export default function YearInReview({ groups, friends, expenses: initialExpenses, onClose, userName, year: yearProp, startWithShare = false }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const year = yearProp || new Date().getFullYear();
  const userId = getUserId();

  // Open share modal directly if startWithShare is true
  useEffect(() => {
    if (startWithShare && data && !loading) {
      setShowShareModal(true);
    }
  }, [startWithShare, data, loading]);

  // Load full year expenses
  useEffect(() => {
    async function loadYearData() {
      try {
        setLoading(true);
        setError(null);

        const currentYear = new Date().getFullYear();
        let allExpenses;

        // For the current year, try to reuse the already-fetched expenses
        // (which cover the last 12 months) to avoid redundant API calls
        if (year === currentYear && initialExpenses && initialExpenses.length > 0) {
          allExpenses = initialExpenses;
        } else {
          // For previous years or if no initial data, fetch from API
          const yearStart = `${year}-01-01T00:00:00Z`;
          const yearEnd = `${year}-12-31T23:59:59Z`;
          
          allExpenses = [];
          let offset = 0;
          const limit = 100;
          let hasMore = true;

          while (hasMore) {
            const batch = await getExpenses({ 
              datedAfter: yearStart, 
              datedBefore: yearEnd,
              limit,
              offset 
            });
            allExpenses = [...allExpenses, ...batch];
            hasMore = batch.length >= limit;
            offset += limit;
            
            // Safety limit
            if (offset > 5000) break;
          }
        }

        const yearData = computeYearInReview(allExpenses, groups, friends, userId, year);
        
        if (!yearData) {
          setError('No expenses found for this year');
        } else {
          setData(yearData);
        }
      } catch (err) {
        console.error('Failed to load year in review:', err);
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    loadYearData();
  }, [groups, friends, userId, year, initialExpenses]);

  const slides = data ? [
    { id: 'welcome', component: <WelcomeSlide data={data} year={year} /> },
    { id: 'total', component: <TotalSpendSlide data={data} /> },
    { id: 'categories', component: <CategorySlide data={data} /> },
    { id: 'monthly', component: <MonthlyJourneySlide data={data} /> },
    { id: 'personality', component: <PersonalitySlide data={data} /> },
    { id: 'social', component: <SocialSlide data={data} /> },
    { id: 'notable', component: <NotableSlide data={data} /> },
    { id: 'patterns', component: <DayPatternSlide data={data} /> },
    { id: 'facts', component: <FunFactsSlide data={data} /> },
    { id: 'summary', component: <SummarySlide data={data} year={year} userName={userName} onShare={() => setShowShareModal(true)} /> },
  ] : [];

  const goNext = useCallback(() => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(c => c + 1);
    }
  }, [currentSlide, slides.length]);

  const goPrev = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide(c => c - 1);
    }
  }, [currentSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev, onClose]);

  // Touch swipe handling
  useEffect(() => {
    let startX = 0;
    const handleTouchStart = (e) => { startX = e.touches[0].clientX; };
    const handleTouchEnd = (e) => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) goNext();
        else goPrev();
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [goNext, goPrev]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-surface-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Sparkles size={28} className="text-white" />
          </div>
          <p className="text-stone-400">Generating your Year in Review...</p>
          <p className="text-stone-600 text-xs mt-2">Analyzing {year} expenses</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-surface-950 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <X size={28} className="text-red-400" />
          </div>
          <h3 className="text-lg font-display text-white mb-2">Couldn't Generate Review</h3>
          <p className="text-stone-400 text-sm mb-6">{error}</p>
          <button onClick={onClose} className="px-6 py-2 bg-stone-800 hover:bg-stone-700 text-white text-sm rounded-lg transition-colors">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-surface-950 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute right-4 z-50 w-10 h-10 rounded-full bg-stone-800/80 hover:bg-stone-700 flex items-center justify-center transition-colors"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <X size={18} className="text-stone-400" />
      </button>

      {/* Progress bar */}
      <div 
        className="absolute left-4 right-16 z-50 flex gap-1"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)' }}
      >
        {slides.map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full overflow-hidden bg-stone-800 cursor-pointer"
            onClick={() => setCurrentSlide(i)}
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                i < currentSlide ? 'bg-emerald-400 w-full' 
                : i === currentSlide ? 'bg-emerald-400 w-full animate-pulse' 
                : 'w-0'
              }`}
            />
          </div>
        ))}
      </div>

      {/* Main slide content */}
      <div className="h-full pb-20" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3rem)' }}>
        <div className="h-full overflow-hidden">
          <div 
            className="h-full transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            <div className="h-full flex">
              {slides.map((slide, i) => (
                <div 
                  key={slide.id} 
                  className="h-full w-full flex-shrink-0"
                  style={{ minWidth: '100%' }}
                >
                  {slide.component}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between safe-bottom">
        <button
          onClick={goPrev}
          disabled={currentSlide === 0}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            currentSlide === 0 
              ? 'bg-stone-800/30 text-stone-600' 
              : 'bg-stone-800 hover:bg-stone-700 text-white'
          }`}
        >
          <ChevronLeft size={20} />
        </button>

        <div className="text-center">
          <p className="text-[10px] text-stone-600">{currentSlide + 1} / {slides.length}</p>
          {currentSlide === slides.length - 1 && (
            <p className="text-xs text-stone-500 mt-1">Swipe to navigate</p>
          )}
        </div>

        <button
          onClick={goNext}
          disabled={currentSlide === slides.length - 1}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            currentSlide === slides.length - 1 
              ? 'bg-stone-800/30 text-stone-600' 
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Share Modal */}
      {showShareModal && data && (
        <ShareableReview
          data={data}
          year={year}
          userName={userName}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
