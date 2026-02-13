/**
 * Category Configuration for ExpenseSight
 * Centralized category definitions with icons, colors, and keywords
 */

import {
  ShoppingCart, Car, Utensils, Zap, ShoppingBag,
  Tv, Heart, Plane, User, CreditCard, HelpCircle,
  Coffee, Home, Fuel, Train, Bus, Bike, Smartphone,
  Gift, Scissors, Dumbbell, Music, Gamepad2, Film, Building2
} from 'lucide-react';

// ─── Category Definitions ────────────────────────────────────────────────────

export const CATEGORIES = {
  'Groceries': {
    icon: ShoppingCart,
    color: 'emerald',
    gradient: 'from-emerald-500/20 to-green-500/20',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/30',
    bar: 'bg-emerald-500',
    keywords: [
      'grocery', 'groceries', 'zepto', 'blinkit', 'bigbasket', 'vegetables',
      'fruits', 'kitchen', 'milk', 'bread', 'eggs', 'supermarket', 'paneer',
      'items', 'instamart', 'provisions'
    ],
  },
  'Transport': {
    icon: Car,
    color: 'blue',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    text: 'text-blue-400',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
    bar: 'bg-blue-500',
    keywords: [
      'cab', 'uber', 'ola', 'auto', 'metro', 'bus', 'train', 'flight',
      'petrol', 'fuel', 'parking', 'toll', 'rapido', 'commute', 'office commute',
      'blabla', 'car pool', 'carpool', 'drop', 'to and from', 'to and fro'
    ],
  },
  'Food & Dining': {
    icon: Utensils,
    color: 'orange',
    gradient: 'from-orange-500/20 to-amber-500/20',
    text: 'text-orange-400',
    bg: 'bg-orange-500/20',
    border: 'border-orange-500/30',
    bar: 'bg-orange-500',
    keywords: [
      'food order', 'food', 'zomato', 'swiggy', 'restaurant', 'dinner', 'lunch',
      'breakfast', 'cafe', 'coffee', 'pizza', 'burger', 'biryani', 'chai', 'tea',
      'drinks', 'bar', 'pub', 'f&b', 'garlic bread', 'dominos', 'mcd', 'thali',
      'kfc', 'order'
    ],
  },
  'Rent': {
    icon: Building2,
    color: 'slate',
    gradient: 'from-slate-500/20 to-gray-500/20',
    text: 'text-slate-400',
    bg: 'bg-slate-500/20',
    border: 'border-slate-500/30',
    bar: 'bg-slate-500',
    keywords: [
      'rent', 'house rent', 'room rent', 'flat rent', 'apartment', 'monthly rent',
      'accommodation', 'housing', 'pg', 'paying guest'
    ],
  },
  'Utilities': {
    icon: Zap,
    color: 'yellow',
    gradient: 'from-yellow-500/20 to-lime-500/20',
    text: 'text-yellow-400',
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/30',
    bar: 'bg-yellow-500',
    keywords: [
      'wifi', 'internet', 'electricity', 'electric', 'water', 'gas', 'cylinder',
      'bill', 'maintenance', 'society', 'airtel', 'jio', 'vodafone',
      'mobile bill', 'recharge', 'icloud'
    ],
  },
  'Shopping': {
    icon: ShoppingBag,
    color: 'pink',
    gradient: 'from-pink-500/20 to-rose-500/20',
    text: 'text-pink-400',
    bg: 'bg-pink-500/20',
    border: 'border-pink-500/30',
    bar: 'bg-pink-500',
    keywords: [
      'amazon', 'flipkart', 'myntra', 'cred', 'gift', 'clothes', 'shoes',
      'electronics', 'gadget', 'shampoo', 'powerbank', 'cable', 'cushion',
      'lumbar', 'flowers', 'cover', 'keyboard', 'management'
    ],
  },
  'Entertainment': {
    icon: Tv,
    color: 'purple',
    gradient: 'from-purple-500/20 to-violet-500/20',
    text: 'text-purple-400',
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/30',
    bar: 'bg-purple-500',
    keywords: [
      'movie', 'cinema', 'netflix', 'spotify', 'subscription', 'subs',
      'comedy', 'show', 'concert', 'game', 'party', 'social', 'art',
      'fifa', 'ps5', 'playstation', 'xbox', 'ea', 'membership',
      'badminton', 'cricket', 'pool', 'sports'
    ],
  },
  'Health': {
    icon: Heart,
    color: 'red',
    gradient: 'from-red-500/20 to-rose-500/20',
    text: 'text-red-400',
    bg: 'bg-red-500/20',
    border: 'border-red-500/30',
    bar: 'bg-red-500',
    keywords: [
      'medicine', 'medical', 'doctor', 'hospital', 'pharmacy', 'gym',
      'fitness', 'health'
    ],
  },
  'Travel': {
    icon: Plane,
    color: 'cyan',
    gradient: 'from-cyan-500/20 to-teal-500/20',
    text: 'text-cyan-400',
    bg: 'bg-cyan-500/20',
    border: 'border-cyan-500/30',
    bar: 'bg-cyan-500',
    keywords: [
      'hotel', 'airbnb', 'trip', 'vacation', 'holiday', 'booking',
      'tourism', 'travel', 'gurgaon', 'ggn', 'jaipur'
    ],
  },
  'Personal': {
    icon: User,
    color: 'indigo',
    gradient: 'from-indigo-500/20 to-blue-500/20',
    text: 'text-indigo-400',
    bg: 'bg-indigo-500/20',
    border: 'border-indigo-500/30',
    bar: 'bg-indigo-500',
    keywords: [
      'haircut', 'salon', 'spa', 'grooming', 'maid', 'cleaning', 'laundry'
    ],
  },
  'Payments': {
    icon: CreditCard,
    color: 'teal',
    gradient: 'from-teal-500/20 to-emerald-500/20',
    text: 'text-teal-400',
    bg: 'bg-teal-500/20',
    border: 'border-teal-500/30',
    bar: 'bg-teal-500',
    keywords: [
      'paid back', 'repaid', 'returned', 'settled', 'transfer', 'refund',
      'refunded', 'cashback', 'cash'
    ],
  },
  'Other': {
    icon: HelpCircle,
    color: 'stone',
    gradient: 'from-stone-500/20 to-stone-600/20',
    text: 'text-stone-400',
    bg: 'bg-stone-500/20',
    border: 'border-stone-500/30',
    bar: 'bg-stone-500',
    keywords: [],
  },
};

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Get category icon component
 */
export function getCategoryIcon(categoryName) {
  return CATEGORIES[categoryName]?.icon || HelpCircle;
}

/**
 * Get category color config
 */
export function getCategoryColors(categoryName) {
  const cat = CATEGORIES[categoryName] || CATEGORIES['Other'];
  return {
    gradient: cat.gradient,
    text: cat.text,
    bg: cat.bg,
    border: cat.border,
    bar: cat.bar,
  };
}

/**
 * Get all category names
 */
export function getAllCategories() {
  return Object.keys(CATEGORIES);
}

/**
 * Infer category from description using keywords
 */
export function inferCategory(description) {
  const lower = description.toLowerCase();
  
  for (const [categoryName, config] of Object.entries(CATEGORIES)) {
    if (config.keywords && config.keywords.length > 0) {
      for (const keyword of config.keywords) {
        if (lower.includes(keyword)) {
          return categoryName;
        }
      }
    }
  }
  
  return 'Other';
}

/**
 * Get default budget for a category
 */
export function getDefaultCategoryBudget(categoryName) {
  const defaults = {
    'Rent': 15000,
    'Food & Dining': 8000,
    'Transport': 5000,
    'Groceries': 6000,
    'Shopping': 5000,
    'Utilities': 4000,
    'Entertainment': 3000,
    'Health': 2000,
    'Personal': 2000,
    'Travel': 3000,
    'Payments': 2000,
    'Other': 2000,
  };
  return defaults[categoryName] || 2000;
}

// ─── Color Badge Classes ─────────────────────────────────────────────────────

/**
 * Get badge classes for a category (for small labels)
 */
export function getCategoryBadgeClasses(categoryName) {
  const colors = getCategoryColors(categoryName);
  return `${colors.bg} ${colors.text}`;
}

export default CATEGORIES;
