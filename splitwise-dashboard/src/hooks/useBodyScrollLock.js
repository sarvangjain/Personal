import { useEffect } from 'react';

/**
 * Hook to lock body scroll when a modal/popup is open
 * Prevents background scrolling on iOS and Android
 */
export function useBodyScrollLock(isLocked = true) {
  useEffect(() => {
    if (!isLocked) return;
    
    // Store original styles
    const originalStyle = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    
    // Get current scroll position
    const scrollY = window.scrollY;
    
    // Lock scroll
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    
    // Cleanup: restore scroll position and styles
    return () => {
      document.body.style.overflow = originalStyle.overflow;
      document.body.style.position = originalStyle.position;
      document.body.style.top = originalStyle.top;
      document.body.style.width = originalStyle.width;
      
      // Restore scroll position
      window.scrollTo(0, scrollY);
    };
  }, [isLocked]);
}

export default useBodyScrollLock;
