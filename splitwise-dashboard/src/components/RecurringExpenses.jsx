import { RefreshCw, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../utils/analytics';

/**
 * Detect recurring expenses by finding descriptions that appear multiple times
 * with roughly regular intervals.
 */
export function detectRecurring(expenses, userId) {
  const valid = expenses.filter(e => !e.payment && !e.deleted_at);

  // Group by normalized description
  const byDesc = {};
  valid.forEach(exp => {
    const key = exp.description?.trim().toLowerCase();
    if (!key) return;
    if (!byDesc[key]) byDesc[key] = [];
    byDesc[key].push(exp);
  });

  const recurring = [];

  Object.entries(byDesc).forEach(([key, exps]) => {
    if (exps.length < 2) return;

    const sorted = exps.sort((a, b) => new Date(a.date) - new Date(b.date));
    const intervals = [];
    for (let i = 1; i < sorted.length; i++) {
      const diff = (new Date(sorted[i].date) - new Date(sorted[i - 1].date)) / (1000 * 60 * 60 * 24);
      intervals.push(diff);
    }

    const avgInterval = intervals.reduce((s, d) => s + d, 0) / intervals.length;

    // Consider it recurring if average interval is between 5 and 45 days (weekly to monthly-ish)
    // or between 25 and 35 days (monthly)
    let frequency = null;
    if (avgInterval >= 5 && avgInterval <= 10) frequency = 'Weekly';
    else if (avgInterval >= 12 && avgInterval <= 18) frequency = 'Bi-weekly';
    else if (avgInterval >= 25 && avgInterval <= 38) frequency = 'Monthly';
    else if (avgInterval >= 55 && avgInterval <= 100) frequency = 'Quarterly';

    if (!frequency && exps.length < 3) return;
    if (!frequency) frequency = `~${Math.round(avgInterval)}d`;

    const amounts = sorted.map(e => {
      const u = e.users?.find(x => x.user_id === userId);
      return u ? parseFloat(u.owed_share) : 0;
    });
    const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const latestAmount = amounts[amounts.length - 1];

    recurring.push({
      description: sorted[0].description,
      frequency,
      avgAmount,
      latestAmount,
      occurrences: exps.length,
      lastDate: sorted[sorted.length - 1].date,
      category: sorted[sorted.length - 1].category?.name || 'General',
      avgInterval: Math.round(avgInterval),
      monthlyEstimate: frequency === 'Weekly' ? avgAmount * 4.33
        : frequency === 'Bi-weekly' ? avgAmount * 2.17
        : frequency === 'Quarterly' ? avgAmount / 3
        : avgAmount,
    });
  });

  return recurring.sort((a, b) => b.monthlyEstimate - a.monthlyEstimate);
}

export default function RecurringExpenses({ expenses, userId }) {
  const recurring = detectRecurring(expenses, userId);

  if (recurring.length === 0) return null;

  const totalMonthly = recurring.reduce((s, r) => s + r.monthlyEstimate, 0);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-base text-stone-200 flex items-center gap-2">
          <RefreshCw size={15} className="text-indigo-400" /> Recurring Expenses
        </h3>
        <div className="text-right">
          <p className="text-xs text-stone-500">Est. Monthly</p>
          <p className="text-sm font-mono text-indigo-400">{formatCurrency(totalMonthly)}</p>
        </div>
      </div>

      <div className="space-y-2">
        {recurring.slice(0, 10).map((r, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-stone-800/25 rounded-xl border border-stone-800/30 hover:border-stone-700/40 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
              <RefreshCw size={12} className="text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-stone-300 truncate">{r.description}</p>
              <p className="text-[10px] text-stone-600">
                {r.frequency} · {r.category} · {r.occurrences} times
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-mono text-stone-300">{formatCurrency(r.latestAmount)}</p>
              <p className="text-[10px] text-stone-600">~{formatCurrency(r.monthlyEstimate)}/mo</p>
            </div>
          </div>
        ))}
      </div>

      {recurring.length > 0 && (
        <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-start gap-2">
          <AlertTriangle size={13} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-amber-400/80 leading-relaxed">
            Detected {recurring.length} recurring expense{recurring.length > 1 ? 's' : ''} totaling ~{formatCurrency(totalMonthly)}/month.
            Review these to find potential savings.
          </p>
        </div>
      )}
    </div>
  );
}
