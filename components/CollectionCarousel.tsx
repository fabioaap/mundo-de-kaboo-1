import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Collection } from '../types';
import { Icons } from './Icons';
import useIsMobile from '../hooks/useIsMobile';

interface CollectionCarouselProps {
  collections: (Collection & { progress?: number })[];
  onCollectionClick: (collection: Collection) => void;
}

export const CollectionCarousel: React.FC<CollectionCarouselProps> = ({
  collections,
  onCollectionClick
}) => {
  const isMobile = useIsMobile();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isAtStart, setIsAtStart] = useState(true);
  const [cardScales, setCardScales] = useState<number[]>([]);
  const [cardOpacities, setCardOpacities] = useState<number[]>([]);
  
  // Momentum scrolling refs
  const velocityRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const momentumAnimationRef = useRef<number | null>(null);
  const isMomentumScrollingRef = useRef(false);
  
  // Track if user dragged (to prevent click on drag)
  const hasDraggedRef = useRef(false);
  const dragThreshold = 5; // pixels - minimum movement to consider it a drag
  const cardDragStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  
  // Vertical scroll to horizontal scroll conversion
  const isHoveringCarouselRef = useRef(false);
  const verticalScrollAccumulatorRef = useRef(0);

  // Duplicate collections for infinite scroll
  const duplicatedCollections = [...collections, ...collections, ...collections];
  // Responsive sizing: smaller on mobile to fit screen
  const collectionWidth = isMobile ? 180 : 260; // Smaller on mobile
  const gap = isMobile ? 32 : 48; // Increased gap on mobile for better spacing
  
  // Scale configuration
  const maxScale = 1.12; // 12% larger when centered (reduced from 15% to prevent overlap)
  const minScale = 1.0; // Normal size when not centered

  const updateCardScales = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    // On mobile, scale based on center; on desktop, scale based on left edge
    const scalePoint = isMobile ? containerRect.width / 2 : 0;
    
    const newScales: number[] = [];
    const newOpacities: number[] = [];
    
    cardRefs.current.forEach((cardRef) => {
      if (!cardRef) {
        newScales.push(minScale);
        newOpacities.push(1);
        return;
      }
      
      const cardRect = cardRef.getBoundingClientRect();
      const cardLeft = cardRect.left - containerRect.left;
      const cardCenter = cardLeft + cardRect.width / 2;
      const distanceFromScalePoint = Math.abs(cardCenter - scalePoint);
      
      // Calculate scale based on distance from scale point
      // Cards closer to scale point get larger scale
      const maxDistance = isMobile 
        ? containerRect.width / 2 + collectionWidth / 2  // Center-based on mobile
        : containerRect.width * 0.7;  // Left-based on desktop
      const normalizedDistance = Math.min(distanceFromScalePoint / maxDistance, 1);
      
      // Use ease-out curve for smoother transition
      const easedDistance = 1 - Math.pow(1 - normalizedDistance, 2);
      const scale = maxScale - (maxScale - minScale) * easedDistance;
      newScales.push(Math.max(minScale, Math.min(maxScale, scale)));
      
      // Calculate opacity for mobile only
      if (isMobile) {
        // Opacity: 100% at center, decreasing as distance increases
        const maxOpacityDistance = containerRect.width / 2 + collectionWidth;
        const opacityNormalizedDistance = Math.min(distanceFromScalePoint / maxOpacityDistance, 1);
        // Use ease-out curve for smoother opacity transition
        const opacityEasedDistance = 1 - Math.pow(1 - opacityNormalizedDistance, 2);
        // Opacity ranges from 1.0 (center) to 0.3 (far from center)
        const minOpacity = 0.3;
        const opacity = 1.0 - (1.0 - minOpacity) * opacityEasedDistance;
        newOpacities.push(Math.max(minOpacity, Math.min(1.0, opacity)));
      } else {
        // Desktop: always fully opaque
        newOpacities.push(1.0);
      }
    });
    
    setCardScales(newScales);
    setCardOpacities(newOpacities);
  }, [collectionWidth, maxScale, minScale, isMobile]);

  const checkScrollPosition = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const scrollPosition = container.scrollLeft;
    const maxScroll = container.scrollWidth - container.clientWidth;
    const sectionWidth = collections.length * (collectionWidth + gap);
    
    // For infinite scroll, we're always in the middle section
    // So we can always scroll both ways, but disable buttons when at logical start/end
    const relativePosition = scrollPosition % sectionWidth;
    const isNearStart = relativePosition < collectionWidth;
    const isNearEnd = relativePosition > sectionWidth - collectionWidth - container.clientWidth;
    
    setCanScrollLeft(!isNearStart);
    setCanScrollRight(!isNearEnd);
    setIsAtStart(isNearStart);
  }, [collections.length, collectionWidth, gap]);

  const stopMomentum = useCallback(() => {
    if (momentumAnimationRef.current !== null) {
      cancelAnimationFrame(momentumAnimationRef.current);
      momentumAnimationRef.current = null;
    }
    isMomentumScrollingRef.current = false;
    velocityRef.current = 0;
  }, []);

  const applyMomentum = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const friction = 0.92; // Friction coefficient (0.92 = 8% reduction per frame)
    const minVelocity = 0.3; // Minimum velocity to continue
    
    const animate = () => {
      if (Math.abs(velocityRef.current) < minVelocity) {
        velocityRef.current = 0;
        isMomentumScrollingRef.current = false;
        momentumAnimationRef.current = null;
        
        // Check infinite scroll after momentum ends
        const scrollPos = container.scrollLeft;
        const sectionWidth = collections.length * (collectionWidth + gap);
        const threshold = 100;
        
        if (scrollPos >= sectionWidth * 2 - container.clientWidth - threshold) {
          container.scrollLeft = sectionWidth + (scrollPos - sectionWidth * 2);
        } else if (scrollPos <= threshold) {
          container.scrollLeft = sectionWidth + scrollPos;
        }
        
        return;
      }
      
      container.scrollLeft += velocityRef.current;
      velocityRef.current *= friction; // Apply friction
      
      // Update scales during momentum
      updateCardScales();
      
      momentumAnimationRef.current = requestAnimationFrame(animate);
    };
    
    isMomentumScrollingRef.current = true;
    momentumAnimationRef.current = requestAnimationFrame(animate);
  }, [updateCardScales, collections.length, collectionWidth, gap]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || collections.length === 0) return;

    // Initialize card scales and opacities arrays
    setCardScales(new Array(duplicatedCollections.length).fill(minScale));
    setCardOpacities(new Array(duplicatedCollections.length).fill(1.0));

    // Set initial scroll position
    const sectionWidth = collections.length * (collectionWidth + gap);
    let startPosition = sectionWidth; // Start at middle section for infinite scroll
    
    // Use requestAnimationFrame to ensure DOM is ready
    let isInitialized = false;
    requestAnimationFrame(() => {
      if (container && !isInitialized) {
        // On mobile, center the first card
        if (isMobile && container.clientWidth > 0) {
          // Calculate position to center first card
          // First card starts at sectionWidth, its center is at sectionWidth + collectionWidth/2
          // To center it: scrollLeft = cardCenter - containerCenter
          const firstCardCenter = sectionWidth + (collectionWidth / 2);
          const containerCenter = container.clientWidth / 2;
          startPosition = firstCardCenter - containerCenter;
        }
        
        container.scrollLeft = startPosition;
        checkScrollPosition();
        // Update scales after initial positioning
        setTimeout(() => updateCardScales(), 100);
        isInitialized = true;
      }
    });

    // Scroll handler - updates button states and card scales
    const handleScroll = () => {
      checkScrollPosition();
      // Use requestAnimationFrame for smooth scale updates during scroll
      requestAnimationFrame(() => {
        updateCardScales();
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Support for horizontal scroll with mousepad/trackpad
    const handleWheel = (e: WheelEvent) => {
      // Only handle if it's clearly horizontal scroll (not vertical)
      // Vertical scroll is handled by handleVerticalScroll
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaY) < 5) {
        e.preventDefault();
        const scrollDelta = e.deltaX;
        
        // Stop any existing momentum
        stopMomentum();
        
        // Apply scroll with momentum effect
        container.scrollLeft += scrollDelta;
        
        // Update scales
        requestAnimationFrame(() => {
          updateCardScales();
        });
      }
      // Handle shift+scroll for explicit horizontal scroll
      else if (e.shiftKey) {
        e.preventDefault();
        const scrollDelta = e.deltaY;
        
        // Stop any existing momentum
        stopMomentum();
        
        // Apply scroll
        container.scrollLeft += scrollDelta;
        
        // Update scales
        requestAnimationFrame(() => {
          updateCardScales();
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    // Also update scales on resize
    const handleResize = () => {
      updateCardScales();
    };
    window.addEventListener('resize', handleResize);

    // Handle vertical scroll to horizontal scroll conversion
    const handleVerticalScroll = (e: WheelEvent) => {
      // Only handle if hovering over carousel and vertical scroll is dominant
      if (isHoveringCarouselRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        e.stopPropagation();
        
        // Stop any existing momentum
        stopMomentum();
        
        // Convert vertical scroll directly to horizontal
        const scrollSpeed = 1.5; // Speed multiplier
        const scrollAmount = e.deltaY * scrollSpeed;
        
        container.scrollLeft += scrollAmount;
        
        // Update scales
        requestAnimationFrame(() => {
          updateCardScales();
        });
      }
    };

    // Add vertical scroll handler to container and parent
    container.addEventListener('wheel', handleVerticalScroll, { passive: false });
    
    // Also listen on parent div for better coverage
    const parentDiv = container.parentElement;
    if (parentDiv) {
      parentDiv.addEventListener('wheel', handleVerticalScroll, { passive: false });
    }

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('wheel', handleVerticalScroll);
      const parentDiv = container.parentElement;
      if (parentDiv) {
        parentDiv.removeEventListener('wheel', handleVerticalScroll);
      }
      window.removeEventListener('resize', handleResize);
      stopMomentum();
    };
  }, [collections.length, collectionWidth, gap, checkScrollPosition, updateCardScales, duplicatedCollections.length, minScale, stopMomentum, isMobile]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    
    // Stop any existing momentum
    stopMomentum();
    
    // Reset drag tracking
    hasDraggedRef.current = false;
    
    setIsDragging(true);
    const container = scrollContainerRef.current;
    const rect = container.getBoundingClientRect();
    setStartX(e.pageX - rect.left);
    setScrollLeft(container.scrollLeft);
    
    // Initialize velocity tracking
    lastXRef.current = e.pageX;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    
    const container = scrollContainerRef.current;
    const currentX = e.pageX;
    const currentTime = performance.now();
    const deltaTime = currentTime - lastTimeRef.current;
    
    // Check if user has dragged beyond threshold
    const rect = container.getBoundingClientRect();
    const x = currentX - rect.left;
    const walk = (x - startX);
    if (Math.abs(walk) > dragThreshold) {
      hasDraggedRef.current = true;
    }
    
    // Calculate velocity (pixels per millisecond, then convert to pixels per frame)
    if (deltaTime > 0 && deltaTime < 100) { // Only track if time delta is reasonable
      const deltaX = currentX - lastXRef.current;
      // Convert to pixels per frame (60fps = ~16.67ms per frame)
      // Multiply by a factor to make momentum more noticeable
      velocityRef.current = (deltaX / deltaTime) * 20;
    }
    
    lastXRef.current = currentX;
    lastTimeRef.current = currentTime;
    
    container.scrollLeft = scrollLeft - walk;
    
    // Update scales during drag for smooth transition
    requestAnimationFrame(() => {
      updateCardScales();
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    
    // Apply momentum scrolling if there's velocity
    if (Math.abs(velocityRef.current) > 0.3) {
      applyMomentum();
    }
  };
  
  const handleCardMouseDown = (e: React.MouseEvent) => {
    // Track initial position for this specific card interaction
    cardDragStartRef.current = {
      x: e.pageX,
      y: e.pageY,
      time: performance.now()
    };
    hasDraggedRef.current = false;
  };
  
  const handleCardMouseMove = (e: React.MouseEvent) => {
    // Only track if mouse is pressed (during drag)
    if (cardDragStartRef.current && isDragging) {
      const deltaX = Math.abs(e.pageX - cardDragStartRef.current.x);
      const deltaY = Math.abs(e.pageY - cardDragStartRef.current.y);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > dragThreshold) {
        hasDraggedRef.current = true;
      }
    }
  };
  
  const handleCardClick = (collection: Collection, e: React.MouseEvent) => {
    // Only open collection if user didn't drag
    if (!hasDraggedRef.current) {
      onCollectionClick(collection);
    }
    // Reset tracking
    cardDragStartRef.current = null;
    hasDraggedRef.current = false;
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Touch events for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!scrollContainerRef.current) return;
    
    // Stop any existing momentum
    stopMomentum();
    
    // Reset drag tracking
    hasDraggedRef.current = false;
    
    setIsDragging(true);
    const container = scrollContainerRef.current;
    const rect = container.getBoundingClientRect();
    const touchX = e.touches[0].pageX;
    setStartX(touchX - rect.left);
    setScrollLeft(container.scrollLeft);
    
    // Initialize velocity tracking
    lastXRef.current = touchX;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const currentX = e.touches[0].pageX;
    const currentTime = performance.now();
    const deltaTime = currentTime - lastTimeRef.current;
    
    // Check if user has dragged beyond threshold
    const rect = container.getBoundingClientRect();
    const x = currentX - rect.left;
    const walk = (x - startX);
    if (Math.abs(walk) > dragThreshold) {
      hasDraggedRef.current = true;
    }
    
    // Calculate velocity (pixels per millisecond, then convert to pixels per frame)
    if (deltaTime > 0 && deltaTime < 100) { // Only track if time delta is reasonable
      const deltaX = currentX - lastXRef.current;
      // Convert to pixels per frame (60fps = ~16.67ms per frame)
      // Multiply by a factor to make momentum more noticeable
      velocityRef.current = (deltaX / deltaTime) * 20;
    }
    
    lastXRef.current = currentX;
    lastTimeRef.current = currentTime;
    
    container.scrollLeft = scrollLeft - walk;
    
    // Update scales during touch drag for smooth transition
    requestAnimationFrame(() => {
      updateCardScales();
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    // Apply momentum scrolling if there's velocity
    if (Math.abs(velocityRef.current) > 0.3) {
      applyMomentum();
    }
  };
  
  const handleCardTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      cardDragStartRef.current = {
        x: e.touches[0].pageX,
        y: e.touches[0].pageY,
        time: performance.now()
      };
      hasDraggedRef.current = false;
    }
  };
  
  const handleCardTouchMove = (e: React.TouchEvent) => {
    // Only track if touch is active (during drag)
    if (cardDragStartRef.current && e.touches.length > 0 && isDragging) {
      const deltaX = Math.abs(e.touches[0].pageX - cardDragStartRef.current.x);
      const deltaY = Math.abs(e.touches[0].pageY - cardDragStartRef.current.y);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > dragThreshold) {
        hasDraggedRef.current = true;
      }
    }
  };
  
  const handleCardTouchEnd = (collection: Collection, e: React.TouchEvent) => {
    // Only open collection if user didn't drag
    if (!hasDraggedRef.current) {
      onCollectionClick(collection);
    }
    // Reset tracking
    cardDragStartRef.current = null;
    hasDraggedRef.current = false;
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollAmount = collectionWidth + gap;
    const sectionWidth = collections.length * (collectionWidth + gap);
    
    let targetScroll = direction === 'left' 
      ? container.scrollLeft - scrollAmount
      : container.scrollLeft + scrollAmount;
    
    // Apply infinite scroll logic only when using arrows
    // If we go past the end, wrap to middle section
    if (targetScroll >= sectionWidth * 2 - container.clientWidth) {
      targetScroll = sectionWidth + (targetScroll - sectionWidth * 2);
    }
    // If we go before the start, wrap to middle section
    else if (targetScroll < 0) {
      targetScroll = sectionWidth + targetScroll;
    }
    
    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  };

  if (collections.length === 0) {
    return null;
  }

  // Calculate extra padding needed for scale (maxScale is 1.12, so 12% extra space needed)
  const scalePadding = collectionWidth * (maxScale - 1) / 2;
  
  // Mobile-specific spacing adjustments
  const containerPaddingTop = isMobile ? 10 : 30;
  const containerPaddingBottom = isMobile ? 10 : 30;
  const containerMarginTop = isMobile ? 0 : 10;
  const innerPaddingTop = isMobile ? 5 : 15;
  const innerPaddingBottom = isMobile ? 5 : 15;
  
  return (
    <div 
      className="relative -mx-6 md:-mx-8 px-6 md:px-8"
      style={{
        paddingTop: `${containerPaddingTop + scalePadding}px`,
        paddingBottom: `${containerPaddingBottom + scalePadding}px`,
        overflow: 'visible',
        marginTop: `${containerMarginTop}px`,
      }}
      onMouseEnter={() => { isHoveringCarouselRef.current = true; }}
      onMouseLeave={() => { 
        isHoveringCarouselRef.current = false; 
        verticalScrollAccumulatorRef.current = 0;
      }}
    >
      {/* Carousel Container */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto no-scrollbar"
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          gap: `${gap}px`,
          paddingTop: `${innerPaddingTop + scalePadding}px`,
          paddingBottom: `${innerPaddingBottom + scalePadding}px`,
          overflowY: 'visible',
          minHeight: '100%',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {duplicatedCollections.map((collection, index) => {
          const scale = cardScales[index] || minScale;
          const opacity = cardOpacities[index] !== undefined ? cardOpacities[index] : 1.0;
          return (
          <div
            key={`${collection.id}-${index}`}
            ref={(el) => {
              cardRefs.current[index] = el;
            }}
            onMouseDown={handleCardMouseDown}
            onMouseMove={handleCardMouseMove}
            onClick={(e) => handleCardClick(collection, e)}
            onTouchStart={handleCardTouchStart}
            onTouchMove={handleCardTouchMove}
            onTouchEnd={(e) => handleCardTouchEnd(collection, e)}
            className="flex-shrink-0 cursor-pointer transition-all duration-500 ease-out"
            style={{ 
              width: `${collectionWidth}px`,
              transform: `scale(${scale})`,
              transformOrigin: isMobile ? 'center center' : 'left center',
              opacity: opacity,
              paddingTop: `${scalePadding}px`,
              paddingBottom: `${scalePadding}px`,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div 
              className="aspect-square rounded-lg overflow-hidden relative group shadow-md shadow-gray-100"
              style={{ 
                overflow: 'hidden',
                position: 'relative',
                width: '100%',
                flexShrink: 0,
                marginBottom: isMobile ? '8px' : '12px',
              }}
            >
              <img 
                src={collection.cover_image} 
                alt={collection.title} 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 bg-gray-200" 
                style={{ 
                  objectPosition: 'center center',
                  display: 'block',
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              {collection.level && collection.level.trim() !== '' && (
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-white/95 backdrop-blur-sm rounded-lg text-[10px] font-bold text-kaboo-primary shadow-sm border border-white/50">
                  {collection.level.replace('Fundamental ', 'Fund. ')}
                </div>
              )}
            </div>
            
            <h3 className="font-bold text-gray-800 leading-tight mb-1 line-clamp-2" style={{ fontSize: isMobile ? '12px' : '14px' }}>
              {collection.title}
            </h3>

            {collection.theme && collection.theme.trim() !== '' && (
              <p className="text-gray-500 line-clamp-1 mb-2 font-medium" style={{ fontSize: isMobile ? '10px' : '12px' }}>
                {collection.theme}
              </p>
            )}

            {collection.progress !== undefined && collection.progress !== null && collection.progress > 0 && (
              <div className="font-bold text-kaboo-light flex items-center gap-1 mt-1" style={{ fontSize: isMobile ? '10px' : '12px' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-kaboo-light" />
                Em andamento
              </div>
            )}
          </div>
          );
        })}
      </div>

      {/* Navigation Arrows */}
      <div className="flex justify-center items-center gap-4" style={{ marginTop: isMobile ? '8px' : '24px' }}>
        <button
          onClick={() => scroll('left')}
          disabled={isAtStart}
          className={`rounded-full flex items-center justify-center transition-all ${
            isAtStart
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
              : 'bg-white text-kaboo-primary shadow-md hover:bg-kaboo-primary hover:text-white border border-gray-200'
          }`}
          style={{ width: isMobile ? '36px' : '40px', height: isMobile ? '36px' : '40px' }}
          aria-label="Anterior"
        >
          <Icons.ChevronLeft size={isMobile ? 18 : 20} />
        </button>
        <button
          onClick={() => scroll('right')}
          disabled={!canScrollRight}
          className={`rounded-full flex items-center justify-center transition-all ${
            !canScrollRight
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
              : 'bg-white text-kaboo-primary shadow-md hover:bg-kaboo-primary hover:text-white border border-gray-200'
          }`}
          style={{ width: isMobile ? '36px' : '40px', height: isMobile ? '36px' : '40px' }}
          aria-label="Próximo"
        >
          <Icons.ChevronLeft size={isMobile ? 18 : 20} className="rotate-180" />
        </button>
      </div>
    </div>
  );
};
