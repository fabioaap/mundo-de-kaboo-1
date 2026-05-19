import { describe, expect, it } from 'vitest';

import {
  AUDIO_PLAYER_SKIP_SECONDS,
  getAudioPlayerSkipTarget,
} from './audioPlayerSkip';

describe('audio player skip regressions', () => {
  it('advances forward and rewinds backward by the mobile affordance amount', () => {
    // Regression: the mobile audio player skip buttons felt inverted during UX validation.
    // Found in conversational QA on 2026-05-11
    // Report: conversational validation for the mobile music player
    expect(AUDIO_PLAYER_SKIP_SECONDS).toBe(10);
    expect(getAudioPlayerSkipTarget(42, 180, 'forward')).toBe(52);
    expect(getAudioPlayerSkipTarget(42, 180, 'backward')).toBe(32);
  });

  it('never rewinds below zero', () => {
    expect(getAudioPlayerSkipTarget(5, 180, 'backward')).toBe(0);
  });

  it('never overshoots a known duration', () => {
    expect(getAudioPlayerSkipTarget(176, 180, 'forward')).toBe(180);
  });

  it('does not snap forward to zero when metadata duration is still unavailable', () => {
    expect(getAudioPlayerSkipTarget(42, 0, 'forward')).toBe(52);
    expect(getAudioPlayerSkipTarget(42, Number.NaN, 'forward')).toBe(52);
  });
});
