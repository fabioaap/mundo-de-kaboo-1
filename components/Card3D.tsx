import React, { useEffect, useRef, useState } from 'react';
import { Collection } from '../types';
import { Icons } from './Icons';
import useIsMobile from '../hooks/useIsMobile';
import { formatSegmentLabel } from '../constants';
import {
  getCollectionDisplayCover,
  getCollectionFormatKinds,
} from '../lib/collectionPresentation';

interface Card3DProps {
  collection: Collection & { progress?: number };
  onCollectionClick: (collection: Collection) => void;
  locked?: boolean;
  tone?: 'default' | 'central-coruja';
  subtitleFallback?: string;
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

const DEFAULT_COLLECTION_THEME = '#5D1F58';

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    }
    : {
      r: 93,
      g: 31,
      b: 88,
    };
};

const toRgba = (hex: string, alpha: number) => {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

export const Card3D: React.FC<Card3DProps> = ({ collection, onCollectionClick, locked, tone = 'default', subtitleFallback }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const displayCoverImage = getCollectionDisplayCover(collection) || collection.cover_image;
  const isCentralCorujaTone = tone === 'central-coruja';
  const progress = collection.progress ?? 0;
  const themeColor = collection.color_theme?.trim() || DEFAULT_COLLECTION_THEME;
  const collectionHeroCover = displayCoverImage || collection.cover_image?.trim() || '';
  const formatKinds = getCollectionFormatKinds(collection);
  const bookSummary = collection.synopsis?.trim()
    || collection.learning_objectives?.trim()
    || (collection.description as string | undefined)?.trim()
    || collection.theme?.trim()
    || subtitleFallback;

  // Primary hover icon: a kit/collection is always a bundle, so its identity
  // wins over any single media asset it may carry (kit check FIRST). Otherwise
  // headphones if pure audio, video if pure video, BookOpen for books.
  const HoverIcon = collection.collection_type === 'kit'
    ? Icons.Library
    : formatKinds.length === 1 && formatKinds[0] === 'audio'
    ? Icons.Headphones
    : formatKinds.length === 1 && formatKinds[0] === 'video'
    ? Icons.Video
    : Icons.BookOpen;

  const isActive = tilt.x !== 0 || tilt.y !== 0;

  // Gyroscope effect for mobile
  useEffect(() => {
    if (!isMobile) return;

    const handleOrientationUpdate = (orientation: { beta: number; gamma: number }) => {
      const normalizedBeta = Math.max(-90, Math.min(90, orientation.beta));
      const normalizedGamma = Math.max(-90, Math.min(90, orientation.gamma));
      const rotateX = (normalizedBeta / 90) * -25;
      const rotateY = (normalizedGamma / 90) * 25;
      setTilt({
        x: Math.max(-25, Math.min(25, rotateX)),
        y: Math.max(-25, Math.min(25, rotateY))
      });
    };

    orientationListeners.add(handleOrientationUpdate);
    setupGlobalOrientationListener();

    if (globalOrientation) {
      handleOrientationUpdate(globalOrientation);
    }

    const requestPermissionOnInteraction = async () => {
      if (!isOrientationListenerActive) {
        setTimeout(async () => {
          await requestIOSPermission();
        }, 0);
      }
    };

    const cardElement = cardRef.current;
    if (cardElement) {
      cardElement.addEventListener('touchstart', requestPermissionOnInteraction, { once: true, passive: true, capture: false });
    }

    return () => {
      orientationListeners.delete(handleOrientationUpdate);
      if (cardElement) {
        cardElement.removeEventListener('touchstart', requestPermissionOnInteraction);
      }
    };
  }, [isMobile]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    const rotateX = (mouseY / (rect.height / 2)) * -8;
    const rotateY = (mouseX / (rect.width / 2)) * 8;
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setTilt({ x: 0, y: 0 });
    }
  };

  return (
    <div
      onClick={() => onCollectionClick(collection)}
      className="group cursor-pointer touch-manipulation flex flex-col w-full"
      style={{
        touchAction: 'pan-y',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* ══ CENTRAL CORUJA: moldura própria + tilt no mesmo elemento ══ */}
      {isCentralCorujaTone && (
        <div
          ref={cardRef}
          className="relative overflow-hidden w-full rounded-[28px] bg-transparent"
          style={{
            ...(isActive && { WebkitMaskImage: '-webkit-radial-gradient(white, black)' }),
            transform: isActive
              ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1, 1, 1)`
              : undefined,
            transformStyle: isActive ? 'preserve-3d' : 'flat',
            transition: isMobile
              ? 'transform 0.1s ease-out'
              : (isActive ? 'transform 0.1s ease-out' : 'transform 0.35s ease-out'),
            touchAction: 'manipulation',
            // Capa quadrada (1:1) para o card Coruja manter o mesmo footprint do card
            // padrão — o tema escuro muda a cor, não o tamanho do grid.
            aspectRatio: '1 / 1',
            width: '100%',
            height: 'auto',
          }}
          onMouseMove={!isMobile ? handleMouseMove : undefined}
          onMouseLeave={!isMobile ? handleMouseLeave : undefined}
        >
          <div className="absolute inset-0 rounded-[28px] bg-[radial-gradient(60%_40%_at_14%_100%,rgba(93,30,118,0.26),transparent_70%),radial-gradient(46%_28%_at_100%_0%,rgba(234,154,59,0.28),transparent_72%)]" />
          <div
            className="absolute inset-[5px] overflow-hidden rounded-[24px] border-[2.5px] border-brand-accent/90 bg-brand-primary shadow-[0_24px_44px_rgba(3,10,22,0.34)]"
            style={{ transform: 'translateZ(16px)' }}
          >
            <img
              src={displayCoverImage}
              alt={collection.title}
              className="h-full w-full object-cover bg-[#091525]"
              loading="lazy"
              decoding="async"
              style={{ transform: 'translateZ(20px)' }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,245,214,0.03)_0%,rgba(19,35,52,0.02)_45%,rgba(7,12,24,0.30)_100%)]" />
          </div>
          {progress > 0 && (
            <div className="absolute inset-x-0 bottom-0 z-10 p-3" style={{ transform: 'translateZ(32px)' }}>
              <div className="rounded-full border border-[#d2c18f]/55 bg-[#20162a]/92 px-3 py-2 shadow-[0_18px_30px_rgba(7,19,30,0.24)]">
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/12">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#f2bf43_0%,#f6d96f_45%,#62b05c_100%)]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-black tracking-[0.08em] text-[#fff1bf]">{progress}%</span>
                </div>
              </div>
            </div>
          )}
          {/* Light reflection */}
          {isActive && (
            <>
              <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(${135 + tilt.y * 2}deg, transparent 0%, rgba(255,255,255,0.3) ${50 + tilt.x * 0.5 + tilt.y * 0.5}%, transparent 100%)`, transform: `translateZ(25px) translateX(${tilt.y * 2}px) translateY(${tilt.x * 2}px)`, mixBlendMode: 'overlay' }} />
              <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at ${50 + tilt.y * 1.5}% ${50 + tilt.x * 1.5}%, rgba(255,255,255,0.4) 0%, transparent 60%)`, transform: 'translateZ(30px)', mixBlendMode: 'soft-light' }} />
            </>
          )}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#0f2335]/0 via-transparent to-white/10" />
        </div>
      )}

      {/* ══ PADRÃO: moldura branca contém image square + texto ══ */}
      {!isCentralCorujaTone && (
        <div
          ref={cardRef}
          className="rounded-[16px] border border-brand-primary/10 bg-white p-2 shadow-[0_10px_24px_rgba(93,31,88,0.05)] transition-[border-color,box-shadow] duration-200 md:hover:-translate-y-1 hover:border-brand-primary/20 hover:shadow-[0_14px_24px_rgba(93,31,88,0.10)] active:scale-[0.995]"
          onMouseMove={!isMobile ? handleMouseMove : undefined}
          onMouseLeave={!isMobile ? handleMouseLeave : undefined}
        >
          {/* Image square — recebe o tilt 3D */}
          <div
            className={`relative overflow-hidden rounded-[10px] border border-brand-primary/10 aspect-square ${collectionHeroCover ? 'bg-slate-100' : 'bg-[linear-gradient(180deg,#fdf9fe,#f6eff8)]'}`}
            style={{
              ...(isActive && { WebkitMaskImage: '-webkit-radial-gradient(white, black)' }),
              transform: isActive
                ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
                : undefined,
              transformStyle: isActive ? 'preserve-3d' : 'flat',
              transition: isMobile
                ? 'transform 0.1s ease-out'
                : (isActive ? 'transform 0.1s ease-out' : 'transform 0.35s ease-out'),
            }}
          >
            {/* Cover image ou gradiente */}
            {collectionHeroCover ? (
              <img
                src={collectionHeroCover}
                alt={collection.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(93,31,88,0.22),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(78,168,222,0.12),transparent_50%),linear-gradient(180deg,#fcf8fd,#f2ebf6)]" />
            )}

            {/* Hover tint */}
            <div className="absolute inset-0 bg-brand-primary/0 transition-colors duration-200 group-hover:bg-brand-primary/10" />

            {/* Hover icon — bottom-right, sobe no hover */}
            {!locked && (
              <span className="pointer-events-none absolute bottom-3 right-3 z-[2] inline-flex items-center justify-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary text-white opacity-0 translate-y-2 shadow-[0_14px_26px_rgba(93,31,88,0.28)] transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                  <HoverIcon size={18} className="stroke-[2.2px]" />
                </span>
              </span>
            )}

            {/* Barra de progresso */}
            {progress > 0 && (
              <span className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] block h-1 bg-black/20">
                <span
                  className="block h-full"
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, ${themeColor} 0%, ${toRgba(themeColor, 0.7)} 100%)`,
                  }}
                />
              </span>
            )}

            {/* Badge de segmento / nível */}
            {(() => {
              const segments = collection.segments;
              if (segments && segments.length > 1) {
                return (
                  <div className="absolute bottom-2 left-2 flex gap-1">
                    {segments.slice(0, 2).map((seg) => (
                      <span key={seg} className="px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm border bg-white/90 text-brand-primary border-white/60">
                        {formatSegmentLabel(seg)}
                      </span>
                    ))}
                    {segments.length > 2 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm border bg-white/90 text-brand-primary border-white/60">
                        +{segments.length - 2}
                      </span>
                    )}
                  </div>
                );
              }
              const label = collection.level || segments?.[0];
              if (!label) return null;
              return (
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm border bg-white/90 text-brand-primary border-white/60">
                  {formatSegmentLabel(label)}
                </div>
              );
            })()}

            {/* Lock overlay */}
            {locked && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/90 shadow-lg">
                  <Icons.Lock size={16} className="text-gray-600" />
                </div>
              </div>
            )}

            {/* Reflexo de luz no tilt */}
            {isActive && (
              <>
                <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(${135 + tilt.y * 2}deg, transparent 0%, rgba(255,255,255,0.3) ${50 + tilt.x * 0.5 + tilt.y * 0.5}%, transparent 100%)`, transform: `translateX(${tilt.y * 2}px) translateY(${tilt.x * 2}px)`, mixBlendMode: 'overlay' }} />
                <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at ${50 + tilt.y * 1.5}% ${50 + tilt.x * 1.5}%, rgba(255,255,255,0.4) 0%, transparent 60%)`, mixBlendMode: 'soft-light' }} />
              </>
            )}

            {/* Overlay ambiente */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(15,23,42,0.14))]" />
          </div>

          {/* ─── Texto dentro da moldura branca ─── */}
          <div className="mt-2.5 flex min-h-[56px] flex-col px-1 pb-1">
            <h3 className="line-clamp-2 text-[13px] font-bold leading-[1.35] tracking-[-0.01em] text-brand-primary">
              {collection.title}
            </h3>
            {bookSummary && (
              <p className="mt-1 line-clamp-2 text-[12px] leading-4 text-gray-500">
                {bookSummary}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── Texto abaixo — Central Coruja ─── */}
      {isCentralCorujaTone && collection.title && (
        <h3 className="mb-1 text-[0.95rem] font-black leading-tight text-[#FFF4E3] line-clamp-2">
          {collection.title}
        </h3>
      )}
      {isCentralCorujaTone && collection.theme && collection.theme.trim() !== '' && (
        <p className="mb-1 text-xs font-medium leading-relaxed text-[#D4DCF0] line-clamp-2">
          {collection.theme}
        </p>
      )}
    </div>
  );
};
