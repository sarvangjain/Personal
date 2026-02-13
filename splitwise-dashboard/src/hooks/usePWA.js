import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for PWA functionality
 * - Tracks online/offline status
 * - Handles install prompt
 * - Detects if app is installed
 * - Service worker update handling
 */
export function usePWA() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState(null);

  // Check if running as installed PWA
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone === true
      || document.referrer.includes('android-app://');
    setIsInstalled(isStandalone);
  }, []);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Install prompt handling
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setCanInstall(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Service worker registration
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          setRegistration(reg);
          
          // Check for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true);
                }
              });
            }
          });
        })
        .catch((err) => {
          console.error('Service worker registration failed:', err);
        });

      // Listen for controller change (after skipWaiting)
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);

  // Install the app
  const install = useCallback(async () => {
    if (!installPrompt) return false;

    try {
      const result = await installPrompt.prompt();
      if (result.outcome === 'accepted') {
        setInstallPrompt(null);
        setCanInstall(false);
        return true;
      }
    } catch (err) {
      console.error('Install failed:', err);
    }
    return false;
  }, [installPrompt]);

  // Apply update (reload with new service worker)
  const applyUpdate = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage('skipWaiting');
    }
  }, [registration]);

  return {
    isOnline,
    isInstalled,
    canInstall,
    install,
    updateAvailable,
    applyUpdate,
  };
}

/**
 * Hook for pull-to-refresh functionality
 * DISABLED: Custom pull-to-refresh is disabled to prevent scroll interference.
 * The app uses CSS overscroll-behavior: none to prevent native pull-to-refresh.
 * Users can refresh using the refresh button in the UI instead.
 */
export function usePullToRefresh(onRefresh, threshold = 80) {
  // Return disabled state - no pull-to-refresh functionality
  // This prevents scroll interference on mobile devices
  return { 
    isPulling: false, 
    pullDistance: 0, 
    isRefreshing: false 
  };
}

/**
 * Hook for haptic feedback (vibration)
 */
export function useHaptic() {
  const vibrate = useCallback((pattern = 10) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  const light = useCallback(() => vibrate(10), [vibrate]);
  const medium = useCallback(() => vibrate(25), [vibrate]);
  const heavy = useCallback(() => vibrate([50, 30, 50]), [vibrate]);
  const success = useCallback(() => vibrate([10, 50, 10]), [vibrate]);
  const error = useCallback(() => vibrate([100, 30, 100, 30, 100]), [vibrate]);

  return { vibrate, light, medium, heavy, success, error };
}
