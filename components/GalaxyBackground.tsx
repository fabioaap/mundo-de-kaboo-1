import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import useIsMobile from '../hooks/useIsMobile';

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleDelay: number; // Delay for CSS animation
}

interface GalaxyBackgroundProps {
  className?: string;
  density?: number;
}

// Cache version - increment to invalidate all caches
const CACHE_VERSION = 1;
const CACHE_KEY_PREFIX = 'galaxy_stars_v';
const MEMORY_CACHE: Map<string, Star[]> = new Map();
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Generate cache key based on screen dimensions and density
const generateCacheKey = (width: number, height: number, density: number, isMobile: boolean, isLowPerformance: boolean): string => {
  // Round dimensions to nearest 100px to allow some flexibility
  const roundedWidth = Math.round(width / 100) * 100;
  const roundedHeight = Math.round(height / 100) * 100;
  return `${CACHE_KEY_PREFIX}${CACHE_VERSION}_${roundedWidth}x${roundedHeight}_d${density.toFixed(2)}_m${isMobile ? '1' : '0'}_p${isLowPerformance ? '1' : '0'}`;
};

// Load stars from cache
const loadStarsFromCache = (cacheKey: string): Star[] | null => {
  try {
    // First check memory cache
    if (MEMORY_CACHE.has(cacheKey)) {
      return MEMORY_CACHE.get(cacheKey)!;
    }

    // Then check localStorage
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    
    // Check if cache is expired
    if (parsed.timestamp && Date.now() - parsed.timestamp > MAX_CACHE_AGE) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    // Store in memory cache for faster access
    if (parsed.stars) {
      MEMORY_CACHE.set(cacheKey, parsed.stars);
      return parsed.stars;
    }

    return null;
  } catch (error) {
    console.warn('Error loading galaxy cache:', error);
    return null;
  }
};

// Save stars to cache
const saveStarsToCache = (cacheKey: string, stars: Star[]): void => {
  try {
    const cacheData = {
      stars,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };

    // Save to memory cache
    MEMORY_CACHE.set(cacheKey, stars);

    // Save to localStorage
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));

    // Clean up old cache entries (keep only last 5)
    const allKeys = Object.keys(localStorage).filter(key => key.startsWith(CACHE_KEY_PREFIX));
    if (allKeys.length > 5) {
      // Sort by timestamp and remove oldest
      const keysWithTimestamps = allKeys.map(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          return { key, timestamp: data.timestamp || 0 };
        } catch {
          return { key, timestamp: 0 };
        }
      }).sort((a, b) => a.timestamp - b.timestamp);

      // Remove oldest entries
      keysWithTimestamps.slice(0, allKeys.length - 5).forEach(({ key }) => {
        localStorage.removeItem(key);
        MEMORY_CACHE.delete(key);
      });
    }
  } catch (error) {
    console.warn('Error saving galaxy cache:', error);
    // If localStorage is full, try to clear old entries
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      try {
        // Clear all galaxy caches
        Object.keys(localStorage)
          .filter(key => key.startsWith(CACHE_KEY_PREFIX))
          .forEach(key => localStorage.removeItem(key));
        MEMORY_CACHE.clear();
      } catch (clearError) {
        console.error('Error clearing cache:', clearError);
      }
    }
  }
};

// Detect if device has low performance
const detectLowPerformance = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  
  // Check for low-end device indicators
  const hardwareConcurrency = navigator.hardwareConcurrency || 2;
  const deviceMemory = (navigator as any).deviceMemory || 4;
  const isLowEnd = hardwareConcurrency <= 2 || deviceMemory <= 2;
  
  return isLowEnd;
};

export const GalaxyBackground: React.FC<GalaxyBackgroundProps> = ({
  className = '',
  density = 0.4, // Reduced default density
}) => {
  const isMobile = useIsMobile();
  const isLowPerformance = useMemo(() => detectLowPerformance(), []);
  
  // Further reduce stars on mobile or low-performance devices
  const effectiveDensity = useMemo(() => {
    if (isLowPerformance) return density * 0.3;
    if (isMobile) return density * 0.5;
    return density;
  }, [density, isMobile, isLowPerformance]);

  // Initialize stars with cache support
  const [stars] = useState<Star[]>(() => {
    // Calculate effective density for initial render
    const initialIsLowPerf = detectLowPerformance();
    const initialIsMobile = window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    let initialDensity = density;
    if (initialIsLowPerf) initialDensity = density * 0.3;
    else if (initialIsMobile) initialDensity = density * 0.5;
    
    // Generate cache key
    const cacheKey = generateCacheKey(
      window.innerWidth,
      window.innerHeight,
      initialDensity,
      initialIsMobile,
      initialIsLowPerf
    );

    // Try to load from cache
    const cachedStars = loadStarsFromCache(cacheKey);
    if (cachedStars && cachedStars.length > 0) {
      return cachedStars;
    }

    // Calculate star count with limits
    const baseCount = Math.floor((window.innerWidth * window.innerHeight) / 15000 * initialDensity);
    const maxStars = initialIsMobile ? 80 : initialIsLowPerf ? 100 : 150;
    const starCount = Math.min(baseCount, maxStars);
    
    // Generate new stars
    const newStars: Star[] = [];
    for (let i = 0; i < starCount; i++) {
      newStars.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2.5 + 1, // Smaller stars
        opacity: Math.random() * 0.6 + 0.2,
        twinkleDelay: Math.random() * 2, // 0-2 seconds delay
      });
    }

    // Save to cache
    saveStarsToCache(cacheKey, newStars);
    
    return newStars;
  });

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const galaxyRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const rotationRef = useRef(0);
  const mouseThrottleRef = useRef(0);

  // Galaxy rotation animation (only rotation, no star updates)
  useEffect(() => {
    const animate = () => {
      const rotationSpeed = 0.08; // Slightly slower
      rotationRef.current += rotationSpeed;
      
      // Update rotation directly on DOM element (GPU accelerated)
      if (galaxyRef.current) {
        galaxyRef.current.style.transform = `rotate(${rotationRef.current}deg)`;
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Throttled mouse position tracking for repulsion effect
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!galaxyRef.current || isMobile || isLowPerformance) return;
    
    // Throttle mouse updates to every 50ms
    const now = Date.now();
    if (now - mouseThrottleRef.current < 50) return;
    mouseThrottleRef.current = now;
    
    // Update mouse position for galaxy repulsion effect
    const galaxyRect = galaxyRef.current.getBoundingClientRect();
    const galaxyX = ((e.clientX - galaxyRect.left) / galaxyRect.width) * 100;
    const galaxyY = ((e.clientY - galaxyRect.top) / galaxyRect.height) * 100;
    setMousePos({ x: galaxyX, y: galaxyY });
  }, [isMobile, isLowPerformance]);

  // Memoize repulsion calculations
  const starElements = useMemo(() => {
    return stars.map((star, index) => {
      // Calculate distance from mouse for repulsion effect (only on desktop, non-low-performance)
      let offsetX = 0;
      let offsetY = 0;
      
      if (!isMobile && !isLowPerformance) {
        const dx = star.x - mousePos.x;
        const dy = star.y - mousePos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const repulsionStrength = 1.5; // Reduced
        const repulsionRadius = 15; // Reduced
        
        if (distance < repulsionRadius) {
          const force = (1 - distance / repulsionRadius) * repulsionStrength;
          offsetX = (dx / distance) * force;
          offsetY = (dy / distance) * force;
        }
      }
      
      // Use CSS animation for twinkle instead of JavaScript
      const baseOpacity = star.opacity * 0.25; // Reduced base opacity
      
      return (
        <div
          key={index}
          className="galaxy-star"
          style={{
            left: `calc(${star.x}% + ${offsetX}px)`,
            top: `calc(${star.y}% + ${offsetY}px)`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: baseOpacity,
            animationDelay: `${star.twinkleDelay}s`,
            transform: `translate(-50%, -50%)`,
            willChange: 'transform, opacity', // GPU acceleration hint
          }}
        />
      );
    });
  }, [stars, mousePos, isMobile, isLowPerformance]);

  return (
    <>
      <style>{`
        @keyframes galaxyTwinkle {
          0%, 100% { 
            opacity: 0.2;
            box-shadow: 0 0 2px 1px rgba(255, 255, 255, 0.3);
          }
          50% { 
            opacity: 0.6;
            box-shadow: 0 0 4px 2px rgba(255, 255, 255, 0.5);
          }
        }
        
        .galaxy-star {
          position: absolute;
          border-radius: 50%;
          background: white;
          animation: galaxyTwinkle 3s ease-in-out infinite;
          pointer-events: none;
          /* Optimize rendering */
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform: translateZ(0); /* Force GPU acceleration */
        }
      `}</style>
      <div 
        ref={galaxyRef}
        className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
        style={{
          transformOrigin: 'center center',
          zIndex: 1,
          willChange: 'transform', // GPU acceleration hint
        }}
        onMouseMove={handleMouseMove}
      >
        {starElements}
      </div>
    </>
  );
};
