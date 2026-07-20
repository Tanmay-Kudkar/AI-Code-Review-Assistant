import { useEffect } from 'react';

export function useLockBodyScroll(isLocked) {
  useEffect(() => {
    const scrollContainer = document.querySelector('main') || document.body;
    
    if (isLocked) {
      // Prevent scrolling on mount
      scrollContainer.style.overflow = 'hidden';
    } else {
      // Re-enable scrolling when unlocked
      scrollContainer.style.overflow = '';
    }

    // Cleanup when component unmounts
    return () => {
      scrollContainer.style.overflow = '';
    };
  }, [isLocked]);
}
