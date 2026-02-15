/**
 * MonthCompare - Side-by-side month comparison chart
 * Shows category-level bars for two selectable months
 */

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, GitCompareArrows, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format, parseISO, subMonths, startOfMonth, endOfMonth, isWithinInterval, getDaysInMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '../../../utils/analytics';
import { TOOLTIP_STYLE } from '../../../utils/chartConfig';

export default function MonthCompare({ expenses }) {
  const [monthAOffset, setMonthAOffset] = useState(0);  // 0 = current month
  const [monthBOffset, setMonthBOffset] = useState(1);  // 1 = last month

  const monthA = subMonths(new Date(), monthAOffset);
  const monthB = subMonths(new Date(), monthBOffset);

  // Gather category data for both months
  const { chartData, totalA, totalB } = useMemo(() => {
    const intervalA = { start: startOfMonth(monthA), end: endOfMonth(monthA) };
    const intervalB = { start: startOfMonth(monthB), end: endOfMonth(monthB) };

    const catA = {};
    const catB = {};
    let sumA = 0;
    let sumB = 0;

    for (const exp of expenses) {
      if (exp.cancelled || exp.isRefund) continue;
      const d = parseISO(exp.date);
      const cat = exp.category || 'Other';

      if (isWithinInterval(d, intervalA)) {
        catA[cat] = (catA[cat] || 0) + exp.amount;
        sumA += exp.amount;
      }
      if (isWithinInterval(d, intervalB)) {
        catB[cat] = (catB[cat] || 0) + exp.amount;
        sumB += exp.amount;
      }
    }

    // Merge categories
    const allCats = [...new Set([...Object.keys(catA), ...Object.keys(catB)])];
    const data = allCats
      .map(cat => ({
        category: cat.length > 10 ? cat.slice(0, 9) + '…' : cat,
        fullCategory: cat,
        [format(monthA, 'MMM')]: catA[cat] || 0,
        [format(monthB, 'MMM')]: catB[cat] || 0,
      }))
      .sort((a, b) => {
        const aMax = Math.max(a[format(monthA, 'MMM')], a[format(monthB, 'MMM')]);
        const bMax = Math.max(b[format(monthA, 'MMM')], b[format(monthB, 'MMM')]);
        return bMax - aMax;
      })
      .slice(0, 7);

    return { chartData: data, totalA: sumA, totalB: sumB };
  }, [expenses, monthA, monthB]);

  const pctChange = totalB > 0 ? ((totalA - totalB) / totalB) * 100 : 0;
  const labelA = format(monthA, 'MMM');
  const labelB = format(monthB, 'MMM');

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={TOOLTIP_STYLE.contentStyle}>
        <p className="text-xs text-stone-400 mb-1">{payload[0]?.payload?.fullCategory || label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-xs" style={{ color: p.color }}>
            {p.name}: {formatCurrency(p.value, 'INR')}
          </p>
        ))}
      </div>
    );
  };

  // Month selector
  const MonthPicker = ({ offset, setOffset, label }) => (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setOffset(o => Math.min(o + 1, 11))}
        className="p-1 text-stone-500 hover:text-stone-300 transition-colors touch-manipulation"
      >
        <ChevronLeft size={14} />
      </button>
      <span className="text-xs font-medium text-stone-300 w-16 text-center">
        {format(subMonths(new Date(), offset), 'MMM yy')}
      </span>
      <button
        onClick={() => setOffset(o => Math.max(o - 1, 0))}
        disabled={offset === 0}
        className="p-1 text-stone-500 hover:text-stone-300 disabled:text-stone-700 transition-colors touch-manipulation"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <GitCompareArrows size={16} className="text-teal-400" />
        <h3 className="text-sm font-medium text-stone-300">Month vs Month</h3>
      </div>

      {/* Month selectors */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 flex flex-col items-center p-2 bg-teal-500/10 border border-teal-500/20 rounded-xl">
          <span className="text-[10px] text-teal-400 uppercase tracking-wider mb-1">Month A</span>
          <MonthPicker offset={monthAOffset} setOffset={setMonthAOffset} label="A" />
          <p className="text-sm font-display text-teal-400 mt-1">{formatCurrency(totalA, 'INR')}</p>
        </div>
        
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-stone-500">vs</span>
          {pctChange !== 0 && (
            <div className={`flex items-center gap-0.5 mt-1 text-[10px] ${
              pctChange > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {pctChange > 0 ? <TrendingUp size={10} /> : pctChange < 0 ? <TrendingDown size={10} /> : <Minus size={10} />}
              {Math.abs(pctChange).toFixed(0)}%
            </div>
          )}
        </div>
        
        <div className="flex-1 flex flex-col items-center p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl">
          <span className="text-[10px] text-purple-400 uppercase tracking-wider mb-1">Month B</span>
          <MonthPicker offset={monthBOffset} setOffset={setMonthBOffset} label="B" />
          <p className="text-sm font-display text-purple-400 mt-1">{formatCurrency(totalB, 'INR')}</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 9 }} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={6}
                wrapperStyle={{ fontSize: 10, color: '#a8a29e' }}
              />
              <Bar dataKey={labelA} fill="#14b8a6" radius={[3, 3, 0, 0]} barSize={14} />
              <Bar dataKey={labelB} fill="#a855f7" radius={[3, 3, 0, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-center text-xs text-stone-500 py-8">No data to compare</p>
      )}
    </div>
  );
}
