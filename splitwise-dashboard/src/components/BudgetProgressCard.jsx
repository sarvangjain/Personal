import { formatCurrency } from '../utils/analytics';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

/**
 * Progress bar component for budget tracking
 * Displays spent vs limit with color-coded status
 */
export default function BudgetProgressCard({ 
  title, 
  spent, 
  limit, 
  percentage, 
  status, 
  currency = 'INR',
  splitwiseAmount,
  manualAmount,
  showBreakdown = false,
  compact = false,
}) {
  // Status-based styling
  const statusConfig = {
    on_track: {
      barColor: 'bg-emerald-500',
      bgColor: 'bg-emerald-500/10',
      textColor: 'text-emerald-400',
      icon: CheckCircle,
      label: 'On track',
    },
    warning: {
      barColor: 'bg-amber-500',
      bgColor: 'bg-amber-500/10',
      textColor: 'text-amber-400',
      icon: AlertTriangle,
      label: 'Approaching limit',
    },
    critical: {
      barColor: 'bg-red-500',
      bgColor: 'bg-red-500/10',
      textColor: 'text-red-400',
      icon: AlertTriangle,
      label: 'Near limit',
    },
    over_budget: {
      barColor: 'bg-red-600',
      bgColor: 'bg-red-500/15',
      textColor: 'text-red-400',
      icon: XCircle,
      label: 'Over budget',
    },
    no_limit: {
      barColor: 'bg-stone-500',
      bgColor: 'bg-stone-500/10',
      textColor: 'text-stone-400',
      icon: null,
      label: 'No limit set',
    },
  };

  const config = statusConfig[status] || statusConfig.no_limit;
  const Icon = config.icon;
  const displayPercentage = Math.min(percentage, 100);
  const remaining = limit - spent;

  if (compact) {
    return (
      <div className={`p-3 rounded-xl border border-stone-800/50 ${config.bgColor}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-stone-200 truncate">{title}</span>
          {Icon && <Icon size={14} className={config.textColor} />}
        </div>
        
        {/* Progress bar */}
        <div className="h-2 bg-stone-800 rounded-full overflow-hidden mb-2">
          <div 
            className={`h-full ${config.barColor} transition-all duration-500 ease-out`}
            style={{ width: `${displayPercentage}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-stone-400">
            {formatCurrency(spent, currency)} / {limit > 0 ? formatCurrency(limit, currency) : '—'}
          </span>
          <span className={config.textColor}>{percentage}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-card p-4 ${config.bgColor} border border-stone-800/50`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-stone-100 truncate">{title}</h3>
          {limit > 0 && (
            <p className={`text-xs mt-0.5 ${config.textColor}`}>
              {config.label}
              {status === 'over_budget' && ` by ${formatCurrency(Math.abs(remaining), currency)}`}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-1.5 rounded-lg ${config.bgColor}`}>
            <Icon size={16} className={config.textColor} />
          </div>
        )}
      </div>

      {/* Amount display */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-display text-stone-100">
            {formatCurrency(spent, currency)}
          </span>
          {limit > 0 && (
            <span className="text-sm text-stone-500">
              / {formatCurrency(limit, currency)}
            </span>
          )}
        </div>
        {limit > 0 && remaining > 0 && (
          <p className="text-xs text-stone-500 mt-1">
            {formatCurrency(remaining, currency)} remaining
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-stone-800 rounded-full overflow-hidden mb-3">
        <div 
          className={`h-full ${config.barColor} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${displayPercentage}%` }}
        />
      </div>

      {/* Percentage indicator */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-stone-400">
          {percentage}% used
        </span>
        {status !== 'no_limit' && remaining > 0 && (
          <span className="text-stone-500">
            {Math.round((remaining / limit) * 100)}% left
          </span>
        )}
      </div>

      {/* Breakdown */}
      {showBreakdown && (splitwiseAmount > 0 || manualAmount > 0) && (
        <div className="mt-3 pt-3 border-t border-stone-800/50">
          <div className="flex items-center gap-4 text-xs">
            {splitwiseAmount > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-stone-400">Splitwise:</span>
                <span className="text-stone-300">{formatCurrency(splitwiseAmount, currency)}</span>
              </div>
            )}
            {manualAmount > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-stone-400">Manual:</span>
                <span className="text-stone-300">{formatCurrency(manualAmount, currency)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact category progress list
 */
export function CategoryProgressList({ categories, currency = 'INR' }) {
  // Sort: categories with limits first, then by spent amount
  const sortedCategories = Object.values(categories)
    .filter(cat => cat.spent > 0 || cat.hasLimit)
    .sort((a, b) => {
      if (a.hasLimit && !b.hasLimit) return -1;
      if (!a.hasLimit && b.hasLimit) return 1;
      return b.spent - a.spent;
    });

  if (sortedCategories.length === 0) {
    return (
      <div className="text-center py-8 text-stone-500 text-sm">
        No spending this month yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedCategories.map(cat => (
        <BudgetProgressCard
          key={cat.name}
          title={cat.name}
          spent={cat.spent}
          limit={cat.limit}
          percentage={cat.percentage}
          status={cat.status}
          currency={currency}
          compact
        />
      ))}
    </div>
  );
}
