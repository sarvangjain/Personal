import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'splitsight_recent_tabs';
const MAX_RECENT = 5;

// Tabs that are always pinned in the bottom nav and shouldn't appear in "recent"
const PINNED_TABS = ['overview', 'activity'];

/**
 * Hook to track recently visited tabs.
 * Persists to localStorage and returns ordered recent list.
 */
export function useRecentTabs() {
  const [recentTabs, setRecentTabs] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage whenever recentTabs changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentTabs));
    } catch { /* silently fail */ }
  }, [recentTabs]);

  /**
   * Record a tab visit. Moves it to the front, deduplicates, caps at MAX_RECENT.
   */
  const recordTabVisit = useCallback((tabId) => {
    setRecentTabs(prev => {
      const filtered = prev.filter(t => t !== tabId);
      return [tabId, ...filtered].slice(0, MAX_RECENT);
    });
  }, []);

  /**
   * Get recent tabs for the bottom nav dynamic slots.
   * Excludes pinned tabs (overview, activity) and returns up to `count` items.
   */
  const getBottomNavRecents = useCallback((count = 2) => {
    return recentTabs
      .filter(t => !PINNED_TABS.includes(t))
      .slice(0, count);
  }, [recentTabs]);

  /**
   * Get recent tabs for the sidebar display.
   * Returns up to `count` most recent, including pinned ones.
   */
  const getSidebarRecents = useCallback((count = 3) => {
    return recentTabs.slice(0, count);
  }, [recentTabs]);

  return {
    recentTabs,
    recordTabVisit,
    getBottomNavRecents,
    getSidebarRecents,
  };
}
