import { describe, expect, it } from 'vitest';

import { getFileUploadPreviewSizeClassName } from './fileUploadPresentation';

describe('getFileUploadPreviewSizeClassName', () => {
  it('keeps the current preview size as the default mapping', () => {
    expect(getFileUploadPreviewSizeClassName()).toBe('w-32 h-32');
    expect(getFileUploadPreviewSizeClassName('md')).toBe('w-32 h-32');
  });

  it('returns a more compact mapping for smaller configuration cards', () => {
    expect(getFileUploadPreviewSizeClassName('sm')).toBe('w-24 h-24');
  });
});
