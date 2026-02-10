import { useState, useRef, useCallback } from 'react';
import { X, Download, Share2, Check, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toPng } from 'html-to-image';
import { formatYIRCurrency } from '../utils/yearInReview';

// ─── Shared Constants & Helpers ─────────────────────────────────────────────

const CARD_W = 360;
const CARD_H = 640;
const EXPORT_SCALE = 3; // 1080×1920

// Inline styles for reliable capture (html-to-image reads computed styles)
const cardBase = {
  width: CARD_W,
  minHeight: CARD_H,
  background: 'linear-gradient(135deg, #0c0a09 0%, #1c1917 50%, #0c0a09 100%)',
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  position: 'relative',
  overflow: 'hidden',
  color: '#fff',
};

// Decorative gradient blobs (CSS radial gradients instead of filter blur for capture compat)
function GlowBlob({ top, left, right, bottom, color = 'rgba(16,185,129,0.10)', size = 250 }) {
  return (
    <div
      style={{
        position: 'absolute', top, left, right, bottom,
        width: size, height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }}
    />
  );
}

function Section({ children, className = '', style = {} }) {
  return (
    <div
      className={className}
      style={{
        background: 'rgba(28,25,23,0.6)',
        border: '1px solid rgba(120,113,108,0.15)',
        borderRadius: 12,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Footer() {
  return (
    <div style={{ paddingTop: 12, marginTop: 'auto', borderTop: '1px solid rgba(120,113,108,0.15)', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #10b981, #14b8a6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✨</div>
        <span style={{ fontSize: 10, color: '#57534e' }}>SplitSight Year in Review</span>
      </div>
    </div>
  );
}

function GradientCircle({ size = 40, colors = ['#10b981', '#14b8a6'], children, style = {} }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Card Components ────────────────────────────────────────────────────────

function SummaryCard({ data, year, userName }) {
  const topCats = data.categoryStats.categories.slice(0, 3);
  const catColors = ['#10b981', '#f59e0b', '#6366f1'];

  return (
    <div style={cardBase}>
      <GlowBlob top={-80} left={-80} />
      <GlowBlob bottom={-100} right={-100} color="rgba(20,184,166,0.10)" size={300} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', padding: 20 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <GradientCircle size={40} style={{ margin: '0 auto 8px' }}><span style={{ fontSize: 18 }}>✨</span></GradientCircle>
          <div style={{ fontSize: 21, fontWeight: 700 }}>{userName}'s {year}</div>
          <div style={{ fontSize: 12, color: '#34d399', fontWeight: 500 }}>Year in Review</div>
        </div>

        {/* Main Stats */}
        <Section style={{ padding: 12, marginBottom: 12 }}>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{formatYIRCurrency(data.totalStats.totalYourShare)}</div>
            <div style={{ fontSize: 10, color: '#78716c' }}>Total Spent</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { v: data.totalStats.totalExpenseCount, l: 'Expenses', c: '#34d399' },
              { v: data.totalStats.uniquePeopleCount, l: 'People', c: '#fbbf24' },
              { v: data.totalStats.uniqueGroupsCount, l: 'Groups', c: '#818cf8' },
            ].map(s => (
              <div key={s.l} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 9, color: '#78716c' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Personality */}
        <Section style={{ padding: 12, marginBottom: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 28, lineHeight: 1.2 }}>{data.personality.emoji}</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{data.personality.type}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
            {data.personality.traits.slice(0, 3).map((t, i) => (
              <span key={i} style={{ padding: '2px 8px', background: 'rgba(28,25,23,0.8)', borderRadius: 12, fontSize: 8, color: '#a8a29e' }}>{t}</span>
            ))}
          </div>
        </Section>

        {/* Categories */}
        <Section style={{ padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: '#78716c', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Top Categories</div>
          {topCats.map((cat, i) => (
            <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: catColors[i], flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#d6d3d1', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
              <span style={{ fontSize: 11, color: '#a8a29e', fontFamily: 'monospace' }}>{formatYIRCurrency(cat.amount)}</span>
            </div>
          ))}
        </Section>

        {/* Best Buddy */}
        {data.socialStats.topFriend && (
          <Section style={{ padding: 10, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <GradientCircle size={32} colors={['#ec4899', '#e11d48']}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{data.socialStats.topFriend.name[0]}</span>
            </GradientCircle>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: '#78716c' }}>Best Split Buddy</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{data.socialStats.topFriend.name}</div>
            </div>
            <span style={{ fontSize: 18 }}>🤝</span>
          </Section>
        )}

        <Footer />
      </div>
    </div>
  );
}

function StatsCard({ data, year, userName }) {
  const net = data.totalStats.netContribution;
  return (
    <div style={cardBase}>
      <GlowBlob top={-80} right={-100} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', padding: 24, height: '100%', minHeight: CARD_H }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: '#34d399', fontWeight: 500, marginBottom: 4 }}>{userName}'s {year}</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>Spending Stats</div>
        </div>

        <Section style={{ padding: 24, marginBottom: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#78716c', marginBottom: 8 }}>Your Total Share</div>
          <div style={{ fontSize: 40, fontWeight: 700, color: '#34d399' }}>{formatYIRCurrency(data.totalStats.totalYourShare)}</div>
        </Section>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          {[
            { v: data.totalStats.totalExpenseCount, l: 'Expenses Split', c: '#fff' },
            { v: formatYIRCurrency(data.totalStats.totalYouPaid), l: 'You Paid', c: '#fbbf24' },
            { v: data.totalStats.uniquePeopleCount, l: 'People', c: '#818cf8' },
            { v: data.totalStats.uniqueGroupsCount, l: 'Groups', c: '#f472b6' },
          ].map(item => (
            <Section key={item.l} style={{ padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: item.c }}>{item.v}</div>
              <div style={{ fontSize: 10, color: '#78716c' }}>{item.l}</div>
            </Section>
          ))}
        </div>

        <Section style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#78716c', marginBottom: 4 }}>Net Contribution</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: net >= 0 ? '#34d399' : '#f87171' }}>{net >= 0 ? '+' : ''}{formatYIRCurrency(net)}</div>
          <div style={{ fontSize: 10, color: '#57534e', marginTop: 4 }}>{net >= 0 ? 'You paid more than your share!' : 'Friends covered for you'}</div>
        </Section>

        <Footer />
      </div>
    </div>
  );
}

function CategoriesCard({ data, year, userName }) {
  const COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6'];
  const topCats = data.categoryStats.categories.slice(0, 5);
  const total = topCats.reduce((s, c) => s + c.amount, 0);

  return (
    <div style={cardBase}>
      <GlowBlob top="33%" left={-100} color="rgba(245,158,11,0.08)" size={300} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', padding: 24, height: '100%', minHeight: CARD_H }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: '#fbbf24', fontWeight: 500, marginBottom: 4 }}>{userName}'s {year}</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>Where It Went</div>
        </div>

        <div style={{ flex: 1 }}>
          {topCats.map((cat, i) => {
            const pct = total > 0 ? (cat.amount / total) * 100 : 0;
            return (
              <div key={cat.name} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: '#d6d3d1' }}>{cat.name}</span>
                  <span style={{ fontSize: 13, color: '#a8a29e', fontFamily: 'monospace' }}>{formatYIRCurrency(cat.amount)}</span>
                </div>
                <div style={{ height: 28, background: 'rgba(28,25,23,0.6)', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 8, background: COLORS[i],
                    width: `${Math.max(pct, 10)}%`,
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8,
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{Math.round(pct)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {topCats[0] && (
          <Section style={{ padding: 16, textAlign: 'center', marginTop: 8 }}>
            <div style={{ fontSize: 11, color: '#78716c', marginBottom: 4 }}>Top Category</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{topCats[0].name}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: COLORS[0] }}>{formatYIRCurrency(topCats[0].amount)}</div>
          </Section>
        )}

        <Footer />
      </div>
    </div>
  );
}

function PersonalityCard({ data, year, userName }) {
  const traitColors = ['#10b981', '#f59e0b', '#6366f1', '#ec4899'];
  const traitBgs = ['rgba(16,185,129,0.12)', 'rgba(245,158,11,0.12)', 'rgba(99,102,241,0.12)', 'rgba(236,72,153,0.12)'];

  return (
    <div style={cardBase}>
      <GlowBlob top="20%" left="20%" color="rgba(139,92,246,0.08)" size={350} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', padding: 24, height: '100%', minHeight: CARD_H, alignItems: 'center' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#c084fc', fontWeight: 500, marginBottom: 4 }}>{userName}'s {year}</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Splitwise Personality</div>
        </div>

        <div style={{ fontSize: 72, lineHeight: 1.1, marginBottom: 12 }}>{data.personality.emoji}</div>
        <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{data.personality.type}</div>
        <div style={{ fontSize: 13, color: '#a8a29e', textAlign: 'center', maxWidth: 280, lineHeight: 1.5, marginBottom: 20 }}>{data.personality.description}</div>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {data.personality.traits.slice(0, 4).map((trait, i) => (
            <span key={i} style={{
              padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
              background: traitBgs[i % 4], color: traitColors[i % 4],
            }}>{trait}</span>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%' }}>
          <Section style={{ padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{data.monthlyStats.busiestMonth.fullName}</div>
            <div style={{ fontSize: 10, color: '#78716c' }}>Busiest Month</div>
          </Section>
          <Section style={{ padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{data.timePatterns.busiestDay.day}</div>
            <div style={{ fontSize: 10, color: '#78716c' }}>Favorite Day</div>
          </Section>
        </div>

        <Footer />
      </div>
    </div>
  );
}

function SocialCard({ data, year, userName }) {
  return (
    <div style={cardBase}>
      <GlowBlob top={-80} left={-80} color="rgba(236,72,153,0.08)" />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', padding: 24, height: '100%', minHeight: CARD_H }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: '#f472b6', fontWeight: 500, marginBottom: 4 }}>{userName}'s {year}</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>Split Squad</div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {data.socialStats.topFriend && (
            <Section style={{ padding: 18 }}>
              <div style={{ fontSize: 10, color: '#f472b6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Best Split Buddy</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <GradientCircle size={56} colors={['#ec4899', '#e11d48']}>
                  <span style={{ fontSize: 22, fontWeight: 700 }}>{data.socialStats.topFriend.name[0]}</span>
                </GradientCircle>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 19, fontWeight: 700 }}>{data.socialStats.topFriend.name}</div>
                  <div style={{ fontSize: 13, color: '#a8a29e' }}>{data.socialStats.topFriend.expenseCount} expenses together</div>
                </div>
                <span style={{ fontSize: 28 }}>🤝</span>
              </div>
            </Section>
          )}

          {data.socialStats.topGroup && (
            <Section style={{ padding: 18 }}>
              <div style={{ fontSize: 10, color: '#818cf8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Most Active Group</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <GradientCircle size={56} colors={['#6366f1', '#7c3aed']} style={{ borderRadius: 14 }}>
                  <span style={{ fontSize: 22 }}>👥</span>
                </GradientCircle>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 19, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.socialStats.topGroup.name}</div>
                  <div style={{ fontSize: 13, color: '#a8a29e' }}>{data.socialStats.topGroup.count} expenses</div>
                </div>
                <span style={{ fontSize: 28 }}>🏆</span>
              </div>
            </Section>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Section style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 700 }}>{data.socialStats.totalFriendsInteracted}</div>
              <div style={{ fontSize: 10, color: '#78716c' }}>Friends</div>
            </Section>
            <Section style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 700 }}>{data.socialStats.totalGroupsActive}</div>
              <div style={{ fontSize: 10, color: '#78716c' }}>Active Groups</div>
            </Section>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}

function HighlightsCard({ data, year, userName }) {
  return (
    <div style={cardBase}>
      <GlowBlob top="40%" left={-100} color="rgba(245,158,11,0.08)" size={300} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', padding: 24, height: '100%', minHeight: CARD_H }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: '#fbbf24', fontWeight: 500, marginBottom: 4 }}>{userName}'s {year}</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>Highlights</div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {data.notableExpenses.biggestExpense && (
            <div style={{ display: 'flex' }}>
              <div style={{ width: 4, borderRadius: 4, background: '#f59e0b', flexShrink: 0 }} />
              <Section style={{ flex: 1, padding: 14, marginLeft: 4, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}>
                <div style={{ fontSize: 10, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Biggest Expense</div>
                <div style={{ fontSize: 17, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.notableExpenses.biggestExpense.description}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#fbbf24', marginTop: 2 }}>{formatYIRCurrency(data.notableExpenses.biggestExpense.amount)}</div>
                <div style={{ fontSize: 11, color: '#78716c', marginTop: 2 }}>{data.notableExpenses.biggestExpense.category}</div>
              </Section>
            </div>
          )}

          {data.notableExpenses.mostFrequentExpense && (
            <div style={{ display: 'flex' }}>
              <div style={{ width: 4, borderRadius: 4, background: '#6366f1', flexShrink: 0 }} />
              <Section style={{ flex: 1, padding: 14, marginLeft: 4, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}>
                <div style={{ fontSize: 10, color: '#818cf8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Most Frequent</div>
                <div style={{ fontSize: 17, fontWeight: 700, textTransform: 'capitalize' }}>{data.notableExpenses.mostFrequentExpense.description}</div>
                <div style={{ fontSize: 13, color: '#a8a29e', marginTop: 4 }}>{data.notableExpenses.mostFrequentExpense.count} times this year</div>
              </Section>
            </div>
          )}

          {data.funFacts.slice(0, 3).map((fact, i) => (
            <Section key={i} style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{fact.icon}</span>
              <span style={{ fontSize: 12, color: '#d6d3d1', lineHeight: 1.4 }}>{fact.text}</span>
            </Section>
          ))}
        </div>

        <Footer />
      </div>
    </div>
  );
}

// ─── Card Registry ──────────────────────────────────────────────────────────

const CARDS = [
  { id: 'summary', name: 'Summary', Component: SummaryCard },
  { id: 'stats', name: 'Stats', Component: StatsCard },
  { id: 'categories', name: 'Categories', Component: CategoriesCard },
  { id: 'personality', name: 'Personality', Component: PersonalityCard },
  { id: 'social', name: 'Social', Component: SocialCard },
  { id: 'highlights', name: 'Highlights', Component: HighlightsCard },
];

// ─── Image Generation ───────────────────────────────────────────────────────

async function generateImage(element) {
  // Wait for fonts
  await document.fonts.ready;

  const dataUrl = await toPng(element, {
    width: CARD_W,
    height: CARD_H,
    pixelRatio: EXPORT_SCALE,
    cacheBust: true,
    // Inline styles for fonts so they survive serialization
    style: {
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    },
    // Filter out non-visible elements
    filter: (node) => {
      // Skip hidden elements
      if (node.dataset?.excludeCapture === 'true') return false;
      return true;
    },
  });

  return dataUrl;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ShareableReview({ data, year, userName, onClose }) {
  const [currentCard, setCurrentCard] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const cardRef = useRef(null);

  const { Component } = CARDS[currentCard];
  const cardId = CARDS[currentCard].id;

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const dataUrl = await generateImage(cardRef.current);
      const link = document.createElement('a');
      link.download = `splitsight-${year}-${cardId}.png`;
      link.href = dataUrl;
      link.click();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2000);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [cardId, year]);

  const handleShare = useCallback(async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const dataUrl = await generateImage(cardRef.current);

      // Convert data URL to blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `splitsight-${year}-${cardId}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `My ${year} SplitSight Wrapped`,
          text: `Check out my ${year} spending wrapped!`,
        });
      } else {
        // Fallback to download
        const link = document.createElement('a');
        link.download = file.name;
        link.href = dataUrl;
        link.click();
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 2000);
      }
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Share failed:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [cardId, year]);

  const goNext = () => setCurrentCard(c => Math.min(c + 1, CARDS.length - 1));
  const goPrev = () => setCurrentCard(c => Math.max(c - 1, 0));

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute right-4 z-50 w-10 h-10 rounded-full bg-stone-800/80 hover:bg-stone-700 flex items-center justify-center transition-colors"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <X size={18} className="text-stone-400" />
      </button>

      <div className="flex flex-col items-center max-w-full">
        {/* Card selector tabs */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 max-w-full px-2 scrollbar-hide">
          {CARDS.map((card, i) => (
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

        {/* Card with navigation */}
        <div className="relative flex items-center gap-2 sm:gap-4">
          <button
            onClick={goPrev}
            disabled={currentCard === 0}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
              currentCard === 0 ? 'bg-stone-800/30 text-stone-700' : 'bg-stone-800 hover:bg-stone-700 text-white'
            }`}
          >
            <ChevronLeft size={20} />
          </button>

          {/* The card — this exact element is captured for export */}
          <div className="rounded-2xl shadow-2xl overflow-hidden" style={{ maxHeight: '70vh', maxWidth: '90vw' }}>
            <div ref={cardRef} className="rounded-2xl overflow-hidden">
              <Component data={data} year={year} userName={userName} />
            </div>
          </div>

          <button
            onClick={goNext}
            disabled={currentCard === CARDS.length - 1}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
              currentCard === CARDS.length - 1 ? 'bg-stone-800/30 text-stone-700' : 'bg-stone-800 hover:bg-stone-700 text-white'
            }`}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 mt-5">
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

        <p className="text-[10px] text-stone-600 mt-3">
          {currentCard + 1} of {CARDS.length} · {CARD_W * EXPORT_SCALE}×{CARD_H * EXPORT_SCALE} Instagram-ready
        </p>
      </div>
    </div>
  );
}
