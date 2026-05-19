import { describe, expect, it } from 'vitest';

import { spacing } from './spacing';
import { applyTheme, themes } from './themes';

describe('design system theme spacing tokens', () => {
  it('applies semantic and brand spacing tokens without breaking theme imports', () => {
    // Regression: ISSUE-001 — missing design-system/tokens/spacing.ts crashed the app before collections rendered
    // Found by /qa on 2026-05-10
    // Report: conversational QA for offline media visibility in collections
    const styleValues = new Map<string, string>();
    const attributes = new Map<string, string>();
    const root = {
      style: {
        setProperty: (name: string, value: string) => {
          styleValues.set(name, value);
        },
      },
      setAttribute: (name: string, value: string) => {
        attributes.set(name, value);
      },
    } as unknown as HTMLElement;

    applyTheme(themes['central-coruja'], root);

    expect(spacing.semantic['page-x']).toBe('1.5rem');
    expect(styleValues.get('--space-page-x')).toBe('1.5rem');
    expect(styleValues.get('--space-card-gap-desktop')).toBe('1.25rem');
    expect(attributes.get('data-brand')).toBe('central-coruja');
  });
});
