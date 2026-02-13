/**
 * BillsCalendar - Monthly calendar view for bill reminders
 */

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CreditCard, AlertCircle } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  addMonths, 
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  isPast
} from 'date-fns';
import { formatCurrency } from '../../../utils/analytics';
import { getCategoryIcon, getCategoryColors } from '../../../utils/categoryConfig';

// Day cell component
function DayCell({ date, bills, isCurrentMonth, onDayClick, selectedDate }) {
  const dayBills = bills.filter(bill => {
    const dueDate = parseISO(bill.nextDueDate);
    return isSameDay(dueDate, date);
  });
  
  const hasBills = dayBills.length > 0;
  const isSelected = selectedDate && isSameDay(date, selectedDate);
  const isPastDay = isPast(date) && !isToday(date);
  const totalDue = dayBills.reduce((sum, b) => sum + b.amount, 0);
  const hasOverdue = hasBills && isPastDay;
  
  return (
    <button
      onClick={() => onDayClick(date)}
      className={`relative p-1.5 sm:p-1 min-h-[60px] sm:h-20 rounded-lg transition-all touch-manipulation active:scale-95 ${
        !isCurrentMonth 
          ? 'opacity-30' 
          : isSelected
            ? 'bg-teal-500/20 border border-teal-500/30'
            : isToday(date)
              ? 'bg-stone-800/50 border border-stone-600'
              : hasBills
                ? hasOverdue
                  ? 'bg-red-500/10 border border-red-500/30'
                  : 'bg-stone-800/30 border border-stone-700/30'
                : 'hover:bg-stone-800/30 active:bg-stone-800/50 border border-transparent'
      }`}
    >
      <span className={`text-xs font-medium ${
        isToday(date) 
          ? 'text-teal-400' 
          : hasOverdue
            ? 'text-red-400'
            : hasBills 
              ? 'text-stone-200' 
              : 'text-stone-500'
      }`}>
        {format(date, 'd')}
      </span>
      
      {hasBills && (
        <div className="mt-1 space-y-0.5">
          {dayBills.slice(0, 2).map(bill => {
            const colors = getCategoryColors(bill.category);
            return (
              <div 
                key={bill.id} 
                className={`text-[8px] px-1 py-0.5 rounded truncate ${
                  hasOverdue ? 'bg-red-500/20 text-red-300' : `${colors.bg} ${colors.text}`
                }`}
              >
                {bill.name}
              </div>
            );
          })}
          {dayBills.length > 2 && (
            <span className="text-[8px] text-stone-500">+{dayBills.length - 2} more</span>
          )}
        </div>
      )}
      
      {hasBills && (
        <div className={`absolute bottom-1 right-1 text-[8px] font-mono ${
          hasOverdue ? 'text-red-400' : 'text-teal-400'
        }`}>
          {formatCurrency(totalDue, 'INR')}
        </div>
      )}
    </button>
  );
}

// Bills for selected day
function DayBillsList({ date, bills, onMarkPaid, onEditBill }) {
  const dayBills = bills.filter(bill => {
    const dueDate = parseISO(bill.nextDueDate);
    return isSameDay(dueDate, date);
  });
  
  if (dayBills.length === 0) {
    return (
      <div className="p-4 text-center text-stone-500 text-sm">
        No bills due on {format(date, 'MMMM d')}
      </div>
    );
  }
  
  const totalDue = dayBills.reduce((sum, b) => sum + b.amount, 0);
  const isPastDay = isPast(date) && !isToday(date);
  
  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-stone-300">
          {format(date, 'EEEE, MMMM d')}
        </h4>
        <span className={`text-sm font-mono ${isPastDay ? 'text-red-400' : 'text-teal-400'}`}>
          {formatCurrency(totalDue, 'INR')}
        </span>
      </div>
      
      <div className="space-y-2">
        {dayBills.map(bill => {
          const CategoryIcon = getCategoryIcon(bill.category);
          const colors = getCategoryColors(bill.category);
          
          return (
            <div 
              key={bill.id} 
              className={`flex items-center gap-3 p-3 rounded-xl border ${
                isPastDay 
                  ? 'bg-red-500/5 border-red-500/30' 
                  : 'bg-stone-800/30 border-stone-700/30'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl ${colors.bg} ${colors.border} border flex items-center justify-center`}>
                <CategoryIcon size={18} className={colors.text} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-200 truncate">{bill.name}</p>
                <p className="text-xs text-stone-500">{bill.category}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono font-medium text-stone-200">
                  {formatCurrency(bill.amount, 'INR')}
                </p>
              </div>
              <button
                onClick={() => onMarkPaid(bill.id)}
                className="px-4 py-2 sm:px-3 sm:py-1.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 active:bg-emerald-500/40 transition-colors touch-manipulation"
              >
                Pay
              </button>
            </div>
          );
        })}
      </div>
      
      {isPastDay && (
        <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle size={14} className="text-red-400" />
          <span className="text-xs text-red-400">These bills are overdue</span>
        </div>
      )}
    </div>
  );
}

export default function BillsCalendar({ bills = [], onMarkPaid, onEditBill }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    const days = [];
    let day = startDate;
    
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    
    return days;
  }, [currentMonth]);

  // Month summary
  const monthSummary = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    const monthBills = bills.filter(bill => {
      const dueDate = parseISO(bill.nextDueDate);
      return dueDate >= monthStart && dueDate <= monthEnd;
    });
    
    const total = monthBills.reduce((sum, b) => sum + b.amount, 0);
    const overdue = monthBills.filter(bill => {
      const dueDate = parseISO(bill.nextDueDate);
      return isPast(dueDate) && !isToday(dueDate);
    });
    
    return { count: monthBills.length, total, overdueCount: overdue.length };
  }, [bills, currentMonth]);

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-display text-stone-200">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-lg bg-stone-800/50 text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1.5 text-xs bg-stone-800/50 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-lg bg-stone-800/50 text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Month Summary */}
      <div className="flex gap-3">
        <div className="flex-1 p-3 bg-stone-800/30 rounded-xl">
          <p className="text-xs text-stone-500">Bills this month</p>
          <p className="text-lg font-display text-stone-200">{monthSummary.count}</p>
        </div>
        <div className="flex-1 p-3 bg-stone-800/30 rounded-xl">
          <p className="text-xs text-stone-500">Total due</p>
          <p className="text-lg font-display text-teal-400">{formatCurrency(monthSummary.total, 'INR')}</p>
        </div>
        {monthSummary.overdueCount > 0 && (
          <div className="flex-1 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-xs text-red-400">Overdue</p>
            <p className="text-lg font-display text-red-400">{monthSummary.overdueCount}</p>
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="bg-stone-800/20 rounded-xl p-2">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs text-stone-500 py-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => (
            <DayCell
              key={i}
              date={day}
              bills={bills}
              isCurrentMonth={isSameMonth(day, currentMonth)}
              selectedDate={selectedDate}
              onDayClick={setSelectedDate}
            />
          ))}
        </div>
      </div>

      {/* Selected day bills */}
      {selectedDate && (
        <div className="bg-stone-800/30 border border-stone-700/30 rounded-xl overflow-hidden">
          <DayBillsList
            date={selectedDate}
            bills={bills}
            onMarkPaid={onMarkPaid}
            onEditBill={onEditBill}
          />
        </div>
      )}
    </div>
  );
}
