import { describe, expect, it } from 'vitest';

import {
  getVideoPlayerSurfaceAction,
  shouldAutoHideVideoPlayerControls,
  shouldRenderInlineNextVideoCard,
} from './videoPlayerLandscape';

describe('video player landscape regressions', () => {
  it('hides the inline next-video card across both mobile player layouts', () => {
    // Regression: the landscape player leaked the large "Próximo" card because display utilities conflicted.
    // Found by /qa on 2026-05-11
    // Report: conversational validation for the mobile landscape video player
    expect(shouldRenderInlineNextVideoCard(true, false)).toBe(false);
    expect(shouldRenderInlineNextVideoCard(false, true)).toBe(false);
    expect(shouldRenderInlineNextVideoCard(false, false)).toBe(true);
  });

  it('auto-hides controls only when playback is active outside portrait mobile', () => {
    expect(shouldAutoHideVideoPlayerControls(true, false)).toBe(true);
    expect(shouldAutoHideVideoPlayerControls(false, false)).toBe(false);
    expect(shouldAutoHideVideoPlayerControls(true, true)).toBe(false);
  });

  it('treats a tap on the landscape video surface as a controls toggle instead of play pause', () => {
    expect(getVideoPlayerSurfaceAction(true, false)).toBe('show-controls');
    expect(getVideoPlayerSurfaceAction(true, true)).toBe('hide-controls');
    expect(getVideoPlayerSurfaceAction(false, false)).toBe('toggle-play');
  });
});
