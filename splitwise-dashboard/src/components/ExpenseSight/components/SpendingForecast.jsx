/**
 * SpendingForecast - Predicts month-end total based on current pace + historical patterns
 * Shows a projection range (optimistic / likely / pessimistic)
 */

import { useMemo } from 'react';
import { TrendingUp, Target, AlertTriangle, CheckCircle } from 'lucide-react';
import { parseISO, startOfMonth, endOfMonth, subMonths, isWithinInterval, getDaysInMonth, format } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatCurrency } from '../../../utils/analytics';
import { TOOLTIP_STYLE } from '../../../utils/chartConfig';

export default function SpendingForecast({ expenses, budget }) {
  const forecast = useMemo(() => {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = getDaysInMonth(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Current month spending
    let currentSpent = 0;
    for (const exp of expenses) {
      if (exp.cancelled || exp.isRefund) continue;
      const d = parseISO(exp.date);
      if (isWithinInterval(d, { start: monthStart, end: monthEnd })) {
        currentSpent += exp.amount;
      }
    }

    // Historical monthly totals (last 3 months)
    const histMonths = [];
    for (let i = 1; i <= 3; i++) {
      const m = subMonths(now, i);
      const s = startOfMonth(m);
      const e = endOfMonth(m);
      let total = 0;
      for (const exp of expenses) {
        if (exp.cancelled || exp.isRefund) continue;
        const d = parseISO(exp.date);
        if (isWithinInterval(d, { start: s, end: e })) {
          total += exp.amount;
        }
      }
      if (total > 0) histMonths.push(total);
    }

    const histAvg = histMonths.length > 0 ? histMonths.reduce((a, b) => a + b, 0) / histMonths.length : 0;

    // Pace-based projection
    const dailyPace = dayOfMonth > 0 ? currentSpent / dayOfMonth : 0;
    const paceProjection = dailyPace * daysInMonth;

    // Weighted projection (70% pace, 30% historical)
    const likelyProjection = histAvg > 0
      ? paceProjection * 0.7 + histAvg * 0.3
      : paceProjection;
    
    // Range
    const optimistic = likelyProjection * 0.85;
    const pessimistic = likelyProjection * 1.2;

    // Daily cumulative data for chart
    const chartData = [];
    let cumulative = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = format(new Date(now.getFullYear(), now.getMonth(), day), 'yyyy-MM-dd');
      
      if (day <= dayOfMonth) {
        // Actual data
        let dayTotal = 0;
        for (const exp of expenses) {
          if (exp.cancelled || exp.isRefund) continue;
          if (exp.date === dateStr) dayTotal += exp.amount;
        }
        cumulative += dayTotal;
        chartData.push({ day, actual: cumulative, forecast: null });
      } else {
        // Forecast
        const projectedDaily = (likelyProjection - currentSpent) / (daysInMonth - dayOfMonth);
        cumulative += projectedDaily;
        chartData.push({ day, actual: null, forecast: Math.round(cumulative) });
      }
    }

    // Add a bridge point so the lines connect
    if (dayOfMonth < daysInMonth && chartData[dayOfMonth - 1]) {
      chartData[dayOfMonth - 1].forecast = chartData[dayOfMonth - 1].actual;
    }

    const daysLeft = daysInMonth - dayOfMonth;
    const dailyAllowance = budget && budget > currentSpent
      ? (budget - currentSpent) / Math.max(daysLeft, 1)
      : 0;

    return {
      currentSpent,
      paceProjection,
      likelyProjection: Math.round(likelyProjection),
      optimistic: Math.round(optimistic),
      pessimistic: Math.round(pessimistic),
      dailyPace: Math.round(dailyPace),
      histAvg: Math.round(histAvg),
      dayOfMonth,
      daysInMonth,
      daysLeft,
      dailyAllowance: Math.round(dailyAllowance),
      chartData,
    };
  }, [expenses, budget]);

  // Status
  const isOverBudget = budget && forecast.likelyProjection > budget;
  const isNearBudget = budget && forecast.likelyProjection > budget * 0.85 && !isOverBudget;

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const point = payload[0]?.payload;
    return (
      <div style={TOOLTIP_STYLE.contentStyle}>
        <p className="text-xs text-stone-400 mb-1">Day {point?.day}</p>
        {point?.actual != null && (
          <p className="text-xs text-teal-400">Actual: {formatCurrency(point.actual, 'INR')}</p>
        )}
        {point?.forecast != null && point?.actual == null && (
          <p className="text-xs text-amber-400">Forecast: {formatCurrency(point.forecast, 'INR')}</p>
        )}
      </div>
    );
  };

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-stone-300 flex items-center gap-2">
          <TrendingUp size={16} className="text-teal-400" />
          Month-End Forecast
        </h3>
        <span className="text-[10px] text-stone-500">
          Day {forecast.dayOfMonth}/{forecast.daysInMonth}
        </span>
      </div>

      {/* Projection cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
          <p className="text-[9px] text-emerald-400 uppercase tracking-wider">Optimistic</p>
          <p className="text-sm font-display text-emerald-400 mt-1">
            {formatCurrency(forecast.optimistic, 'INR')}
          </p>
        </div>
        <div className={`p-2.5 rounded-xl text-center border ${
          isOverBudget
            ? 'bg-red-500/10 border-red-500/20'
            : isNearBudget
            ? 'bg-amber-500/10 border-amber-500/20'
            : 'bg-teal-500/10 border-teal-500/20'
        }`}>
          <p className={`text-[9px] uppercase tracking-wider ${
            isOverBudget ? 'text-red-400' : isNearBudget ? 'text-amber-400' : 'text-teal-400'
          }`}>Likely</p>
          <p className={`text-sm font-display mt-1 ${
            isOverBudget ? 'text-red-400' : isNearBudget ? 'text-amber-400' : 'text-teal-400'
          }`}>
            {formatCurrency(forecast.likelyProjection, 'INR')}
          </p>
        </div>
        <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
          <p className="text-[9px] text-rose-400 uppercase tracking-wider">Pessimistic</p>
          <p className="text-sm font-display text-rose-400 mt-1">
            {formatCurrency(forecast.pessimistic, 'INR')}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={forecast.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="forecastActualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="forecastPredGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#78716c', fontSize: 9 }}
              interval="preserveStartEnd"
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            {budget && (
              <ReferenceLine y={budget} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1} />
            )}
            <Area
              type="monotone"
              dataKey="actual"
              stroke="#14b8a6"
              fill="url(#forecastActualGrad)"
              strokeWidth={2}
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="forecast"
              stroke="#f59e0b"
              fill="url(#forecastPredGrad)"
              strokeWidth={2}
              strokeDasharray="6 3"
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-stone-600 text-center">
        Solid = actual • Dashed = forecast{budget ? ' • Red line = budget' : ''}
      </p>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 bg-stone-800/30 rounded-xl">
          <p className="text-[10px] text-stone-500">Current Pace</p>
          <p className="text-sm font-display text-stone-200">
            {formatCurrency(forecast.dailyPace, 'INR')}/day
          </p>
        </div>
        <div className="p-2.5 bg-stone-800/30 rounded-xl">
          <p className="text-[10px] text-stone-500">Historical Avg</p>
          <p className="text-sm font-display text-stone-200">
            {forecast.histAvg > 0 ? formatCurrency(forecast.histAvg, 'INR') : '—'}/mo
          </p>
        </div>
      </div>

      {/* Budget alert */}
      {budget > 0 && (
        <div className={`p-3 rounded-xl flex items-start gap-2 ${
          isOverBudget
            ? 'bg-red-500/10 border border-red-500/20'
            : isNearBudget
            ? 'bg-amber-500/10 border border-amber-500/20'
            : 'bg-emerald-500/10 border border-emerald-500/20'
        }`}>
          {isOverBudget ? (
            <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
          ) : isNearBudget ? (
            <AlertTriangle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
          ) : (
            <CheckCircle size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
          )}
          <div>
            <p className={`text-xs font-medium ${
              isOverBudget ? 'text-red-400' : isNearBudget ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {isOverBudget
                ? `On track to exceed budget by ${formatCurrency(forecast.likelyProjection - budget, 'INR')}`
                : isNearBudget
                ? 'Getting close to your budget limit'
                : 'On track to stay within budget'
              }
            </p>
            {forecast.daysLeft > 0 && budget > forecast.currentSpent && (
              <p className="text-[10px] text-stone-500 mt-0.5">
                You can spend ~{formatCurrency(forecast.dailyAllowance, 'INR')}/day for the next {forecast.daysLeft} days
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
