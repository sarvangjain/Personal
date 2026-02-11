import { useState, useRef, useCallback } from 'react';
import { X, Download, Share2, Check, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toPng } from 'html-to-image';
import { formatTripCurrency } from '../utils/trips';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

// ─── Shared Constants ───────────────────────────────────────────────────────

const CARD_W = 360;
const CARD_H = 640;
const EXPORT_SCALE = 3;

const cardBase = {
  width: CARD_W,
  minHeight: CARD_H,
  background: 'linear-gradient(135deg, #0c0a09 0%, #1c1917 50%, #0c0a09 100%)',
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  position: 'relative',
  overflow: 'hidden',
  color: '#fff',
};

function GlowBlob({ top, left, right, bottom, color = 'rgba(6,182,212,0.10)', size = 250 }) {
  return (
    <div style={{
      position: 'absolute', top, left, right, bottom,
      width: size, height: size,
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      pointerEvents: 'none',
    }} />
  );
}

function Section({ children, style = {} }) {
  return (
    <div style={{
      background: 'rgba(28,25,23,0.6)',
      border: '1px solid rgba(120,113,108,0.15)',
      borderRadius: 12,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Footer() {
  return (
    <div style={{ paddingTop: 12, marginTop: 'auto', borderTop: '1px solid rgba(120,113,108,0.15)', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🗺️</div>
        <span style={{ fontSize: 10, color: '#57534e' }}>SplitSight Trip Recap</span>
      </div>
    </div>
  );
}

// Helper to shorten: fmt(amount) using trip.currency from closure
function useFmt(trip) {
  return (amount) => formatTripCurrency(amount, trip.currency);
}

// ─── Card 1: Trip Summary ───────────────────────────────────────────────────

function TripSummaryCard({ trip }) {
  const fmt = useFmt(trip);
  const CAT_COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6'];
  const topCats = trip.categories.slice(0, 4);

  return (
    <div style={cardBase}>
      <GlowBlob top={-80} left={-80} color="rgba(6,182,212,0.10)" />
      <GlowBlob bottom={-100} right={-100} color="rgba(59,130,246,0.08)" size={300} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', padding: 20, minHeight: CARD_H }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 48, lineHeight: 1.1, marginBottom: 8 }}>{trip.vibe.emoji}</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{trip.groupName}</div>
          <div style={{ fontSize: 12, color: '#67e8f9', fontWeight: 500, marginTop: 2 }}>{trip.dateRange}</div>
          <div style={{ fontSize: 10, color: '#78716c', marginTop: 4 }}>{trip.durationDays} days · {trip.memberCount} people · {trip.expenseCount} expenses</div>
        </div>

        <Section style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#34d399' }}>{fmt(trip.totalGroupSpend)}</div>
              <div style={{ fontSize: 9, color: '#78716c' }}>Group Total</div>
            </div>
            <div style={{ width: 1, background: 'rgba(120,113,108,0.15)' }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#fbbf24' }}>{fmt(trip.yourShare)}</div>
              <div style={{ fontSize: 9, color: '#78716c' }}>Your Share</div>
            </div>
          </div>
        </Section>

        <Section style={{ padding: 12, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 9, color: '#78716c', textTransform: 'uppercase', letterSpacing: 1 }}>Burn Rate</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#67e8f9' }}>{fmt(trip.perDayBurnRate)}/day</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: '#78716c', textTransform: 'uppercase', letterSpacing: 1 }}>Your Rate</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#818cf8' }}>{fmt(trip.yourPerDayRate)}/day</div>
          </div>
        </Section>

        <Section style={{ padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: '#78716c', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Money Went To</div>
          {topCats.map((cat, i) => (
            <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLORS[i], flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#d6d3d1', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
              <span style={{ fontSize: 10, color: '#78716c' }}>{cat.percentage}%</span>
              <span style={{ fontSize: 11, color: '#a8a29e', fontFamily: 'monospace' }}>{fmt(cat.amount)}</span>
            </div>
          ))}
        </Section>

        {trip.generousPayer && (
          <Section style={{ padding: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 700, flexShrink: 0,
            }}>
              {trip.generousPayer.name?.[0] || '?'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: '#fbbf24' }}>MVP — Most Generous</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{trip.generousPayer.name}</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24' }}>{fmt(trip.generousPayer.totalPaid)}</div>
          </Section>
        )}

        <Footer />
      </div>
    </div>
  );
}

// ─── Card 2: Leaderboard Card ───────────────────────────────────────────────

function LeaderboardCard({ trip }) {
  const fmt = useFmt(trip);
  const COLORS = ['#fbbf24', '#c0c0c0', '#cd7f32', '#818cf8', '#f472b6'];
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div style={cardBase}>
      <GlowBlob top={-80} right={-80} color="rgba(245,158,11,0.08)" />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', padding: 24, minHeight: CARD_H }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: '#67e8f9', fontWeight: 500, marginBottom: 4 }}>{trip.groupName}</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>Payer Leaderboard</div>
          <div style={{ fontSize: 11, color: '#78716c', marginTop: 4 }}>{trip.dateRange}</div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {trip.payers.slice(0, 5).map((payer, i) => {
            const maxPaid = trip.payers[0].totalPaid;
            const pct = maxPaid > 0 ? (payer.totalPaid / maxPaid) * 100 : 0;
            return (
              <Section key={payer.id} style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{medals[i] || `#${i + 1}`}</span>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${COLORS[i]}, ${COLORS[i]}88)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, flexShrink: 0,
                  }}>
                    {payer.name?.[0] || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{payer.name}</div>
                    <div style={{ marginTop: 4, height: 6, background: 'rgba(28,25,23,0.8)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 4, background: COLORS[i], width: `${pct}%` }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS[i], flexShrink: 0 }}>{fmt(payer.totalPaid)}</div>
                </div>
              </Section>
            );
          })}
        </div>

        <Section style={{ padding: 14, textAlign: 'center', marginTop: 10 }}>
          <div style={{ fontSize: 11, color: '#78716c', marginBottom: 4 }}>Total Group Spend</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#34d399' }}>{fmt(trip.totalGroupSpend)}</div>
        </Section>

        <Footer />
      </div>
    </div>
  );
}

// ─── Card 3: Highlights Card ────────────────────────────────────────────────

function HighlightsCard({ trip }) {
  const fmt = useFmt(trip);

  return (
    <div style={cardBase}>
      <GlowBlob top="30%" left={-80} color="rgba(236,72,153,0.08)" size={300} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', padding: 24, minHeight: CARD_H }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 42, lineHeight: 1.1, marginBottom: 8 }}>{trip.vibe.emoji}</div>
          <div style={{ fontSize: 13, color: '#67e8f9', fontWeight: 500, marginBottom: 4 }}>{trip.groupName}</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>Trip Highlights</div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {trip.biggestExpense && (
            <div style={{ display: 'flex' }}>
              <div style={{ width: 4, borderRadius: 4, background: '#f59e0b', flexShrink: 0 }} />
              <Section style={{ flex: 1, padding: 14, marginLeft: 4, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}>
                <div style={{ fontSize: 10, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Biggest Expense</div>
                <div style={{ fontSize: 16, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trip.biggestExpense.description}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fbbf24', marginTop: 2 }}>{fmt(trip.biggestExpense.cost)}</div>
              </Section>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Section style={{ padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#67e8f9' }}>{trip.durationDays}</div>
              <div style={{ fontSize: 10, color: '#78716c' }}>Days</div>
            </Section>
            <Section style={{ padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#f472b6' }}>{trip.expenseCount}</div>
              <div style={{ fontSize: 10, color: '#78716c' }}>Expenses</div>
            </Section>
            <Section style={{ padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#818cf8' }}>{trip.memberCount}</div>
              <div style={{ fontSize: 10, color: '#78716c' }}>People</div>
            </Section>
            <Section style={{ padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#34d399' }}>{fmt(trip.perDayBurnRate)}</div>
              <div style={{ fontSize: 10, color: '#78716c' }}>Per Day</div>
            </Section>
          </div>

          <Section style={{ padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#78716c', marginBottom: 4 }}>Your Net Contribution</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: trip.netContribution >= 0 ? '#34d399' : '#f87171' }}>
              {trip.netContribution >= 0 ? '+' : ''}{fmt(trip.netContribution)}
            </div>
            <div style={{ fontSize: 10, color: '#57534e', marginTop: 4 }}>
              {trip.netContribution >= 0 ? 'You covered for the group!' : 'Friends had your back'}
            </div>
          </Section>
        </div>

        <Footer />
      </div>
    </div>
  );
}

// ─── Card Registry ──────────────────────────────────────────────────────────

const CARDS = [
  { id: 'summary', name: 'Summary', Component: TripSummaryCard },
  { id: 'leaderboard', name: 'Leaderboard', Component: LeaderboardCard },
  { id: 'highlights', name: 'Highlights', Component: HighlightsCard },
];

// ─── Image Generation ───────────────────────────────────────────────────────

async function generateImage(element) {
  await document.fonts.ready;
  return toPng(element, {
    width: CARD_W,
    height: CARD_H,
    pixelRatio: EXPORT_SCALE,
    cacheBust: true,
    style: { fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" },
    filter: (node) => node.dataset?.excludeCapture !== 'true',
  });
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ShareableTripCard({ trip, onClose }) {
  const [currentCard, setCurrentCard] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const cardRef = useRef(null);

  useBodyScrollLock(true);

  const { Component } = CARDS[currentCard];
  const cardId = CARDS[currentCard].id;

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const dataUrl = await generateImage(cardRef.current);
      const link = document.createElement('a');
      link.download = `splitsight-trip-${trip.groupName.replace(/\s+/g, '-').toLowerCase()}-${cardId}.png`;
      link.href = dataUrl;
      link.click();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2000);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [cardId, trip.groupName]);

  const handleShare = useCallback(async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const dataUrl = await generateImage(cardRef.current);
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `splitsight-trip-${cardId}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${trip.groupName} — Trip Recap`,
          text: `Check out our ${trip.groupName} trip recap!`,
        });
      } else {
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
  }, [cardId, trip.groupName]);

  const goNext = () => setCurrentCard(c => Math.min(c + 1, CARDS.length - 1));
  const goPrev = () => setCurrentCard(c => Math.max(c - 1, 0));

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <button
        onClick={onClose}
        className="absolute right-4 z-50 w-10 h-10 rounded-full bg-stone-800/80 hover:bg-stone-700 flex items-center justify-center transition-colors"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <X size={18} className="text-stone-400" />
      </button>

      <div className="flex flex-col items-center max-w-full">
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 max-w-full px-2 scrollbar-hide">
          {CARDS.map((card, i) => (
            <button
              key={card.id}
              onClick={() => setCurrentCard(i)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                i === currentCard
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-stone-800/60 text-stone-400 hover:bg-stone-700/60 border border-transparent'
              }`}
            >
              {card.name}
            </button>
          ))}
        </div>

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

          <div className="rounded-2xl shadow-2xl overflow-hidden" style={{ maxHeight: '70vh', maxWidth: '90vw' }}>
            <div ref={cardRef} className="rounded-2xl overflow-hidden">
              <Component trip={trip} />
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

        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-2.5 bg-stone-800 hover:bg-stone-700 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : downloadSuccess ? <Check size={16} className="text-emerald-400" /> : <Download size={16} />}
            {downloadSuccess ? 'Saved!' : 'Download'}
          </button>
          <button
            onClick={handleShare}
            disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-cyan-500/20"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
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
