/**
 * ESCategoryDetail - Comprehensive category breakdown view
 * Shows pie chart, expandable categories, monthly comparison, and top merchants
 */

import { useState, useMemo } from 'react';
import { 
  ArrowLeft, ChevronDown, ChevronUp, TrendingUp, TrendingDown,
  Minus, DollarSign, Calendar
} from 'lucide-react';
import { format, parseISO, subMonths, subDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../../utils/analytics';
import { getCategoryIcon, getCategoryColors } from '../../../utils/categoryConfig';
import { TOOLTIP_STYLE } from '../../../utils/chartConfig';

// Chart colors
const PIE_COLORS = [
  '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4',
  '#6366f1', '#84cc16', '#f97316', '#a855f7', '#14b8a6', '#78716c'
];

// Category row with expandable expenses
function CategoryRow({ category, total, count, percentage, expenses, trend, isExpanded, onToggle }) {
  const Icon = getCategoryIcon(category);
  const colors = getCategoryColors(category);
  
  return (
    <div className="glass-card overflow-hidden">
      {/* Header - clickable */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-3 hover:bg-stone-800/30 transition-colors"
      >
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={18} className={colors.text} />
        </div>
        
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-stone-200">{category}</p>
            {trend !== 0 && (
              <span className={`flex items-center gap-0.5 text-[10px] ${
                trend > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {trend > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {Math.abs(trend)}%
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500">{count} expense{count !== 1 ? 's' : ''}</p>
        </div>
        
        <div className="text-right flex-shrink-0">
          <p className={`text-sm font-display ${colors.text}`}>
            {formatCurrency(total, 'INR')}
          </p>
          <p className="text-[10px] text-stone-500">{percentage.toFixed(1)}%</p>
        </div>
        
        <div className="text-stone-500 ml-2">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>
      
      {/* Expanded expenses list */}
      {isExpanded && expenses.length > 0 && (
        <div className="px-4 pb-4 space-y-2 border-t border-stone-800/50 pt-3">
          {expenses.slice(0, 10).map((exp, i) => (
            <div key={exp.id} className="flex items-center gap-3 p-2 bg-stone-800/30 rounded-lg">
              <span className="text-[10px] text-stone-600 w-4">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-stone-300 truncate">{exp.description}</p>
                <p className="text-[10px] text-stone-500">
                  {format(parseISO(exp.date), 'MMM d, yyyy')}
                </p>
              </div>
              <p className="text-xs font-mono text-stone-300">
                {formatCurrency(exp.amount, 'INR')}
              </p>
            </div>
          ))}
          {expenses.length > 10 && (
            <p className="text-xs text-stone-500 text-center py-1">
              +{expenses.length - 10} more expenses
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Monthly comparison bar chart
function MonthlyComparisonChart({ categoryData, selectedCategory }) {
  const data = useMemo(() => {
    if (!selectedCategory || !categoryData[selectedCategory]) return [];
    return categoryData[selectedCategory].monthly.slice(-3);
  }, [categoryData, selectedCategory]);

  if (data.length === 0) return null;

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={TOOLTIP_STYLE.contentStyle}>
        <p className="text-xs text-stone-400">{payload[0]?.payload?.month}</p>
        <p className="text-sm text-teal-400 font-medium">
          {formatCurrency(payload[0]?.value, 'INR')}
        </p>
      </div>
    );
  };

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-medium text-stone-300 mb-4">
        {selectedCategory} - Last 3 Months
      </h3>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis 
              dataKey="monthShort" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#78716c', fontSize: 10 }}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]} fill="#8b5cf6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Top merchants card
function TopMerchantsCard({ expenses, category }) {
  const merchants = useMemo(() => {
    const merchantMap = {};
    
    for (const exp of expenses) {
      if (category && exp.category !== category) continue;
      
      // Extract merchant name (first word or two)
      const desc = exp.description.toLowerCase();
      const merchant = desc.split(' ').slice(0, 2).join(' ');
      
      if (!merchantMap[merchant]) {
        merchantMap[merchant] = { name: exp.description.split(' ').slice(0, 2).join(' '), total: 0, count: 0 };
      }
      merchantMap[merchant].total += exp.amount;
      merchantMap[merchant].count += 1;
    }
    
    return Object.values(merchantMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [expenses, category]);

  if (merchants.length === 0) return null;

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-medium text-stone-300 mb-3">
        {category ? `Top in ${category}` : 'Top Merchants'}
      </h3>
      <div className="space-y-2">
        {merchants.map((m, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-5 h-5 rounded-full bg-stone-800 text-stone-500 text-[10px] flex items-center justify-center">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-stone-300 truncate capitalize">{m.name}</p>
              <p className="text-[10px] text-stone-500">{m.count}x</p>
            </div>
            <p className="text-xs font-mono text-stone-400">
              {formatCurrency(m.total, 'INR')}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Time filter options
const TIME_FILTERS = [
  { id: 'all', label: 'All Time' },
  { id: 'month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: '30d', label: 'Last 30 Days' },
  { id: '90d', label: 'Last 90 Days' },
];

export default function ESCategoryDetail({ expenses, onClose }) {
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [selectedForComparison, setSelectedForComparison] = useState(null);
  const [timeFilter, setTimeFilter] = useState('all');

  // Apply time filter to expenses
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    return expenses.filter(exp => {
      if (exp.cancelled || exp.isRefund) return false;
      const expDate = parseISO(exp.date);
      switch (timeFilter) {
        case 'month':
          return isWithinInterval(expDate, { start: startOfMonth(now), end: endOfMonth(now) });
        case 'last_month': {
          const lm = subMonths(now, 1);
          return isWithinInterval(expDate, { start: startOfMonth(lm), end: endOfMonth(lm) });
        }
        case '30d':
          return expDate >= subDays(now, 30);
        case '90d':
          return expDate >= subDays(now, 90);
        default:
          return true;
      }
    });
  }, [expenses, timeFilter]);

  // Calculate category data with trends
  const { categoryData, pieData, grandTotal } = useMemo(() => {
    const now = new Date();
    const thisMonth = { start: startOfMonth(now), end: endOfMonth(now) };
    const lastMonth = { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
    
    const data = {};
    let total = 0;
    
    for (const exp of filteredExpenses) {
      
      const cat = exp.category || 'Other';
      const expDate = parseISO(exp.date);
      
      if (!data[cat]) {
        data[cat] = {
          total: 0,
          count: 0,
          expenses: [],
          thisMonth: 0,
          lastMonth: 0,
          monthly: {},
        };
      }
      
      data[cat].total += exp.amount;
      data[cat].count += 1;
      data[cat].expenses.push(exp);
      total += exp.amount;
      
      // Track this month vs last month
      if (isWithinInterval(expDate, thisMonth)) {
        data[cat].thisMonth += exp.amount;
      }
      if (isWithinInterval(expDate, lastMonth)) {
        data[cat].lastMonth += exp.amount;
      }
      
      // Track monthly for charts
      const monthKey = format(expDate, 'yyyy-MM');
      data[cat].monthly[monthKey] = (data[cat].monthly[monthKey] || 0) + exp.amount;
    }
    
    // Calculate trends and format data
    const sortedCategories = Object.entries(data)
      .map(([category, stats]) => {
        // Calculate trend (% change from last month)
        let trend = 0;
        if (stats.lastMonth > 0) {
          trend = Math.round(((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100);
        } else if (stats.thisMonth > 0) {
          trend = 100;
        }
        
        // Format monthly data for charts
        const monthlyArr = Object.entries(stats.monthly)
          .map(([month, amount]) => ({
            month: format(new Date(month + '-01'), 'MMMM yyyy'),
            monthShort: format(new Date(month + '-01'), 'MMM'),
            amount,
          }))
          .sort((a, b) => a.month.localeCompare(b.month));
        
        return {
          category,
          total: stats.total,
          count: stats.count,
          percentage: total > 0 ? (stats.total / total) * 100 : 0,
          expenses: stats.expenses.sort((a, b) => b.amount - a.amount),
          trend,
          monthly: monthlyArr,
        };
      })
      .sort((a, b) => b.total - a.total);
    
    // Pie chart data
    const pie = sortedCategories.slice(0, 8).map((cat, i) => ({
      name: cat.category,
      value: cat.total,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
    
    // Add "Other" if there are more categories
    if (sortedCategories.length > 8) {
      const otherTotal = sortedCategories.slice(8).reduce((sum, c) => sum + c.total, 0);
      pie.push({ name: 'Other', value: otherTotal, color: PIE_COLORS[10] });
    }
    
    // Convert to lookup object
    const categoryLookup = {};
    for (const cat of sortedCategories) {
      categoryLookup[cat.category] = cat;
    }
    
    return {
      categoryData: categoryLookup,
      pieData: pie,
      grandTotal: total,
      categories: sortedCategories,
    };
  }, [filteredExpenses]);

  const categories = Object.values(categoryData).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-stone-800/50 text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors touch-manipulation active:scale-95"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-display text-stone-200">Category Breakdown</h2>
          <p className="text-xs text-stone-500">
            {formatCurrency(grandTotal, 'INR')} across {categories.length} categories
          </p>
        </div>
      </div>

      {/* Time Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {TIME_FILTERS.map(filter => (
          <button
            key={filter.id}
            onClick={() => setTimeFilter(filter.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all touch-manipulation ${
              timeFilter === filter.id
                ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                : 'bg-stone-800/50 text-stone-400 border border-stone-700/50 hover:bg-stone-800 active:bg-stone-700'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Pie Chart */}
      {pieData.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-medium text-stone-300 mb-4">Distribution</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
                  paddingAngle={2}
                  onClick={(data) => {
                    setSelectedForComparison(data.name);
                    setExpandedCategory(expandedCategory === data.name ? null : data.name);
                  }}
                >
                  {pieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      stroke={expandedCategory === entry.name ? '#fff' : 'transparent'}
                      strokeWidth={2}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => formatCurrency(value, 'INR')}
                  contentStyle={TOOLTIP_STYLE.contentStyle}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-2 justify-center mt-3">
            {pieData.slice(0, 6).map((item, i) => (
              <button
                key={item.name}
                onClick={() => {
                  setSelectedForComparison(item.name);
                  setExpandedCategory(expandedCategory === item.name ? null : item.name);
                }}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${
                  expandedCategory === item.name 
                    ? 'bg-stone-800' 
                    : 'hover:bg-stone-800/50'
                }`}
              >
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[10px] text-stone-400">{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Comparison (for selected category) */}
      {selectedForComparison && (
        <MonthlyComparisonChart 
          categoryData={categoryData} 
          selectedCategory={selectedForComparison} 
        />
      )}

      {/* Top Merchants */}
      <TopMerchantsCard expenses={filteredExpenses} category={selectedForComparison} />

      {/* Category List */}
      <div className="space-y-2">
        <h3 className="text-xs text-stone-500 uppercase tracking-wider px-1">All Categories</h3>
        {categories.length > 0 ? (
          categories.map(cat => (
            <CategoryRow
              key={cat.category}
              category={cat.category}
              total={cat.total}
              count={cat.count}
              percentage={cat.percentage}
              expenses={cat.expenses}
              trend={cat.trend}
              isExpanded={expandedCategory === cat.category}
              onToggle={() => {
                setExpandedCategory(expandedCategory === cat.category ? null : cat.category);
                setSelectedForComparison(cat.category);
              }}
            />
          ))
        ) : (
          <div className="text-center py-12 glass-card">
            <p className="text-sm text-stone-500">No expenses for this period</p>
            <p className="text-xs text-stone-600 mt-1">Try a different time range</p>
          </div>
        )}
      </div>
    </div>
  );
}
