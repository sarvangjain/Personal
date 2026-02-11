import { ArrowRight, ArrowUpRight, ArrowDownRight, Banknote } from 'lucide-react';
import { formatCurrency } from '../utils/analytics';

/** Aggregate a list of settle-up suggestions into per-currency totals */
function aggregateByCurrency(items) {
  const map = {};
  items.forEach(s => {
    const c = s.currency || 'INR';
    map[c] = (map[c] || 0) + s.amount;
  });
  // Sort by amount desc
  return Object.entries(map)
    .map(([code, amount]) => ({ code, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export default function SettleUpPanel({ suggestions }) {
  if (!suggestions || suggestions.length === 0) return null;

  const youPay = suggestions.filter(s => s.youPay);
  const youReceive = suggestions.filter(s => !s.youPay);
  const payByCurrency = aggregateByCurrency(youPay);
  const receiveByCurrency = aggregateByCurrency(youReceive);

  return (
    <div className="glass-card p-6">
      <h3 className="font-display text-base text-stone-200 mb-1 flex items-center gap-2">
        <Banknote size={15} className="text-emerald-400" /> Settle Up
      </h3>
      <p className="text-xs text-stone-500 mb-4">Simplified transactions to clear all debts</p>

      {/* Summary */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
          <p className="text-[10px] text-red-400/70 uppercase font-medium tracking-wide">You Pay</p>
          <div className="mt-0.5">
            {payByCurrency.length > 0 ? payByCurrency.map((t, i) => (
              <p key={t.code} className={`font-display text-red-400 ${i === 0 ? 'text-lg' : 'text-sm opacity-70'}`}>
                {formatCurrency(t.amount, t.code)}
              </p>
            )) : (
              <p className="text-lg font-display text-red-400">{formatCurrency(0)}</p>
            )}
          </div>
          <p className="text-[10px] text-stone-600">{youPay.length} transaction{youPay.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex-1 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
          <p className="text-[10px] text-emerald-400/70 uppercase font-medium tracking-wide">You Receive</p>
          <div className="mt-0.5">
            {receiveByCurrency.length > 0 ? receiveByCurrency.map((t, i) => (
              <p key={t.code} className={`font-display text-emerald-400 ${i === 0 ? 'text-lg' : 'text-sm opacity-70'}`}>
                {formatCurrency(t.amount, t.code)}
              </p>
            )) : (
              <p className="text-lg font-display text-emerald-400">{formatCurrency(0)}</p>
            )}
          </div>
          <p className="text-[10px] text-stone-600">{youReceive.length} transaction{youReceive.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Transaction list */}
      <div className="space-y-2">
        {suggestions.map((s, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
              s.youPay
                ? 'bg-red-500/3 border-red-500/10 hover:border-red-500/20'
                : 'bg-emerald-500/3 border-emerald-500/10 hover:border-emerald-500/20'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              s.youPay ? 'bg-red-500/10' : 'bg-emerald-500/10'
            }`}>
              {s.youPay ? <ArrowUpRight size={14} className="text-red-400" /> : <ArrowDownRight size={14} className="text-emerald-400" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-sm">
                <span className="text-stone-400">{s.fromName}</span>
                <ArrowRight size={10} className="text-stone-600" />
                <span className="text-stone-300">{s.toName}</span>
              </div>
              <p className="text-[10px] text-stone-600">{s.groupName}</p>
            </div>

            <span className={`text-sm font-mono font-medium ${s.youPay ? 'text-red-400' : 'text-emerald-400'}`}>
              {formatCurrency(s.amount, s.currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
