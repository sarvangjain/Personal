/**
 * Shared chart configuration and utilities
 * Used across all chart components for consistency
 */

// Consistent color palette for charts
export const CHART_COLORS = [
  '#10b981', // emerald
  '#f59e0b', // amber  
  '#6366f1', // indigo
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#ef4444', // red
];

// Status colors for budget indicators
export const STATUS_COLORS = {
  good: '#10b981',      // emerald - under budget
  warning: '#f59e0b',   // amber - approaching limit
  danger: '#ef4444',    // red - over budget
  neutral: '#6b7280',   // gray - no data
};

// Gradient definitions for area charts
export const GRADIENT_DEFS = {
  emerald: {
    id: 'emeraldGradient',
    startColor: '#10b981',
    endColor: '#10b981',
    startOpacity: 0.3,
    endOpacity: 0.05,
  },
  purple: {
    id: 'purpleGradient',
    startColor: '#8b5cf6',
    endColor: '#8b5cf6',
    startOpacity: 0.3,
    endOpacity: 0.05,
  },
  amber: {
    id: 'amberGradient',
    startColor: '#f59e0b',
    endColor: '#f59e0b',
    startOpacity: 0.3,
    endOpacity: 0.05,
  },
};

// Common chart axis styling
export const AXIS_STYLE = {
  axisLine: false,
  tickLine: false,
  tick: { fill: '#78716c', fontSize: 10 },
  stroke: '#292524',
};

// Common tooltip styling
export const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'rgba(28, 25, 23, 0.95)',
    border: '1px solid rgba(120, 113, 108, 0.3)',
    borderRadius: '12px',
    padding: '8px 12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
  },
  labelStyle: { color: '#d6d3d1', fontWeight: 500, marginBottom: 4 },
  itemStyle: { color: '#a8a29e', fontSize: 12 },
};

// Mobile-optimized chart margins
export const CHART_MARGINS = {
  mobile: { top: 10, right: 10, left: 0, bottom: 10 },
  desktop: { top: 20, right: 20, left: 10, bottom: 20 },
};

// Get color by index (cycles through palette)
export function getChartColor(index) {
  return CHART_COLORS[index % CHART_COLORS.length];
}

// Get status color based on percentage
export function getStatusColor(percentage, warningThreshold = 80, dangerThreshold = 100) {
  if (percentage >= dangerThreshold) return STATUS_COLORS.danger;
  if (percentage >= warningThreshold) return STATUS_COLORS.warning;
  return STATUS_COLORS.good;
}

// Format large numbers for chart labels
export function formatChartValue(value, currency = 'INR') {
  if (value >= 100000) {
    return `${(value / 100000).toFixed(1)}L`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

// Generate gradient SVG definition component props
export function createGradientDef(id, color, startOpacity = 0.3, endOpacity = 0.05) {
  return {
    id,
    x1: '0', y1: '0', x2: '0', y2: '1',
    stops: [
      { offset: '0%', stopColor: color, stopOpacity: startOpacity },
      { offset: '100%', stopColor: color, stopOpacity: endOpacity },
    ],
  };
}

// Responsive breakpoint for charts
export const MOBILE_BREAKPOINT = 640;

// Check if device is mobile (for SSR safety, default to false)
export function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

// Mobile-optimized tooltip props for Recharts
export const MOBILE_TOOLTIP_PROPS = {
  // Larger touch area
  cursor: { strokeWidth: 2 },
  // Better visibility on mobile
  allowEscapeViewBox: { x: false, y: false },
  // Position for mobile
  position: { y: 0 },
  // Offset for touch
  offset: 10,
};

// Touch-friendly active dot props
export const TOUCH_ACTIVE_DOT = {
  r: 6,
  strokeWidth: 3,
  stroke: '#0c0a09',
};

// Chart animation settings
export const CHART_ANIMATION = {
  duration: 500,
  easing: 'ease-out',
};

// Pie chart label settings for mobile
export const PIE_LABEL_PROPS = {
  fontSize: 10,
  fill: '#a8a29e',
};
