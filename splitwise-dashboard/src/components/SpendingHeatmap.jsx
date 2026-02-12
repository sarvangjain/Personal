import { useState, useMemo, useEffect } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  parseISO,
  subMonths,
  addMonths,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { ChevronLeft, ChevronRight, Flame, X } from 'lucide-react';
import { formatCurrency } from '../utils/analytics';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

// Get intensity level (0-4) based on spending amount
function getIntensityLevel(amount, maxAmount) {
  if (amount === 0) return 0;
  const ratio = amount / maxAmount;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.75) return 3;
  return 4;
}

// Intensity colors (emerald gradient)
const INTENSITY_COLORS = [
  'bg-stone-800/30',           // 0 - no spending
  'bg-emerald-500/20',         // 1 - low
  'bg-emerald-500/40',         // 2 - medium-low
  'bg-emerald-500/60',         // 3 - medium-high
  'bg-emerald-500/90',         // 4 - high
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SpendingHeatmap({ expenses, userId, currency = 'INR' }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  
  // Lock scroll when day detail modal is open
  useBodyScrollLock(!!selectedDay);
  
  // Calculate daily spending for the month
  const { dailyData, maxSpending, monthTotal } = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    
    const dailyMap = {};
    let max = 0;
    let total = 0;
    
    // Initialize all days
    days.forEach(day => {
      const key = format(day, 'yyyy-MM-dd');
      dailyMap[key] = { date: day, amount: 0, expenses: [] };
    });
    
    // Aggregate expenses (handles both Splitwise and ExpenseSight formats)
    expenses.forEach(exp => {
      if (exp.deleted_at || exp.cancelled) return;
      const expDate = parseISO(exp.date || exp.created_at);
      if (!isSameMonth(expDate, currentMonth)) return;
      
      const key = format(expDate, 'yyyy-MM-dd');
      if (!dailyMap[key]) return;
      
      // Handle both Splitwise format (users array) and ExpenseSight format (direct amount)
      let amount = 0;
      if (exp.users && userId) {
        // Splitwise format
        const userShare = exp.users.find(u => u.user_id === userId);
        amount = userShare ? parseFloat(userShare.owed_share || 0) : 0;
      } else if (typeof exp.amount === 'number') {
        // ExpenseSight format - skip refunds for heatmap
        if (exp.isRefund) return;
        amount = exp.amount;
      }
      
      if (amount > 0) {
        dailyMap[key].amount += amount;
        dailyMap[key].expenses.push({
          description: exp.description,
          amount,
          category: exp.category?.name || exp.category || 'Other',
        });
        total += amount;
      }
    });
    
    // Find max for scaling
    Object.values(dailyMap).forEach(d => {
      if (d.amount > max) max = d.amount;
    });
    
    return { 
      dailyData: dailyMap, 
      maxSpending: max || 1,
      monthTotal: total,
    };
  }, [expenses, userId, currentMonth]);

  // Generate calendar grid (including padding days from prev/next months)
  const calendarGrid = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const calStart = startOfWeek(start);
    const calEnd = endOfWeek(end);
    
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => {
    if (currentMonth < new Date()) {
      setCurrentMonth(addMonths(currentMonth, 1));
    }
  };

  const isCurrentMonth = isSameMonth(currentMonth, new Date());

  return (
    <div className="glass-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame size={16} className="text-orange-400" />
          <h3 className="text-sm font-medium text-stone-200">Spending Heatmap</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handlePrevMonth}
            className="p-1.5 text-stone-400 hover:text-stone-200 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-stone-300 min-w-[100px] text-center">
            {format(currentMonth, 'MMM yyyy')}
          </span>
          <button 
            onClick={handleNextMonth}
            disabled={isCurrentMonth}
            className="p-1.5 text-stone-400 hover:text-stone-200 transition-colors disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Month total */}
      <div className="flex items-center justify-between mb-4 p-3 bg-stone-800/30 rounded-lg">
        <span className="text-xs text-stone-400">Month Total</span>
        <span className="text-sm font-medium text-stone-200">
          {formatCurrency(monthTotal, currency)}
        </span>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map(day => (
          <div key={day} className="text-center text-[10px] text-stone-500 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarGrid.map((day, index) => {
          const key = format(day, 'yyyy-MM-dd');
          const data = dailyData[key];
          const isThisMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());
          const intensity = data ? getIntensityLevel(data.amount, maxSpending) : 0;
          const hasSpending = data?.amount > 0;
          
          return (
            <button
              key={index}
              onClick={() => hasSpending && setSelectedDay(data)}
              disabled={!hasSpending}
              className={`
                aspect-square rounded-md flex items-center justify-center text-xs
                transition-all relative
                ${isThisMonth ? '' : 'opacity-30'}
                ${INTENSITY_COLORS[intensity]}
                ${hasSpending ? 'cursor-pointer hover:ring-1 hover:ring-emerald-500/50 active:scale-95' : 'cursor-default'}
                ${isToday ? 'ring-1 ring-stone-500' : ''}
              `}
            >
              <span className={`
                ${intensity >= 3 ? 'text-white font-medium' : 'text-stone-400'}
                ${!isThisMonth ? 'text-stone-600' : ''}
              `}>
                {format(day, 'd')}
              </span>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-1 mt-4 text-[10px] text-stone-500">
        <span>Less</span>
        {INTENSITY_COLORS.map((color, i) => (
          <div key={i} className={`w-3 h-3 rounded-sm ${color}`} />
        ))}
        <span>More</span>
      </div>

      {/* Selected day detail modal */}
      {selectedDay && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedDay(null)}
        >
          <div 
            className="glass-card p-4 w-full max-w-sm animate-scale-in max-h-[70vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium text-stone-100">
                  {format(selectedDay.date, 'EEEE, MMM d')}
                </h4>
                <p className="text-sm text-emerald-400 font-medium">
                  {formatCurrency(selectedDay.amount, currency)}
                </p>
              </div>
              <button 
                onClick={() => setSelectedDay(null)}
                className="p-1.5 text-stone-500 hover:text-stone-300"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              {selectedDay.expenses.map((exp, i) => (
                <div 
                  key={i}
                  className="flex items-center justify-between p-3 bg-stone-800/40 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-200 truncate">{exp.description}</p>
                    <p className="text-xs text-stone-500">{exp.category}</p>
                  </div>
                  <span className="text-sm font-medium text-stone-300 ml-3">
                    {formatCurrency(exp.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
