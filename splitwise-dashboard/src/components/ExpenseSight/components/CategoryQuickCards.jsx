/**
 * CategoryQuickCards - Interactive category summary cards for Activity tab
 * Shows spending per category with visual progress bars
 */

import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { formatCurrency } from '../../../utils/analytics';
import { CATEGORIES, getCategoryIcon, getCategoryColors } from '../../../utils/categoryConfig';

// Individual category card
function CategoryCard({ category, total, count, percentage, isActive, onClick }) {
  const Icon = getCategoryIcon(category);
  const colors = getCategoryColors(category);
  
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 w-32 p-3 rounded-xl border transition-all ${
        isActive 
          ? `bg-gradient-to-br ${colors.gradient} border-teal-500/50 ring-2 ring-teal-500/30`
          : 'bg-stone-800/40 border-stone-700/30 hover:bg-stone-800/60'
      }`}
    >
      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center mb-2`}>
        <Icon size={16} className={colors.text} />
      </div>
      <p className="text-xs font-medium text-stone-300 truncate">{category}</p>
      <p className={`text-sm font-display ${colors.text} mt-0.5`}>
        {formatCurrency(total, 'INR')}
      </p>
      <p className="text-[10px] text-stone-500 mt-0.5">{count} expense{count !== 1 ? 's' : ''}</p>
      
      {/* Progress bar */}
      <div className="h-1 bg-stone-700/50 rounded-full mt-2 overflow-hidden">
        <div 
          className={`h-full ${colors.bar} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </button>
  );
}

// "View All" card
function ViewAllCard({ onClick, totalCategories }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-24 p-3 rounded-xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-500/30 flex flex-col items-center justify-center gap-2 hover:from-teal-500/20 hover:to-cyan-500/20 transition-all"
    >
      <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
        <ChevronRight size={16} className="text-teal-400" />
      </div>
      <p className="text-xs font-medium text-teal-400">View All</p>
      <p className="text-[10px] text-stone-500">{totalCategories} categories</p>
    </button>
  );
}

export default function CategoryQuickCards({ 
  expenses, 
  activeCategory, 
  onCategoryClick,
  onViewAllClick,
  maxCards = 4 
}) {
  // Calculate category totals
  const categoryData = useMemo(() => {
    const data = {};
    let grandTotal = 0;
    
    for (const exp of expenses) {
      if (exp.cancelled || exp.isRefund) continue;
      
      const cat = exp.category || 'Other';
      if (!data[cat]) {
        data[cat] = { total: 0, count: 0 };
      }
      data[cat].total += exp.amount;
      data[cat].count += 1;
      grandTotal += exp.amount;
    }
    
    // Convert to array with percentages
    const categories = Object.entries(data)
      .map(([category, { total, count }]) => ({
        category,
        total,
        count,
        percentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
    
    return { categories, grandTotal };
  }, [expenses]);

  if (categoryData.categories.length === 0) {
    return null;
  }

  const visibleCategories = categoryData.categories.slice(0, maxCards);
  const hasMore = categoryData.categories.length > maxCards;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs text-stone-500 uppercase tracking-wider">By Category</h3>
        <p className="text-xs text-stone-600">
          {formatCurrency(categoryData.grandTotal, 'INR')} total
        </p>
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {/* "All" filter card */}
        <button
          onClick={() => onCategoryClick(null)}
          className={`flex-shrink-0 w-20 p-3 rounded-xl border transition-all ${
            !activeCategory 
              ? 'bg-teal-500/20 border-teal-500/50 ring-2 ring-teal-500/30'
              : 'bg-stone-800/40 border-stone-700/30 hover:bg-stone-800/60'
          }`}
        >
          <p className="text-xs font-medium text-stone-300">All</p>
          <p className="text-sm font-display text-teal-400 mt-1">
            {formatCurrency(categoryData.grandTotal, 'INR')}
          </p>
          <p className="text-[10px] text-stone-500 mt-0.5">
            {expenses.filter(e => !e.cancelled && !e.isRefund).length} items
          </p>
        </button>

        {/* Category cards */}
        {visibleCategories.map(cat => (
          <CategoryCard
            key={cat.category}
            category={cat.category}
            total={cat.total}
            count={cat.count}
            percentage={cat.percentage}
            isActive={activeCategory === cat.category}
            onClick={() => onCategoryClick(cat.category === activeCategory ? null : cat.category)}
          />
        ))}

        {/* View all card */}
        {hasMore && onViewAllClick && (
          <ViewAllCard 
            onClick={onViewAllClick}
            totalCategories={categoryData.categories.length}
          />
        )}
      </div>
    </div>
  );
}

// Re-export for convenience
export { CATEGORIES, getCategoryIcon, getCategoryColors };
