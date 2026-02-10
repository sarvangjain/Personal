import { useState, useRef, useCallback } from 'react';
import { X, Download, Share2, Check, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import html2canvas from 'html2canvas';
import { formatYIRCurrency } from '../utils/yearInReview';

// Card dimensions (optimized for Instagram stories - 1080x1920 aspect ratio scaled down)
const CARD_WIDTH = 360;
const CARD_HEIGHT = 640;

// Summary Card - All key stats in one
function SummaryCard({ data, year, userName }) {
  const topCats = data.categoryStats.categories.slice(0, 3);
  
  return (
    <div 
      className="relative"
      style={{ 
        width: CARD_WIDTH, 
        minHeight: CARD_HEIGHT,
        background: 'linear-gradient(135deg, #0c0a09 0%, #1c1917 50%, #0c0a09 100%)',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl" />
      
      <div className="relative z-10 flex flex-col p-5">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-2 shadow-lg shadow-emerald-500/20">
            <span className="text-lg">✨</span>
          </div>
          <h1 className="text-xl font-bold text-white">{userName}'s {year}</h1>
          <p className="text-emerald-400 text-xs font-medium">Year in Review</p>
        </div>

        {/* Main Stats */}
        <div className="bg-stone-900/60 backdrop-blur rounded-xl p-3 mb-3 border border-stone-800/50">
          <div className="text-center mb-2">
            <p className="text-2xl font-bold text-white">{formatYIRCurrency(data.totalStats.totalYourShare)}</p>
            <p className="text-[10px] text-stone-500">Total Spent</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-base font-bold text-emerald-400">{data.totalStats.totalExpenseCount}</p>
              <p className="text-[9px] text-stone-500">Expenses</p>
            </div>
            <div>
              <p className="text-base font-bold text-amber-400">{data.totalStats.uniquePeopleCount}</p>
              <p className="text-[9px] text-stone-500">People</p>
            </div>
            <div>
              <p className="text-base font-bold text-indigo-400">{data.totalStats.uniqueGroupsCount}</p>
              <p className="text-[9px] text-stone-500">Groups</p>
            </div>
          </div>
        </div>

        {/* Personality */}
        <div className="bg-stone-900/60 backdrop-blur rounded-xl p-3 mb-3 border border-stone-800/50 text-center">
          <span className="text-2xl mb-0.5 block">{data.personality.emoji}</span>
          <p className="text-base font-bold text-white">{data.personality.type}</p>
          <div className="flex flex-wrap justify-center gap-1 mt-1.5">
            {data.personality.traits.slice(0, 3).map((trait, i) => (
              <span key={i} className="px-2 py-0.5 bg-stone-800/80 rounded-full text-[8px] text-stone-400">
                {trait}
              </span>
            ))}
          </div>
        </div>

        {/* Top Categories */}
        <div className="bg-stone-900/60 backdrop-blur rounded-xl p-3 mb-3 border border-stone-800/50">
          <p className="text-[9px] text-stone-500 uppercase tracking-wide mb-1.5">Top Categories</p>
          <div className="space-y-1.5">
            {topCats.map((cat, i) => (
              <div key={cat.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: ['#10b981', '#f59e0b', '#6366f1'][i] }} />
                <span className="text-[11px] text-stone-300 flex-1">{cat.name}</span>
                <span className="text-[11px] font-mono text-stone-400">{formatYIRCurrency(cat.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Best Buddy */}
        {data.socialStats.topFriend && (
          <div className="bg-stone-900/60 backdrop-blur rounded-xl p-2.5 mb-3 border border-stone-800/50 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-xs font-medium text-white">
              {data.socialStats.topFriend.name[0]}
            </div>
            <div>
              <p className="text-[9px] text-stone-500">Best Split Buddy</p>
              <p className="text-xs text-white font-medium">{data.socialStats.topFriend.name}</p>
            </div>
            <span className="ml-auto text-base">🤝</span>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 text-center border-t border-stone-800/50">
          <p className="text-[9px] text-stone-600">Generated with SpendLens</p>
        </div>
      </div>
    </div>
  );
}

// Stats Card - Detailed spending stats
function StatsCard({ data, year, userName }) {
  return (
    <div 
      className="relative"
      style={{ 
        width: CARD_WIDTH, 
        minHeight: CARD_HEIGHT,
        background: 'linear-gradient(135deg, #0c0a09 0%, #1c1917 50%, #0c0a09 100%)',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl" />
      
      <div className="relative z-10 h-full flex flex-col p-6">
        <div className="text-center mb-6">
          <p className="text-emerald-400 text-xs font-medium mb-1">{userName}'s {year}</p>
          <h1 className="text-2xl font-bold text-white">Spending Stats</h1>
        </div>

        <div className="flex-1 flex flex-col justify-center space-y-4">
          {/* Main Amount */}
          <div className="bg-stone-900/60 backdrop-blur rounded-2xl p-6 text-center border border-stone-800/50">
            <p className="text-xs text-stone-500 mb-2">Your Total Share</p>
            <p className="text-4xl font-bold text-emerald-400">{formatYIRCurrency(data.totalStats.totalYourShare)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-stone-900/60 backdrop-blur rounded-xl p-4 text-center border border-stone-800/50">
              <p className="text-2xl font-bold text-white">{data.totalStats.totalExpenseCount}</p>
              <p className="text-[10px] text-stone-500">Expenses Split</p>
            </div>
            <div className="bg-stone-900/60 backdrop-blur rounded-xl p-4 text-center border border-stone-800/50">
              <p className="text-2xl font-bold text-amber-400">{formatYIRCurrency(data.totalStats.totalYouPaid)}</p>
              <p className="text-[10px] text-stone-500">You Paid</p>
            </div>
            <div className="bg-stone-900/60 backdrop-blur rounded-xl p-4 text-center border border-stone-800/50">
              <p className="text-2xl font-bold text-indigo-400">{data.totalStats.uniquePeopleCount}</p>
              <p className="text-[10px] text-stone-500">People</p>
            </div>
            <div className="bg-stone-900/60 backdrop-blur rounded-xl p-4 text-center border border-stone-800/50">
              <p className="text-2xl font-bold text-pink-400">{data.totalStats.uniqueGroupsCount}</p>
              <p className="text-[10px] text-stone-500">Groups</p>
            </div>
          </div>

          <div className="bg-stone-900/60 backdrop-blur rounded-xl p-4 text-center border border-stone-800/50">
            <p className="text-xs text-stone-500 mb-1">Net Contribution</p>
            <p className={`text-2xl font-bold ${data.totalStats.netContribution >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {data.totalStats.netContribution >= 0 ? '+' : ''}{formatYIRCurrency(data.totalStats.netContribution)}
            </p>
            <p className="text-[10px] text-stone-600 mt-1">
              {data.totalStats.netContribution >= 0 ? 'You paid more than your share!' : 'Friends covered for you'}
            </p>
          </div>
        </div>

        <div className="mt-auto pt-4 text-center border-t border-stone-800/50">
          <div className="flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <span className="text-xs">✨</span>
            </div>
            <span className="text-[10px] text-stone-600">SpendLens Year in Review</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Categories Card
function CategoriesCard({ data, year, userName }) {
  const COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6'];
  const topCats = data.categoryStats.categories.slice(0, 5);
  const total = topCats.reduce((s, c) => s + c.amount, 0);
  
  return (
    <div 
      className="relative"
      style={{ 
        width: CARD_WIDTH, 
        minHeight: CARD_HEIGHT,
        background: 'linear-gradient(135deg, #0c0a09 0%, #1c1917 50%, #0c0a09 100%)',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      <div className="absolute top-1/3 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
      
      <div className="relative z-10 h-full flex flex-col p-6">
        <div className="text-center mb-6">
          <p className="text-amber-400 text-xs font-medium mb-1">{userName}'s {year}</p>
          <h1 className="text-2xl font-bold text-white">Where It Went</h1>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          {/* Visual bars */}
          <div className="space-y-4 mb-6">
            {topCats.map((cat, i) => {
              const percent = total > 0 ? (cat.amount / total) * 100 : 0;
              return (
                <div key={cat.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-stone-300">{cat.name}</span>
                    <span className="text-sm font-mono text-stone-400">{formatYIRCurrency(cat.amount)}</span>
                  </div>
                  <div className="h-8 bg-stone-800/60 rounded-lg overflow-hidden">
                    <div 
                      className="h-full rounded-lg flex items-center justify-end px-2 transition-all"
                      style={{ width: `${Math.max(percent, 10)}%`, background: COLORS[i] }}
                    >
                      <span className="text-[10px] font-bold text-white/90">{Math.round(percent)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top Category highlight */}
          {topCats[0] && (
            <div className="bg-stone-900/60 backdrop-blur rounded-2xl p-4 text-center border border-stone-800/50">
              <p className="text-xs text-stone-500 mb-1">Top Category</p>
              <p className="text-xl font-bold text-white">{topCats[0].name}</p>
              <p className="text-2xl font-bold" style={{ color: COLORS[0] }}>
                {formatYIRCurrency(topCats[0].amount)}
              </p>
            </div>
          )}
        </div>

        <div className="mt-auto pt-4 text-center border-t border-stone-800/50">
          <div className="flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <span className="text-xs">✨</span>
            </div>
            <span className="text-[10px] text-stone-600">SpendLens Year in Review</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Personality Card
function PersonalityCard({ data, year, userName }) {
  return (
    <div 
      className="relative"
      style={{ 
        width: CARD_WIDTH, 
        minHeight: CARD_HEIGHT,
        background: 'linear-gradient(135deg, #0c0a09 0%, #1c1917 50%, #0c0a09 100%)',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl" />
      
      <div className="relative z-10 h-full flex flex-col p-6">
        <div className="text-center mb-4">
          <p className="text-purple-400 text-xs font-medium mb-1">{userName}'s {year}</p>
          <h1 className="text-xl font-bold text-white">Splitwise Personality</h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-8xl mb-4">{data.personality.emoji}</div>
          <h2 className="text-3xl font-bold text-white mb-2">{data.personality.type}</h2>
          <p className="text-sm text-stone-400 text-center max-w-[280px] mb-6 leading-relaxed">
            {data.personality.description}
          </p>
          
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {data.personality.traits.map((trait, i) => (
              <span 
                key={i}
                className="px-3 py-1.5 rounded-full text-xs font-medium"
                style={{
                  background: ['#10b98120', '#f59e0b20', '#6366f120', '#ec489920'][i % 4],
                  color: ['#10b981', '#f59e0b', '#6366f1', '#ec4899'][i % 4],
                }}
              >
                {trait}
              </span>
            ))}
          </div>

          {/* Fun stats */}
          <div className="grid grid-cols-2 gap-3 w-full">
            <div className="bg-stone-900/60 backdrop-blur rounded-xl p-3 text-center border border-stone-800/50">
              <p className="text-lg font-bold text-white">{data.monthlyStats.busiestMonth.fullName}</p>
              <p className="text-[10px] text-stone-500">Busiest Month</p>
            </div>
            <div className="bg-stone-900/60 backdrop-blur rounded-xl p-3 text-center border border-stone-800/50">
              <p className="text-lg font-bold text-white">{data.timePatterns.busiestDay.day}</p>
              <p className="text-[10px] text-stone-500">Favorite Day</p>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4 text-center border-t border-stone-800/50">
          <div className="flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <span className="text-xs">✨</span>
            </div>
            <span className="text-[10px] text-stone-600">SpendLens Year in Review</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Social Card
function SocialCard({ data, year, userName }) {
  return (
    <div 
      className="relative"
      style={{ 
        width: CARD_WIDTH, 
        minHeight: CARD_HEIGHT,
        background: 'linear-gradient(135deg, #0c0a09 0%, #1c1917 50%, #0c0a09 100%)',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      <div className="absolute top-0 left-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl" />
      
      <div className="relative z-10 h-full flex flex-col p-6">
        <div className="text-center mb-6">
          <p className="text-pink-400 text-xs font-medium mb-1">{userName}'s {year}</p>
          <h1 className="text-2xl font-bold text-white">Split Squad</h1>
        </div>

        <div className="flex-1 flex flex-col justify-center space-y-4">
          {/* Best Buddy */}
          {data.socialStats.topFriend && (
            <div className="bg-stone-900/60 backdrop-blur rounded-2xl p-5 border border-stone-800/50">
              <p className="text-[10px] text-pink-400 uppercase tracking-wide mb-3">Best Split Buddy</p>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-2xl font-bold text-white">
                  {data.socialStats.topFriend.name[0]}
                </div>
                <div>
                  <p className="text-xl font-bold text-white">{data.socialStats.topFriend.name}</p>
                  <p className="text-sm text-stone-400">{data.socialStats.topFriend.expenseCount} expenses together</p>
                </div>
                <span className="ml-auto text-3xl">🤝</span>
              </div>
            </div>
          )}

          {/* Top Group */}
          {data.socialStats.topGroup && (
            <div className="bg-stone-900/60 backdrop-blur rounded-2xl p-5 border border-stone-800/50">
              <p className="text-[10px] text-indigo-400 uppercase tracking-wide mb-3">Most Active Group</p>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl">
                  👥
                </div>
                <div>
                  <p className="text-xl font-bold text-white truncate max-w-[180px]">{data.socialStats.topGroup.name}</p>
                  <p className="text-sm text-stone-400">{data.socialStats.topGroup.count} expenses</p>
                </div>
                <span className="ml-auto text-3xl">🏆</span>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-stone-900/60 backdrop-blur rounded-xl p-4 text-center border border-stone-800/50">
              <p className="text-3xl font-bold text-white">{data.socialStats.totalFriendsInteracted}</p>
              <p className="text-[10px] text-stone-500">Friends</p>
            </div>
            <div className="bg-stone-900/60 backdrop-blur rounded-xl p-4 text-center border border-stone-800/50">
              <p className="text-3xl font-bold text-white">{data.socialStats.totalGroupsActive}</p>
              <p className="text-[10px] text-stone-500">Active Groups</p>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4 text-center border-t border-stone-800/50">
          <div className="flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <span className="text-xs">✨</span>
            </div>
            <span className="text-[10px] text-stone-600">SpendLens Year in Review</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Highlights Card
function HighlightsCard({ data, year, userName }) {
  return (
    <div 
      className="relative"
      style={{ 
        width: CARD_WIDTH, 
        minHeight: CARD_HEIGHT,
        background: 'linear-gradient(135deg, #0c0a09 0%, #1c1917 50%, #0c0a09 100%)',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      <div className="absolute top-1/2 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl" />
      
      <div className="relative z-10 h-full flex flex-col p-6">
        <div className="text-center mb-6">
          <p className="text-amber-400 text-xs font-medium mb-1">{userName}'s {year}</p>
          <h1 className="text-2xl font-bold text-white">Highlights</h1>
        </div>

        <div className="flex-1 flex flex-col justify-center space-y-4">
          {/* Biggest Expense */}
          {data.notableExpenses.biggestExpense && (
            <div className="bg-stone-900/60 backdrop-blur rounded-2xl p-4 border-l-4 border-amber-500 border-y border-r border-stone-800/50">
              <p className="text-[10px] text-amber-400 uppercase tracking-wide mb-2">Biggest Expense</p>
              <p className="text-lg font-bold text-white truncate">{data.notableExpenses.biggestExpense.description}</p>
              <p className="text-2xl font-bold text-amber-400">{formatYIRCurrency(data.notableExpenses.biggestExpense.amount)}</p>
              <p className="text-xs text-stone-500">{data.notableExpenses.biggestExpense.category}</p>
            </div>
          )}

          {/* Most Frequent */}
          {data.notableExpenses.mostFrequentExpense && (
            <div className="bg-stone-900/60 backdrop-blur rounded-2xl p-4 border-l-4 border-indigo-500 border-y border-r border-stone-800/50">
              <p className="text-[10px] text-indigo-400 uppercase tracking-wide mb-2">Most Frequent</p>
              <p className="text-lg font-bold text-white capitalize">{data.notableExpenses.mostFrequentExpense.description}</p>
              <p className="text-sm text-stone-400">{data.notableExpenses.mostFrequentExpense.count} times this year</p>
            </div>
          )}

          {/* Fun Facts */}
          <div className="space-y-2">
            {data.funFacts.slice(0, 3).map((fact, i) => (
              <div key={i} className="bg-stone-900/60 backdrop-blur rounded-xl p-3 flex items-center gap-3 border border-stone-800/50">
                <span className="text-xl">{fact.icon}</span>
                <p className="text-xs text-stone-300 flex-1">{fact.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-4 text-center border-t border-stone-800/50">
          <div className="flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <span className="text-xs">✨</span>
            </div>
            <span className="text-[10px] text-stone-600">SpendLens Year in Review</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main ShareableReview Modal Component
export default function ShareableReview({ data, year, userName, onClose }) {
  const [currentCard, setCurrentCard] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const cardRef = useRef(null);

  const cards = [
    { id: 'summary', name: 'Summary', component: <SummaryCard data={data} year={year} userName={userName} /> },
    { id: 'stats', name: 'Stats', component: <StatsCard data={data} year={year} userName={userName} /> },
    { id: 'categories', name: 'Categories', component: <CategoriesCard data={data} year={year} userName={userName} /> },
    { id: 'personality', name: 'Personality', component: <PersonalityCard data={data} year={year} userName={userName} /> },
    { id: 'social', name: 'Social', component: <SocialCard data={data} year={year} userName={userName} /> },
    { id: 'highlights', name: 'Highlights', component: <HighlightsCard data={data} year={year} userName={userName} /> },
  ];

  const generateImage = useCallback(async () => {
    if (!cardRef.current) return null;
    
    setIsGenerating(true);
    try {
      const element = cardRef.current;
      const canvas = await html2canvas(element, {
        scale: 3, // High quality
        backgroundColor: null,
        useCORS: true,
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });
      return canvas;
    } catch (error) {
      console.error('Failed to generate image:', error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleDownload = useCallback(async () => {
    const canvas = await generateImage();
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `spendlens-${year}-${cards[currentCard].id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2000);
  }, [generateImage, year, currentCard, cards]);

  const handleShare = useCallback(async () => {
    const canvas = await generateImage();
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        const file = new File([blob], `spendlens-${year}-${cards[currentCard].id}.png`, { type: 'image/png' });
        
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `My ${year} SpendLens Wrapped`,
            text: `Check out my ${year} spending wrapped!`,
          });
        } else {
          // Fallback to download
          handleDownload();
        }
      }, 'image/png');
    } catch (error) {
      console.error('Share failed:', error);
      handleDownload();
    }
  }, [generateImage, year, currentCard, cards, handleDownload]);

  const goNext = () => setCurrentCard(c => Math.min(c + 1, cards.length - 1));
  const goPrev = () => setCurrentCard(c => Math.max(c - 1, 0));

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute right-4 z-50 w-10 h-10 rounded-full bg-stone-800/80 hover:bg-stone-700 flex items-center justify-center transition-colors"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <X size={18} className="text-stone-400" />
      </button>

      <div className="flex flex-col items-center max-w-full">
        {/* Card selector */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 max-w-full px-2">
          {cards.map((card, i) => (
            <button
              key={card.id}
              onClick={() => setCurrentCard(i)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                i === currentCard 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-stone-800/60 text-stone-400 hover:bg-stone-700/60 border border-transparent'
              }`}
            >
              {card.name}
            </button>
          ))}
        </div>

        {/* Card preview with navigation */}
        <div className="relative flex items-center gap-2 sm:gap-4">
          <button
            onClick={goPrev}
            disabled={currentCard === 0}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              currentCard === 0 
                ? 'bg-stone-800/30 text-stone-700' 
                : 'bg-stone-800 hover:bg-stone-700 text-white'
            }`}
          >
            <ChevronLeft size={20} />
          </button>

          {/* The actual card to render/capture */}
          <div 
            className="rounded-2xl shadow-2xl overflow-auto"
            style={{ maxHeight: '70vh', maxWidth: '90vw' }}
          >
            <div ref={cardRef} className="rounded-2xl overflow-hidden">
              {cards[currentCard].component}
            </div>
          </div>

          <button
            onClick={goNext}
            disabled={currentCard === cards.length - 1}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              currentCard === cards.length - 1 
                ? 'bg-stone-800/30 text-stone-700' 
                : 'bg-stone-800 hover:bg-stone-700 text-white'
            }`}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-2.5 bg-stone-800 hover:bg-stone-700 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : downloadSuccess ? (
              <Check size={16} className="text-emerald-400" />
            ) : (
              <Download size={16} />
            )}
            {downloadSuccess ? 'Saved!' : 'Download'}
          </button>

          <button
            onClick={handleShare}
            disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
          >
            {isGenerating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Share2 size={16} />
            )}
            Share
          </button>
        </div>

        <p className="text-[10px] text-stone-600 mt-4">
          {currentCard + 1} of {cards.length} • Swipe or tap to browse cards
        </p>
      </div>
    </div>
  );
}
