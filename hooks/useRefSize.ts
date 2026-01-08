import { useRef, useEffect, useState } from 'react';

export const useRefSize = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const handleResize = () => {
    if (ref.current) {
      setSize({
        width: ref.current.offsetWidth,
        height: ref.current.offsetHeight
      });
    }
  };

  useEffect(() => {
    // Initial resize
    handleResize();
    
    // Use ResizeObserver for better dimension tracking
    let resizeObserver: ResizeObserver | null = null;
    
    if (ref.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(ref.current);
    }

    const handleOrientationChange = () => {
      handleResize();
    };

    // Also listen to window resize as fallback
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Retry after a short delay to ensure DOM is ready
    const timeout = setTimeout(handleResize, 100);
    const timeout2 = setTimeout(handleResize, 500);

    return () => {
      if (resizeObserver && ref.current) {
        resizeObserver.unobserve(ref.current);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      clearTimeout(timeout);
      clearTimeout(timeout2);
    };
  }, []);

  const refreshSize = () => {
    handleResize();
  };

  return { ref, ...size, refreshSize };
};
