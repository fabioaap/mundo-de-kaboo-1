import { describe, expect, it } from 'vitest';

import { buildPublicAppUrl, buildTenantPublicAppUrl } from './appPaths';

describe('buildPublicAppUrl', () => {
  it('anchors auth redirects to the public production domain', () => {
    expect(buildPublicAppUrl()).toBe('https://mundodekaboo.educacross.dev/');
    expect(buildPublicAppUrl('?confirmation=success')).toBe('https://mundodekaboo.educacross.dev/?confirmation=success');
    expect(buildPublicAppUrl('#login')).toBe('https://mundodekaboo.educacross.dev/#login');
  });
});

describe('buildTenantPublicAppUrl', () => {
  it('pins auth redirects to the active tenant', () => {
    expect(buildTenantPublicAppUrl('central-coruja')).toBe('https://mundodekaboo.educacross.dev/?brand=central-coruja');
    expect(buildTenantPublicAppUrl('central-coruja', '?confirmation=success')).toBe('https://mundodekaboo.educacross.dev/?confirmation=success&brand=central-coruja');
    expect(buildTenantPublicAppUrl('kaboo', '#set_password')).toBe('https://mundodekaboo.educacross.dev/?brand=kaboo#set_password');
  });

  it('falls back to the canonical public URL when the tenant is unknown', () => {
    expect(buildTenantPublicAppUrl('invalid-brand', '?confirmation=success')).toBe('https://mundodekaboo.educacross.dev/?confirmation=success');
  });
});
