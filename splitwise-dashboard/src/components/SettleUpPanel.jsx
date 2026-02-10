import { ArrowRight, ArrowUpRight, ArrowDownRight, Banknote } from 'lucide-react';
import { formatCurrency } from '../utils/analytics';

export default function SettleUpPanel({ suggestions }) {
  if (!suggestions || suggestions.length === 0) return null;

  const youPay = suggestions.filter(s => s.youPay);
  const youReceive = suggestions.filter(s => !s.youPay);
  const totalPay = youPay.reduce((s, x) => s + x.amount, 0);
  const totalReceive = youReceive.reduce((s, x) => s + x.amount, 0);

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
          <p className="text-lg font-display text-red-400 mt-0.5">{formatCurrency(totalPay)}</p>
          <p className="text-[10px] text-stone-600">{youPay.length} transactions</p>
        </div>
        <div className="flex-1 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
          <p className="text-[10px] text-emerald-400/70 uppercase font-medium tracking-wide">You Receive</p>
          <p className="text-lg font-display text-emerald-400 mt-0.5">{formatCurrency(totalReceive)}</p>
          <p className="text-[10px] text-stone-600">{youReceive.length} transactions</p>
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
