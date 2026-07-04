import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const loadServiceWorker = (cacheKeys: string[], brand = 'kaboo') => {
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
    clients: { claim },
    URL,
  };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);

  return {
    deletedCaches,
    fireActivate: async () => {
      const event = { waitUntil: (p: Promise<unknown>) => p };
      await Promise.all((listeners.activate || []).map((handler) => handler(event)));
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
});
