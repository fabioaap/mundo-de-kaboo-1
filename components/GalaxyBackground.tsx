import React, { useState, useRef, useEffect } from 'react';
import useIsMobile from '../hooks/useIsMobile';

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkle: number;
}

interface GalaxyBackgroundProps {
  className?: string;
  density?: number;
}

export const GalaxyBackground: React.FC<GalaxyBackgroundProps> = ({
  className = '',
  density = 1.3,
}) => {
  const [stars, setStars] = useState<Star[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const galaxyRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const rotationRef = useRef(0);
  const isMobile = useIsMobile();

  // Initialize galaxy stars
  useEffect(() => {
    const starCount = Math.floor((window.innerWidth * window.innerHeight) / 10000 * density);
    const newStars: Star[] = [];
    
    for (let i = 0; i < starCount; i++) {
      newStars.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1.5,
        opacity: Math.random() * 0.8 + 0.2,
        twinkle: Math.random() * Math.PI * 2,
      });
    }
    
    setStars(newStars);
  }, [density]);

  // Galaxy animation loop
  useEffect(() => {
    const animate = () => {
      const rotationSpeed = 0.1;
      
      rotationRef.current += rotationSpeed;
      timeRef.current += 0.01;
      
      // Update rotation directly on DOM element
      if (galaxyRef.current) {
        galaxyRef.current.style.transform = `rotate(${rotationRef.current}deg)`;
      }
      
      setStars(prev => prev.map(star => ({
        ...star,
        twinkle: star.twinkle + 0.02,
      })));
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Mouse position tracking for repulsion effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!galaxyRef.current || isMobile) return;
    
    // Update mouse position for galaxy repulsion effect
    const galaxyRect = galaxyRef.current.getBoundingClientRect();
    const galaxyX = ((e.clientX - galaxyRect.left) / galaxyRect.width) * 100;
    const galaxyY = ((e.clientY - galaxyRect.top) / galaxyRect.height) * 100;
    setMousePos({ x: galaxyX, y: galaxyY });
  };

  return (
    <div 
      ref={galaxyRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{
        transformOrigin: 'center center',
        zIndex: 1,
      }}
      onMouseMove={handleMouseMove}
    >
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
      {stars.map((star, index) => {
        // Calculate distance from mouse for repulsion effect
        const dx = star.x - mousePos.x;
        const dy = star.y - mousePos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const repulsionStrength = 2;
        const repulsionRadius = 20;
        
        let offsetX = 0;
        let offsetY = 0;
        
        if (distance < repulsionRadius && !isMobile) {
          const force = (1 - distance / repulsionRadius) * repulsionStrength;
          offsetX = (dx / distance) * force;
          offsetY = (dy / distance) * force;
        }
        
        // Twinkle effect
        const twinkleOpacity = star.opacity * (0.5 + 0.5 * Math.sin(star.twinkle));
        
        return (
          <div
            key={index}
            className="absolute rounded-full bg-white"
            style={{
              left: `calc(${star.x}% + ${offsetX}px)`,
              top: `calc(${star.y}% + ${offsetY}px)`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: twinkleOpacity * 0.3,
              boxShadow: `0 0 ${star.size * 3}px ${star.size}px rgba(255, 255, 255, ${twinkleOpacity * 0.6})`,
              transform: `translate(-50%, -50%)`,
              transition: 'opacity 0.1s ease-out, box-shadow 0.1s ease-out',
            }}
          />
        );
      })}
    </div>
  );
};
