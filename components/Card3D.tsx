import React, { useState, useRef, useEffect } from 'react';
import { Collection } from '../types';
import useIsMobile from '../hooks/useIsMobile';

interface Card3DProps {
  collection: Collection & { progress?: number };
  onCollectionClick: (collection: Collection) => void;
}

export const Card3D: React.FC<Card3DProps> = ({ collection, onCollectionClick }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Gyroscope effect for mobile
  useEffect(() => {
    if (!isMobile) return;

    const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return;
      
      // Convert device orientation to card tilt
      // beta: -180 to 180 (front-back tilt, 0 = flat)
      // gamma: -90 to 90 (left-right tilt, 0 = centered)
      // Normalize and apply subtle rotation (max 12 degrees for mobile)
      // Clamp beta to -90 to 90 range for more natural feel
      const normalizedBeta = Math.max(-90, Math.min(90, e.beta));
      const normalizedGamma = Math.max(-90, Math.min(90, e.gamma));
      
      const rotateX = (normalizedBeta / 90) * -12; // Invert for natural feel
      const rotateY = (normalizedGamma / 90) * 12;
      
      setTilt({ 
        x: Math.max(-12, Math.min(12, rotateX)), 
        y: Math.max(-12, Math.min(12, rotateY)) 
      });
    };

    // Request permission for iOS 13+
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      (DeviceOrientationEvent as any).requestPermission()
        .then((response: string) => {
          if (response === 'granted') {
            window.addEventListener('deviceorientation', handleDeviceOrientation);
          }
        })
        .catch(() => {
          // Permission denied or not available - silent fail
        });
    } else {
      // For Android and older iOS
      window.addEventListener('deviceorientation', handleDeviceOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
    };
  }, [isMobile]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only use mouse movement on desktop
    if (isMobile || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    
    // Normalize to -1 to 1 range and apply subtle rotation (max 8 degrees)
    const rotateX = (mouseY / (rect.height / 2)) * -8; // Max 8 degrees for subtlety
    const rotateY = (mouseX / (rect.width / 2)) * 8; // Max 8 degrees for subtlety
    
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    // Only reset on desktop
    if (!isMobile) {
      setTilt({ x: 0, y: 0 });
    }
  };

  return (
    <div 
      key={collection.id}
      onClick={() => onCollectionClick(collection)}
      className="cursor-pointer active:scale-95 transition-transform"
    >
      <div 
        ref={cardRef}
        className="aspect-square mb-3 rounded-lg overflow-hidden relative group shadow-md shadow-gray-100"
        style={{ 
          WebkitMaskImage: '-webkit-radial-gradient(white, black)',
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1, 1, 1)`,
          transformStyle: 'preserve-3d',
          transition: isMobile 
            ? 'transform 0.15s ease-out' 
            : (tilt.x === 0 && tilt.y === 0 ? 'transform 0.5s ease-out' : 'transform 0.1s ease-out'),
        }}
        onMouseMove={!isMobile ? handleMouseMove : undefined}
        onMouseLeave={!isMobile ? handleMouseLeave : undefined}
      >
        <img 
          src={collection.cover_image} 
          alt={collection.title} 
          className="w-full h-full object-cover bg-gray-200" 
          style={{
            transform: 'translateZ(20px)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {collection.level && (
          <div 
            className="absolute bottom-2 right-2 px-2 py-1 bg-white/95 backdrop-blur-sm rounded-lg text-[10px] font-bold text-kaboo-primary shadow-sm border border-white/50"
            style={{
              transform: 'translateZ(30px)',
            }}
          >
            {collection.level.replace('Fundamental ', 'Fund. ')}
          </div>
        )}
      </div>
      
      {collection.title && (
        <h3 className="font-bold text-gray-800 text-sm leading-tight mb-1 line-clamp-2">
          {collection.title}
        </h3>
      )}

      {collection.theme && collection.theme.trim() !== '' && (
        <p className="text-xs text-gray-500 line-clamp-1 mb-2 font-medium">
          {collection.theme}
        </p>
      )}

      {collection.progress !== undefined && collection.progress > 0 && (
        <div className="text-xs font-bold text-kaboo-light flex items-center gap-1 mt-1">
          <div className="w-1.5 h-1.5 rounded-full bg-kaboo-light" />
          Em andamento
        </div>
      )}
    </div>
  );
};
