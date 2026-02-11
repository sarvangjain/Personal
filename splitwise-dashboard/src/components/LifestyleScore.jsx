import { useState, useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { ChevronLeft, ChevronRight, Heart, TrendingUp, Sparkles, Info } from 'lucide-react';
import { computeMonthlyLifestyle, computeBalanceScore, generateNudges, DIMENSIONS } from '../utils/lifestyle';
import { formatCurrency, formatCompact } from '../utils/analytics';

const DIMENSION_KEYS = Object.keys(DIMENSIONS);
const RADAR_COLORS = ['#10b981', '#f59e0b'];

function ScoreRing({ score, size = 100 }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  const label = score >= 70 ? 'Balanced' : score >= 40 ? 'Moderate' : 'Skewed';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(120,113,108,0.15)" strokeWidth={6} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={6} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-display text-white">{score}</span>
        <span className="text-[9px] text-stone-500 mt-0.5">{label}</span>
      </div>
    </div>
  );
}

function DimensionCard({ dimension, data, prevData }) {
  const meta = DIMENSIONS[dimension];
  const change = prevData && prevData.amount > 0
    ? Math.round(((data.amount - prevData.amount) / prevData.amount) * 100)
    : null;

  return (
    <div className="p-3 bg-stone-800/30 rounded-xl border border-stone-800/30">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{meta.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-300">{meta.label}</p>
          <p className="text-[10px] text-stone-600 truncate">{meta.description}</p>
        </div>
        {change !== null && change !== 0 && (
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
            change > 0 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
          }`}>
            {change > 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
      <div className="flex items-end justify-between">
        <span className="text-lg font-display" style={{ color: meta.color }}>
          {formatCompact(data.amount)}
        </span>
        <span className="text-[10px] text-stone-600">{data.count} expenses · {data.percentage}%</span>
      </div>
      {/* Mini progress bar */}
      <div className="mt-2 h-1.5 bg-stone-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(data.percentage, 100)}%`, background: meta.color }}
        />
      </div>
    </div>
  );
}

function NudgeCard({ nudge }) {
  return (
    <div
      className="p-3.5 bg-stone-800/30 rounded-xl border border-stone-800/30 hover:border-stone-700/40 transition-colors"
      style={{ borderLeftWidth: 3, borderLeftColor: nudge.color }}
    >
      <div className="flex items-start gap-2.5">
        <span className="text-lg leading-none mt-0.5">{nudge.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-300 leading-tight">{nudge.title}</p>
          <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">{nudge.desc}</p>
        </div>
      </div>
    </div>
  );
}

function MonthSelector({ months, selectedIndex, onChange }) {
  const canPrev = selectedIndex > 0;
  const canNext = selectedIndex < months.length - 1;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => canPrev && onChange(selectedIndex - 1)}
        disabled={!canPrev}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
          canPrev ? 'bg-stone-800 hover:bg-stone-700 text-stone-300' : 'text-stone-700'
        }`}
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm font-medium text-stone-300 min-w-[90px] text-center">
        {months[selectedIndex]?.monthLabel}
      </span>
      <button
        onClick={() => canNext && onChange(selectedIndex + 1)}
        disabled={!canNext}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
          canNext ? 'bg-stone-800 hover:bg-stone-700 text-stone-300' : 'text-stone-700'
        }`}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function TrendMiniChart({ monthlyData, dimension }) {
  const meta = DIMENSIONS[dimension];
  const data = monthlyData.map(m => ({
    name: m.shortLabel,
    value: Math.round(m.dimensions[dimension].amount),
  }));

  return (
    <div className="h-20">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id={`grad-${dimension}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={meta.color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={meta.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#78716c' }} axisLine={false} tickLine={false} />
          <YAxis tick={false} axisLine={false} tickLine={false} />
          <Area type="monotone" dataKey="value" stroke={meta.color} fill={`url(#grad-${dimension})`} strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function LifestyleScore({ expenses, userId }) {
  const monthlyData = useMemo(() => computeMonthlyLifestyle(expenses, userId, 6), [expenses, userId]);
  const [selectedMonth, setSelectedMonth] = useState(monthlyData.length - 1);
  const [showTrends, setShowTrends] = useState(false);

  const current = monthlyData[selectedMonth];
  const previous = selectedMonth > 0 ? monthlyData[selectedMonth - 1] : null;

  const balanceScore = useMemo(
    () => current ? computeBalanceScore(current.dimensions) : 0,
    [current]
  );

  const nudges = useMemo(
    () => generateNudges(monthlyData.slice(0, selectedMonth + 1)),
    [monthlyData, selectedMonth]
  );

  if (!current || current.total === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <Heart size={28} className="text-stone-600 mx-auto mb-3" />
        <p className="text-stone-400">Not enough spending data to compute your lifestyle score.</p>
        <p className="text-xs text-stone-600 mt-1">Keep logging expenses and check back!</p>
      </div>
    );
  }

  // Build comparison radar data (current + previous month overlay)
  const radarData = DIMENSION_KEYS.map(d => {
    const maxAll = Math.max(
      ...monthlyData.map(m => Math.max(...DIMENSION_KEYS.map(k => m.dimensions[k].amount))),
      1
    );
    return {
      dimension: DIMENSIONS[d].label,
      current: Math.round((current.dimensions[d].amount / maxAll) * 100),
      previous: previous ? Math.round((previous.dimensions[d].amount / maxAll) * 100) : 0,
      fullMark: 100,
    };
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
            <Heart size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-display text-stone-200">Lifestyle Score</h2>
            <p className="text-xs text-stone-500">Your spending wellness radar</p>
          </div>
        </div>
        <MonthSelector months={monthlyData} selectedIndex={selectedMonth} onChange={setSelectedMonth} />
      </div>

      {/* Score + Radar */}
      <div className="glass-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Balance Score Ring */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <ScoreRing score={balanceScore} size={110} />
            <p className="text-[10px] text-stone-600 text-center max-w-[120px]">
              Lifestyle Balance Score
            </p>
          </div>

          {/* Radar Chart */}
          <div className="flex-1 w-full" style={{ minHeight: 240 }}>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid stroke="rgba(120,113,108,0.15)" />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fontSize: 11, fill: '#a8a29e' }}
                />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                {previous && (
                  <Radar
                    name="Previous"
                    dataKey="previous"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.08}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                )}
                <Radar
                  name="Current"
                  dataKey="current"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
            {previous && (
              <div className="flex items-center justify-center gap-4 -mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-emerald-500 rounded-full" />
                  <span className="text-[10px] text-stone-500">{current.shortLabel}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-amber-500 rounded-full opacity-60" style={{ borderTop: '1px dashed' }} />
                  <span className="text-[10px] text-stone-500">{previous.shortLabel}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Total this month */}
        <div className="mt-4 pt-4 border-t border-stone-800/50 flex items-center justify-between">
          <span className="text-xs text-stone-500">Total this month</span>
          <span className="text-sm font-mono text-stone-300">{formatCurrency(current.total)}</span>
        </div>
      </div>

      {/* Dimension Breakdown */}
      <div className="glass-card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm text-stone-200">Dimension Breakdown</h3>
          <button
            onClick={() => setShowTrends(!showTrends)}
            className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors ${
              showTrends
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-stone-800 text-stone-500 hover:text-stone-300'
            }`}
          >
            <TrendingUp size={12} className="inline mr-1" />
            {showTrends ? 'Hide Trends' : 'Show Trends'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DIMENSION_KEYS.map(d => (
            <div key={d}>
              <DimensionCard
                dimension={d}
                data={current.dimensions[d]}
                prevData={previous?.dimensions[d]}
              />
              {showTrends && (
                <div className="mt-1 px-1">
                  <TrendMiniChart monthlyData={monthlyData} dimension={d} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Nudges */}
      {nudges.length > 0 && (
        <div className="glass-card p-5 sm:p-6">
          <h3 className="font-display text-sm text-stone-200 mb-3 flex items-center gap-2">
            <Sparkles size={14} className="text-amber-400" />
            Wellness Nudges
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {nudges.map((nudge, i) => (
              <NudgeCard key={i} nudge={nudge} />
            ))}
          </div>
        </div>
      )}

      {/* Info footer */}
      <div className="flex items-start gap-2 px-1">
        <Info size={12} className="text-stone-600 mt-0.5 flex-shrink-0" />
        <p className="text-[10px] text-stone-600 leading-relaxed">
          Your Lifestyle Balance Score uses Shannon entropy to measure how evenly your spending is distributed across 5 life dimensions. A higher score means a more balanced lifestyle. Nudges compare your current month to your trailing average.
        </p>
      </div>
    </div>
  );
}
