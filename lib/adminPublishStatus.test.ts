import { describe, expect, it } from 'vitest';
import { isEffectivelyPublished } from './adminPublishStatus';

describe('isEffectivelyPublished', () => {
  it('collection published + asset published = true', () => {
    expect(isEffectivelyPublished(true, true)).toBe(true);
  });

  it('collection unpublished + asset published = false', () => {
    expect(isEffectivelyPublished(false, true)).toBe(false);
  });

  it('collection published + asset unpublished = false', () => {
    expect(isEffectivelyPublished(true, false)).toBe(false);
  });

  it('treats null/undefined as published (backward-compat)', () => {
    expect(isEffectivelyPublished(undefined, undefined)).toBe(true);
    expect(isEffectivelyPublished(null, true)).toBe(true);
    expect(isEffectivelyPublished(true, null)).toBe(true);
    expect(isEffectivelyPublished(false, undefined)).toBe(false);
  });
});
