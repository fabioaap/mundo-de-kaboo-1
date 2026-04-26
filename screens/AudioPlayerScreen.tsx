import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icons } from '../components/Icons';
import { placeholderImageUrl } from '../lib/appPaths';
import { Collection, MediaItemCard, ScreenName } from '../types';
import { useThemeBackground } from '../hooks/useThemeBackground';
import { GalaxyBackground } from '../components/GalaxyBackground';
import { api } from '../lib/api';

interface AudioPlayerScreenProps {
  collection: Collection;
  mediaItemId?: string;
  assetUrl?: string;
  assetTitle?: string;
  onNavigate: (screen: ScreenName, params?: any) => void;
  onBack: () => void;
}

export const AudioPlayerScreen: React.FC<AudioPlayerScreenProps> = ({
  collection,
  mediaItemId,
  assetUrl,
  assetTitle,
  onNavigate,
  onBack,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [cdRotation, setCdRotation] = useState(0); // Current rotation in degrees
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartTime, setDragStartTime] = useState(0);
  const [dragStartRotation, setDragStartRotation] = useState(0);
  const [isHoveringCd, setIsHoveringCd] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);
  const [resolvedPlaybackUrl, setResolvedPlaybackUrl] = useState<string | null>(null);
  const [resolvedPlaybackTitle, setResolvedPlaybackTitle] = useState<string | null>(null);
  const [relatedTracks, setRelatedTracks] = useState<MediaItemCard[]>([]);
  const [trackDescription, setTrackDescription] = useState<string>('');
  const [trackEnded, setTrackEnded] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rotationIntervalRef = useRef<number | null>(null);
  const lastSavedAtRef = useRef(0);
  const lastSavedPositionRef = useRef(0);
  const saveInFlightRef = useRef(false);

  const themeColor = collection.color_theme || '#5D1F58';
  const resolvedAudioUrl = resolvedPlaybackUrl ?? assetUrl ?? collection.audio_url;
  const resolvedTitle = resolvedPlaybackTitle ?? assetTitle ?? collection.title;
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  // Set browser background to match theme color
  useThemeBackground(themeColor);

  // Convert hex color to RGB for background
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
      : { r: 93, g: 31, b: 88 };
  };

  const rgb = hexToRgb(themeColor);
  const bgColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    let isActive = true;

    setResolvedPlaybackUrl(null);
    setResolvedPlaybackTitle(null);
    setTrackEnded(false);

    if (!mediaItemId) {
      return () => {
        isActive = false;
      };
    }

    api.resolveMediaPlayback(mediaItemId)
      .then((session) => {
        if (!isActive) {
          return;
        }

        setResolvedPlaybackUrl(session.source.url ?? null);
        setResolvedPlaybackTitle(session.item.title);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setResolvedPlaybackUrl(null);
        setResolvedPlaybackTitle(null);
      });

    return () => {
      isActive = false;
    };
  }, [mediaItemId]);

  useEffect(() => {
    let isActive = true;

    setRelatedTracks([]);
    setTrackDescription('');

    const loadContext = async () => {
      try {
        const [hub, detail] = await Promise.all([
          api.getMediaHub('music'),
          mediaItemId ? api.getMediaItem(mediaItemId) : Promise.resolve(null),
        ]);

        if (!isActive) {
          return;
        }

        const allItems = [
          ...(hub.hero ? [hub.hero] : []),
          ...hub.shelves.flatMap((shelf) => shelf.items),
        ];
        const unique = Array.from(new Map(allItems.map((item) => [item.id, item])).values());

        setRelatedTracks(unique.filter((item) => item.id !== mediaItemId).slice(0, 8));
        setTrackDescription(detail?.description ?? detail?.summary ?? collection.description ?? '');
      } catch {
        if (!isActive) {
          return;
        }

        setRelatedTracks([]);
        setTrackDescription(collection.description ?? '');
      }
    };

    loadContext();

    return () => {
      isActive = false;
    };
  }, [collection.description, mediaItemId]);

  // Reset CD rotation when audio resets to 0 and not playing
  // But don't reset if we're about to play (isPlaying becomes true)
  useEffect(() => {
    if (currentTime === 0 && !isPlaying) {
      setCdRotation(0);
    }
  }, [currentTime, isPlaying]);

  // Start rotation immediately when play is pressed (before audio actually starts)
  useEffect(() => {
    if (isPlaying && currentTime === 0 && duration > 0) {
      // Immediately set rotation to 0 (start position) so it begins rotating right away
      setCdRotation(0);
    }
  }, [isPlaying, currentTime, duration]);

  // Convert audio time to rotation
  const timeToRotation = (time: number): number => {
    if (!duration) return 0;
    // Map full duration to 5 full rotations (5 * 360 = 1800 degrees)
    const normalizedTime = time / duration;
    return normalizedTime * 1800; // 5 full rotations
  };

  // Rotate CD continuously - syncs with audio progress, progress bar, skip, etc.
  useEffect(() => {
    if (duration > 0) {
      // Use requestAnimationFrame for smooth, fluid rotation
      const updateRotation = () => {
        if (audioRef.current && !isDragging) {
          const currentAudioTime = audioRef.current.currentTime;
          // Always update rotation, even if currentAudioTime is 0 (starts immediately)
          const rotation = timeToRotation(currentAudioTime);
          setCdRotation(rotation);
        } else if (!isDragging) {
          // If audio not available, use currentTime state
          const rotation = timeToRotation(currentTime);
          setCdRotation(rotation);
        }

        // Continue animation loop
        rotationIntervalRef.current = requestAnimationFrame(updateRotation);
      };

      // Start animation loop immediately
      rotationIntervalRef.current = requestAnimationFrame(updateRotation);

      return () => {
        if (rotationIntervalRef.current) {
          cancelAnimationFrame(rotationIntervalRef.current);
          rotationIntervalRef.current = null;
        }
      };
    }
  }, [isDragging, duration, currentTime]);

  const togglePlay = async () => {
    if (!audioRef.current) return;

    try {
      setPlayError(null);
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } catch {
      setPlayError('Não foi possível reproduzir o áudio. Toque novamente para tentar.');
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeekStart = () => {
    setIsDragging(true);
    setDragStartTime(currentTime);
    setDragStartRotation(cdRotation);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);

    // Update rotation based on new time
    const newRotation = timeToRotation(time);
    setCdRotation(newRotation);

    setCurrentTime(time);

    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleSeekEnd = () => {
    setIsDragging(false);
    maybeSaveProgress(true);
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 15, duration);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 15, 0);
    }
  };

  const toggleSpeed = () => {
    if (playbackRate === 0.75) setPlaybackRate(1.0);
    else if (playbackRate === 1.0) setPlaybackRate(1.25);
    else if (playbackRate === 1.25) setPlaybackRate(1.5);
    else if (playbackRate === 1.5) setPlaybackRate(2.0);
    else setPlaybackRate(0.75);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const maybeSaveProgress = useCallback((force = false) => {
    if (!mediaItemId || saveInFlightRef.current) {
      return;
    }

    const positionSeconds = Math.max(0, Math.floor(currentTime));
    const totalDurationSeconds = Number.isFinite(duration) && duration > 0
      ? Math.floor(duration)
      : undefined;
    const progressPercent = totalDurationSeconds
      ? Math.max(0, Math.min(100, Math.round((positionSeconds / totalDurationSeconds) * 100)))
      : 0;

    if (!force) {
      const elapsedMs = Date.now() - lastSavedAtRef.current;
      const movedSeconds = Math.abs(positionSeconds - lastSavedPositionRef.current);

      if (elapsedMs < 10000 || movedSeconds < 5) {
        return;
      }
    }

    saveInFlightRef.current = true;

    api.saveMediaProgress({
      mediaItemId,
      lastPositionSeconds: positionSeconds,
      progressPercent,
      totalDurationSeconds,
      completed: totalDurationSeconds ? positionSeconds >= totalDurationSeconds - 2 : false,
    }).finally(() => {
      saveInFlightRef.current = false;
      lastSavedAtRef.current = Date.now();
      lastSavedPositionRef.current = positionSeconds;
    });
  }, [currentTime, duration, mediaItemId]);

  useEffect(() => {
    maybeSaveProgress(false);
  }, [currentTime, maybeSaveProgress]);

  useEffect(() => {
    return () => {
      maybeSaveProgress(true);
    };
  }, [maybeSaveProgress]);

  const handleReplay = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play();
    setIsPlaying(true);
    setTrackEnded(false);
  };

  const SkipBack15Icon = ({ size = 28 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
      <text x="12" y="16.5" textAnchor="middle" fontSize="6" fontWeight="900" fill="currentColor">15</text>
    </svg>
  );

  const SkipForward15Icon = ({ size = 28 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 5V1l5 5-5 5V7C8.69 7 6 9.69 6 13s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
      <text x="12" y="16.5" textAnchor="middle" fontSize="6" fontWeight="900" fill="currentColor">15</text>
    </svg>
  );

  const handleBack = () => {
    maybeSaveProgress(true);
    onBack();
  };

  const openRelatedTrack = (item: MediaItemCard) => {
    onNavigate('player_audio', {
      collectionId: item.collectionId ?? collection.id,
      mediaItemId: item.id,
      assetTitle: item.title,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{
        height: '100vh',
        width: '100vw',
        backgroundColor: bgColor
      }}
    >
      {/* Galaxy Effect */}
      <GalaxyBackground />

      {/* Dark overlay to darken background */}
      <div className="absolute inset-0 bg-black/10" style={{ zIndex: 2 }} />
      {resolvedAudioUrl && (
        <audio
          ref={audioRef}
          src={resolvedAudioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => {
            setIsPlaying(false);
            setTrackEnded(true);
            maybeSaveProgress(true);
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => {
            setIsPlaying(false);
            maybeSaveProgress(true);
          }}
        />
      )}

      {/* Header */}
      <div className="relative z-20 p-4 flex items-center justify-between flex-shrink-0">
        <button
          onClick={handleBack}
          className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md shadow-xl text-white flex items-center justify-center hover:bg-black/30 transition-all active:scale-95 border border-white/30"
          aria-label="Voltar"
        >
          <Icons.ChevronLeft size={24} strokeWidth={2.5} />
        </button>

        <div className="flex-1 text-center">
          <div className="inline-block bg-black/20 backdrop-blur-md px-6 py-2 rounded-full shadow-lg border border-white/10">
            <h1 className="text-sm md:text-base font-bold text-white drop-shadow-sm">
              {resolvedTitle}
            </h1>
          </div>
        </div>

        <button
          onClick={() => setShowSidebar(s => !s)}
          aria-label={showSidebar ? 'Ocultar sugestões' : 'Ver sugestões'}
          className={`h-10 inline-flex items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold text-white/90 transition-colors backdrop-blur-md ${showSidebar
              ? 'border-white/40 bg-white/20'
              : 'border-white/25 bg-black/30 hover:bg-black/45'
            }`}
        >
          {showSidebar ? 'Ocultar' : 'Sugestões'}
          <Icons.ChevronRight size={13} className={`transition-transform ${showSidebar ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Track Ended Overlay */}
      {trackEnded && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="text-center px-8 space-y-5 w-full max-w-sm">
            <div className="text-5xl select-none">🎵</div>
            <h2 className="text-xl font-black text-white">Faixa concluída!</h2>
            <p className="text-sm text-white/70">O que você quer fazer agora?</p>
            <div className="space-y-3">
              <button
                onClick={handleReplay}
                className="w-full py-3 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold text-base transition-all active:scale-95 hover:bg-white/30"
              >
                Ouvir novamente
              </button>
              {relatedTracks.length > 0 && (
                <button
                  onClick={() => {
                    setTrackEnded(false);
                    openRelatedTrack(relatedTracks[0]);
                  }}
                  className="w-full py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white/80 font-semibold text-sm transition-all active:scale-95 hover:bg-white/20"
                >
                  Próxima: {relatedTracks[0].title}
                </button>
              )}
              <button
                onClick={handleBack}
                className="w-full py-2 text-white/60 font-medium text-sm transition-all active:scale-95 hover:text-white/80"
              >
                Voltar ao catálogo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - two-column layout on desktop */}
      <div className="flex-1 flex flex-col lg:flex-row relative z-10 overflow-hidden">

        {/* Player Column */}
        <div className="flex flex-col items-center justify-start pt-3 overflow-y-auto min-w-0 flex-1">
          {/* CD/Vinyl Disc */}
          <div className="relative mb-2">
            <div
              className="w-56 h-56 md:w-72 md:h-72 rounded-full relative cursor-pointer select-none"
              style={{
                transform: `rotate(${cdRotation}deg) scale(${isHoveringCd ? 1.05 : 1})`,
                transition: isDragging ? 'none' : 'transform 0.05s linear',
                willChange: 'transform'
              }}
              onMouseEnter={() => setIsHoveringCd(true)}
              onMouseLeave={() => setIsHoveringCd(false)}
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
            >
              {/* Outer Ring - Vinyl Grooves */}
              <div className="absolute inset-0 rounded-full border-8 border-black/40 shadow-2xl">
                {/* Groove lines */}
                <div className="absolute inset-2 rounded-full border border-white/10" />
                <div className="absolute inset-4 rounded-full border border-white/10" />
                <div className="absolute inset-6 rounded-full border border-white/10" />
                <div className="absolute inset-8 rounded-full border border-white/10" />
              </div>

              {/* Album Cover */}
              <div className="absolute inset-4 rounded-full overflow-hidden shadow-inner">
                <img
                  src={collection.cover_image || placeholderImageUrl}
                  alt={collection.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Center Label - CD/Vinyl Center */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-black/60 backdrop-blur-sm border-2 border-white/20 shadow-inner flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-black/80" />
              </div>

              {/* Play/Pause Affordance Overlay */}
              <div
                className={`absolute inset-0 rounded-full flex items-center justify-center bg-black/25 transition-opacity duration-200 pointer-events-none ${!isPlaying ? 'opacity-100' : isHoveringCd ? 'opacity-100' : 'opacity-0'
                  }`}
              >
                {isPlaying ? (
                  <Icons.Pause size={44} fill="white" strokeWidth={0} className="text-white drop-shadow-lg" />
                ) : (
                  <Icons.Play size={44} fill="white" strokeWidth={0} className="text-white drop-shadow-lg ml-2" />
                )}
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="w-full max-w-md px-6 pb-5 space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onMouseDown={handleSeekStart}
                  onTouchStart={handleSeekStart}
                  onChange={handleSeek}
                  onMouseUp={handleSeekEnd}
                  onTouchEnd={handleSeekEnd}
                  className="w-full h-3 bg-white/20 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, white ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)`
                  }}
                />
              </div>
              <div className="flex justify-between text-xs font-bold text-white/80 px-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Speed Control */}
            <div className="flex justify-center">
              <button
                onClick={toggleSpeed}
                aria-label={`Velocidade: ${playbackRate}x`}
                className="px-5 py-1.5 rounded-full bg-black/20 backdrop-blur-md border border-white/30 text-white font-bold text-sm hover:bg-black/30 transition-all active:scale-95"
              >
                {playbackRate}x
              </button>
            </div>

            {/* Main Controls */}
            <div className="flex items-center justify-center gap-7">
              {/* Skip Backward */}
              <button
                onClick={skipBackward}
                className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md shadow-xl flex items-center justify-center text-white border border-white/30 transition-all active:scale-95 hover:bg-black/30 hover:scale-110"
                aria-label="Retroceder 15 segundos"
              >
                <SkipBack15Icon size={24} />
              </button>

              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="w-[4.5rem] h-[4.5rem] rounded-full bg-white/20 backdrop-blur-md shadow-2xl flex items-center justify-center text-white border-2 border-white/40 transition-all active:scale-95 hover:bg-white/30 hover:scale-110"
                aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
              >
                {isPlaying ? (
                  <Icons.Pause size={32} fill="currentColor" strokeWidth={2} />
                ) : (
                  <Icons.Play size={32} fill="currentColor" strokeWidth={2} className="ml-1" />
                )}
              </button>

              {/* Skip Forward */}
              <button
                onClick={skipForward}
                className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md shadow-xl flex items-center justify-center text-white border border-white/30 transition-all active:scale-95 hover:bg-black/30 hover:scale-110"
                aria-label="Avançar 15 segundos"
              >
                <SkipForward15Icon size={24} />
              </button>
            </div>

            {/* Play Error Message */}
            {playError && (
              <div className="mt-4 bg-red-500/80 backdrop-blur-sm text-white text-xs px-4 py-2 rounded-full text-center max-w-xs">
                {playError}
              </div>
            )}

            {trackDescription && (
              <div className="rounded-xl border border-white/20 bg-black/20 px-3 py-3 text-white/90 backdrop-blur-md">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/60">Sobre esta faixa</p>
                <p className="mt-1 text-sm leading-5 line-clamp-2">{trackDescription}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar — catálogo relacionado */}
        <div
          className={`flex-shrink-0 overflow-y-auto transition-all duration-300 border-t lg:border-t-0 lg:border-l border-white/10 bg-black/25 backdrop-blur-md ${showSidebar
              ? 'w-full h-72 lg:h-auto lg:w-80 xl:w-96'
              : 'w-0 h-0 overflow-hidden opacity-0 pointer-events-none border-0'
            }`}
          style={{ scrollbarWidth: 'none' } as React.CSSProperties}
        >
          <div className="p-4 space-y-3 min-w-[280px]">
            <div className="px-1">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/65">Catálogo relacionado</p>
              <h2 className="mt-1 text-sm font-black text-white">Sugestões da biblioteca</h2>
            </div>

            {relatedTracks.length === 0 && (
              <p className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/75">
                Sem outras faixas relacionadas no momento.
              </p>
            )}

            {relatedTracks.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openRelatedTrack(item)}
                className="flex w-full items-center gap-3 rounded-xl border border-white/15 bg-white/5 p-2.5 text-left transition-colors hover:bg-white/10 text-white"
              >
                <div
                  className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-white/10"
                  style={item.thumbnailUrl ? {
                    backgroundImage: `url(${item.thumbnailUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  } : undefined}
                >
                  <span className="absolute bottom-1 left-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/65 text-white">
                    <Icons.Play size={9} className="ml-0.5 fill-current stroke-none" />
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-1 text-xs font-bold">{item.title}</p>
                  <p className="text-[11px] text-white/70">{item.collectionTitle ?? 'Kaboo'}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        input[type=range] {
          -webkit-appearance: none;
          appearance: none;
        }
        
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 3px solid rgba(255,255,255,0.8);
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        
        input[type=range]::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 3px solid rgba(255,255,255,0.8);
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
};
