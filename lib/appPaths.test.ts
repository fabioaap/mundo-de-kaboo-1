import { describe, expect, it } from 'vitest';

import { buildPublicAppUrl } from './appPaths';

describe('buildPublicAppUrl', () => {
  it('anchors auth redirects to the public production domain', () => {
    expect(buildPublicAppUrl()).toBe('https://mundodekaboo.educacross.dev/');
    expect(buildPublicAppUrl('?confirmation=success')).toBe('https://mundodekaboo.educacross.dev/?confirmation=success');
    expect(buildPublicAppUrl('#login')).toBe('https://mundodekaboo.educacross.dev/#login');
  });
});
