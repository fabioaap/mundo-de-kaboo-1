export type AudioPlayerSkipDirection = 'backward' | 'forward';

export const AUDIO_PLAYER_SKIP_SECONDS = 10;

const getFinitePositiveNumber = (value: number): number | null => {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
};

export const getAudioPlayerSkipTarget = (
  currentTime: number,
  duration: number,
  direction: AudioPlayerSkipDirection,
  stepSeconds: number = AUDIO_PLAYER_SKIP_SECONDS,
): number => {
  const safeCurrentTime = getFinitePositiveNumber(currentTime) ?? 0;
  const safeStepSeconds = getFinitePositiveNumber(stepSeconds) ?? AUDIO_PLAYER_SKIP_SECONDS;
  const signedStep = direction === 'forward' ? safeStepSeconds : -safeStepSeconds;
  const unclampedTarget = Math.max(0, safeCurrentTime + signedStep);
  const safeDuration = getFinitePositiveNumber(duration);

  return safeDuration === null ? unclampedTarget : Math.min(unclampedTarget, safeDuration);
};
