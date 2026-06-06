import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Collection } from '../types';
import { Icons } from './Icons';
import useIsMobile from '../hooks/useIsMobile';
import { useRefSize } from '../hooks/useRefSize';
import { formatSegmentLabel } from '../constants';
import {
  getCollectionDisplayCover,
  getCollectionFormatKinds,
  getCollectionTypeMeta,
  normalizeSingleKitBookIds,
  type CollectionFormatKind,
} from '../lib/collectionPresentation';

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

const DEFAULT_COLLECTION_THEME = '#5D1F58';

const COLLECTION_FORMAT_META: Record<
  CollectionFormatKind,
  {
    label: string;
    Icon: React.ComponentType<{ size?: number; className?: string }>;
    toneClassName: string;
  }
> = {
  reading: {
    label: 'Livro',
    Icon: Icons.BookOpen,
    toneClassName: 'bg-slate-900 text-white',
  },
  audio: {
    label: 'Áudio',
    Icon: Icons.Headphones,
    toneClassName: 'bg-[#1E3A8A] text-white',
  },
  video: {
    label: 'Vídeo',
    Icon: Icons.Video,
    toneClassName: 'bg-[#7C2D12] text-white',
  },
  materials: {
    label: 'Material',
    Icon: Icons.FileText,
    toneClassName: 'bg-[#14532D] text-white',
  },
};

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

const clampNumber = (value: number, min: number, max: number) => (
  Math.min(max, Math.max(min, value))
);

type CollectionCardLayout = {
  aspectRatio: string;
  stackWidth: number;
  stackRight: number;
  stackPosition: 'center' | 'bottom';
  headerPaddingRight: number;
  bodyPaddingRight: number;
  footerPaddingRight: number;
  visibleFormatLimit: number;
  summaryClampClassName: string;
  bodyMarginTop: string;
  pillsMarginTop: string;
};

const getCollectionCardLayout = (cardWidth: number, isMobile: boolean): CollectionCardLayout => {
  const resolvedWidth = cardWidth > 0 ? cardWidth : (isMobile ? 343 : 320);

  if (isMobile) {
    const nominalCardHeight = Math.round(resolvedWidth / 2.0);
    const stackInset = 8;
    const effectiveStackSize = nominalCardHeight - stackInset * 2;
    return {
      aspectRatio: '2.0 / 1',
      stackWidth: effectiveStackSize,
      stackRight: stackInset,
      stackPosition: 'center',
      headerPaddingRight: effectiveStackSize + stackInset,
      bodyPaddingRight: effectiveStackSize + stackInset,
      footerPaddingRight: Math.max(0, effectiveStackSize + stackInset - 12),
      visibleFormatLimit: 2,
      summaryClampClassName: 'line-clamp-2',
      bodyMarginTop: 'mt-3',
      pillsMarginTop: 'mt-auto',
    };
  }

  if (resolvedWidth < 280) {
    const nominalCardHeight = Math.round(resolvedWidth / 0.88);
    const stackInset = 6;
    const effectiveStackSize = Math.min(Math.round(resolvedWidth * 0.42), nominalCardHeight - stackInset * 2);
    return {
      aspectRatio: '0.88 / 1',
      stackWidth: effectiveStackSize,
      stackRight: stackInset,
      stackPosition: 'center',
      headerPaddingRight: 8,
      bodyPaddingRight: 8,
      footerPaddingRight: 8,
      visibleFormatLimit: 2,
      summaryClampClassName: 'line-clamp-2',
      bodyMarginTop: 'mt-3',
      pillsMarginTop: 'mt-3',
    };
  }

  const nominalCardHeight = Math.round(resolvedWidth / 2.3);
  const stackInset = 10; // breathing room from card edges
  const effectiveStackSize = nominalCardHeight - stackInset * 2;
  return {
    aspectRatio: '2.3 / 1',
    stackWidth: effectiveStackSize,
    stackRight: stackInset,
    stackPosition: 'center',
    headerPaddingRight: effectiveStackSize + stackInset,
    bodyPaddingRight: effectiveStackSize + stackInset,
    footerPaddingRight: Math.max(0, effectiveStackSize + stackInset - 12),
    visibleFormatLimit: 3,
    summaryClampClassName: 'line-clamp-3',
    bodyMarginTop: 'mt-2',
    pillsMarginTop: 'mt-auto',
  };
};

export const Card3D: React.FC<Card3DProps> = ({ collection, onCollectionClick, locked, tone = 'default' }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [tagPopover, setTagPopover] = useState<{ x: number; y: number; tags: { key: string; label: string; className: string }[] } | null>(null);
  const { ref: cardRef, width: cardWidth } = useRefSize();
  const { ref: titleRef, height: titleHeight } = useRefSize();
  const isMobile = useIsMobile();
  const displayCoverImage = getCollectionDisplayCover(collection) || collection.cover_image;
  const collectionTypeMeta = getCollectionTypeMeta(collection);
  const isCentralCorujaTone = tone === 'central-coruja';
  const isCollectionCard = !isCentralCorujaTone && collectionTypeMeta.type === 'kit';
  const progress = collection.progress ?? 0;
  const themeColor = collection.color_theme?.trim() || DEFAULT_COLLECTION_THEME;
  const collectionHeroCover = displayCoverImage || collection.cover_image?.trim() || '';
  const formatKinds = getCollectionFormatKinds(collection);
  const collectionCardLayout = getCollectionCardLayout(cardWidth, isMobile);
  const linkedBooksCount = normalizeSingleKitBookIds(collection.kit_book_ids).length;
  const kitContentSummary = collection.synopsis?.trim()
    || (collection.description as string | undefined)?.trim()
    || collection.theme?.trim()
    || collectionTypeMeta.detailSummary;
  // Algoritmo de diagramação: a descrição preenche todo o espaço livre entre título e tags,
  // escalando de mobile a 4K. Calcula a altura do card pela largura medida + aspect ratio,
  // subtrai o título medido e o "chrome" fixo (paddings, tags, separador, footer), e converte em linhas.
  const DESC_LINE_HEIGHT_PX = 20; // 13px × 1.5
  // Teto de altura: em telas grandes (4K) o card largo ficaria alto demais p/ o texto preencher,
  // deixando vão em branco. Limitar a altura encolhe a capa (full-height) e elimina o espaço vazio.
  const COLLECTION_CARD_MAX_HEIGHT = 196;
  const cardAspectNum = parseFloat(collectionCardLayout.aspectRatio) || 1;
  const cardHeightPx = cardWidth > 0
    ? Math.min(cardWidth / cardAspectNum, COLLECTION_CARD_MAX_HEIGHT)
    : 0;
  // Espaço vertical consumido por tudo que não é a descrição (estimado, levemente generoso p/ não cortar).
  const descChromePx = isMobile ? 78 : 82;
  const descAvailablePx = cardHeightPx - descChromePx - titleHeight;
  const descMaxLines = cardHeightPx > 0
    ? Math.min(12, Math.max(1, Math.floor(descAvailablePx / DESC_LINE_HEIGHT_PX)))
    : 2;
  const coverBadgeLabel = isCentralCorujaTone
    ? collectionTypeMeta.shortLabel
    : collection.level
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

  // Fecha o popover de tags ao rolar ou redimensionar (coords ficariam defasadas)
  useEffect(() => {
    if (!tagPopover) return;
    const close = () => setTagPopover(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [tagPopover]);

  const handleMouseLeave = () => {
    // Only reset on desktop
    if (!isMobile) {
      setTilt({ x: 0, y: 0 });
    }
  };

  const isActive = tilt.x !== 0 || tilt.y !== 0;

  return (
    <div
      key={collection.id}
      onClick={() => onCollectionClick(collection)}
      className="cursor-pointer touch-manipulation flex flex-col w-full"
      style={{
        touchAction: 'pan-y',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div
        ref={cardRef}
        className={`overflow-hidden relative group w-full ${isCentralCorujaTone
          ? 'mb-3 rounded-[28px] bg-transparent shadow-none'
          : isCollectionCard
            ? 'rounded-lg bg-white shadow-[0_28px_60px_rgba(15,23,42,0.12)]'
            : 'mb-3 rounded-lg shadow-md shadow-gray-100'}`}
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
          aspectRatio: isCentralCorujaTone ? '0.78 / 1' : isCollectionCard ? collectionCardLayout.aspectRatio : '1 / 1',
          width: '100%',
          height: 'auto',
          ...(isCollectionCard && { maxHeight: `${COLLECTION_CARD_MAX_HEIGHT}px` }),
        }}
        onMouseMove={!isMobile ? handleMouseMove : undefined}
        onMouseLeave={!isMobile ? handleMouseLeave : undefined}
      >
        {isCentralCorujaTone && (
          <>
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
                style={{
                  transform: 'translateZ(20px)',
                }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,245,214,0.03)_0%,rgba(19,35,52,0.02)_45%,rgba(7,12,24,0.30)_100%)]" />
            </div>
          </>
        )}
        {isCollectionCard && (
          <>
            {/* Gradient backgrounds */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(150deg, ${toRgba(themeColor, 0.18)} 0%, rgba(255,255,255,0.98) 38%, rgba(248,250,252,0.98) 100%)`,
                transform: 'translateZ(10px)',
              }}
            />
            <div
              className="absolute inset-0 opacity-95"
              style={{
                background: `radial-gradient(circle at 0% 100%, ${toRgba(themeColor, 0.22)} 0%, transparent 42%), radial-gradient(circle at 100% 0%, ${toRgba(themeColor, 0.18)} 0%, transparent 28%), linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 60%)`,
                transform: 'translateZ(12px)',
              }}
            />

            {/* Cover image — right side, full height */}
            <div
              className="absolute right-0 top-0 bottom-0 w-[40%] overflow-hidden rounded-r-lg"
              style={{ transform: 'translateZ(16px)' }}
            >
              <img
                src={collectionHeroCover}
                alt={collection.title}
                className="h-full w-full object-cover bg-slate-100"
                loading="lazy"
                decoding="async"
                style={{ objectPosition: 'center top' }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.28)_0%,transparent_32%)]" />
            </div>

            {/* Content — left side */}
            <div
              className="relative z-10 flex h-full flex-col px-3.5 pb-2 pt-2.5 sm:px-4 sm:pb-2.5 sm:pt-3"
              style={{ paddingRight: '44%' }}
            >
              {/* Body: título + descrição (preenche o espaço livre) + tags */}
              <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
                <div ref={titleRef} className="shrink-0">
                  <h3 className="text-sm font-black leading-tight text-slate-900 sm:text-[0.95rem] line-clamp-2">
                    {collection.title}
                  </h3>
                </div>

                {/* Área da descrição: cresce p/ ocupar o vão entre título e tags; nº de linhas calculado p/ preencher */}
                <div className="mt-0.5 min-h-0 flex-1 overflow-hidden">
                  {kitContentSummary && (
                    <p
                      className="text-[13px] font-medium text-slate-500"
                      style={{
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: String(descMaxLines),
                        overflow: 'hidden',
                        lineHeight: 1.5,
                      }}
                    >
                      {kitContentSummary}
                    </p>
                  )}
                </div>

                {/* Tags — max 2 visíveis + chip "+N" com popover */}
                {(() => {
                  const segmentTags = (collection.segments && collection.segments.length > 0)
                    ? collection.segments.map(formatSegmentLabel)
                    : collection.level
                      ? [formatSegmentLabel(collection.level)]
                      : [];
                  const allTags = [
                    ...formatKinds.map((kind) => ({
                      key: `fmt-${kind}`,
                      label: COLLECTION_FORMAT_META[kind].label,
                      className: COLLECTION_FORMAT_META[kind].toneClassName,
                    })),
                    ...segmentTags.map((seg) => ({
                      key: `seg-${seg}`,
                      label: seg,
                      className: 'bg-slate-100 text-slate-600 border border-slate-200',
                    })),
                  ];
                  if (allTags.length === 0) return null;
                  const MAX_VISIBLE = 2;
                  const visible = allTags.slice(0, MAX_VISIBLE);
                  const hidden = allTags.slice(MAX_VISIBLE);
                  return (
                    <div className="mt-1.5 flex shrink-0 flex-nowrap items-center gap-1">
                      {visible.map((tag) => (
                        <span
                          key={tag.key}
                          className={`inline-flex shrink-0 items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold whitespace-nowrap ${tag.className}`}
                        >
                          {tag.label}
                        </span>
                      ))}
                      {hidden.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (tagPopover) {
                              setTagPopover(null);
                              return;
                            }
                            const rect = e.currentTarget.getBoundingClientRect();
                            setTagPopover({ x: rect.left, y: rect.bottom + 4, tags: hidden });
                          }}
                          className="inline-flex shrink-0 items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-900/85 text-white whitespace-nowrap"
                          aria-label={`Mais ${hidden.length} tag${hidden.length > 1 ? 's' : ''}`}
                        >
                          +{hidden.length}
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Separator */}
              <div className="my-1.5 border-t border-slate-200/60" />

              {/* Footer: CTA + progress */}
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold text-white shrink-0"
                  style={{ backgroundColor: toRgba(themeColor, 0.88) }}
                >
                  Explorar
                  <Icons.ChevronRight size={10} />
                </span>
                {progress > 0 && (
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${progress}%`,
                          background: `linear-gradient(90deg, ${themeColor} 0%, ${toRgba(themeColor, 0.55)} 100%)`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-black shrink-0" style={{ color: toRgba(themeColor, 0.88) }}>
                      {progress >= 100 ? '✓' : `${progress}%`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        {!isCentralCorujaTone && (
          !isCollectionCard && (
            <img
              src={displayCoverImage}
              alt={collection.title}
              className="w-full h-full object-cover bg-gray-200"
              loading="lazy"
              decoding="async"
              style={{
                transform: 'translateZ(20px)',
              }}
            />
          )
        )}

        {(isCentralCorujaTone || isCollectionCard) && (locked || progress > 0) && (
          <div
            className={`absolute ${isCollectionCard ? 'right-4 top-4 h-11 min-w-[2.75rem] px-3' : 'right-3 top-3 h-10 w-10'} flex items-center justify-center rounded-full border shadow-[0_12px_22px_rgba(14,9,34,0.28)] ${locked
              ? 'border-[#ecd495]/80 bg-[#1d2037]/92 text-[#ffeab8]'
              : isCollectionCard
                ? 'border-white/80 bg-white/90 text-slate-700'
                : 'border-[#f2d87b]/90 bg-[#ffcf4d] text-[#62331a]'}`}
            style={{ transform: 'translateZ(34px)' }}
          >
            {locked
              ? <Icons.Lock size={16} />
              : progress >= 100
                ? <Icons.Check size={18} className="stroke-[3px]" />
                : (
                  <span className="text-[10px] font-black uppercase tracking-[0.16em]" style={isCollectionCard ? { color: toRgba(themeColor, 0.9) } : undefined}>
                    {progress}%
                  </span>
                )}
          </div>
        )}
        {/* Light reflection effect - only rendered when card is actively tilting */}
        {isActive && (
          <>
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
                mixBlendMode: 'soft-light',
              }}
            />
          </>
        )}
        <div className={`absolute inset-0 transition-opacity ${isCentralCorujaTone
          ? 'bg-gradient-to-t from-[#0f2335]/0 via-transparent to-white/10 opacity-100'
          : isCollectionCard
            ? 'bg-[linear-gradient(140deg,rgba(255,255,255,0)_48%,rgba(255,255,255,0.28)_100%)] opacity-100'
            : 'bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100'}`} />

        {isCentralCorujaTone && progress > 0 && (
          <div
            className="absolute inset-x-0 bottom-0 z-10 p-3"
            style={{ transform: 'translateZ(32px)' }}
          >
            <div className="rounded-full border border-[#d2c18f]/55 bg-[#20162a]/92 px-3 py-2 shadow-[0_18px_30px_rgba(7,19,30,0.24)]">
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
          <div
            className={`absolute inset-0 flex items-center justify-center ${isCollectionCard ? 'bg-white/28 backdrop-blur-[2px]' : 'bg-black/40'}`}
            style={{ transform: 'translateZ(35px)' }}
          >
            {!isCentralCorujaTone && !isCollectionCard && (
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/90 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-600">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            )}
          </div>
        )}

        {!isCentralCorujaTone && !isCollectionCard && (() => {
          const segments = collection.segments;
          if (segments && segments.length > 1) {
            const visible = segments.slice(0, 2);
            const extra = segments.length - 2;
            return (
              <div className="absolute bottom-2 right-2 flex gap-1" style={{ transform: 'translateZ(30px)' }}>
                {visible.map((seg) => (
                  <span key={seg} className={`px-2 py-1 rounded-full text-[10px] font-bold shadow-sm border ${isCentralCorujaTone
                    ? 'bg-[#fff9eb] text-[#204b48] border-[#fff3d1]'
                    : 'bg-white text-brand-primary border-white/50'}`}>
                    {formatSegmentLabel(seg)}
                  </span>
                ))}
                {extra > 0 && (
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold shadow-sm border ${isCentralCorujaTone
                    ? 'bg-[#fff9eb] text-[#204b48] border-[#fff3d1]'
                    : 'bg-white text-brand-primary border-white/50'}`}>
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
              className={`absolute bottom-2 right-2 px-2 py-1 rounded-full text-[10px] font-bold shadow-sm border ${isCentralCorujaTone
                ? 'bg-[#fff9eb] text-[#243A60] border-[#fff3d1]'
                : 'bg-white text-brand-primary border-white/50'}`}
              style={{ transform: 'translateZ(30px)' }}
            >
              {formatSegmentLabel(label)}
            </div>
          );
        })()}
      </div>

      {!isCentralCorujaTone && !isCollectionCard && collection.title && (
        <h3 className="font-bold text-gray-800 text-sm leading-tight mb-1 line-clamp-2">
          {collection.title}
        </h3>
      )}

      {!isCentralCorujaTone && !isCollectionCard && (() => {
        const bookSummary = collection.synopsis?.trim() || (collection.description as string | undefined)?.trim() || collection.theme?.trim();
        return bookSummary ? (
          <p className="text-xs text-gray-500 line-clamp-1 mb-2 font-medium">{bookSummary}</p>
        ) : null;
      })()}

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

      {!isCentralCorujaTone && !isCollectionCard && collection.progress !== undefined && collection.progress > 0 && (
        <div className="mt-1 flex items-center gap-1 text-xs font-bold text-brand-light">
          <div className="h-1.5 w-1.5 rounded-full bg-brand-light" />
          Em andamento
        </div>
      )}

      {/* Popover das tags extras (renderizado via portal p/ escapar do overflow-hidden do card) */}
      {tagPopover && createPortal(
        <>
          <div
            className="fixed inset-0 z-[60]"
            onClick={(e) => { e.stopPropagation(); setTagPopover(null); }}
          />
          <div
            className="fixed z-[61] flex max-w-[200px] flex-col items-start gap-1 rounded-xl bg-white p-2 shadow-[0_12px_32px_rgba(15,23,42,0.18)] ring-1 ring-slate-200"
            style={{ left: tagPopover.x, top: tagPopover.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {tagPopover.tags.map((tag) => (
              <span
                key={tag.key}
                className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold whitespace-nowrap ${tag.className}`}
              >
                {tag.label}
              </span>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
