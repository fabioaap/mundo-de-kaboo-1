import { useState, useEffect } from 'react';

export default function useOrientation() {
  const [isLandscape, setIsLandscape] = useState(true);

  useEffect(() => {
    const checkOrientation = () => {
      // Check if width > height (landscape) or use orientation API if available
      const isLandscapeMode = window.innerWidth > window.innerHeight;
      setIsLandscape(isLandscapeMode);
    };

    // Check on mount
    checkOrientation();

    // Listen to resize events
    window.addEventListener('resize', checkOrientation);
    
    // Listen to orientation change events (for mobile devices)
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  return isLandscape;
}
