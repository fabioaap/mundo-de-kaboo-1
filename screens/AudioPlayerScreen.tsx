import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icons } from '../components/Icons';
import { placeholderImageUrl } from '../lib/appPaths';
import { getCollectionDisplayCover, getLibraryAssetCoverImage } from '../lib/collectionPresentation';
import { Collection, MediaItemCard, ScreenName } from '../types';
import { useThemeBackground } from '../hooks/useThemeBackground';
import { GalaxyBackground } from '../components/GalaxyBackground';
import { api } from '../lib/api';
import { useOfflineDownload } from '../hooks/useOfflineDownload';
import useIsMobile from '../hooks/useIsMobile';
import useOrientation from '../hooks/useOrientation';
import {
  getAudioPlayerLayout,
  shouldTreatAudioPlayerAsCompactViewport,
  shouldUseAudioPlayerMobileLandscapeLayout,
  shouldResetAudioPlayerPanels,
} from '../lib/audioPlayerLayout';
import {
  AUDIO_PLAYER_SKIP_SECONDS,
  getAudioPlayerSkipTarget,
} from '../lib/audioPlayerSkip';

interface AudioPlayerScreenProps {
  collection: Collection;
  mediaItemId?: string;
  assetUrl?: string;
  assetTitle?: string;
  lyricsUrl?: string;
  assetOfflineAvailable?: boolean | null;
  // Per-media cover passed by the caller (e.g. DetailsScreen.getAssetCover): the cover of
  // the media being played, NOT of the collection it was opened from. Prevents an audio
  // reused inside a kit from showing the kit's cover. Falls back to the collection cover.
  coverImage?: string;
  // When true (set on prev/next/related navigation), the freshly loaded track
  // starts playing automatically instead of waiting for a manual play press.
  autoplay?: boolean;
  // When navigating within a playlist (prev/next, related click), the caller passes the
  // current playlist so the player doesn't re-derive scope from the new track's collection.
  initialPlaylistTracks?: MediaItemCard[];
  onNavigate: (screen: ScreenName, params?: any) => void;
  onBack: () => void;
}

export const AudioPlayerScreen: React.FC<AudioPlayerScreenProps> = ({
  collection,
  mediaItemId,
  assetUrl,
  assetTitle,
  lyricsUrl,
  assetOfflineAvailable,
  coverImage,
  autoplay,
  initialPlaylistTracks,
  onNavigate,
  onBack,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [cdRotation, setCdRotation] = useState(0); // Current rotation in degrees
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartTime, setDragStartTime] = useState(0);
  const [dragStartRotation, setDragStartRotation] = useState(0);

  // All collections (cached by the api layer) so the player can resolve the cover of the
  // media being played from its asset URL — independent of which collection it was opened
  // from. This makes every entry point (DetailsScreen, vitrine, next-track, reload) show the
  // media's own/source cover instead of the launching collection's cover.
  const [collectionsById, setCollectionsById] = useState<Map<string, Collection> | null>(null);

  const [playError, setPlayError] = useState<string | null>(null);
  const [resolvedPlaybackUrl, setResolvedPlaybackUrl] = useState<string | null>(null);
  const [resolvedPlaybackTitle, setResolvedPlaybackTitle] = useState<string | null>(null);
  const [relatedTracks, setRelatedTracks] = useState<MediaItemCard[]>([]);
  const [playlistTracks, setPlaylistTracks] = useState<MediaItemCard[]>([]);
  const [trackDescription, setTrackDescription] = useState<string>('');

  const [showSidebar, setShowSidebar] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyricsText, setLyricsText] = useState<string | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [showMobileUtilitySheet, setShowMobileUtilitySheet] = useState(false);
  const [isCompactHeightViewport, setIsCompactHeightViewport] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rotationIntervalRef = useRef<number | null>(null);
  // Guards autoplay so each new track plays at most once (canPlay can fire repeatedly).
  const autoplayDoneRef = useRef(false);
  const lastSavedAtRef = useRef(0);
  const lastSavedPositionRef = useRef(0);
  const saveInFlightRef = useRef(false);

  const isMobile = useIsMobile();
  const isLandscape = useOrientation();
  const isMobilePortrait = isMobile && !isLandscape;
  const isMobileLandscape = shouldUseAudioPlayerMobileLandscapeLayout(
    isLandscape,
    isMobile,
    isCompactHeightViewport
  );
  const currentPlayerLayout = getAudioPlayerLayout(isMobilePortrait, isMobileLandscape);
  const previousPlayerLayoutRef = useRef(currentPlayerLayout);
  const themeColor = collection.color_theme || '#5D1F58';
  const resolvedAudioUrl = resolvedPlaybackUrl ?? assetUrl ?? collection.audio_url;
  const resolvedTitle = resolvedPlaybackTitle ?? assetTitle ?? collection.title;
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  // Cover of the media actually playing, resolved from its URL (source-collection cover),
  // independent of which collection the player was opened from. Falls back to the caller's
  // hint, then the launching collection cover, then the placeholder. While the collections
  // list is loading, the hint/collection cover avoids a flash.
  const resolvedAlbumCover = collectionsById
    ? getLibraryAssetCoverImage({ url: resolvedAudioUrl, media_type: 'audio' }, collection, collectionsById)
    : '';
  const albumCoverImage = resolvedAlbumCover || coverImage || getCollectionDisplayCover(collection) || placeholderImageUrl;
  const {
    isAvailable: canDownloadOffline,
    isDownloaded: isOfflineDownloaded,
    isDownloading: isOfflineDownloading,
    downloadError: offlineDownloadError,
    handleDownload: handleOfflineDownload,
    handleRemove: handleOfflineRemove,
  } = useOfflineDownload(collection, [resolvedAudioUrl, lyricsUrl], assetOfflineAvailable);

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

  // Fetch lyrics text when lyricsUrl changes
  useEffect(() => {
    if (!lyricsUrl) {
      setLyricsText(null);
      setShowLyrics(false);
      return;
    }

    let active = true;
    setLyricsLoading(true);
    setLyricsText(null);

    fetch(lyricsUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (active) setLyricsText(text);
      })
      .catch(() => {
        if (active) setLyricsText('Não foi possível carregar a letra.');
      })
      .finally(() => {
        if (active) setLyricsLoading(false);
      });

    return () => { active = false; };
  }, [lyricsUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    const checkCompactHeightViewport = () => {
      setIsCompactHeightViewport(
        shouldTreatAudioPlayerAsCompactViewport(window.innerWidth, window.innerHeight)
      );
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
    setShowSidebar(false);
    setShowLyrics(false);
    setShowMobileUtilitySheet(false);

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

        if (!session) {
          setResolvedPlaybackUrl(null);
          setResolvedPlaybackTitle(null);
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

  // Load all collections once (api layer caches this) so the album cover can be resolved
  // from the playing media's source collection — see albumCoverImage above.
  useEffect(() => {
    let active = true;
    api.getCollections()
      .then((cols) => {
        if (active) setCollectionsById(new Map(cols.map((item) => [item.id, item])));
      })
      .catch(() => {
        if (active) setCollectionsById(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    setRelatedTracks([]);
    setPlaylistTracks([]);
    setTrackDescription('');
    autoplayDoneRef.current = false;

    const loadContext = async () => {
      try {
        // Playlist passed explicitly by the caller (prev/next/related navigation) — use it
        // directly so the player doesn't collapse scope to the new track's own collection.
        if (initialPlaylistTracks && initialPlaylistTracks.length > 0) {
          if (!isActive) return;
          setPlaylistTracks(initialPlaylistTracks);
          setRelatedTracks(initialPlaylistTracks.filter((t) => t.id !== mediaItemId).slice(0, 8));
          const detail = mediaItemId ? await api.getMediaItem(mediaItemId) : null;
          if (!isActive) return;
          setTrackDescription(detail?.description ?? detail?.summary ?? collection.description ?? '');
          return;
        }

        const currentUrl = (assetUrl ?? '').trim();

        // Se a coleção tem outras faixas de música, escopa "Próximas" à coleção (WS-15).
        const allCollectionMusic = (collection.collection_assets ?? [])
          .filter(a => a.category === 'music' && a.url && a.is_published !== false)
          .map(a => ({
            id: a.id,
            hub: 'music' as const,
            kind: 'audio' as const,
            title: a.title,
            thumbnailUrl: a.cover_image ?? collection.cover_image ?? null,
            provider: 'internal' as const,
            locked: false,
            isFavorite: false,
            progressPercent: 0,
            assetUrl: a.url ?? null,
            collectionId: collection.id,
          }));

        const otherCollectionMusic = allCollectionMusic.filter(
          a => a.id !== mediaItemId && a.assetUrl?.trim() !== currentUrl
        );

        if (otherCollectionMusic.length > 0) {
          if (!isActive) return;
          setPlaylistTracks(allCollectionMusic);
          setRelatedTracks(otherCollectionMusic.slice(0, 8));
          const detail = mediaItemId ? await api.getMediaItem(mediaItemId) : null;
          if (!isActive) return;
          setTrackDescription(detail?.description ?? detail?.summary ?? collection.description ?? '');
          return;
        }

        // Narração de obra (kit ou livro com PDF): sem navegação para hub global.
        const isBoundObra = collection.collection_type === 'kit'
          || (collection.collection_assets ?? []).some(a => a.category === 'reading' && a.url?.trim());
        if (isBoundObra) {
          if (!isActive) return;
          setRelatedTracks([]);
          setPlaylistTracks([]);
          const detail = mediaItemId ? await api.getMediaItem(mediaItemId) : null;
          if (!isActive) return;
          setTrackDescription(detail?.description ?? detail?.summary ?? collection.description ?? '');
          return;
        }

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

        setPlaylistTracks(unique);
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

  useEffect(() => {
    const previousLayout = previousPlayerLayoutRef.current;

    if (shouldResetAudioPlayerPanels(previousLayout, currentPlayerLayout)) {
      setShowSidebar(false);
      setShowLyrics(false);
      setShowMobileUtilitySheet(false);
    }

    previousPlayerLayoutRef.current = currentPlayerLayout;
  }, [currentPlayerLayout]);

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
    if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
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
    if (!audioRef.current) {
      return;
    }

    const nextTime = getAudioPlayerSkipTarget(
      audioRef.current.currentTime,
      Number.isFinite(audioRef.current.duration) ? audioRef.current.duration : duration,
      'forward'
    );
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const skipBackward = () => {
    if (!audioRef.current) {
      return;
    }

    const nextTime = getAudioPlayerSkipTarget(
      audioRef.current.currentTime,
      Number.isFinite(audioRef.current.duration) ? audioRef.current.duration : duration,
      'backward'
    );
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const toggleSpeed = () => {
    if (playbackRate === 0.75) setPlaybackRate(1.0);
    else if (playbackRate === 1.0) setPlaybackRate(1.25);
    else if (playbackRate === 1.25) setPlaybackRate(1.5);
    else if (playbackRate === 1.5) setPlaybackRate(2.0);
    else setPlaybackRate(0.75);
  };

  const formatTime = (time: number) => {
    if (!Number.isFinite(time) || time < 0) return "00:00";
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

  const SkipTenGlyph: React.FC<{ direction: 'back' | 'forward'; size?: number }> = ({
    direction,
    size = 24,
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

  const handleBack = () => {
    maybeSaveProgress(true);
    onBack();
  };

  const toggleSuggestionsPanel = () => {
    if (isMobile) {
      setShowMobileUtilitySheet(true);
    }

    setShowLyrics(false);
    setShowSidebar((prev) => !prev);
  };

  const toggleLyricsPanel = () => {
    if (isMobile) {
      setShowSidebar(false);
      setShowMobileUtilitySheet(false);
    }

    setShowLyrics((prev) => !prev);
  };

  const toggleMobileUtilityControls = () => {
    setShowMobileUtilitySheet((prev) => {
      const next = !prev;

      if (!next) {
        setShowSidebar(false);
      }

      return next;
    });
  };

  const openRelatedTrack = (item: MediaItemCard) => {
    onNavigate('player_audio', {
      collectionId: item.collectionId ?? collection.id,
      mediaItemId: item.id,
      assetTitle: item.title,
      // Switching tracks within a playlist (prev/next, auto-advance, related click)
      // should keep playing — the user already chose to listen.
      autoplay: true,
      // Preserve the current playlist scope so the next mount doesn't re-derive it
      // from the new track's collection (which may be a single-track collection).
      initialPlaylistTracks: playlistTracks,
    });
  };

  const playlistIndex = playlistTracks.findIndex((t) => t.id === mediaItemId);

  // Player controls are driven by the content TYPE of the asset playing, not by where it
  // was opened from. Music tracks ('music') get playlist nav + auto-advance and no speed;
  // narration/audiobook ('storytelling') gets speed and no playlist nav.
  // mediaItemId may be a hub id ("collection-asset:<hub>:<collId>:<assetId>") or a raw asset id.
  const resolvedAssetId = mediaItemId?.match(/^collection-asset:[^:]+:[^:]+:(.+)$/)?.[1] ?? mediaItemId;
  const currentCategory = (collection.collection_assets ?? []).find((a) => a.id === resolvedAssetId)?.category ?? null;
  // Fallback: anything sitting in the music hub playlist is a music track (the hub holds
  // only 'music' assets), so treat it as music even if the asset lookup misses.
  const isMusicTrack = currentCategory === 'music' || (currentCategory === null && playlistIndex >= 0);

  // Prev/next track + auto-advance only apply to music tracks within the playlist.
  const showTrackNav = isMusicTrack && playlistIndex >= 0;
  // Speed control is for spoken content (narration/audiobook); music hides it.
  const showSpeedControl = !isMusicTrack;
  const prevTrack = showTrackNav && playlistIndex > 0 ? playlistTracks[playlistIndex - 1] : null;
  const nextTrack = showTrackNav && playlistIndex < playlistTracks.length - 1 ? playlistTracks[playlistIndex + 1] : null;

  const handlePrevTrack = () => { if (prevTrack) openRelatedTrack(prevTrack); };
  const handleNextTrack = () => { if (nextTrack) openRelatedTrack(nextTrack); };

  const mobileHeaderButtonClass = 'h-10 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/28 px-3 text-[11px] font-bold text-white/90 shadow-lg backdrop-blur-md transition-colors hover:bg-black/40';
  const mobileUtilityActionClass = 'flex min-h-[56px] items-center gap-3 rounded-[22px] border border-white/14 bg-black/26 px-4 text-left text-sm font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_22px_rgba(0,0,0,0.18)] backdrop-blur-md transition-colors hover:bg-black/36';
  const transportButtonHitAreaClass = 'group relative inline-flex h-16 w-16 items-center justify-center rounded-full border border-transparent bg-transparent text-white outline-none transition-transform duration-150 active:scale-95 focus-visible:ring-2 focus-visible:ring-white/75';
  const transportButtonSurfaceClass = 'pointer-events-none flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-black/20 shadow-xl backdrop-blur-md transition-all duration-150 group-hover:scale-[1.08] group-hover:bg-black/30';
  const playButtonHitAreaClass = 'group relative inline-flex h-20 w-20 items-center justify-center rounded-full border border-transparent bg-transparent text-white outline-none transition-transform duration-150 active:scale-95 focus-visible:ring-2 focus-visible:ring-white/75';
  const playButtonSurfaceClass = 'pointer-events-none flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border-2 border-white/40 bg-white/20 shadow-2xl backdrop-blur-md transition-all duration-150 group-hover:scale-[1.05] group-hover:bg-white/30';

  const renderRelatedTracksList = (cardClassName: string, showHeader = true) => (
    <>
      {showHeader && (
        <div className="px-1">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/65">Catálogo relacionado</p>
          <h2 className="mt-1 text-sm font-black text-white">Sugestões da biblioteca</h2>
        </div>
      )}

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
          className={cardClassName}
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
            <p className="text-[11px] text-white/70">{item.collectionTitle ?? ''}</p>
          </div>
        </button>
      ))}
    </>
  );

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
            maybeSaveProgress(true);
            if (nextTrack) {
              openRelatedTrack(nextTrack);
            } else {
              setIsPlaying(false);
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => {
            setIsPlaying(false);
            maybeSaveProgress(true);
          }}
          onWaiting={() => setIsBuffering(true)}
          onCanPlay={() => {
            setIsBuffering(false);
            if (autoplay && !autoplayDoneRef.current && audioRef.current?.paused) {
              autoplayDoneRef.current = true;
              audioRef.current.play().catch(() => {
                setIsPlaying(false);
              });
            }
          }}
        />
      )}

      {/* Header */}
      <div className={`relative z-20 flex flex-shrink-0 items-center justify-between gap-3 ${isMobile ? 'px-4 py-4' : 'p-4'}`}>
        <button
          onClick={handleBack}
          className="w-12 h-12 shrink-0 rounded-full bg-black/20 backdrop-blur-md shadow-xl text-white flex items-center justify-center hover:bg-black/30 transition-all active:scale-95 border border-white/30"
          aria-label="Voltar"
        >
          <Icons.ChevronLeft size={24} strokeWidth={2.5} />
        </button>

        {/* Title pill — absolutely centered on the full header width so it stays
            perfectly aligned with the album art and controls below, regardless
            of the width difference between the back button and the right-side buttons. */}
        <div className="absolute inset-x-0 flex justify-center pointer-events-none px-16">
          <div className={`pointer-events-auto min-w-0 max-w-[70%] flex items-center justify-center border border-white/10 bg-black/20 shadow-lg backdrop-blur-md ${isMobile ? 'rounded-[24px] px-4 py-2' : 'rounded-full px-6 py-2'}`}>
            <h1 className={`${isMobile ? 'line-clamp-2 text-sm' : 'text-sm md:text-base'} font-bold text-white drop-shadow-sm break-words text-center`}>
              {resolvedTitle}
            </h1>
          </div>
        </div>

        {isMobile ? (
          <button
            type="button"
            onClick={toggleMobileUtilityControls}
            aria-label={showMobileUtilitySheet ? 'Ocultar controles extras' : 'Mostrar controles extras'}
            className={mobileHeaderButtonClass}
          >
            <Icons.MoreHorizontal size={16} />
            <span>{showMobileUtilitySheet ? 'Fechar' : 'Mais'}</span>
            <Icons.ChevronDown size={14} className={`transition-transform ${showMobileUtilitySheet ? 'rotate-180' : ''}`} />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {canDownloadOffline && (
              <button
                type="button"
                onClick={isOfflineDownloaded ? handleOfflineRemove : handleOfflineDownload}
                disabled={isOfflineDownloading}
                aria-label={isOfflineDownloaded ? 'Remover download offline' : 'Baixar áudio para offline'}
                className={`h-10 inline-flex items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold transition-colors backdrop-blur-md disabled:cursor-default ${isOfflineDownloaded
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
                <span className="hidden sm:inline">
                  {isOfflineDownloaded ? 'Remover offline' : isOfflineDownloading ? 'Baixando...' : 'Baixar offline'}
                </span>
              </button>
            )}

            {lyricsUrl && (
              <button
                onClick={toggleLyricsPanel}
                aria-label={showLyrics ? 'Ocultar letra' : 'Ver letra'}
                className={`h-10 inline-flex items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold text-white/90 transition-colors backdrop-blur-md ${showLyrics
                  ? 'border-white/40 bg-white/20'
                  : 'border-white/25 bg-black/30 hover:bg-black/45'
                  }`}
              >
                {showLyrics ? 'Ocultar' : '♪ Letra'}
              </button>
            )}
          </div>
        )}
      </div>

      {isMobile && showMobileUtilitySheet && (
        <section
          className={`absolute z-30 rounded-[28px] border border-white/14 bg-black/55 p-4 text-white shadow-[0_18px_42px_rgba(0,0,0,0.34)] backdrop-blur-md ${isMobileLandscape ? 'right-4 top-[88px] bottom-4 w-[min(320px,42vw)]' : 'left-4 right-4 bottom-4 max-h-[44vh]'}`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/55">Controles extras</p>
              <p className="mt-1 text-sm font-semibold text-white/90">Sugestões, letra e download ficam escondidos até você precisar.</p>
            </div>
            <button
              type="button"
              onClick={toggleMobileUtilityControls}
              aria-label="Fechar controles extras"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/8 text-white/80 transition-colors hover:bg-white/12"
            >
              <Icons.X size={16} />
            </button>
          </div>

          <div className={`mt-4 grid gap-2 ${lyricsUrl || canDownloadOffline ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {canDownloadOffline && (
              <button
                type="button"
                onClick={isOfflineDownloaded ? handleOfflineRemove : handleOfflineDownload}
                disabled={isOfflineDownloading}
                aria-label={isOfflineDownloaded ? 'Remover download offline' : 'Baixar áudio para offline'}
                className={`${mobileUtilityActionClass} disabled:cursor-default ${isOfflineDownloaded ? 'border-red-300/45 bg-red-500/20 text-red-100 hover:bg-red-500/28' : ''}`}
              >
                {isOfflineDownloading ? (
                  <Icons.RotateCw size={16} className="animate-spin" />
                ) : isOfflineDownloaded ? (
                  <Icons.Trash2 size={16} />
                ) : (
                  <Icons.Download size={16} />
                )}
                <div>
                  <p className="text-sm font-semibold">{isOfflineDownloaded ? 'Remover offline' : isOfflineDownloading ? 'Baixando...' : 'Download offline'}</p>
                  <p className="text-[11px] text-white/60">{isOfflineDownloaded ? 'Limpa a cópia salva neste aparelho.' : 'Salva a faixa para ouvir depois.'}</p>
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={toggleSuggestionsPanel}
              aria-label={showSidebar ? 'Ocultar sugestões' : 'Ver sugestões'}
              className={`${mobileUtilityActionClass} ${showSidebar ? 'border-white/26 bg-white/[0.12]' : ''}`}
            >
              <Icons.ChevronRight size={16} className={`transition-transform ${showSidebar ? 'rotate-90' : ''}`} />
              <div>
                <p className="text-sm font-semibold">{showSidebar ? 'Ocultar sugestões' : 'Sugestões'}</p>
                <p className="text-[11px] text-white/60">Veja a próxima faixa sem poluir o header.</p>
              </div>
            </button>

            {lyricsUrl && (
              <button
                type="button"
                onClick={toggleLyricsPanel}
                aria-label={showLyrics ? 'Ocultar letra' : 'Ver letra'}
                className={`${mobileUtilityActionClass} col-span-full ${showLyrics ? 'border-white/26 bg-white/[0.12]' : ''}`}
              >
                <Icons.FileText size={16} />
                <div>
                  <p className="text-sm font-semibold">{showLyrics ? 'Ocultar letra' : 'Abrir letra'}</p>
                  <p className="text-[11px] text-white/60">Mostra a letra em tela cheia para leitura confortável.</p>
                </div>
              </button>
            )}
          </div>

          {!showSidebar && (
            <p className="mt-4 text-xs leading-5 text-white/65">
              O player mobile ficou focado no essencial. Abra as sugestões só quando quiser trocar de faixa.
            </p>
          )}

          {showSidebar && (
            <div className={`mt-4 space-y-2 overflow-y-auto pr-1 ${isMobileLandscape ? 'h-[calc(100%-182px)]' : 'max-h-[22vh]'}`}>
              {renderRelatedTracksList('flex w-full items-center gap-3 rounded-xl border border-white/15 bg-white/5 p-2.5 text-left transition-colors hover:bg-white/10 text-white')}
            </div>
          )}
        </section>
      )}



      {/* Main Content - two-column layout on desktop */}
      <div className={`relative z-10 flex-1 overflow-hidden ${isMobileLandscape ? 'px-4 pb-4' : 'flex flex-col md:flex-row'}`}>

        {/* Player Column */}
        <div className={`min-w-0 flex-1 ${isMobileLandscape ? 'flex h-full items-center justify-center gap-5 overflow-hidden' : 'flex flex-col items-center justify-center overflow-y-auto'}`}>
          {/* CD/Vinyl Disc */}
          <div className={`relative ${isMobileLandscape ? 'shrink-0' : 'mb-2'}`}>
            <div
              className={`${isMobileLandscape ? 'h-40 w-40' : 'h-56 w-56 md:h-72 md:w-72'} relative select-none rounded-full`}
              style={{
                transform: `rotate(${cdRotation}deg)`,
                transition: isDragging ? 'none' : 'transform 0.05s linear',
                willChange: 'transform'
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

              {/* Album Cover — the cover of the media actually playing (resolved from its
                  URL), not the collection it was opened from. See albumCoverImage. */}
              <div className="absolute inset-4 rounded-full overflow-hidden shadow-inner">
                <img
                  src={albumCoverImage}
                  alt={resolvedTitle}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Center Label - CD/Vinyl Center */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-black/60 backdrop-blur-sm border-2 border-white/20 shadow-inner flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-black/80" />
              </div>


            </div>
          </div>

          {/* Controls Section */}
          <div className={`w-full space-y-4 ${isMobileLandscape ? 'max-w-[360px] rounded-[28px] border border-white/14 bg-black/18 px-4 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-md' : 'max-w-md px-6 pb-5'}`}>
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

            {/* Speed Control — só faz sentido em conteúdo falado (audiolivro/narração).
                Numa faixa de música acelerar distorce o áudio, então fica oculto. */}
            {showSpeedControl && (
              <div className="flex justify-center">
                <button
                  onClick={toggleSpeed}
                  aria-label={`Velocidade: ${playbackRate}x`}
                  className="px-5 py-1.5 rounded-full bg-black/20 backdrop-blur-md border border-white/30 text-white font-bold text-sm hover:bg-black/30 transition-all active:scale-95"
                >
                  {playbackRate}x
                </button>
              </div>
            )}

            {/* Main Controls */}
            <div className={`flex items-center justify-center ${isMobileLandscape ? 'gap-3' : 'gap-5'}`}>
              {/* Prev Track — only in the music playlist context */}
              {showTrackNav && (
                <button
                  type="button"
                  onClick={handlePrevTrack}
                  disabled={!prevTrack}
                  className={`${transportButtonHitAreaClass} disabled:opacity-30`}
                  aria-label="Faixa anterior"
                >
                  <span className={transportButtonSurfaceClass}>
                    <Icons.SkipBack size={20} strokeWidth={2} />
                  </span>
                </button>
              )}

              {/* Skip Backward */}
              <button
                type="button"
                onClick={skipBackward}
                className={transportButtonHitAreaClass}
                aria-label={`Retroceder ${AUDIO_PLAYER_SKIP_SECONDS} segundos`}
              >
                <span className={transportButtonSurfaceClass}>
                  <SkipTenGlyph direction="back" size={24} />
                </span>
              </button>

              {/* Play/Pause */}
              <button
                type="button"
                onClick={togglePlay}
                className={playButtonHitAreaClass}
                aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
              >
                <span className={playButtonSurfaceClass}>
                  {isBuffering ? (
                    <svg className="animate-spin" width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                  ) : isPlaying ? (
                    <Icons.Pause size={32} fill="currentColor" strokeWidth={2} />
                  ) : (
                    <Icons.Play size={32} fill="currentColor" strokeWidth={2} className="ml-1" />
                  )}
                </span>
              </button>

              {/* Skip Forward */}
              <button
                type="button"
                onClick={skipForward}
                className={transportButtonHitAreaClass}
                aria-label={`Avançar ${AUDIO_PLAYER_SKIP_SECONDS} segundos`}
              >
                <span className={transportButtonSurfaceClass}>
                  <SkipTenGlyph direction="forward" size={24} />
                </span>
              </button>

              {/* Next Track — only in the music playlist context */}
              {showTrackNav && (
                <button
                  type="button"
                  onClick={handleNextTrack}
                  disabled={!nextTrack}
                  className={`${transportButtonHitAreaClass} disabled:opacity-30`}
                  aria-label="Próxima faixa"
                >
                  <span className={transportButtonSurfaceClass}>
                    <Icons.SkipForward size={20} strokeWidth={2} />
                  </span>
                </button>
              )}
            </div>

            {/* Play Error Message */}
            {playError && (
              <div className="mt-4 bg-red-500/80 backdrop-blur-sm text-white text-xs px-4 py-2 rounded-full text-center max-w-xs">
                {playError}
              </div>
            )}

            {offlineDownloadError && (
              <div className="mt-4 rounded-2xl border border-red-300/35 bg-red-500/80 px-4 py-2 text-center text-xs text-white backdrop-blur-sm">
                {offlineDownloadError}
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

        {/* Lyrics Panel */}
        {lyricsUrl && showLyrics && (
          <div className="absolute inset-0 z-25 flex flex-col bg-black/80 backdrop-blur-md" style={{ zIndex: 25 }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/65">Letra da música</p>
              <button
                onClick={() => setShowLyrics(false)}
                aria-label="Fechar letra"
                className="rounded-full border border-white/25 bg-black/30 px-3 py-1 text-[11px] font-bold text-white/90 hover:bg-black/45 transition-colors"
              >
                Fechar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' } as React.CSSProperties}>
              {lyricsLoading ? (
                <p className="text-white/60 text-sm text-center mt-8">Carregando letra...</p>
              ) : (
                <pre className="text-white/90 text-sm leading-7 whitespace-pre-wrap font-sans">
                  {lyricsText}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* Sidebar — próximas músicas, sempre visível no desktop (paridade com VideoPlayerScreen) */}
        <aside
          className={`${relatedTracks.length === 0 ? 'hidden' : 'hidden md:flex md:flex-col'} w-[340px] shrink-0 my-3 mr-3 rounded-2xl border border-white/10 bg-black/28 backdrop-blur-md overflow-hidden`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3.5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">Próximas músicas</p>
            <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-white/12 px-2 text-[11px] font-black text-white/70">
              {relatedTracks.length}
            </span>
          </div>
          <div
            className="flex-1 space-y-1.5 overflow-y-auto p-3"
            style={{ scrollbarWidth: 'none' } as React.CSSProperties}
          >
            {renderRelatedTracksList(
              'flex w-full items-center gap-3 rounded-xl border border-white/12 bg-white/5 p-2.5 text-left transition-colors hover:bg-white/10 text-white',
              false
            )}
          </div>
        </aside>

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
