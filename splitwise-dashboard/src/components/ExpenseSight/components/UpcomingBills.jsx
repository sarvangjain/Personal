/**
 * UpcomingBills - Widget showing upcoming bill reminders for Home tab
 */

import { useState, useEffect } from 'react';
import { CreditCard, ChevronRight, AlertCircle, Clock, Calendar } from 'lucide-react';
import { format, parseISO, differenceInDays, isPast, isToday } from 'date-fns';
import { formatCurrency } from '../../../utils/analytics';
import { getUpcomingBills, markBillPaid } from '../../../firebase/expenseSightService';
import { getCategoryIcon, getCategoryColors } from '../../../utils/categoryConfig';

// Mini bill card
function MiniBillCard({ bill, onMarkPaid }) {
  const dueDate = parseISO(bill.nextDueDate);
  const daysUntilDue = differenceInDays(dueDate, new Date());
  const isOverdue = isPast(dueDate) && !isToday(dueDate);
  const isDueToday = isToday(dueDate);
  
  const CategoryIcon = getCategoryIcon(bill.category);
  const colors = getCategoryColors(bill.category);
  
  const getStatusText = () => {
    if (isOverdue) return 'Overdue';
    if (isDueToday) return 'Due today';
    if (daysUntilDue === 1) return 'Tomorrow';
    return `${daysUntilDue} days`;
  };
  
  const getStatusColor = () => {
    if (isOverdue) return 'text-red-400';
    if (isDueToday) return 'text-amber-400';
    return 'text-stone-400';
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${
      isOverdue 
        ? 'bg-red-500/5 border-red-500/30' 
        : isDueToday
          ? 'bg-amber-500/5 border-amber-500/30'
          : 'bg-stone-800/30 border-stone-700/30'
    }`}>
      <div className={`w-10 h-10 rounded-xl ${colors.bg} ${colors.border} border flex items-center justify-center flex-shrink-0`}>
        <CategoryIcon size={18} className={colors.text} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-200 truncate">{bill.name}</p>
        <p className={`text-xs ${getStatusColor()} flex items-center gap-1`}>
          {isOverdue && <AlertCircle size={10} />}
          {isDueToday && <Clock size={10} />}
          {getStatusText()}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-mono font-medium text-stone-200">
          {formatCurrency(bill.amount, 'INR')}
        </p>
      </div>
    </div>
  );
}

export default function UpcomingBills({ userId, onViewAll, limit = 3 }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    
    setLoading(true);
    getUpcomingBills(userId, 14) // Get bills due in next 2 weeks
      .then(setBills)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  const handleMarkPaid = async (billId) => {
    const result = await markBillPaid(userId, billId);
    if (result.success) {
      setBills(prev => prev.filter(b => b.id !== billId));
    }
  };

  // Calculate totals
  const totalDue = bills.slice(0, limit).reduce((sum, b) => sum + b.amount, 0);
  const overdueCount = bills.filter(b => {
    const dueDate = parseISO(b.nextDueDate);
    return isPast(dueDate) && !isToday(dueDate);
  }).length;

  if (loading) {
    return (
      <div className="glass-card p-4 animate-pulse">
        <div className="h-4 bg-stone-700/50 rounded w-1/3 mb-3" />
        <div className="space-y-2">
          <div className="h-14 bg-stone-700/30 rounded-xl" />
          <div className="h-14 bg-stone-700/30 rounded-xl" />
        </div>
      </div>
    );
  }

  if (bills.length === 0) {
    return null; // Don't show widget if no upcoming bills
  }

  return (
    <div className="glass-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-teal-400" />
          <h3 className="text-sm font-medium text-stone-200">Upcoming Bills</h3>
          {overdueCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-full">
              {overdueCount} overdue
            </span>
          )}
        </div>
        <button
          onClick={onViewAll}
          className="text-xs text-teal-400 hover:text-teal-300 active:text-teal-200 flex items-center gap-1 transition-colors py-1 px-2 -mr-2 touch-manipulation"
        >
          View all
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Bills List */}
      <div className="space-y-2">
        {bills.slice(0, limit).map(bill => (
          <MiniBillCard 
            key={bill.id} 
            bill={bill} 
            onMarkPaid={handleMarkPaid}
          />
        ))}
      </div>

      {/* Total */}
      {bills.length > 0 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-700/30">
          <span className="text-xs text-stone-500">
            {bills.length > limit ? `Next ${limit} bills` : 'Total due'}
          </span>
          <span className="text-sm font-mono text-teal-400">
            {formatCurrency(totalDue, 'INR')}
          </span>
        </div>
      )}

      {/* Show more indicator */}
      {bills.length > limit && (
        <button
          onClick={onViewAll}
          className="w-full mt-2 py-3 sm:py-2 text-xs text-stone-400 hover:text-stone-200 active:text-teal-400 transition-colors touch-manipulation"
        >
          +{bills.length - limit} more bills
        </button>
      )}
    </div>
  );
}
