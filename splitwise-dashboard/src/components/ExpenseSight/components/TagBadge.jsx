/**
 * TagBadge - Small colored pill for displaying tags
 */

import { X } from 'lucide-react';

// Tag color definitions
const TAG_COLORS = {
  blue: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
  },
  purple: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
  },
  pink: {
    bg: 'bg-pink-500/20',
    text: 'text-pink-400',
    border: 'border-pink-500/30',
  },
  green: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  orange: {
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
  },
  red: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/30',
  },
  teal: {
    bg: 'bg-teal-500/20',
    text: 'text-teal-400',
    border: 'border-teal-500/30',
  },
  yellow: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
  },
  cyan: {
    bg: 'bg-cyan-500/20',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
  },
  stone: {
    bg: 'bg-stone-500/20',
    text: 'text-stone-400',
    border: 'border-stone-500/30',
  },
};

export function getTagColor(colorName) {
  return TAG_COLORS[colorName] || TAG_COLORS.stone;
}

export default function TagBadge({ 
  name, 
  color = 'stone', 
  size = 'sm', 
  onRemove,
  onClick,
  isActive = false,
}) {
  const colors = getTagColor(color);
  
  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5',
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };
  
  const baseClasses = `
    inline-flex items-center gap-1 rounded-full font-medium
    ${sizeClasses[size]}
    ${colors.bg} ${colors.text}
    ${isActive ? `border ${colors.border}` : 'border border-transparent'}
    ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
  `;
  
  return (
    <span 
      className={baseClasses}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <span className="opacity-60">#</span>
      {name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 p-0.5 rounded-full hover:bg-white/10 transition-colors"
        >
          <X size={size === 'xs' ? 8 : size === 'sm' ? 10 : 12} />
        </button>
      )}
    </span>
  );
}

// Export color options for color picker
export const TAG_COLOR_OPTIONS = Object.keys(TAG_COLORS);
