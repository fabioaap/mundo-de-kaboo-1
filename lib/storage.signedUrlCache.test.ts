import { describe, it, expect, vi, beforeEach } from 'vitest';

const createSignedUrl = vi.fn();

vi.mock('./supabase', () => ({
  supabase: {
    storage: {
      from: () => ({ createSignedUrl: (...args: unknown[]) => createSignedUrl(...args) }),
    },
  },
}));

import { getSignedUrl } from './storage';

const BUCKET = 'collections';

beforeEach(() => {
  createSignedUrl.mockReset();
  createSignedUrl.mockImplementation(async (path: string) => ({
    data: { signedUrl: `https://x.supabase.co/storage/v1/object/sign/${BUCKET}/${path}?token=abc` },
    error: null,
  }));
});

describe('getSignedUrl cache', () => {
  it('reuses the cached URL on a second call for the same bucket+path', async () => {
    const path = `covers/a-${Math.random()}.png`;
    const first = await getSignedUrl(BUCKET, path);
    const second = await getSignedUrl(BUCKET, path);

    expect(first).toBe(second);
    expect(createSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('caches different paths independently', async () => {
    const pathA = `covers/b-${Math.random()}.png`;
    const pathB = `covers/c-${Math.random()}.png`;

    const a1 = await getSignedUrl(BUCKET, pathA);
    const b1 = await getSignedUrl(BUCKET, pathB);
    const a2 = await getSignedUrl(BUCKET, pathA);
    const b2 = await getSignedUrl(BUCKET, pathB);

    expect(a1).toBe(a2);
    expect(b1).toBe(b2);
    expect(a1).not.toBe(b1);
    expect(createSignedUrl).toHaveBeenCalledTimes(2);
  });

  it('dedupes concurrent in-flight requests for the same bucket+path', async () => {
    const path = `covers/d-${Math.random()}.png`;

    const [a, b, c] = await Promise.all([
      getSignedUrl(BUCKET, path),
      getSignedUrl(BUCKET, path),
      getSignedUrl(BUCKET, path),
    ]);

    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(createSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('does not cache a failed result, so a retry hits the API again', async () => {
    const path = `covers/e-${Math.random()}.png`;
    createSignedUrl.mockImplementationOnce(async () => ({ data: null, error: { message: 'boom' } }));

    const failed = await getSignedUrl(BUCKET, path);
    expect(failed).toBeNull();
    expect(createSignedUrl).toHaveBeenCalledTimes(1);

    const retried = await getSignedUrl(BUCKET, path);
    expect(retried).not.toBeNull();
    expect(createSignedUrl).toHaveBeenCalledTimes(2);
  });

  it('shares the cache entry between the legacy single-URL form and the two-arg form', async () => {
    const path = `covers/f-${Math.random()}.png`;
    const fullUrl = `https://proj.supabase.co/storage/v1/object/public/${BUCKET}/${path}`;

    const viaTwoArgs = await getSignedUrl(BUCKET, path);
    const viaSingleArg = await getSignedUrl(fullUrl);

    expect(viaSingleArg).toBe(viaTwoArgs);
    expect(createSignedUrl).toHaveBeenCalledTimes(1);
  });
});
