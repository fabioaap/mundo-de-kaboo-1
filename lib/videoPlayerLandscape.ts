export type VideoPlayerSurfaceAction = 'toggle-play' | 'show-controls' | 'hide-controls';

export const shouldAutoHideVideoPlayerControls = (isPlaying: boolean, isMobilePortrait: boolean): boolean => (
  isPlaying && !isMobilePortrait
);

export const shouldRenderInlineNextVideoCard = (
  isMobilePortrait: boolean,
  isMobileLandscape: boolean
): boolean => !isMobilePortrait && !isMobileLandscape;

export const getVideoPlayerSurfaceAction = (
  isMobileLandscape: boolean,
  showControls: boolean
): VideoPlayerSurfaceAction => {
  if (!isMobileLandscape) {
    return 'toggle-play';
  }

  return showControls ? 'hide-controls' : 'show-controls';
};
