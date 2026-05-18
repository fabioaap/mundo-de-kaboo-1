export type AudioPlayerLayout = 'mobile-portrait' | 'mobile-landscape' | 'default';

export const getAudioPlayerLayout = (
  isMobilePortrait: boolean,
  isMobileLandscape: boolean
): AudioPlayerLayout => {
  if (isMobilePortrait) {
    return 'mobile-portrait';
  }

  if (isMobileLandscape) {
    return 'mobile-landscape';
  }

  return 'default';
};

export const shouldTreatAudioPlayerAsCompactViewport = (
  width: number,
  height: number
): boolean => height <= 500 && width <= 960;

export const shouldUseAudioPlayerMobileLandscapeLayout = (
  isLandscape: boolean,
  isMobile: boolean,
  isCompactHeightViewport: boolean
): boolean => isLandscape && (isMobile || isCompactHeightViewport);

export const shouldResetAudioPlayerPanels = (
  previousLayout: AudioPlayerLayout,
  nextLayout: AudioPlayerLayout
): boolean => previousLayout !== nextLayout;
