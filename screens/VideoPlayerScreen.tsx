import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icons } from '../components/Icons';
import { Collection, MediaItemCard, ScreenName } from '../types';
import useIsMobile from '../hooks/useIsMobile';
import useOrientation from '../hooks/useOrientation';
import { useThemeBackground } from '../hooks/useThemeBackground';
import { api } from '../lib/api';
import { useOfflineDownload } from '../hooks/useOfflineDownload';

interface VideoPlayerScreenProps {
  collection: Collection;
  mediaItemId?: string;
  assetUrl?: string;
  assetTitle?: string;
  onNavigate: (screen: ScreenName, params?: any) => void;
  onBack: () => void;
}

const getYouTubeVideoId = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const shortMatch = value.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/i);
  if (shortMatch?.[1]) {
    return shortMatch[1];
  }

  const watchMatch = value.match(/[?&]v=([A-Za-z0-9_-]{6,})/i);
  if (watchMatch?.[1]) {
    return watchMatch[1];
  }

  const embedMatch = value.match(/(?:embed|shorts)\/([A-Za-z0-9_-]{6,})/i);
  if (embedMatch?.[1]) {
    return embedMatch[1];
  }

  return null;
};

type PlayerState = 'loading' | 'playing' | 'paused' | 'error' | 'error_persistent' | 'ended';

export const VideoPlayerScreen: React.FC<VideoPlayerScreenProps> = ({
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
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);
  const [resolvedPlaybackUrl, setResolvedPlaybackUrl] = useState<string | null>(null);
  const [resolvedPlaybackTitle, setResolvedPlaybackTitle] = useState<string | null>(null);
  const [relatedItems, setRelatedItems] = useState<MediaItemCard[]>([]);
  const [itemDescription, setItemDescription] = useState<string>('');
  const [showShortcutsHint, setShowShortcutsHint] = useState(true);
  const [showMobileQueue, setShowMobileQueue] = useState(false);
  const [showDesktopRelated, setShowDesktopRelated] = useState(false);
  const [isDesktopDescriptionExpanded, setIsDesktopDescriptionExpanded] = useState(false);
  const [playerState, setPlayerState] = useState<PlayerState>('loading');

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<any>(null);
  const lastSavedAtRef = useRef(0);
  const lastSavedPositionRef = useRef(0);
  const saveInFlightRef = useRef(false);
  const retryCountRef = useRef(0);
  const endedFocusRef = useRef<HTMLButtonElement>(null);
  const errorPersistentFocusRef = useRef<HTMLButtonElement>(null);

  const themeColor = collection.color_theme || '#5D1F58';
  const isMobile = useIsMobile();
  const isLandscape = useOrientation();
  const isMobilePortrait = isMobile && !isLandscape;
  const resolvedVideoUrl = resolvedPlaybackUrl ?? assetUrl ?? collection.video_url;
  const resolvedTitle = resolvedPlaybackTitle ?? assetTitle ?? collection.title;
  const youtubeVideoId = getYouTubeVideoId(resolvedVideoUrl);
  const isYouTubeSource = Boolean(youtubeVideoId);
  const youtubeEmbedUrl = youtubeVideoId
    ? `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&playsinline=1&rel=0`
    : null;
  const {
    isAvailable: canDownloadOffline,
    isDownloaded: isOfflineDownloaded,
    isDownloading: isOfflineDownloading,
    downloadError: offlineDownloadError,
    handleDownload: handleOfflineDownload,
    handleRemove: handleOfflineRemove,
  } = useOfflineDownload(collection, [resolvedVideoUrl]);

  // Set browser background to black for video player
  useThemeBackground('#000000');

  useEffect(() => {
    // Hide controls initially after 3 seconds
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    setResolvedPlaybackUrl(null);
    setResolvedPlaybackTitle(null);
    setPlayerState('loading');
    retryCountRef.current = 0;

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

    setRelatedItems([]);
    setItemDescription('');

    const loadContext = async () => {
      try {
        const [hub, detail] = await Promise.all([
          api.getMediaHub('videos'),
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
        const filtered = unique
          .filter((item) => item.id !== mediaItemId)
          .slice(0, 10);

        setRelatedItems(filtered);
        setItemDescription(detail?.description ?? detail?.summary ?? collection.description ?? '');
      } catch {
        if (!isActive) {
          return;
        }

        setRelatedItems([]);
        setItemDescription(collection.description ?? '');
      }
    };

    loadContext();

    return () => {
      isActive = false;
    };
  }, [collection.description, mediaItemId]);

  useEffect(() => {
    setShowMobileQueue(false);
  }, [mediaItemId]);

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying && !isMobilePortrait) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
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

  const handleBack = () => {
    maybeSaveProgress(true);
    onBack();
  };

  const togglePlay = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    resetControlsTimeout();
    if (isYouTubeSource) return;
    if (!videoRef.current) return;
    try {
      setPlayError(null);
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
        setPlayerState('paused');
      } else {
        await videoRef.current.play();
        setIsPlaying(true);
        setPlayerState('playing');
      }
    } catch {
      setPlayError('Não foi possível reproduzir o vídeo. Toque novamente para tentar.');
      setIsPlaying(false);
      setPlayerState('error');
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedData = () => {
    setIsLoading(false);
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
    setPlayerState((prev) => prev === 'loading' ? 'paused' : prev);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetControlsTimeout();
    if (isYouTubeSource) return;
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleSeekEnd = () => {
    maybeSaveProgress(true);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    resetControlsTimeout();
    if (isYouTubeSource) return;
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetControlsTimeout();
    if (isYouTubeSource) return;
    if (videoRef.current) {
      const newMutedState = !isMuted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
      if (newMutedState) {
        setVolume(0);
      } else {
        setVolume(1);
        videoRef.current.volume = 1;
      }
    }
  };

  const skip = (seconds: number) => {
    resetControlsTimeout();
    if (isYouTubeSource) return;
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(Math.max(videoRef.current.currentTime + seconds, 0), duration);
    }
  };

  const toggleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetControlsTimeout();
    if (isYouTubeSource) return;
    let newRate = 1.0;
    if (playbackRate === 1.0) newRate = 1.5;
    else if (playbackRate === 1.5) newRate = 2.0;
    else newRate = 1.0;

    setPlaybackRate(newRate);
    if (videoRef.current) videoRef.current.playbackRate = newRate;
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => console.log(err));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const remainingTime = Math.max(duration - currentTime, 0);
  const leadRelatedItem = relatedItems[0];
  const overlayActive = playerState === 'ended' || playerState === 'error_persistent';
  const desktopDockRightPadding = showDesktopRelated
    ? 'var(--player-right-rail)'
    : 'var(--player-edge-gap)';
  const panelChromeClass = 'rounded-2xl border border-white/20 bg-black/52 backdrop-blur-md shadow-[0_16px_40px_rgba(0,0,0,0.35)]';
  const cardChromeClass = 'rounded-xl border border-white/20 bg-white/8 transition-colors hover:bg-white/14';
  const mobilePortraitMediaTransform = isMobilePortrait ? 'translateY(-9vh)' : undefined;
  const mobilePortraitCenterTransform = isMobilePortrait
    ? 'translate(-50%, calc(-50% - 9vh))'
    : 'translate(-50%, -50%)';

  const retryPlayback = async () => {
    resetControlsTimeout();

    if (!videoRef.current) {
      return;
    }

    retryCountRef.current += 1;
    const isPersistent = retryCountRef.current >= 2;

    setPlayError(null);
    setIsLoading(true);
    setPlayerState('loading');
    videoRef.current.load();

    try {
      await videoRef.current.play();
      setIsPlaying(true);
      setPlayerState('playing');
      retryCountRef.current = 0;
    } catch {
      setIsPlaying(false);
      setIsLoading(false);
      if (isPersistent) {
        setPlayError('Não foi possível iniciar o vídeo após várias tentativas.');
        setPlayerState('error_persistent');
      } else {
        setPlayError('Não foi possível iniciar o vídeo neste momento.');
        setPlayerState('error');
      }
    }
  };

  const openRelatedItem = (item: MediaItemCard) => {
    onNavigate('player_video', {
      collectionId: item.collectionId ?? collection.id,
      mediaItemId: item.id,
      assetTitle: item.title,
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === 'escape') {
        event.preventDefault();
        handleBack();
        return;
      }

      if (isYouTubeSource) {
        return;
      }

      if (key === ' ' || key === 'k') {
        event.preventDefault();
        togglePlay();
        return;
      }

      if (key === 'arrowleft' || key === 'j') {
        event.preventDefault();
        skip(-10);
        return;
      }

      if (key === 'arrowright' || key === 'l') {
        event.preventDefault();
        skip(10);
        return;
      }

      if (key === 'm') {
        event.preventDefault();
        if (videoRef.current) {
          const newMutedState = !isMuted;
          videoRef.current.muted = newMutedState;
          setIsMuted(newMutedState);
          if (newMutedState) {
            setVolume(0);
          } else {
            setVolume(1);
            videoRef.current.volume = 1;
          }
        }
        return;
      }

      if (key === 'f') {
        event.preventDefault();
        if (!document.fullscreenElement) {
          containerRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => undefined);
        } else {
          document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => undefined);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleBack, isMuted, isYouTubeSource]);

  useEffect(() => {
    if (!showControls || !showShortcutsHint) {
      return;
    }

    const hintTimer = window.setTimeout(() => {
      setShowShortcutsHint(false);
    }, 5000);

    return () => {
      window.clearTimeout(hintTimer);
    };
  }, [showControls, showShortcutsHint]);

  // Auto-focus primary CTA when modals appear
  useEffect(() => {
    if (playerState === 'ended') {
      endedFocusRef.current?.focus();
    }
  }, [playerState === 'ended']);

  useEffect(() => {
    if (playerState === 'error_persistent') {
      errorPersistentFocusRef.current?.focus();
    }
  }, [playerState === 'error_persistent']);

  useEffect(() => {
    const controlsElement = controlsContainerRef.current;

    if (!controlsElement) {
      return;
    }

    if (overlayActive) {
      controlsElement.setAttribute('inert', '');
    } else {
      controlsElement.removeAttribute('inert');
    }

    return () => {
      controlsElement.removeAttribute('inert');
    };
  }, [overlayActive]);

  if (isMobilePortrait) {
    const visibleMobileQueueItems = showMobileQueue ? relatedItems : relatedItems.slice(0, 2);
    const hiddenQueueCount = Math.max(relatedItems.length - visibleMobileQueueItems.length, 0);

    return (
      <div
        ref={containerRef}
        className="fixed inset-0 z-50 overflow-y-auto bg-black text-white"
        role="dialog"
        aria-modal="true"
        aria-label="Player de vídeo"
        onTouchStart={resetControlsTimeout}
      >
        <div className="min-h-full pb-[max(1rem,env(safe-area-inset-bottom))]">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-black/80 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition-colors hover:bg-white/10"
                aria-label="Voltar"
              >
                <Icons.ChevronLeft size={22} strokeWidth={2.5} />
              </button>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Vídeo</p>
                <h1 className="truncate text-sm font-black text-white">{resolvedTitle}</h1>
                <p className="truncate text-xs text-white/55">{collection.title}</p>
              </div>

              {canDownloadOffline && !isYouTubeSource && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (isOfflineDownloaded) {
                      handleOfflineRemove();
                    } else {
                      handleOfflineDownload();
                    }
                  }}
                  disabled={isOfflineDownloading}
                  aria-label={isOfflineDownloaded ? 'Remover download offline' : 'Baixar vídeo para offline'}
                  className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[10px] font-black uppercase tracking-[0.08em] transition-colors disabled:cursor-default ${
                    isOfflineDownloaded
                      ? 'border-red-300/50 bg-red-500/20 text-red-100 hover:bg-red-500/30'
                      : isOfflineDownloading
                        ? 'border-white/30 bg-white/15 text-white/85'
                        : 'border-white/20 bg-white/5 text-white/80 hover:bg-white/10'
                  }`}
                >
                  {isOfflineDownloading ? (
                    <Icons.RotateCw size={14} className="animate-spin" />
                  ) : isOfflineDownloaded ? (
                    <Icons.Trash2 size={14} />
                  ) : (
                    <Icons.Download size={14} />
                  )}
                  <span className="hidden min-[360px]:inline">{isOfflineDownloaded ? 'Remover' : isOfflineDownloading ? 'Baixando' : 'Offline'}</span>
                </button>
              )}
            </div>
          </header>

          <div className="px-4 pt-4">
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
              <div className="aspect-video">
                {youtubeEmbedUrl ? (
                  <iframe
                    src={youtubeEmbedUrl}
                    title={resolvedTitle || 'Vídeo do YouTube'}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    onLoad={() => { setIsLoading(false); setPlayerState('playing'); }}
                  />
                ) : resolvedVideoUrl ? (
                  <video
                    ref={videoRef}
                    src={resolvedVideoUrl}
                    className="h-full w-full bg-black object-contain"
                    playsInline
                    onClick={(event) => { event.stopPropagation(); togglePlay(); }}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedData={handleLoadedData}
                    onWaiting={() => { setIsLoading(true); }}
                    onPlaying={() => { setIsLoading(false); setPlayerState('playing'); }}
                    onPause={() => {
                      setIsPlaying(false);
                      setPlayerState('paused');
                      maybeSaveProgress(true);
                    }}
                    onError={() => {
                      setIsLoading(false);
                      setIsPlaying(false);
                      setPlayError('Não foi possível carregar o vídeo nesta conexão.');
                      const isPersistent = retryCountRef.current >= 2;
                      setPlayerState(isPersistent ? 'error_persistent' : 'error');
                    }}
                    onEnded={() => {
                      setIsPlaying(false);
                      setPlayerState('ended');
                      setShowControls(true);
                      maybeSaveProgress(true);
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center px-6">
                    <div className="max-w-md rounded-2xl border border-white/15 bg-black/50 p-6 text-center backdrop-blur-sm">
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/70">Transmissão indisponível</p>
                      <h2 className="mt-3 text-lg font-black text-white">Não conseguimos carregar este vídeo agora</h2>
                      <p className="mt-2 text-sm text-white/80">
                        Você pode voltar para a biblioteca ou seguir para outro conteúdo relacionado.
                      </p>
                      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={handleBack}
                          className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/20"
                        >
                          Voltar para biblioteca
                        </button>
                        {leadRelatedItem && (
                          <button
                            type="button"
                            onClick={() => openRelatedItem(leadRelatedItem)}
                            className="rounded-xl border border-white/20 bg-kaboo-primary/80 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-kaboo-primary"
                          >
                            Tentar próximo vídeo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {!isYouTubeSource && resolvedVideoUrl && playerState !== 'ended' && playerState !== 'error_persistent' && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={(event) => togglePlay(event)}
                    className="pointer-events-auto inline-flex h-20 w-20 items-center justify-center rounded-full border border-white/25 bg-black/28 text-white shadow-[0_20px_36px_rgba(0,0,0,0.35)] backdrop-blur-md transition-transform active:scale-95"
                    aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
                  >
                    {isPlaying ? (
                      <Icons.Pause size={34} fill="currentColor" strokeWidth={2} />
                    ) : (
                      <Icons.Play size={34} fill="currentColor" strokeWidth={2} className="ml-1" />
                    )}
                  </button>
                </div>
              )}

              {isLoading && (resolvedVideoUrl || youtubeEmbedUrl) && (
                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white"></div>
                </div>
              )}

              {playerState === 'ended' && (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="overlay-ended-title-mobile"
                  className="absolute inset-0 z-20 flex items-center justify-center bg-black/75 px-4 text-center backdrop-blur-sm"
                >
                  <div className="flex max-w-xs flex-col items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/40 bg-white/10 backdrop-blur-md">
                      <Icons.Check size={32} className="text-white" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">Concluído</p>
                      <h2 id="overlay-ended-title-mobile" className="mt-1 text-xl font-black text-white">{resolvedTitle}</h2>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        ref={endedFocusRef}
                        autoFocus
                        type="button"
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.currentTime = 0;
                            videoRef.current.play().then(() => {
                              setIsPlaying(true);
                              setPlayerState('playing');
                              retryCountRef.current = 0;
                            }).catch(() => undefined);
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/25 active:scale-95"
                      >
                        <Icons.RotateCw size={15} /> Assistir de novo
                      </button>
                      {leadRelatedItem && (
                        <button
                          type="button"
                          onClick={() => openRelatedItem(leadRelatedItem)}
                          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-black transition-colors hover:bg-white/90 active:scale-95"
                        >
                          <Icons.ChevronRight size={15} />
                          <span className="max-w-[150px] truncate">{leadRelatedItem.title}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {playerState === 'error_persistent' && (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="overlay-error-title-mobile"
                  className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 px-4 text-center backdrop-blur-sm"
                >
                  <div className="w-full max-w-sm rounded-2xl border border-red-400/30 bg-red-900/60 p-6 backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-red-400/40 bg-red-500/20">
                      <Icons.AlertCircle size={28} className="text-red-300" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-300/80">Falha persistente</p>
                    <h2 id="overlay-error-title-mobile" className="mt-2 text-lg font-black text-white">Não foi possível carregar o vídeo</h2>
                    <p className="mt-2 text-sm text-white/70">
                      Verifique sua conexão e tente novamente, ou acesse outro conteúdo.
                    </p>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                      <button
                        ref={errorPersistentFocusRef}
                        autoFocus
                        type="button"
                        onClick={() => {
                          retryCountRef.current = 0;
                          setPlayerState('loading');
                          retryPlayback();
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/25 active:scale-95"
                      >
                        <Icons.RotateCw size={15} /> Tentar novamente
                      </button>
                      {leadRelatedItem && (
                        <button
                          type="button"
                          onClick={() => openRelatedItem(leadRelatedItem)}
                          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-black transition-colors hover:bg-white/90 active:scale-95"
                        >
                          <Icons.ChevronRight size={15} />
                          <span className="max-w-[150px] truncate">{leadRelatedItem.title}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 px-4 pt-4">
            {playError && (
              <div className={`${panelChromeClass} border-red-300/35 bg-red-500/82 px-4 py-3 text-sm text-white`}>
                <p>{playError}</p>
                {resolvedVideoUrl && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      retryPlayback();
                    }}
                    className="mt-2 rounded-lg border border-white/35 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white"
                  >
                    Tentar novamente
                  </button>
                )}
              </div>
            )}

            {offlineDownloadError && (
              <div className={`${panelChromeClass} border-red-300/35 bg-red-500/82 px-4 py-3 text-sm text-white`}>
                <p>{offlineDownloadError}</p>
              </div>
            )}

            {!isYouTubeSource ? (
              <section className={`${panelChromeClass} p-4`}>
                <div className="flex items-center gap-2.5 text-[11px] font-bold text-white/85">
                  <span className="tabular-nums">{formatTime(currentTime)}</span>
                  <div className="relative flex h-5 flex-1 items-center">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleSeek}
                      onMouseUp={handleSeekEnd}
                      onTouchEnd={handleSeekEnd}
                      className="relative z-20 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/30 focus:outline-none"
                      style={{
                        background: `linear-gradient(to right, ${themeColor} ${progressPercent}%, rgba(255,255,255,0.3) ${progressPercent}%)`
                      }}
                    />
                  </div>
                  <span className="tabular-nums text-white/70">-{formatTime(remainingTime)}</span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => skip(-10)}
                    className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/20 bg-white/8 text-white transition-colors hover:bg-white/14"
                    aria-label="Voltar 10 segundos"
                  >
                    <Icons.SkipBack size={20} />
                    <span className="text-[11px] font-bold">-10s</span>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => togglePlay(event)}
                    className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/25 bg-white/12 text-white transition-colors hover:bg-white/20"
                    aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
                  >
                    {isPlaying ? <Icons.Pause size={22} fill="currentColor" /> : <Icons.Play size={22} fill="currentColor" className="ml-0.5" />}
                    <span className="text-[11px] font-bold">{isPlaying ? 'Pausar' : 'Play'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => skip(10)}
                    className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/20 bg-white/8 text-white transition-colors hover:bg-white/14"
                    aria-label="Avançar 10 segundos"
                  >
                    <Icons.SkipForward size={20} />
                    <span className="text-[11px] font-bold">+10s</span>
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/20 bg-white/6 px-2 text-center text-white transition-colors hover:bg-white/12"
                  >
                    {isMuted || volume === 0 ? <Icons.VolumeX size={18} /> : <Icons.Volume2 size={18} />}
                    <span className="text-[10px] font-bold uppercase tracking-[0.08em]">Som</span>
                  </button>
                  <button
                    type="button"
                    onClick={toggleSpeed}
                    className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/20 bg-white/6 px-2 text-center text-white transition-colors hover:bg-white/12"
                  >
                    <span className="text-sm font-black">{playbackRate}x</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.08em]">Veloc.</span>
                  </button>
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/20 bg-white/6 px-2 text-center text-white transition-colors hover:bg-white/12"
                  >
                    {isFullscreen ? <Icons.Minimize size={18} /> : <Icons.Maximize size={18} />}
                    <span className="text-[10px] font-bold uppercase tracking-[0.08em]">Tela</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMobileQueue((prev) => !prev)}
                    className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/20 bg-white/6 px-2 text-center text-white transition-colors hover:bg-white/12"
                  >
                    <Icons.ChevronRight size={18} className={`transition-transform ${showMobileQueue ? 'rotate-90' : ''}`} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.08em]">Fila</span>
                  </button>
                </div>

                {leadRelatedItem && (
                  <button
                    type="button"
                    onClick={() => openRelatedItem(leadRelatedItem)}
                    className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-white/20 bg-white/8 p-3 text-left transition-colors hover:bg-white/14"
                  >
                    <div
                      className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-white/8"
                      style={leadRelatedItem.thumbnailUrl ? {
                        backgroundImage: `url(${leadRelatedItem.thumbnailUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      } : undefined}
                    >
                      <span className="absolute bottom-1 left-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/65 text-white">
                        <Icons.Play size={8} className="ml-0.5 fill-current stroke-none" />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/55">Próximo vídeo</p>
                      <p className="mt-1 truncate text-sm font-bold text-white">{leadRelatedItem.title}</p>
                      <p className="truncate text-xs text-white/60">{leadRelatedItem.collectionTitle ?? collection.title}</p>
                    </div>
                    <Icons.ChevronRight size={16} className="shrink-0 text-white/70" />
                  </button>
                )}
              </section>
            ) : (
              <section className={`${panelChromeClass} p-4 text-sm text-white/80`}>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/65">Controles</p>
                <p className="mt-2 leading-6">
                  Reprodução via YouTube. Use os controles nativos do vídeo para avançar, pausar, ajustar som e tela cheia.
                </p>
              </section>
            )}

            {itemDescription && (
              <section className={`${panelChromeClass} p-4`}>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/65">Descrição</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{itemDescription}</p>
              </section>
            )}

            <section className={`${panelChromeClass} p-4`}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/65">Próximos vídeos</p>
                  <p className="mt-1 text-sm font-bold text-white">
                    {relatedItems.length > 0 ? `${relatedItems.length} vídeos na fila` : 'Sem vídeos relacionados'}
                  </p>
                </div>
                {relatedItems.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setShowMobileQueue((prev) => !prev)}
                    className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/8 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white/80 transition-colors hover:bg-white/14"
                  >
                    {showMobileQueue ? 'Enxugar' : 'Ver fila'}
                    <Icons.ChevronRight size={12} className={`transition-transform ${showMobileQueue ? 'rotate-90' : ''}`} />
                  </button>
                )}
              </div>

              {relatedItems.length === 0 ? (
                <p className="mt-3 rounded-2xl border border-white/20 bg-white/6 px-3 py-3 text-sm text-white/65">
                  Não há outros vídeos disponíveis para esta trilha agora.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {visibleMobileQueueItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openRelatedItem(item)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-white/20 bg-white/8 p-3 text-left transition-colors hover:bg-white/14"
                    >
                      <div
                        className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-white/8"
                        style={item.thumbnailUrl ? {
                          backgroundImage: `url(${item.thumbnailUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        } : undefined}
                      >
                        <span className="absolute bottom-1 left-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/65 text-white">
                          <Icons.Play size={8} className="ml-0.5 fill-current stroke-none" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-bold leading-5 text-white">{item.title}</p>
                        <p className="mt-0.5 text-xs text-white/60">{item.collectionTitle ?? collection.title}</p>
                      </div>
                      <Icons.ChevronRight size={16} className="shrink-0 text-white/65" />
                    </button>
                  ))}

                  {!showMobileQueue && hiddenQueueCount > 0 && (
                    <p className="px-1 text-xs text-white/55">
                      +{hiddenQueueCount} vídeo{hiddenQueueCount > 1 ? 's' : ''} escondido{hiddenQueueCount > 1 ? 's' : ''} na fila.
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>

        <style>{`
          input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            height: 14px;
            width: 14px;
            border-radius: 50%;
            background: ${themeColor};
            cursor: pointer;
            margin-top: -5px;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
            border: 2px solid white;
            transform: scale(1);
          }
          input[type=range]::-webkit-slider-runnable-track {
            height: 4px;
            background: transparent;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden group"
      style={{
        '--player-sidebar-width': '340px',
        '--player-edge-gap': '24px',
        '--player-right-rail': 'calc(var(--player-sidebar-width) + var(--player-edge-gap) * 2)',
        '--player-dock-right': desktopDockRightPadding,
      } as React.CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-label="Player de vídeo"
      onMouseMove={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
      onClick={() => setShowControls(!showControls)}
    >
      {/* Dark overlay to darken background */}
      <div className="absolute inset-0 bg-black/10 z-0" />

      {/* Video Element */}
      {youtubeEmbedUrl ? (
        <iframe
          src={youtubeEmbedUrl}
          title={resolvedTitle || 'Vídeo do YouTube'}
          className="h-full w-full"
          style={mobilePortraitMediaTransform ? { transform: mobilePortraitMediaTransform } : undefined}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onLoad={() => { setIsLoading(false); setPlayerState('playing'); }}
        />
      ) : resolvedVideoUrl ? (
        <video
          ref={videoRef}
          src={resolvedVideoUrl}
          className="w-full h-full object-contain"
          style={mobilePortraitMediaTransform ? { transform: mobilePortraitMediaTransform } : undefined}
          playsInline
          onClick={(e) => { e.stopPropagation(); togglePlay(); }}
          onTimeUpdate={handleTimeUpdate}
          onLoadedData={handleLoadedData}
          onWaiting={() => { setIsLoading(true); }}
          onPlaying={() => { setIsLoading(false); setPlayerState('playing'); }}
          onPause={() => {
            setIsPlaying(false);
            setPlayerState('paused');
            maybeSaveProgress(true);
          }}
          onError={() => {
            setIsLoading(false);
            setIsPlaying(false);
            setPlayError('Não foi possível carregar o vídeo nesta conexão.');
            const isPersistent = retryCountRef.current >= 2;
            setPlayerState(isPersistent ? 'error_persistent' : 'error');
          }}
          onEnded={() => {
            setIsPlaying(false);
            setPlayerState('ended');
            setShowControls(true);
            maybeSaveProgress(true);
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-6">
          <div className="max-w-md rounded-2xl border border-white/15 bg-black/50 p-6 text-center backdrop-blur-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/70">Transmissão indisponível</p>
            <h2 className="mt-3 text-lg font-black text-white">Não conseguimos carregar este vídeo agora</h2>
            <p className="mt-2 text-sm text-white/80">
              Você pode voltar para a biblioteca ou seguir para outro conteúdo relacionado.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleBack}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/20"
              >
                Voltar para biblioteca
              </button>
              {leadRelatedItem && (
                <button
                  type="button"
                  onClick={() => openRelatedItem(leadRelatedItem)}
                  className="rounded-xl border border-white/20 bg-kaboo-primary/80 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-kaboo-primary"
                >
                  Tentar próximo vídeo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && (resolvedVideoUrl || youtubeEmbedUrl) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      )}

      {/* Ended Overlay */}
      {playerState === 'ended' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="overlay-ended-title"
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/75 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center gap-6 px-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/40 bg-white/10 backdrop-blur-md">
              <Icons.Check size={40} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/60">Concluído</p>
              <h2 id="overlay-ended-title" className="mt-1 text-2xl font-black text-white">{resolvedTitle}</h2>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                ref={endedFocusRef}
                autoFocus
                type="button"
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0;
                    videoRef.current.play().then(() => {
                      setIsPlaying(true);
                      setPlayerState('playing');
                      retryCountRef.current = 0;
                    }).catch(() => undefined);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/25 active:scale-95"
                aria-label="Assistir novamente"
              >
                <Icons.RotateCw size={16} /> Assistir novamente
              </button>
              {leadRelatedItem && (
                <button
                  type="button"
                  onClick={() => openRelatedItem(leadRelatedItem)}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-black text-black transition-colors hover:bg-white/90 active:scale-95"
                  aria-label={`Próximo: ${leadRelatedItem.title}`}
                >
                  <Icons.ChevronRight size={16} />
                  <span className="max-w-[180px] truncate">{leadRelatedItem.title}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/20 active:scale-95"
              >
                <Icons.ChevronLeft size={16} /> Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Persistent Overlay */}
      {playerState === 'error_persistent' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="overlay-error-title"
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-6 w-full max-w-md rounded-2xl border border-red-400/30 bg-red-900/60 p-8 text-center backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="mb-4 flex h-16 w-16 mx-auto items-center justify-center rounded-full border border-red-400/40 bg-red-500/20">
              <Icons.AlertCircle size={32} className="text-red-300" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-300/80">Falha persistente</p>
            <h2 id="overlay-error-title" className="mt-2 text-xl font-black text-white">Não foi possível carregar o vídeo</h2>
            <p className="mt-2 text-sm text-white/70">
              Verifique sua conexão e tente novamente, ou acesse outro conteúdo.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                ref={errorPersistentFocusRef}
                autoFocus
                type="button"
                onClick={() => {
                  retryCountRef.current = 0;
                  setPlayerState('loading');
                  retryPlayback();
                }}
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/25 active:scale-95"
              >
                <Icons.RotateCw size={16} /> Tentar novamente
              </button>
              {leadRelatedItem && (
                <button
                  type="button"
                  onClick={() => openRelatedItem(leadRelatedItem)}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-black text-black transition-colors hover:bg-white/90 active:scale-95"
                >
                  <Icons.ChevronRight size={16} />
                  <span className="max-w-[160px] truncate">{leadRelatedItem.title}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/20 active:scale-95"
              >
                <Icons.ChevronLeft size={16} /> Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay Gradient for controls visibility */}
      <div className={`absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 transition-opacity duration-300 pointer-events-none ${showControls ? 'opacity-100' : 'opacity-0'}`} />

      {/* Controls Container — hidden behind modal overlays */}
      <div
        ref={controlsContainerRef}
        aria-hidden={overlayActive}
        className={`absolute inset-0 flex flex-col justify-between p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] transition-opacity duration-300 md:p-6 lg:pr-[var(--player-dock-right)] ${overlayActive ? 'opacity-0 pointer-events-none' : showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >

        {/* Top Bar */}
        <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleBack}
            className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md shadow-xl text-white flex items-center justify-center hover:bg-black/30 transition-all active:scale-95 border border-white/30"
            aria-label="Voltar"
          >
            <Icons.ChevronLeft size={24} strokeWidth={2.5} />
          </button>

          <div className="flex-1 px-3 text-center">
            <div className="inline-block max-w-[min(70vw,560px)] rounded-full border border-white/15 bg-black/30 px-4 py-2 shadow-lg backdrop-blur-md md:px-6">
              <h1 className="line-clamp-1 text-xs font-bold text-white drop-shadow-sm md:text-base">
                {resolvedTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canDownloadOffline && !isYouTubeSource && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (isOfflineDownloaded) {
                    handleOfflineRemove();
                  } else {
                    handleOfflineDownload();
                  }
                }}
                disabled={isOfflineDownloading}
                aria-label={isOfflineDownloaded ? 'Remover download offline' : 'Baixar vídeo para offline'}
                className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold transition-colors disabled:cursor-default ${
                  isOfflineDownloaded
                    ? 'border-red-300/50 bg-red-500/20 text-red-200 hover:bg-red-500/35'
                    : isOfflineDownloading
                      ? 'border-white/30 bg-white/15 text-white/90'
                      : 'border-white/25 bg-black/30 text-white/90 hover:bg-black/45'
                }`}
              >
                {isOfflineDownloading ? (
                  <Icons.RotateCw size={13} className="animate-spin" />
                ) : isOfflineDownloaded ? (
                  <Icons.Trash2 size={13} />
                ) : (
                  <Icons.Download size={13} />
                )}
                <span className="hidden md:inline">
                  {isOfflineDownloaded ? 'Remover offline' : isOfflineDownloading ? 'Baixando...' : 'Baixar offline'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setShowDesktopRelated((prev) => !prev);
              }}
              aria-label={showDesktopRelated ? 'Ocultar relacionados' : 'Mostrar relacionados'}
              className="hidden h-10 items-center gap-1.5 rounded-full border border-white/25 bg-black/30 px-3 text-[11px] font-bold text-white/90 transition-colors hover:bg-black/45 lg:inline-flex"
            >
              {showDesktopRelated ? 'Ocultar' : 'Relacionados'}
              <Icons.ChevronRight size={13} className={`transition-transform ${showDesktopRelated ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {showShortcutsHint && (
          <div className="pointer-events-none absolute right-4 top-16 hidden rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/75 backdrop-blur-md md:block">
            Espaço/K: play, J/L: 10s, M: mute, F: full, ESC: voltar
          </div>
        )}

        {!isYouTubeSource && (
          <>
            {/* Center Play Button */}
            <div
              className="absolute left-1/2 top-1/2 flex items-center gap-12"
              style={{ transform: mobilePortraitCenterTransform }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => skip(-10)}
                className="text-white/70 hover:text-white transition-colors p-4 rounded-full hover:bg-white/10 active:scale-95 hidden md:block"
              >
                <div className="flex flex-col items-center">
                  <Icons.SkipBack size={32} />
                  <span className="text-[10px] font-bold">-10s</span>
                </div>
              </button>

              <button
                onClick={(e) => togglePlay(e)}
                className="w-20 h-20 rounded-full bg-black/20 backdrop-blur-md shadow-xl flex items-center justify-center text-white border border-white/30 transition-all active:scale-95 hover:bg-black/30 hover:scale-110"
                aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
              >
                {isPlaying ? (
                  <Icons.Pause size={36} fill="currentColor" strokeWidth={2} />
                ) : (
                  <Icons.Play size={36} fill="currentColor" strokeWidth={2} className="ml-1" />
                )}
              </button>

              <button
                onClick={() => skip(10)}
                className="text-white/70 hover:text-white transition-colors p-4 rounded-full hover:bg-white/10 active:scale-95 hidden md:block"
              >
                <div className="flex flex-col items-center">
                  <Icons.SkipForward size={32} />
                  <span className="text-[10px] font-bold">+10s</span>
                </div>
              </button>
            </div>

            {/* Bottom Control Dock */}
            <div className="w-full flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
              {playError && (
                <div className="mx-auto w-full max-w-[min(100%,980px)] lg:max-w-none lg:ml-0 lg:mr-[var(--player-dock-right)]">
                  <div role="alert" className="rounded-2xl border border-red-300/35 bg-red-500/82 px-4 py-3 text-sm text-white backdrop-blur-md shadow-[0_14px_26px_rgba(0,0,0,0.28)]">
                    <p>{playError}</p>
                    {resolvedVideoUrl && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          retryPlayback();
                        }}
                        className="mt-2 rounded-lg border border-white/35 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white"
                      >
                        Tentar novamente
                      </button>
                    )}
                  </div>
                </div>
              )}

              {offlineDownloadError && (
                <div className="mx-auto w-full max-w-[min(100%,980px)] lg:max-w-none lg:ml-0 lg:mr-[var(--player-dock-right)]">
                  <div role="alert" className="rounded-2xl border border-red-300/35 bg-red-500/82 px-4 py-3 text-sm text-white backdrop-blur-md shadow-[0_14px_26px_rgba(0,0,0,0.28)]">
                    <p>{offlineDownloadError}</p>
                  </div>
                </div>
              )}

              <div className="mx-auto w-full max-w-[min(100%,980px)] lg:max-w-none lg:ml-0 lg:mr-[var(--player-dock-right)]">
                <div className={`${panelChromeClass} px-3 pb-3 pt-2 md:px-4`}>
                  <div className="flex items-center gap-2.5 text-[11px] font-bold text-white/85 md:text-xs">
                    <span className="tabular-nums">{formatTime(currentTime)}</span>
                    <div className="relative flex-1 h-4 flex items-center">
                      <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleSeek}
                        onMouseUp={handleSeekEnd}
                        onTouchEnd={handleSeekEnd}
                        className="w-full h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer focus:outline-none relative z-20 transition-all hover:h-2"
                        style={{
                          background: `linear-gradient(to right, ${themeColor} ${progressPercent}%, rgba(255,255,255,0.3) ${progressPercent}%)`
                        }}
                      />
                    </div>
                    <span className="tabular-nums text-white/70">-{formatTime(remainingTime)}</span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-1.5 md:gap-2.5">
                      <button
                        onClick={() => skip(-10)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/8 text-white/90 transition-colors hover:bg-white/14"
                        aria-label="Voltar 10 segundos"
                        title="Voltar 10s (J)"
                      >
                        <Icons.SkipBack size={18} />
                      </button>
                      <button
                        onClick={(e) => togglePlay(e)}
                        className="inline-flex h-11 min-w-[52px] items-center justify-center rounded-xl border border-white/25 bg-white/8 px-3 text-white transition-colors hover:bg-white/18"
                        aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
                        title="Play/Pause (Espaço ou K)"
                      >
                        {isPlaying ? <Icons.Pause size={20} fill="currentColor" /> : <Icons.Play size={20} fill="currentColor" className="ml-0.5" />}
                      </button>
                      <button
                        onClick={() => skip(10)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/8 text-white/90 transition-colors hover:bg-white/14"
                        aria-label="Avançar 10 segundos"
                        title="Avançar 10s (L)"
                      >
                        <Icons.SkipForward size={18} />
                      </button>
                      <p className="hidden text-xs font-bold text-white/80 sm:block">
                        <span className="tabular-nums">{formatTime(currentTime)}</span>
                        <span className="mx-1 text-white/45">/</span>
                        <span className="tabular-nums">{formatTime(duration)}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 md:gap-2">
                      <button
                        onClick={toggleMute}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/8 text-white/90 transition-colors hover:bg-white/14"
                        title="Ativar/desativar som (M)"
                      >
                        {isMuted || volume === 0 ? <Icons.VolumeX size={18} /> : <Icons.Volume2 size={18} />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="hidden h-1 w-20 appearance-none rounded-lg bg-white/30 md:block"
                        style={{
                          background: `linear-gradient(to right, white ${volume * 100}%, rgba(255,255,255,0.3) ${volume * 100}%)`
                        }}
                      />
                      <button
                        onClick={toggleSpeed}
                        className="inline-flex h-9 min-w-[44px] items-center justify-center rounded-lg border border-white/20 bg-white/8 px-2.5 text-xs font-black text-white transition-colors hover:bg-white/14"
                        title="Velocidade"
                      >
                        {playbackRate}x
                      </button>
                      <button
                        onClick={toggleFullscreen}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/8 text-white/90 transition-colors hover:bg-white/14"
                        title="Tela cheia (F)"
                      >
                        {isFullscreen ? <Icons.Minimize size={18} /> : <Icons.Maximize size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {itemDescription && (
                <section className="pointer-events-auto mx-auto hidden w-full max-w-[min(100%,980px)] lg:block lg:max-w-none lg:ml-0 lg:mr-[var(--player-dock-right)]">
                  <div className={`${panelChromeClass} p-4`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/65">Descrição</p>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setIsDesktopDescriptionExpanded((prev) => !prev);
                        }}
                        aria-label={isDesktopDescriptionExpanded ? 'Recolher descrição' : 'Expandir descrição'}
                        className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/6 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white/75 transition-colors hover:bg-white/12"
                      >
                        {isDesktopDescriptionExpanded ? 'Recolher' : 'Expandir'}
                        <Icons.ChevronRight size={12} className={`transition-transform ${isDesktopDescriptionExpanded ? 'rotate-90' : ''}`} />
                      </button>
                    </div>
                    <p className={`mt-2 text-sm leading-6 text-white/90 overflow-y-auto pr-1 ${isDesktopDescriptionExpanded ? 'max-h-[180px]' : 'max-h-[68px]'}`}>
                      {itemDescription}
                    </p>
                  </div>
                </section>
              )}

              {leadRelatedItem && (
                <button
                  type="button"
                  onClick={() => openRelatedItem(leadRelatedItem)}
                  className={`mt-2 inline-flex w-full items-center justify-between rounded-xl border border-white/20 bg-white/8 px-3 py-2 text-left text-xs text-white/85 transition-colors hover:bg-white/14 lg:hidden ${isMobilePortrait ? 'hidden' : ''}`}
                >
                  <span className="min-w-0">
                    <span className="text-[10px] uppercase tracking-[0.12em] text-white/60">Próximo</span>
                    <span className="mt-0.5 block truncate font-bold text-white">{leadRelatedItem.title}</span>
                  </span>
                  <Icons.ChevronRight size={14} className="shrink-0 text-white/70" />
                </button>
              )}
            </div>
          </>
        )}

        {isYouTubeSource && (
          <div className="pointer-events-auto mx-auto mb-2 w-full max-w-[min(100%,980px)] rounded-2xl border border-white/20 bg-black/55 px-4 py-3 text-xs text-white/80 backdrop-blur-md">
            Reprodução via YouTube: use os controles nativos do vídeo.
          </div>
        )}
      </div>

      <aside className={`pointer-events-auto absolute bottom-6 right-[var(--player-edge-gap)] top-24 z-30 hidden w-[var(--player-sidebar-width)] flex-col overflow-hidden ${panelChromeClass} lg:flex ${showDesktopRelated ? '' : 'opacity-0 pointer-events-none translate-x-4'}`}>
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/65">Próximos vídeos</p>
          <h2 className="mt-1 text-sm font-black text-white">Relacionados</h2>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {relatedItems.length === 0 && (
            <p className="rounded-xl border border-white/20 bg-white/8 px-3 py-3 text-xs text-white/70">
              Sem relacionados para este vídeo.
            </p>
          )}

          {relatedItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openRelatedItem(item)}
              className={`flex w-full items-start gap-3 p-2.5 text-left ${cardChromeClass}`}
            >
              <div
                className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/20 bg-white/8"
                style={item.thumbnailUrl ? {
                  backgroundImage: `url(${item.thumbnailUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                } : undefined}
              >
                <span className="absolute bottom-1 left-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/65 text-white">
                  <Icons.Play size={10} className="ml-0.5 fill-current stroke-none" />
                </span>
              </div>

              <div className="min-w-0">
                <p className="line-clamp-2 text-[13px] font-bold leading-5 text-white">{item.title}</p>
                <p className="mt-1 text-[11px] text-white/70">{item.collectionTitle ?? 'Kaboo'}</p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className={`pointer-events-auto absolute left-4 right-4 z-30 rounded-2xl border border-white/15 bg-black/55 p-3 backdrop-blur-md transition-all duration-300 lg:hidden ${showMobileQueue ? 'bottom-4 max-h-[52vh]' : isMobilePortrait ? 'bottom-4 max-h-[112px]' : 'bottom-20 max-h-[72px]'}`} onClick={(event) => event.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between px-0.5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/65">Próximos vídeos</p>
          <button
            type="button"
            onClick={() => setShowMobileQueue((prev) => !prev)}
            aria-label={showMobileQueue ? 'Ocultar fila de vídeos' : 'Mostrar fila de vídeos'}
            className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/8 px-2 py-1 text-[10px] font-bold text-white/75"
          >
            {showMobileQueue ? 'Ocultar' : 'Mostrar'}
            <Icons.ChevronRight size={12} className={`transition-transform ${showMobileQueue ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {!showMobileQueue ? (
          <div className="space-y-2">
            <p className="text-[11px] text-white/70">
              {relatedItems.length > 0 ? `${relatedItems.length} vídeos na fila` : 'Sem vídeos na fila'}
            </p>
            {isMobilePortrait && leadRelatedItem && (
              <button
                type="button"
                onClick={() => openRelatedItem(leadRelatedItem)}
                className="flex w-full items-center gap-2.5 rounded-xl border border-white/20 bg-white/8 p-2 text-left transition-colors hover:bg-white/14"
              >
                <div
                  className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-white/20 bg-white/8"
                  style={leadRelatedItem.thumbnailUrl ? {
                    backgroundImage: `url(${leadRelatedItem.thumbnailUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  } : undefined}
                >
                  <span className="absolute bottom-1 left-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/65 text-white">
                    <Icons.Play size={8} className="ml-0.5 fill-current stroke-none" />
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-white/55">Próximo</p>
                  <p className="mt-0.5 line-clamp-2 text-[12px] font-bold leading-4 text-white">{leadRelatedItem.title}</p>
                </div>

                <Icons.ChevronRight size={14} className="shrink-0 text-white/70" />
              </button>
            )}
          </div>
        ) : relatedItems.length === 0 ? (
          <p className="rounded-xl border border-white/20 bg-white/8 px-3 py-2 text-xs text-white/70">
            Sem relacionados para este vídeo.
          </p>
        ) : (
          <div className="max-h-[38vh] space-y-2 overflow-y-auto pr-0.5">
            {relatedItems.slice(0, 2).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openRelatedItem(item)}
                className="flex w-full items-center gap-2.5 rounded-xl border border-white/20 bg-white/8 p-2 text-left transition-colors hover:bg-white/14"
              >
                <div
                  className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/20 bg-white/8"
                  style={item.thumbnailUrl ? {
                    backgroundImage: `url(${item.thumbnailUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  } : undefined}
                >
                  <span className="absolute bottom-1 left-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/65 text-white">
                    <Icons.Play size={8} className="ml-0.5 fill-current stroke-none" />
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="line-clamp-2 text-[12px] font-bold leading-4 text-white">{item.title}</p>
                  <p className="mt-0.5 text-[10px] text-white/70">{item.collectionTitle ?? 'Kaboo'}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 14px;
          width: 14px;
          border-radius: 50%;
          background: ${themeColor};
          cursor: pointer;
          margin-top: -5px; 
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
          border: 2px solid white;
          transform: scale(0);
          transition: transform 0.1s;
        }
        .group:hover input[type=range]::-webkit-slider-thumb {
             transform: scale(1.2);
        }
        input[type=range]::-webkit-slider-runnable-track {
            height: 4px;
            background: transparent;
        }
        .group\\/vol input[type=range]::-webkit-slider-thumb {
            background: white;
            height: 12px;
            width: 12px;
            margin-top: -4px;
            border: none;
            box-shadow: 0 0 4px rgba(0,0,0,0.5);
            transform: scale(1);
        }
      `}</style>
    </div>
  );
};
