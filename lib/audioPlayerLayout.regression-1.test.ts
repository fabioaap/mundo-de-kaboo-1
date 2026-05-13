import { describe, expect, it } from 'vitest';

import {
  getAudioPlayerLayout,
  shouldTreatAudioPlayerAsCompactViewport,
  shouldUseAudioPlayerMobileLandscapeLayout,
  shouldResetAudioPlayerPanels,
} from './audioPlayerLayout';

describe('audio player layout regressions', () => {
  it('detects the mobile portrait and landscape layouts explicitly', () => {
    expect(getAudioPlayerLayout(true, false)).toBe('mobile-portrait');
    expect(getAudioPlayerLayout(false, true)).toBe('mobile-landscape');
    expect(getAudioPlayerLayout(false, false)).toBe('default');
  });

  it('treats short landscape viewports as mobile landscape even with a desktop user agent', () => {
    // Regression: 852x393 stayed on the desktop audio layout during QA, hiding controls below the fold.
    // Found by /qa on 2026-05-11
    // Report: conversational validation for the mobile music player
    expect(shouldTreatAudioPlayerAsCompactViewport(852, 393)).toBe(true);
    expect(
      shouldUseAudioPlayerMobileLandscapeLayout(true, false, true)
    ).toBe(true);
    expect(
      shouldUseAudioPlayerMobileLandscapeLayout(false, true, true)
    ).toBe(false);
  });

  it('resets mobile panels when the audio player changes layout context', () => {
    // Regression: the music player kept mobile overlays open when rotating between portrait and landscape.
    // Found by /qa on 2026-05-11
    // Report: conversational validation for the mobile music player
    expect(
      shouldResetAudioPlayerPanels(
        getAudioPlayerLayout(true, false),
        getAudioPlayerLayout(false, true)
      )
    ).toBe(true);
    expect(
      shouldResetAudioPlayerPanels(
        getAudioPlayerLayout(false, true),
        getAudioPlayerLayout(false, true)
      )
    ).toBe(false);
  });
});
