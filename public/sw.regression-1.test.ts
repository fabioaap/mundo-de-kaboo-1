import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const loadServiceWorker = (cacheKeys: string[], brand = 'kaboo', activeClientUrls: string[] = []) => {
  const source = readFileSync(path.join(__dirname, 'sw.js'), 'utf-8');

  const listeners: Record<string, ((event: unknown) => void)[]> = {};
  const deletedCaches: string[] = [];
  const claim = () => Promise.resolve();

  const sandbox = {
    self: {
      location: { href: `https://app.kaboo.test/sw.js?brand=${brand}` },
      addEventListener: (type: string, handler: (event: unknown) => void) => {
        listeners[type] = listeners[type] || [];
        listeners[type].push(handler);
      },
      skipWaiting: () => {},
    },
    caches: {
      keys: () => Promise.resolve(cacheKeys),
      delete: (key: string) => {
        deletedCaches.push(key);
        return Promise.resolve(true);
      },
      open: () => Promise.resolve({ match: () => Promise.resolve(undefined) }),
    },
    clients: {
      claim,
      matchAll: () => Promise.resolve(activeClientUrls.map((url) => ({ url }))),
    },
    URL,
  };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);

  return {
    deletedCaches,
    fireActivate: async () => {
      // Capture the promise(s) passed to waitUntil rather than relying on the handler's return
      // value (it doesn't return waitUntil's argument, matching real SW semantics) — otherwise
      // this would resolve before the vm-sandboxed promise chain actually finishes.
      const waited: Promise<unknown>[] = [];
      const event = {
        waitUntil: (p: Promise<unknown>) => {
          waited.push(p);
          return p;
        },
      };
      (listeners.activate || []).forEach((handler) => handler(event));
      await Promise.all(waited);
    },
  };
};

// Regression: a stale SW from before brand-scoping (registered as plain 'kaboo-offline-v1')
// stayed active across a user's session and never had its old cache cleaned up — the
// `activate` handler only called `clients.claim()`, it never deleted caches that don't match
// the current brand-scoped CACHE_NAME. Combined with `updateViaCache: 'imports'` (the default),
// a static host without strong cache-control on sw.js can serve the browser's own update-check
// fetch stale bytes, so a real user's already-controlled tab could run old SW logic indefinitely
// — surviving a hard refresh, which doesn't force-refetch the SW's own script.
// Bug report: 2026-07-04, kit "Livro" card click silently doing nothing for a user with a
// pre-existing tab/session, while a fresh Chrome profile reproduced the fix correctly.
describe('sw.js activate handler', () => {
  it('deletes stale caches from a previous brand/version but keeps the current brand-scoped cache', async () => {
    const { deletedCaches, fireActivate } = loadServiceWorker(
      ['kaboo-offline-v1', 'kaboo-offline-v1-central-coruja', 'kaboo-offline-v2-unrelated'],
      'central-coruja'
    );

    await fireActivate();

    expect(deletedCaches).toContain('kaboo-offline-v1');
    expect(deletedCaches).not.toContain('kaboo-offline-v1-central-coruja');
    expect(deletedCaches).not.toContain('kaboo-offline-v2-unrelated');
  });

  it('keeps the current cache when it is the only one present', async () => {
    const { deletedCaches, fireActivate } = loadServiceWorker(['kaboo-offline-v1']);

    await fireActivate();

    expect(deletedCaches).toEqual([]);
  });

  // Regression: only one SW is active per origin/scope, shared by every open tab. If a user has
  // two tabs open for different brands (e.g. '?brand=central-coruja' + '?brand=outra-marca'),
  // whichever tab's registration triggers `activate` must not delete the OTHER brand's cache
  // while that other tab is still open and using it — even though it looks just as "stale" as a
  // genuinely orphaned cache from the filter's point of view.
  it('does not delete a stale-looking cache that another currently-open tab is still using', async () => {
    const { deletedCaches, fireActivate } = loadServiceWorker(
      ['kaboo-offline-v1', 'kaboo-offline-v1-outra-marca', 'kaboo-offline-v1-central-coruja'],
      'central-coruja',
      ['https://app.kaboo.test/?brand=outra-marca']
    );

    await fireActivate();

    expect(deletedCaches).toContain('kaboo-offline-v1');
    expect(deletedCaches).not.toContain('kaboo-offline-v1-outra-marca');
    expect(deletedCaches).not.toContain('kaboo-offline-v1-central-coruja');
  });
});
