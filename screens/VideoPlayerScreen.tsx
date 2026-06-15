import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icons } from '../components/Icons';
import { Collection, MediaItemCard, ScreenName } from '../types';
import useIsMobile from '../hooks/useIsMobile';
import useOrientation from '../hooks/useOrientation';
import { useThemeBackground } from '../hooks/useThemeBackground';
import { api } from '../lib/api';
import {
  getVideoPlayerLayout,
  getVideoPlayerSurfaceAction,
  shouldAutoHideVideoPlayerControls,
  shouldResetMobileUtilityPanels,
  shouldRenderInlineNextVideoCard,
} from '../lib/videoPlayerLandscape';
import { useOfflineDownload } from '../hooks/useOfflineDownload';

interface VideoPlayerScreenProps {
  collection: Collection;
  mediaItemId?: string;
  assetUrl?: string;
  assetTitle?: string;
  assetOfflineAvailable?: boolean | null;
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

type SkipGlyphDirection = 'back' | 'forward';

const SkipTenGlyph: React.FC<{ direction: SkipGlyphDirection; size?: number }> = ({
  direction,
  size = 30,
}) => {
  const glyphPaths = direction === 'back'
    ? [
      'M11.99,5V1l-5,5l5,5V7c3.31,0,6,2.69,6,6s-2.69,6-6,6s-6-2.69-6-6h-2c0,4.42,3.58,8,8,8s8-3.58,8-8S16.41,5,11.99,5z',
      'M10.89,16h-0.85v-3.26l-1.01,0.31v-0.69l1.77-0.63h0.09V16z',
      'M15.17,14.24c0,0.32-0.03,0.6-0.1,0.82s-0.17,0.42-0.29,0.57s-0.28,0.26-0.45,0.33s-0.37,0.1-0.59,0.1s-0.41-0.03-0.59-0.1s-0.33-0.18-0.46-0.33s-0.23-0.34-0.3-0.57s-0.11-0.5-0.11-0.82V13.5c0-0.32,0.03-0.6,0.1-0.82s0.17-0.42,0.29-0.57s0.28-0.26,0.45-0.33s0.37-0.1,0.59-0.1s0.41,0.03,0.59,0.1c0.18,0.07,0.33,0.18,0.46,0.33s0.23,0.34,0.3,0.57s0.11,0.5,0.11,0.82V14.24z M14.32,13.38c0-0.19-0.01-0.35-0.04-0.48s-0.07-0.23-0.12-0.31s-0.11-0.14-0.19-0.17s-0.16-0.05-0.25-0.05s-0.18,0.02-0.25,0.05s-0.14,0.09-0.19,0.17s-0.09,0.18-0.12,0.31s-0.04,0.29-0.04,0.48v0.97c0,0.19,0.01,0.35,0.04,0.48s0.07,0.24,0.12,0.32s0.11,0.14,0.19,0.17s0.16,0.05,0.25,0.05s0.18-0.02,0.25-0.05s0.14-0.09,0.19-0.17s0.09-0.19,0.11-0.32s0.04-0.29,0.04-0.48V13.38z',
    ]
    : [
      'M18,13c0,3.31-2.69,6-6,6s-6-2.69-6-6s2.69-6,6-6v4l5-5l-5-5v4c-4.42,0-8,3.58-8,8c0,4.42,3.58,8,8,8s8-3.58,8-8H18z',
      'M10.86,15.94V11.67H10.77L9,12.3v0.69l1.01-0.31v3.26H10.86z',
      'M12.25,13.44v0.74c0,1.9,1.31,1.82,1.44,1.82c0.14,0,1.44,0.09,1.44-1.82v-0.74c0-1.9-1.31-1.82-1.44-1.82C13.55,11.62,12.25,11.53,12.25,13.44z M14.29,13.32v0.97c0,0.77-0.21,1.03-0.59,1.03c-0.38,0-0.6-0.26-0.6-1.03v-0.97c0-0.75,0.22-1.01,0.59-1.01C14.07,12.3,14.29,12.57,14.29,13.32z',
    ];

  const [outlinePath, ...numberPaths] = glyphPaths;

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="overflow-visible fill-current text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
    >
      <path d={outlinePath} />
      <g transform="translate(12 13.85) scale(1.18) translate(-12 -13.85)">
        {numberPaths.map((path) => (
          <path key={path} d={path} />
        ))}
      </g>
    </svg>
  );
};

export const VideoPlayerScreen: React.FC<VideoPlayerScreenProps> = ({
  collection,
  mediaItemId,
  assetUrl,
  assetTitle,
  assetOfflineAvailable,
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
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const [showMobileUtilitySheet, setShowMobileUtilitySheet] = useState(false);
  const [showDesktopRelated, setShowDesktopRelated] = useState(false);
  // When true, renders the YouTube-style page layout (video + info + related side by side).
  // When false, renders the fullscreen landscape overlay.
  // Default true so the player opens in page mode; click "Expandir" to go fullscreen.
  const [isPlayerCollapsed, setIsPlayerCollapsed] = useState(true);
  const [isCompactHeightViewport, setIsCompactHeightViewport] = useState(false);
  const [playerState, setPlayerState] = useState<PlayerState>('loading');

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<any>(null);
  // YouTube postMessage control
  const ytIframeRef = useRef<HTMLIFrameElement>(null);
  const ytPrevCtRef = useRef<number>(-1); // track previous currentTime to infer playing state
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
  // Desktop page mode: player is "collapsed" (not fullscreen) on a non-mobile device
  const isDesktopPage = isPlayerCollapsed && !isMobile;
  // Unified YouTube-style page layout: mobile portrait OR desktop page mode
  const isYouTubePage = isMobilePortrait || isDesktopPage;
  // isPlayerCollapsed is desktop-only — mobile landscape layout is purely device-driven
  const isMobileLandscape = isLandscape && (isMobile || isCompactHeightViewport);
  const currentPlayerLayout = getVideoPlayerLayout(isMobilePortrait, isMobileLandscape);
  const previousPlayerContextRef = useRef({
    layout: currentPlayerLayout,
    isFullscreen: false,
  });
  const resolvedVideoUrl = resolvedPlaybackUrl ?? assetUrl ?? collection.video_url;
  const resolvedTitle = resolvedPlaybackTitle ?? assetTitle ?? collection.title;
  const youtubeVideoId = getYouTubeVideoId(resolvedVideoUrl);
  const isYouTubeSource = Boolean(youtubeVideoId);
  // iOS/Safari/Edge bloqueiam play programático (postMessage) de iframe YouTube. Em
  // dispositivos touch usamos os CONTROLES NATIVOS do YouTube (controls=1) para que o
  // toque no player do YouTube inicie o vídeo. No desktop mantemos os controles do app.
  const isTouchDevice = typeof window !== 'undefined'
    && (('ontouchstart' in window) || (navigator.maxTouchPoints ?? 0) > 0);
  const youtubeEmbedUrl = youtubeVideoId
    ? `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=${isTouchDevice ? 0 : 1}&playsinline=1&rel=0&enablejsapi=1&controls=${isTouchDevice ? 1 : 0}`
    : null;
  const {
    isAvailable: canDownloadOffline,
    isDownloaded: isOfflineDownloaded,
    isDownloading: isOfflineDownloading,
    downloadError: offlineDownloadError,
    handleDownload: handleOfflineDownload,
    handleRemove: handleOfflineRemove,
  } = useOfflineDownload(collection, [resolvedVideoUrl], assetOfflineAvailable);

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

  // YouTube: postMessage for commands; YT.Player for registration + callbacks; window.message for infoDelivery
  const ytPostMessage = useCallback((func: string, args: any[] = []) => {
    ytIframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      '*'
    );
  }, []);

  useEffect(() => {
    if (!isYouTubeSource) return;

    // Listen for infoDelivery events (currentTime, duration, playerState)
    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.event === 'infoDelivery' && data.info) {
          const { playerState: ps, currentTime: ct, duration: dur } = data.info;
          if (typeof ct === 'number') {
            setCurrentTime(ct);
            // Infer playing state from time progression:
            // YouTube only sends infoDelivery while playing, and
            // playerState is only included when the state CHANGES.
            // So if currentTime moved forward, the video is playing.
            if (ct !== ytPrevCtRef.current && ytPrevCtRef.current >= 0) {
              setIsPlaying(true);
              setPlayerState('playing');
              setIsLoading(false);
            }
            ytPrevCtRef.current = ct;
          }
          if (typeof dur === 'number' && dur > 0) setDuration(dur);
          if (typeof ps === 'number') {
            if (ps === 1) { setIsPlaying(true); setPlayerState('playing'); setIsLoading(false); }
            else if (ps === 2) {
              setIsPlaying(false); setPlayerState('paused');
              ytPrevCtRef.current = -1; // reset: previne re-ativar isPlaying por infoDelivery tardio após pause
            }
            else if (ps === 0) {
              setIsPlaying(false); setPlayerState('ended');
              ytPrevCtRef.current = -1; // reset: mesma razão para o estado ended
            }
          }
        }
      } catch { /* ignore non-YouTube messages */ }
    };
    window.addEventListener('message', handleMessage);

    // Register with YT.Player to activate two-way communication (enables infoDelivery events).
    // NOTE: YT.Player methods like playVideo() are unavailable in this API version;
    // we use postMessage commands instead. The constructor is only needed for registration.
    const registerYTPlayer = () => {
      if (!ytIframeRef.current) return;
      const win = window as any;
      if (!win.YT?.Player) return;
      new win.YT.Player(ytIframeRef.current, {
        events: {
          onReady: () => { setIsLoading(false); setPlayerState('playing'); setIsPlaying(true); },
          onStateChange: (e: any) => {
            const s = e?.data;
            if (s === 1) { setIsPlaying(true); setPlayerState('playing'); setIsLoading(false); }
            else if (s === 2) { setIsPlaying(false); setPlayerState('paused'); }
            else if (s === 0) { setIsPlaying(false); setPlayerState('ended'); }
          },
        },
      });
    };

    const win = window as any;
    if (win.YT?.Player) {
      registerYTPlayer();
    } else {
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(script);
      }
      const prev = win.onYouTubeIframeAPIReady;
      win.onYouTubeIframeAPIReady = () => { prev?.(); registerYTPlayer(); };
    }

    // Fallback: mark as playing after 2s if onReady doesn't fire (autoplay=1)
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
      setPlayerState('playing');
      setIsPlaying(true);
    }, 2000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(loadingTimer);
      // Do NOT destroy the YT.Player — it would remove the iframe from the DOM.
      // React manages the iframe lifecycle; we just drop our references.
    };
  }, [isYouTubeSource, youtubeVideoId]);

  useEffect(() => {
    const checkCompactHeightViewport = () => {
      setIsCompactHeightViewport(window.innerHeight <= 500 && window.innerWidth <= 960);
    };

    checkCompactHeightViewport();
    window.addEventListener('resize', checkCompactHeightViewport);

    return () => {
      window.removeEventListener('resize', checkCompactHeightViewport);
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

    // Do NOT clear relatedItems here. Keeping the previous list visible prevents
    // the right column from disappearing (which caused the player to expand/collapse).
    // The hub re-fetch below will update the list correctly in the background.
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

        // Exclude the currently-playing video from "Próximos vídeos" — by id AND by
        // video URL. The URL check is essential because the same video can be reached
        // without a mediaItemId (e.g. opened from a collection's materials list) and
        // because the same video may be referenced by more than one collection.
        const currentUrl = (assetUrl ?? collection.video_url ?? '').trim();
        const unique = Array.from(new Map(allItems.map((item) => [item.id, item])).values());
        const filtered = unique
          .filter((item) => item.id !== mediaItemId)
          .filter((item) => !currentUrl || ((item as { assetUrl?: string | null }).assetUrl ?? '').trim() !== currentUrl)
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
  }, [collection.description, mediaItemId, assetUrl, collection.video_url]);

  useEffect(() => {
    setShowMobileQueue(false);
    setShowMobileDetails(false);
    setShowMobileUtilitySheet(false);
  }, [mediaItemId]);

  useEffect(() => {
    if (!showControls && isMobileLandscape) {
      setShowMobileQueue(false);
      setShowMobileDetails(false);
      setShowMobileUtilitySheet(false);
    }
  }, [isMobileLandscape, showControls]);

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    // YouTube iframe captures mouse events — we can't detect hover over the video area,
    // so auto-hide would leave the user with no way to bring controls back.
    if (shouldAutoHideVideoPlayerControls(isPlaying, isMobilePortrait) && !isYouTubeSource) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  useEffect(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    if (!shouldAutoHideVideoPlayerControls(isPlaying, isMobilePortrait) || isYouTubeSource) {
      return;
    }

    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isMobilePortrait, isPlaying]);

  useEffect(() => {
    const previousContext = previousPlayerContextRef.current;

    if (
      shouldResetMobileUtilityPanels(
        previousContext.layout,
        currentPlayerLayout,
        previousContext.isFullscreen,
        isFullscreen
      )
    ) {
      setShowMobileQueue(false);
      setShowMobileDetails(false);
      setShowMobileUtilitySheet(false);
    }

    previousPlayerContextRef.current = {
      layout: currentPlayerLayout,
      isFullscreen,
    };
  }, [currentPlayerLayout, isFullscreen]);

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
    if (isYouTubeSource) {
      if (isPlaying) ytPostMessage('pauseVideo');
      else ytPostMessage('playVideo');
      return;
    }
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

  const toggleControlsVisibility = (event?: React.MouseEvent) => {
    event?.stopPropagation();

    if (showControls) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }

      setShowControls(false);
      return;
    }

    resetControlsTimeout();
  };

  const handleVideoSurfaceClick = (event: React.MouseEvent) => {
    event.stopPropagation();

    const surfaceAction = getVideoPlayerSurfaceAction(isMobileLandscape, showControls);

    if (surfaceAction !== 'toggle-play') {
      event.preventDefault();
      toggleControlsVisibility();
      return;
    }

    togglePlay();
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
    const time = Number(e.target.value);
    if (isYouTubeSource) {
      ytPostMessage('seekTo', [time, true]);
      setCurrentTime(time);
      return;
    }
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
    if (isYouTubeSource) {
      if (isMuted) { ytPostMessage('unMute'); setIsMuted(false); }
      else { ytPostMessage('mute'); setIsMuted(true); }
      return;
    }
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
    if (isYouTubeSource) {
      const newTime = Math.min(Math.max(currentTime + seconds, 0), duration);
      ytPostMessage('seekTo', [newTime, true]);
      setCurrentTime(newTime);
      return;
    }
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(Math.max(videoRef.current.currentTime + seconds, 0), duration);
    }
  };

  const toggleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetControlsTimeout();
    let newRate = 1.0;
    if (playbackRate === 1.0) newRate = 1.5;
    else if (playbackRate === 1.5) newRate = 2.0;
    else newRate = 1.0;
    setPlaybackRate(newRate);
    if (isYouTubeSource) {
      ytPostMessage('setPlaybackRate', [newRate]);
      return;
    }
    if (videoRef.current) videoRef.current.playbackRate = newRate;
  };

  const requestLandscapeOrientation = useCallback(async () => {
    if (!isMobile) {
      return;
    }

    const screenOrientation = window.screen.orientation as ScreenOrientation & {
      lock?: (orientation: string) => Promise<void>;
    };
    if (!screenOrientation || typeof screenOrientation.lock !== 'function') {
      return;
    }

    try {
      await screenOrientation.lock('landscape');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotSupportedError') {
        return;
      }
      console.warn('Unable to lock screen orientation to landscape.', error);
    }
  }, [isMobile]);

  const releaseScreenOrientation = useCallback(() => {
    const screenOrientation = window.screen.orientation;
    if (!screenOrientation || typeof screenOrientation.unlock !== 'function') {
      return;
    }

    try {
      screenOrientation.unlock();
    } catch (error) {
      console.warn('Unable to release screen orientation lock.', error);
    }
  }, []);

  const toggleFullscreen = useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!document.fullscreenElement) {
      if (!containerRef.current) {
        return;
      }

      try {
        await containerRef.current.requestFullscreen();
      } catch (error) {
        console.warn('Unable to enter fullscreen mode.', error);
      }
      return;
    }

    try {
      await document.exitFullscreen();
    } catch (error) {
      console.warn('Unable to exit fullscreen mode.', error);
    }
  }, []);

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

  const toggleMobileQueuePanel = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    resetControlsTimeout();
    setShowMobileUtilitySheet(true);
    setShowMobileDetails(false);
    setShowMobileQueue((prev) => !prev);
  };

  const toggleMobileDetailsPanel = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    resetControlsTimeout();
    setShowMobileUtilitySheet(true);
    setShowMobileQueue(false);
    setShowMobileDetails((prev) => !prev);
  };

  const toggleMobileUtilitySheet = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    resetControlsTimeout();
    setShowMobileUtilitySheet((prev) => {
      const next = !prev;

      if (!next) {
        setShowMobileQueue(false);
        setShowMobileDetails(false);
      }

      return next;
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
        void toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleBack, isMuted, isYouTubeSource, toggleFullscreen]);

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
    const handleFullscreenChange = () => {
      const nextIsFullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(nextIsFullscreen);

      if (nextIsFullscreen) {
        void requestLandscapeOrientation();
        return;
      }

      releaseScreenOrientation();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [releaseScreenOrientation, requestLandscapeOrientation]);

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

  const relatedItemsQueueLabel = relatedItems.length > 0
    ? `${relatedItems.length} vídeo${relatedItems.length > 1 ? 's' : ''} na fila`
    : 'Sem vídeos na fila';

  if (isYouTubePage) {
    return (
      <div
        ref={containerRef}
        className="fixed inset-0 z-50 overflow-y-auto bg-[#0f0f0f] text-white"
        role="dialog"
        aria-modal="true"
        aria-label="Player de vídeo"
      >
        <div className="min-h-full pb-[max(1.5rem,env(safe-area-inset-bottom))]">

          {/* ── Sticky header ── */}
          <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0f0f0f]/95 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md">
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
                  className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[10px] font-black uppercase tracking-[0.08em] transition-colors disabled:cursor-default ${isOfflineDownloaded
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

          {/* ── Content: responsive YouTube-style layout ── */}
          <div className="mx-auto max-w-screen-xl lg:px-6 lg:py-5">
            <div className="flex flex-col md:flex-row md:gap-6 md:items-start">

              {/* ── Left column: video card + info ── */}
              <div className="min-w-0 flex-1">

                {/* Video card */}
                <div className="overflow-hidden bg-black lg:rounded-xl">

                  {/* Video area — 16:9 */}
                  <div className="relative aspect-video">
                    {youtubeEmbedUrl ? (
                      <iframe
                        ref={ytIframeRef}
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
                                className="rounded-xl border border-white/20 bg-brand-primary/80 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-primary"
                              >
                                Tentar próximo vídeo
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Center play/pause — native video only (YouTube has its own UI) */}
                    {resolvedVideoUrl && !isYouTubeSource && playerState !== 'ended' && playerState !== 'error_persistent' && (
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

                    {/* Loading spinner */}
                    {isLoading && (resolvedVideoUrl || youtubeEmbedUrl) && (
                      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white"></div>
                      </div>
                    )}

                    {/* Ended overlay */}
                    {playerState === 'ended' && (
                      <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="overlay-ended-title-page"
                        className="absolute inset-0 z-20 flex items-center justify-center bg-black/75 px-4 text-center backdrop-blur-sm"
                      >
                        <div className="flex max-w-xs flex-col items-center gap-4">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/40 bg-white/10 backdrop-blur-md">
                            <Icons.Check size={32} className="text-white" strokeWidth={2.5} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">Concluído</p>
                            <h2 id="overlay-ended-title-page" className="mt-1 text-xl font-black text-white">{resolvedTitle}</h2>
                          </div>
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <button
                              ref={endedFocusRef}
                              autoFocus
                              type="button"
                              onClick={() => {
                                if (isYouTubeSource) {
                                  ytPostMessage('seekTo', [0, true]);
                                  ytPostMessage('playVideo');
                                  setPlayerState('playing');
                                } else if (videoRef.current) {
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

                    {/* Error persistent overlay */}
                    {playerState === 'error_persistent' && (
                      <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="overlay-error-title-page"
                        className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 px-4 text-center backdrop-blur-sm"
                      >
                        <div className="w-full max-w-sm rounded-2xl border border-red-400/30 bg-red-900/60 p-6 backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-red-400/40 bg-red-500/20">
                            <Icons.AlertCircle size={28} className="text-red-300" />
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-300/80">Falha persistente</p>
                          <h2 id="overlay-error-title-page" className="mt-2 text-lg font-black text-white">Não foi possível carregar o vídeo</h2>
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
                  </div>{/* end video area */}

                  {/* Controls bar — always visible, sits below the video in document flow */}
                  <div className="border-t border-white/[0.08] bg-black px-4 pb-4 pt-3">

                    {/* Error banners */}
                    {playError && (
                      <div className="mb-3 rounded-xl border border-red-300/35 bg-red-500/20 px-4 py-3 text-sm text-white">
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
                      <div className="mb-3 rounded-xl border border-red-300/35 bg-red-500/20 px-4 py-3 text-sm text-white">
                        <p>{offlineDownloadError}</p>
                      </div>
                    )}

                    {/* Seekbar */}
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
                      <span className="tabular-nums text-white/60">-{formatTime(remainingTime)}</span>
                    </div>

                    {/* Controls row */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => skip(-10)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/85 transition-colors hover:bg-white/10 active:scale-95"
                          aria-label="Voltar 10 segundos"
                        >
                          <SkipTenGlyph direction="back" size={22} />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => togglePlay(event)}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/[0.08] text-white transition-colors hover:bg-white/[0.16] active:scale-95"
                          aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
                        >
                          {isPlaying ? (
                            <Icons.Pause size={22} fill="currentColor" />
                          ) : (
                            <Icons.Play size={22} fill="currentColor" className="ml-0.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => skip(10)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/85 transition-colors hover:bg-white/10 active:scale-95"
                          aria-label="Avançar 10 segundos"
                        >
                          <SkipTenGlyph direction="forward" size={22} />
                        </button>
                        <span className="ml-2 tabular-nums text-xs text-white/50">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={toggleMute}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/85 transition-colors hover:bg-white/10 active:scale-95"
                          aria-label={isMuted || volume === 0 ? 'Ativar som' : 'Silenciar'}
                        >
                          {isMuted || volume === 0 ? <Icons.VolumeX size={18} /> : <Icons.Volume2 size={18} />}
                        </button>
                        <button
                          type="button"
                          onClick={toggleSpeed}
                          className="inline-flex h-10 min-w-[40px] items-center justify-center rounded-lg px-1 text-xs font-black tabular-nums text-white/85 transition-colors hover:bg-white/10 active:scale-95"
                          aria-label={`Velocidade: ${playbackRate}x`}
                        >
                          {playbackRate}×
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsPlayerCollapsed(false)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/85 transition-colors hover:bg-white/10 active:scale-95"
                          title="Expandir para tela cheia"
                          aria-label="Expandir para tela cheia"
                        >
                          <Icons.Maximize size={18} />
                        </button>
                      </div>
                    </div>
                  </div>{/* end controls bar */}
                </div>{/* end video card */}

                {/* Title + meta + description */}
                <div className="mt-5 space-y-3 px-4 lg:px-0">
                  <div>
                    <h2 className="text-base font-black leading-snug text-white lg:text-lg">
                      {resolvedTitle}
                    </h2>
                    <p className="mt-1 text-sm text-white/50">{collection.title}</p>
                  </div>

                  {itemDescription && (
                    <div className="rounded-xl bg-white/[0.06] px-4 py-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">Descrição</p>
                      <p className="mt-2 text-sm leading-6 text-white/80">{itemDescription}</p>
                    </div>
                  )}
                </div>

                {/* Related videos — mobile only (hidden on lg+, shown in sidebar there) */}
                {relatedItems.length > 0 && (
                  <div className="mt-6 px-4 pb-2 lg:hidden">
                    <p className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/50">
                      Próximos vídeos
                    </p>
                    <div className="space-y-2">
                      {relatedItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => openRelatedItem(item)}
                          className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.1] bg-white/[0.04] p-3 text-left transition-colors hover:bg-white/[0.08] active:scale-[0.99]"
                        >
                          <div
                            className="relative h-[54px] w-[96px] shrink-0 overflow-hidden rounded-xl bg-white/10"
                            style={item.thumbnailUrl ? {
                              backgroundImage: `url(${item.thumbnailUrl})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            } : undefined}
                          >
                            <span className="absolute bottom-1 left-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/72 text-white">
                              <Icons.Play size={8} className="ml-0.5 fill-current stroke-none" />
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-[13px] font-bold leading-5 text-white">{item.title}</p>
                            <p className="mt-0.5 text-[11px] text-white/50">{item.collectionTitle ?? collection.title}</p>
                          </div>
                          <Icons.ChevronRight size={16} className="shrink-0 text-white/45" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>{/* end left column */}

              {/* ── Right column: related videos — desktop only ── */}
              {relatedItems.length > 0 && (
                <aside className="hidden md:block w-[360px] shrink-0">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/50">
                    Próximos vídeos
                  </p>
                  <div className="space-y-1">
                    {relatedItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => openRelatedItem(item)}
                        className="flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-white/[0.07] active:bg-white/[0.04]"
                      >
                        <div
                          className="relative h-[94px] w-[168px] shrink-0 overflow-hidden rounded-lg bg-white/10"
                          style={item.thumbnailUrl ? {
                            backgroundImage: `url(${item.thumbnailUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          } : undefined}
                        >
                          <span className="absolute bottom-1 left-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/72 text-white">
                            <Icons.Play size={8} className="ml-0.5 fill-current stroke-none" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <p className="line-clamp-2 text-[13px] font-bold leading-5 text-white">{item.title}</p>
                          <p className="mt-1 text-[11px] font-medium text-white/50">{item.collectionTitle ?? collection.title}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </aside>
              )}

            </div>
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
      className="fixed inset-0 z-50 bg-black flex overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Player de vídeo"
    >
      {/* ── Video area: fills all space to the left of the sidebar ── */}
      <div
        className="relative flex-1 min-w-0 group"
        onMouseMove={resetControlsTimeout}
        onTouchStart={resetControlsTimeout}
        onClick={toggleControlsVisibility}
      >

      {/* Dark overlay to darken background — purely decorative, must not intercept clicks */}
      <div className="absolute inset-0 bg-black/10 z-0 pointer-events-none" />

      {/* Video Element */}
      {youtubeEmbedUrl ? (
        <iframe
          ref={ytIframeRef}
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
          onClick={handleVideoSurfaceClick}
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
                  className="rounded-xl border border-white/20 bg-brand-primary/80 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-primary"
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
                  if (isYouTubeSource) {
                    ytPostMessage('seekTo', [0, true]);
                    ytPostMessage('playVideo');
                    setPlayerState('playing');
                  } else if (videoRef.current) {
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
      {/* For YouTube sources the whole overlay is pointer-events-none so clicks reach the iframe;
          only the top bar gets pointer-events-auto so navigation buttons still work. */}
      <div
        ref={controlsContainerRef}
        aria-hidden={overlayActive}
        className={`absolute inset-0 flex flex-col justify-between p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] transition-opacity duration-300 md:p-6 ${overlayActive ? 'opacity-0 pointer-events-none' : showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${isYouTubeSource ? 'pointer-events-none' : ''}`}
      >

        {/* Top Bar */}
        <div className={`flex items-center justify-between ${isYouTubeSource ? 'pointer-events-auto' : ''}`} onClick={(e) => e.stopPropagation()}>
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
                className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold transition-colors disabled:cursor-default ${isOfflineDownloaded
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
              aria-label={showDesktopRelated ? 'Ocultar informações' : 'Ver descrição e relacionados'}
              className="hidden h-10 items-center gap-1.5 rounded-full border border-white/25 bg-black/30 px-3 text-[11px] font-bold text-white/90 transition-colors hover:bg-black/45 lg:inline-flex"
            >
              <Icons.FileText size={13} />
              {showDesktopRelated ? 'Ocultar' : 'Info'}
              <Icons.ChevronRight size={13} className={`transition-transform ${showDesktopRelated ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {showShortcutsHint && !isMobileLandscape && (
          <div className="pointer-events-none absolute right-4 top-16 hidden rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/75 backdrop-blur-md md:block">
            Espaço/K: play, J/L: 10s, M: mute, F: full, ESC: voltar
          </div>
        )}

        {(
          <>
            {/* Center Play Button — skip buttons live only in the bottom dock (YouTube reference pattern).
                Em touch + YouTube NÃO renderizamos o play customizado: ele interceptaria o toque
                e o iOS bloqueia o play via postMessage — deixamos os controles nativos do YouTube. */}
            {!(isTouchDevice && isYouTubeSource) && (
            <div
              className={`absolute left-1/2 top-1/2 ${isYouTubeSource ? 'pointer-events-auto' : ''}`}
              style={{ transform: mobilePortraitCenterTransform }}
              onClick={(e) => e.stopPropagation()}
            >
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
            </div>
            )}

            {/* Bottom Control Dock */}
            <div className={`w-full flex flex-col gap-2 ${isYouTubeSource ? 'pointer-events-auto' : ''}`} onClick={(e) => e.stopPropagation()}>
              {playError && (
                <div className="mx-auto w-full max-w-[min(100%,980px)] lg:max-w-none">
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
                <div className="mx-auto w-full max-w-[min(100%,980px)] lg:max-w-none">
                  <div role="alert" className="rounded-2xl border border-red-300/35 bg-red-500/82 px-4 py-3 text-sm text-white backdrop-blur-md shadow-[0_14px_26px_rgba(0,0,0,0.28)]">
                    <p>{offlineDownloadError}</p>
                  </div>
                </div>
              )}

              <div className="mx-auto w-full max-w-[min(100%,980px)] lg:max-w-none">
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
                    <div className="flex items-center gap-2.5 md:gap-3">
                      <button
                        onClick={() => skip(-10)}
                        className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-[20px] border border-white/14 bg-black/28 text-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_18px_rgba(0,0,0,0.16)] backdrop-blur-md transition-colors hover:bg-black/36"
                        aria-label="Voltar 10 segundos"
                        title="Voltar 10s (J)"
                      >
                        <SkipTenGlyph direction="back" />
                      </button>
                      <button
                        onClick={(e) => togglePlay(e)}
                        className="inline-flex h-[56px] min-w-[84px] items-center justify-center rounded-[22px] border border-white/18 bg-white/[0.09] px-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_12px_22px_rgba(0,0,0,0.14)] backdrop-blur-md transition-colors hover:bg-white/[0.16]"
                        aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
                        title="Play/Pause (Espaço ou K)"
                      >
                        {isPlaying ? <Icons.Pause size={20} fill="currentColor" /> : <Icons.Play size={20} fill="currentColor" className="ml-0.5" />}
                      </button>
                      <button
                        onClick={() => skip(10)}
                        className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-[20px] border border-white/14 bg-black/28 text-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_18px_rgba(0,0,0,0.16)] backdrop-blur-md transition-colors hover:bg-black/36"
                        aria-label="Avançar 10 segundos"
                        title="Avançar 10s (L)"
                      >
                        <SkipTenGlyph direction="forward" />
                      </button>
                      <p className="hidden whitespace-nowrap pl-1 text-[15px] font-black tracking-[-0.03em] text-white/82 sm:block">
                        <span className="tabular-nums">{formatTime(currentTime)}</span>
                        <span className="mx-1 text-white/45">/</span>
                        <span className="tabular-nums">{formatTime(duration)}</span>
                      </p>
                    </div>

                    <div className={`flex items-center gap-1.5 md:gap-2 ${isMobileLandscape ? 'flex-wrap justify-end' : ''}`}>
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
                      {!isMobileLandscape && (
                        <button
                          onClick={toggleSpeed}
                          className="inline-flex h-9 min-w-[44px] items-center justify-center rounded-lg border border-white/20 bg-white/8 px-2.5 text-xs font-black text-white transition-colors hover:bg-white/14"
                          title="Velocidade"
                        >
                          {playbackRate}x
                        </button>
                      )}
                      <button
                        onClick={() => setIsPlayerCollapsed(true)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/8 text-white/90 transition-colors hover:bg-white/14"
                        title="Retrair player"
                        aria-label="Retrair player"
                      >
                        <Icons.Minimize size={18} />
                      </button>
                      {isMobileLandscape && (
                        <button
                          type="button"
                          onClick={toggleMobileUtilitySheet}
                          className={`inline-flex h-9 items-center gap-1 rounded-lg border px-2.5 text-[11px] font-black transition-colors ${showMobileUtilitySheet
                              ? 'border-white/35 bg-white/18 text-white'
                              : 'border-white/20 bg-white/8 text-white/85 hover:bg-white/14'
                            }`}
                          aria-label={showMobileUtilitySheet ? 'Ocultar controles extras' : 'Mostrar controles extras'}
                        >
                          <Icons.Settings size={15} />
                          Mais
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {isMobileLandscape && showControls && showMobileUtilitySheet && (
                <section className="pointer-events-auto mx-auto w-full max-w-[min(100%,980px)] lg:hidden">
                  <div className={`${panelChromeClass} max-h-[38vh] overflow-hidden p-3`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/65">Controles extras</p>
                        <p className="mt-1 text-xs text-white/60">
                          Velocidade, descrição e fila ficam escondidos até você precisar.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={toggleMobileUtilitySheet}
                        className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/8 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white/80"
                      >
                        Fechar
                        <Icons.X size={12} />
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={toggleSpeed}
                        className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/20 bg-white/8 px-2 text-center text-white transition-colors hover:bg-white/12"
                      >
                        <span className="text-sm font-black">{playbackRate}x</span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.08em]">Veloc.</span>
                      </button>
                      {itemDescription && (
                        <button
                          type="button"
                          onClick={toggleMobileDetailsPanel}
                          className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl border px-2 text-center transition-colors ${showMobileDetails
                              ? 'border-white/35 bg-white/18 text-white'
                              : 'border-white/20 bg-white/8 text-white/85 hover:bg-white/12'
                            }`}
                        >
                          <Icons.FileText size={16} />
                          <span className="text-[10px] font-bold uppercase tracking-[0.08em]">Info</span>
                        </button>
                      )}
                      {relatedItems.length > 0 && (
                        <button
                          type="button"
                          onClick={toggleMobileQueuePanel}
                          className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl border px-2 text-center transition-colors ${showMobileQueue
                              ? 'border-white/35 bg-white/18 text-white'
                              : 'border-white/20 bg-white/8 text-white/85 hover:bg-white/12'
                            }`}
                        >
                          <Icons.Video size={16} />
                          <span className="text-[10px] font-bold uppercase tracking-[0.08em]">Fila</span>
                        </button>
                      )}
                    </div>

                    {!showMobileDetails && !showMobileQueue && (
                      <p className="mt-3 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-xs text-white/65">
                        O dock ficou focado em reproduzir e navegar. Abra os extras só quando precisar consultar.
                      </p>
                    )}

                    {showMobileDetails && itemDescription && (
                      <div className="mt-3">
                        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/65">Descrição</p>
                        <p className="max-h-[24vh] overflow-y-auto pr-1 text-sm leading-6 text-white/85">
                          {itemDescription}
                        </p>
                      </div>
                    )}

                    {showMobileQueue && (
                      <div className="mt-3">
                        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/65">Próximos vídeos</p>
                        {relatedItems.length === 0 ? (
                          <p className="rounded-xl border border-white/20 bg-white/8 px-3 py-2 text-xs text-white/70">
                            Sem relacionados para este vídeo.
                          </p>
                        ) : (
                          <div className="max-h-[28vh] space-y-2 overflow-y-auto pr-0.5">
                            {relatedItems.slice(0, 5).map((item) => (
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

                                <div className="min-w-0 flex-1">
                                  <p className="line-clamp-2 text-[12px] font-bold leading-4 text-white">{item.title}</p>
                                  <p className="mt-0.5 text-[10px] text-white/70">{item.collectionTitle ?? ''}</p>
                                </div>

                                <Icons.ChevronRight size={14} className="shrink-0 text-white/70" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Description was removed from the dock — it lives in the Info sidebar now.
                  A description here would push the video up when the text is long. */}

              {leadRelatedItem && shouldRenderInlineNextVideoCard(isMobilePortrait, isMobileLandscape) && (
                <button
                  type="button"
                  onClick={() => openRelatedItem(leadRelatedItem)}
                  className="mt-2 inline-flex w-full items-center justify-between rounded-xl border border-white/20 bg-white/8 px-3 py-2 text-left text-xs text-white/85 transition-colors hover:bg-white/14 lg:hidden"
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

      </div>{/* end controls container */}

      </div>{/* end video area wrapper */}

      {/* ── Info sidebar — flex sibling of the video area, NOT overlapping ── */}
      {showDesktopRelated && (
      <aside className={`hidden lg:flex w-[340px] shrink-0 flex-col overflow-y-auto border-l border-white/10 bg-black/70 backdrop-blur-md`}>
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/65">Informações</p>
          <h2 className="mt-1 text-sm font-black text-white">{resolvedTitle}</h2>
        </div>

        {itemDescription && (
          <div className="border-b border-white/10 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/55">Descrição</p>
            <p className="mt-2 text-sm leading-6 text-white/85">{itemDescription}</p>
          </div>
        )}

        {relatedItems.length > 0 && (
          <div className="px-4 pb-2 pt-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/65">Próximos vídeos</p>
          </div>
        )}

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
                <p className="mt-1 text-[11px] text-white/70">{item.collectionTitle ?? ''}</p>
              </div>
            </button>
          ))}
        </div>
      </aside>
      )}{/* end Info sidebar */}

      <section className={`pointer-events-auto absolute left-4 right-4 z-30 rounded-2xl border border-white/15 bg-black/55 p-3 backdrop-blur-md transition-all duration-300 lg:hidden ${isMobileLandscape ? 'opacity-0 pointer-events-none hidden' : showMobileQueue ? 'bottom-4 max-h-[52vh]' : isMobilePortrait ? 'bottom-4 max-h-[112px]' : 'bottom-20 max-h-[72px]'}`} onClick={(event) => event.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between px-0.5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/65">Próximos vídeos</p>
          <button
            type="button"
            onClick={toggleMobileQueuePanel}
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
              {relatedItemsQueueLabel}
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
                  <p className="mt-0.5 text-[10px] text-white/70">{item.collectionTitle ?? ''}</p>
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
