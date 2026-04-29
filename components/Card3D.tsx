import React, { useState, useRef, useEffect } from 'react';
import { Collection } from '../types';
import { Icons } from './Icons';
import useIsMobile from '../hooks/useIsMobile';
import { formatSegmentLabel } from '../constants';
import { getCollectionDisplayCover, getCollectionTypeMeta } from '../lib/collectionPresentation';

interface Card3DProps {
  collection: Collection & { progress?: number };
  onCollectionClick: (collection: Collection) => void;
  locked?: boolean;
  tone?: 'default' | 'central-coruja';
}

// Global state for device orientation (shared across all cards)
let globalOrientation: { beta: number; gamma: number } | null = null;
let orientationListeners: Set<(orientation: { beta: number; gamma: number }) => void> = new Set();
let isOrientationListenerActive = false;
let orientationHandler: ((e: DeviceOrientationEvent) => void) | null = null;

const setupGlobalOrientationListener = () => {
  if (isOrientationListenerActive || orientationHandler) return;

  orientationHandler = (e: DeviceOrientationEvent) => {
    if (e.beta === null || e.gamma === null) return;

    globalOrientation = { beta: e.beta, gamma: e.gamma };

    // Notify all listeners
    orientationListeners.forEach(listener => {
      listener(globalOrientation!);
    });
  };

  // For Android and older iOS (no permission needed)
  if (typeof DeviceOrientationEvent !== 'undefined') {
    window.addEventListener('deviceorientation', orientationHandler, { passive: true });
    isOrientationListenerActive = true;
    console.log('Device orientation listener activated');
  }
};

const requestIOSPermission = async (): Promise<boolean> => {
  if (typeof DeviceOrientationEvent === 'undefined') {
    console.log('DeviceOrientationEvent not available');
    return false;
  }

  if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
    try {
      console.log('Requesting device orientation permission...');
      const response = await (DeviceOrientationEvent as any).requestPermission();
      console.log('Permission response:', response);
      if (response === 'granted') {
        setupGlobalOrientationListener();
        return true;
      }
      return false;
    } catch (error) {
      console.log('Device orientation permission error:', error);
      return false;
    }
  } else {
    // No permission needed, setup directly
    setupGlobalOrientationListener();
    return true;
  }
};

export const Card3D: React.FC<Card3DProps> = ({ collection, onCollectionClick, locked, tone = 'default' }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const displayCoverImage = getCollectionDisplayCover(collection) || collection.cover_image;
  const collectionTypeMeta = getCollectionTypeMeta(collection);
  const isCentralCorujaTone = tone === 'central-coruja';
  const progress = collection.progress ?? 0;
  const coverBadgeLabel = collection.level
    ? formatSegmentLabel(collection.level)
    : collection.segments?.[0]
      ? formatSegmentLabel(collection.segments[0])
      : collectionTypeMeta.shortLabel;

  // Gyroscope effect for mobile
  useEffect(() => {
    if (!isMobile) return;

    const handleOrientationUpdate = (orientation: { beta: number; gamma: number }) => {
      // Convert device orientation to card tilt
      // beta: -180 to 180 (front-back tilt, 0 = flat)
      // gamma: -90 to 90 (left-right tilt, 0 = centered)
      // Increased rotation for more visible effect (max 25 degrees for mobile)
      const normalizedBeta = Math.max(-90, Math.min(90, orientation.beta));
      const normalizedGamma = Math.max(-90, Math.min(90, orientation.gamma));

      // More pronounced rotation for better visibility
      const rotateX = (normalizedBeta / 90) * -25; // Invert for natural feel, increased from 12 to 25
      const rotateY = (normalizedGamma / 90) * 25; // Increased from 12 to 25

      setTilt({
        x: Math.max(-25, Math.min(25, rotateX)),
        y: Math.max(-25, Math.min(25, rotateY))
      });
    };

    // Register this card's listener
    orientationListeners.add(handleOrientationUpdate);

    // Try to setup listener (works for Android immediately)
    setupGlobalOrientationListener();

    // If we already have orientation data, use it immediately
    if (globalOrientation) {
      handleOrientationUpdate(globalOrientation);
    }

    // Request permission on user interaction (iOS requires this)
    const requestPermissionOnInteraction = async (e: Event) => {
      // Don't stop propagation - let the click event bubble to the parent onClick
      // Only request permission if not already active
      if (!isOrientationListenerActive) {
        console.log('User interaction detected, requesting permission...');
        // Use setTimeout to avoid blocking the click event
        setTimeout(async () => {
          await requestIOSPermission();
        }, 0);
      }
    };

    // Add interaction listeners to request permission
    const cardElement = cardRef.current;
    if (cardElement) {
      // Use capture phase but don't stop propagation - let click work normally
      // Use passive: true to avoid blocking touch events
      cardElement.addEventListener('touchstart', requestPermissionOnInteraction, { once: true, passive: true, capture: false });
      // Don't add click listener - it interferes with the parent onClick
      // Permission will be requested on touchstart which is sufficient
    }

    return () => {
      orientationListeners.delete(handleOrientationUpdate);
      if (cardElement) {
        cardElement.removeEventListener('touchstart', requestPermissionOnInteraction);
      }
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
      className="cursor-pointer active:scale-95 transition-transform touch-manipulation flex h-full flex-col w-full"
      style={{
        touchAction: 'manipulation',
      }}
    >
      <div
        ref={cardRef}
        className={`overflow-hidden relative group w-full ${isCentralCorujaTone
          ? 'mb-3 rounded-[28px] bg-transparent shadow-none'
          : 'mb-3 rounded-lg shadow-md shadow-gray-100'}`}
        style={{
          WebkitMaskImage: '-webkit-radial-gradient(white, black)',
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1, 1, 1)`,
          transformStyle: 'preserve-3d',
          transition: isMobile
            ? 'transform 0.1s ease-out'
            : (tilt.x === 0 && tilt.y === 0 ? 'transform 0.5s ease-out' : 'transform 0.1s ease-out'),
          touchAction: 'manipulation',
          aspectRatio: isCentralCorujaTone ? '0.78 / 1' : '1 / 1',
          width: '100%',
          height: 'auto',
        }}
        onMouseMove={!isMobile ? handleMouseMove : undefined}
        onMouseLeave={!isMobile ? handleMouseLeave : undefined}
      >
        {isCentralCorujaTone && (
          <>
            <div className="absolute inset-0 rounded-[28px] bg-[radial-gradient(60%_40%_at_14%_100%,rgba(110,52,143,0.24),transparent_70%),radial-gradient(46%_28%_at_100%_0%,rgba(253,186,116,0.26),transparent_72%)]" />
            <div
              className="absolute inset-[5px] overflow-hidden rounded-[24px] border-[2.5px] border-[#f0c861]/90 bg-[#17334a] shadow-[0_24px_44px_rgba(3,10,22,0.34)]"
              style={{ transform: 'translateZ(16px)' }}
            >
              <img
                src={displayCoverImage}
                alt={collection.title}
                className="h-full w-full object-cover bg-[#0f2435]"
                style={{
                  transform: 'translateZ(20px)',
                }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,245,214,0.03)_0%,rgba(19,35,52,0.02)_45%,rgba(7,12,24,0.30)_100%)]" />
            </div>
          </>
        )}
        {!isCentralCorujaTone && (
          <img
            src={displayCoverImage}
            alt={collection.title}
            className="w-full h-full object-cover bg-gray-200"
            style={{
              transform: 'translateZ(20px)',
            }}
          />
        )}
        <div
          className={`absolute border backdrop-blur-sm ${isCentralCorujaTone
            ? 'left-3 top-3 max-w-[calc(100%-4rem)] truncate rounded-full border-[#d0c08d]/60 bg-[#4d3567]/92 px-3 py-1.5 text-[10px] text-[#fff0bc] shadow-[0_12px_22px_rgba(19,8,35,0.34)]'
            : `top-2 left-2 whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] ${collectionTypeMeta.coverClassName}`
            } font-black uppercase tracking-[0.14em]`}
          style={{ transform: 'translateZ(30px)' }}
        >
          {isCentralCorujaTone ? coverBadgeLabel : collectionTypeMeta.shortLabel}
        </div>

        {isCentralCorujaTone && (locked || progress > 0 || collectionTypeMeta.type === 'kit') && (
          <div
            className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border shadow-[0_12px_22px_rgba(14,9,34,0.28)] ${locked ? 'border-[#ecd495]/80 bg-[#1d2037]/92 text-[#ffeab8]' : 'border-[#f2d87b]/90 bg-[#ffcf4d] text-[#62331a]'}`}
            style={{ transform: 'translateZ(34px)' }}
          >
            {locked ? <Icons.Lock size={16} /> : progress > 0 ? <Icons.Check size={18} className="stroke-[3px]" /> : <span className="text-xl leading-none">★</span>}
          </div>
        )}
        {/* Light reflection effect - moves based on tilt */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(${135 + (tilt.y * 2)
              }deg, 
              transparent 0%, 
              rgba(255, 255, 255, 0.3) ${50 + (tilt.x * 0.5) + (tilt.y * 0.5)}%, 
              transparent 100%
            )`,
            transform: `translateZ(25px) translateX(${tilt.y * 2}px) translateY(${tilt.x * 2}px)`,
            transition: 'background 0.1s ease-out, transform 0.1s ease-out',
            mixBlendMode: 'overlay',
          }}
        />
        {/* Secondary light reflection for more realism */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at ${50 + (tilt.y * 1.5)}% ${50 + (tilt.x * 1.5)}%, 
              rgba(255, 255, 255, 0.4) 0%, 
              transparent 60%
            )`,
            transform: 'translateZ(30px)',
            transition: 'background 0.1s ease-out',
            mixBlendMode: 'soft-light',
          }}
        />
        <div className={`absolute inset-0 transition-opacity ${isCentralCorujaTone
          ? 'bg-gradient-to-t from-[#0f2335]/0 via-transparent to-white/10 opacity-100'
          : 'bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100'}`} />

        {isCentralCorujaTone && progress > 0 && (
          <div
            className="absolute inset-x-0 bottom-0 z-10 p-3"
            style={{ transform: 'translateZ(32px)' }}
          >
            <div className="rounded-full border border-[#d2c18f]/55 bg-[#20162a]/80 px-3 py-2 shadow-[0_18px_30px_rgba(7,19,30,0.24)] backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/12">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,#f2bf43_0%,#f6d96f_45%,#62b05c_100%)]" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-[10px] font-black tracking-[0.08em] text-[#fff1bf]">{progress}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Lock overlay for content-gated collections */}
        {locked && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center" style={{ transform: 'translateZ(35px)' }}>
            {!isCentralCorujaTone && (
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/90 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-600">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            )}
          </div>
        )}

        {!isCentralCorujaTone && (() => {
          const segments = collection.segments;
          if (segments && segments.length > 1) {
            const visible = segments.slice(0, 2);
            const extra = segments.length - 2;
            return (
              <div className="absolute bottom-2 right-2 flex gap-1" style={{ transform: 'translateZ(30px)' }}>
                {visible.map((seg) => (
                  <span key={seg} className={`px-2 py-1 backdrop-blur-sm rounded-full text-[10px] font-bold shadow-sm border ${isCentralCorujaTone
                    ? 'bg-[#fff9eb]/95 text-[#204b48] border-[#fff3d1]'
                    : 'bg-white/95 text-kaboo-primary border-white/50'}`}>
                    {formatSegmentLabel(seg)}
                  </span>
                ))}
                {extra > 0 && (
                  <span className={`px-2 py-1 backdrop-blur-sm rounded-full text-[10px] font-bold shadow-sm border ${isCentralCorujaTone
                    ? 'bg-[#fff9eb]/95 text-[#204b48] border-[#fff3d1]'
                    : 'bg-white/95 text-kaboo-primary border-white/50'}`}>
                    +{extra}
                  </span>
                )}
              </div>
            );
          }
          const label = collection.level;
          if (!label) return null;
          return (
            <div
              className={`absolute bottom-2 right-2 px-2 py-1 backdrop-blur-sm rounded-full text-[10px] font-bold shadow-sm border ${isCentralCorujaTone
                ? 'bg-[#fff9eb]/95 text-[#204b48] border-[#fff3d1]'
                : 'bg-white/95 text-kaboo-primary border-white/50'}`}
              style={{ transform: 'translateZ(30px)' }}
            >
              {formatSegmentLabel(label)}
            </div>
          );
        })()}
      </div>

      {!isCentralCorujaTone && collection.title && (
        <h3 className="font-bold text-gray-800 text-sm leading-tight mb-1 line-clamp-2">
          {collection.title}
        </h3>
      )}

      {!isCentralCorujaTone && collection.theme && collection.theme.trim() !== '' && (
        <p className="text-xs text-gray-500 line-clamp-1 mb-2 font-medium">
          {collection.theme}
        </p>
      )}

      {isCentralCorujaTone && collection.title && (
        <h3 className="mb-1 text-[0.95rem] font-black leading-tight text-[#fff3bf] line-clamp-2">
          {collection.title}
        </h3>
      )}

      {isCentralCorujaTone && collection.theme && collection.theme.trim() !== '' && (
        <p className="mb-1 text-xs font-medium leading-relaxed text-[#c7d5cf] line-clamp-2">
          {collection.theme}
        </p>
      )}

      {!isCentralCorujaTone && collection.progress !== undefined && collection.progress > 0 && (
        <div className="mt-1 flex items-center gap-1 text-xs font-bold text-kaboo-light">
          <div className="h-1.5 w-1.5 rounded-full bg-kaboo-light" />
          Em andamento
        </div>
      )}
    </div>
  );
};
