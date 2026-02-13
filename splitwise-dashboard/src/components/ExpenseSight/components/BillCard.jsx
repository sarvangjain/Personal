/**
 * BillCard - Individual bill display with actions
 */

import { useState } from 'react';
import { 
  Calendar, CreditCard, Check, Edit2, Trash2, 
  Clock, RotateCcw, Zap, AlertCircle
} from 'lucide-react';
import { format, differenceInDays, parseISO, isPast, isToday } from 'date-fns';
import { formatCurrency } from '../../../utils/analytics';
import { getCategoryIcon, getCategoryColors } from '../../../utils/categoryConfig';

// Frequency labels
const FREQUENCY_LABELS = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  once: 'One-time',
};

export default function BillCard({ 
  bill, 
  onMarkPaid, 
  onEdit, 
  onDelete,
  compact = false 
}) {
  const [confirming, setConfirming] = useState(false);
  
  const dueDate = parseISO(bill.nextDueDate);
  const daysUntilDue = differenceInDays(dueDate, new Date());
  const isOverdue = isPast(dueDate) && !isToday(dueDate);
  const isDueToday = isToday(dueDate);
  const isDueSoon = daysUntilDue > 0 && daysUntilDue <= 3;
  
  const CategoryIcon = getCategoryIcon(bill.category);
  const categoryColors = getCategoryColors(bill.category);
  
  // Status indicator
  const getStatusColor = () => {
    if (isOverdue) return 'text-red-400 bg-red-500/20 border-red-500/30';
    if (isDueToday) return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
    if (isDueSoon) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    return 'text-stone-400 bg-stone-700/30 border-stone-700/50';
  };
  
  const getStatusText = () => {
    if (isOverdue) return 'Overdue';
    if (isDueToday) return 'Due today';
    if (daysUntilDue === 1) return 'Due tomorrow';
    if (isDueSoon) return `Due in ${daysUntilDue} days`;
    return format(dueDate, 'MMM d');
  };

  const handleMarkPaid = () => {
    if (confirming) {
      onMarkPaid(bill.id);
      setConfirming(false);
    } else {
      setConfirming(true);
      // Auto-reset after 3 seconds
      setTimeout(() => setConfirming(false), 3000);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-stone-800/30 border border-stone-700/30 rounded-xl">
        <div className={`w-10 h-10 rounded-xl ${categoryColors.bg} ${categoryColors.border} border flex items-center justify-center flex-shrink-0`}>
          <CategoryIcon size={18} className={categoryColors.text} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-stone-200 truncate">{bill.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-mono font-medium text-stone-200">
            {formatCurrency(bill.amount, 'INR')}
          </p>
        </div>
        <button
          onClick={handleMarkPaid}
          className={`p-2.5 sm:p-2 rounded-lg transition-colors flex-shrink-0 touch-manipulation ${
            confirming 
              ? 'bg-emerald-500/20 text-emerald-400' 
              : 'bg-stone-700/50 text-stone-400 hover:text-emerald-400 hover:bg-stone-700 active:bg-emerald-500/20'
          }`}
          title={confirming ? 'Click again to confirm' : 'Mark as paid'}
        >
          <Check size={18} className="sm:w-4 sm:h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${
      isOverdue 
        ? 'bg-red-500/5 border-red-500/30' 
        : isDueToday
          ? 'bg-amber-500/5 border-amber-500/30'
          : 'bg-stone-800/30 border-stone-700/30'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <div className={`w-12 h-12 rounded-xl ${categoryColors.bg} ${categoryColors.border} border flex items-center justify-center flex-shrink-0`}>
          <CategoryIcon size={20} className={categoryColors.text} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-base font-medium text-stone-200 truncate">{bill.name}</p>
            {bill.isAutoPay && (
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded flex items-center gap-1">
                <Zap size={10} /> Auto
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors.bg} ${categoryColors.text}`}>
              {bill.category}
            </span>
            <span className="text-xs text-stone-500 flex items-center gap-1">
              <RotateCcw size={10} />
              {FREQUENCY_LABELS[bill.frequency]}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-display text-stone-200">
            {formatCurrency(bill.amount, 'INR')}
          </p>
          <p className={`text-xs px-2 py-0.5 rounded border inline-flex items-center gap-1 ${getStatusColor()}`}>
            {isOverdue && <AlertCircle size={10} />}
            {isDueToday && <Clock size={10} />}
            {getStatusText()}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center border-t border-stone-700/30">
        <button
          onClick={handleMarkPaid}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            confirming 
              ? 'bg-emerald-500/20 text-emerald-400' 
              : 'text-stone-400 hover:bg-stone-800/50 hover:text-emerald-400'
          }`}
        >
          <Check size={16} />
          {confirming ? 'Confirm Payment' : 'Mark as Paid'}
        </button>
        <div className="w-px h-8 bg-stone-700/30" />
        <button
          onClick={() => onEdit(bill)}
          className="px-4 py-3 text-stone-400 hover:bg-stone-800/50 hover:text-teal-400 transition-colors"
          title="Edit bill"
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={() => onDelete(bill.id)}
          className="px-4 py-3 text-stone-400 hover:bg-stone-800/50 hover:text-red-400 transition-colors"
          title="Delete bill"
        >
          <Trash2 size={16} />
        </button>
      </div>
      
      {/* Last paid info */}
      {bill.lastPaidDate && (
        <div className="px-4 py-2 bg-stone-800/30 text-xs text-stone-500 border-t border-stone-700/30">
          Last paid: {format(parseISO(bill.lastPaidDate), 'MMM d, yyyy')}
        </div>
      )}
    </div>
  );
}
