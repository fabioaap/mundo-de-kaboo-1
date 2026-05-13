export type VideoPlayerSurfaceAction = 'toggle-play' | 'show-controls' | 'hide-controls';
export type VideoPlayerLayout = 'mobile-portrait' | 'mobile-landscape' | 'default';

export const shouldAutoHideVideoPlayerControls = (isPlaying: boolean, isMobilePortrait: boolean): boolean => (
  isPlaying && !isMobilePortrait
);

export const shouldRenderInlineNextVideoCard = (
  isMobilePortrait: boolean,
  isMobileLandscape: boolean
): boolean => !isMobilePortrait && !isMobileLandscape;

export const getVideoPlayerLayout = (
  isMobilePortrait: boolean,
  isMobileLandscape: boolean
): VideoPlayerLayout => {
  if (isMobilePortrait) {
    return 'mobile-portrait';
  }

  if (isMobileLandscape) {
    return 'mobile-landscape';
  }

  return 'default';
};

export const shouldResetMobileUtilityPanels = (
  previousLayout: VideoPlayerLayout,
  nextLayout: VideoPlayerLayout,
  previousFullscreen: boolean,
  nextFullscreen: boolean
): boolean => previousLayout !== nextLayout || previousFullscreen !== nextFullscreen;

export const getVideoPlayerSurfaceAction = (
  isMobileLandscape: boolean,
  showControls: boolean
): VideoPlayerSurfaceAction => {
  if (!isMobileLandscape) {
    return 'toggle-play';
  }

  return showControls ? 'hide-controls' : 'show-controls';
};
