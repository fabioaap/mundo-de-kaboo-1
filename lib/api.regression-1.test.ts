import { beforeEach, describe, expect, it, vi } from 'vitest';

const createStorageMock = (): Storage => {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
};

const stubBrowserStorage = () => {
  const sessionStorage = createStorageMock();
  const localStorage = createStorageMock();

  vi.stubGlobal('sessionStorage', sessionStorage);
  vi.stubGlobal('localStorage', localStorage);
  vi.stubGlobal('window', {
    sessionStorage,
    localStorage,
  });

  return { sessionStorage, localStorage };
};

describe('api mock collections cache invalidation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('clears the collections cache after mock collection creation', async () => {
    // Regression: BUG-005 — mock collection create left the admin grid on stale cached data
    // Found by /qa on 2026-05-09
    // Report: .gstack/qa-reports/qa-report-sprint2-2026-05-09.md
    const { sessionStorage } = stubBrowserStorage();
    const { api } = await import('./api');

    const initialCollections = await api.getCollections();
    expect(initialCollections.length).toBeGreaterThan(0);
    expect(sessionStorage.getItem('kaboo_collections_cache')).not.toBeNull();

    const created = await api.createCollection({
      title: 'Regression BUG-005 Create',
      theme: 'QA cache invalidation',
      collection_type: 'collection',
      primary_segment: 'E.F. Anos Iniciais',
      segments: ['E.F. Anos Iniciais'],
    });

    expect(created?.title).toBe('Regression BUG-005 Create');
    expect(sessionStorage.getItem('kaboo_collections_cache')).toBeNull();

    const refreshedCollections = await api.getCollections();
    expect(refreshedCollections.some((collection) => collection.id === created?.id)).toBe(true);
  });

  it('clears the collections cache after mock collection updates', async () => {
    const { sessionStorage } = stubBrowserStorage();
    const { api } = await import('./api');

    const initialCollections = await api.getCollections();
    const target = initialCollections[0];

    if (!target) {
      throw new Error('Expected seed collections in mock dataset');
    }

    expect(sessionStorage.getItem('kaboo_collections_cache')).not.toBeNull();

    const updated = await api.updateCollection(target.id, {
      theme: 'Regression BUG-005 Updated Theme',
    });

    expect(updated?.theme).toBe('Regression BUG-005 Updated Theme');
    expect(sessionStorage.getItem('kaboo_collections_cache')).toBeNull();

    const refreshedCollections = await api.getCollections();
    expect(refreshedCollections.find((collection) => collection.id === target.id)?.theme).toBe('Regression BUG-005 Updated Theme');
  });

  it('clears the collections cache after mock collection deletion', async () => {
    const { sessionStorage } = stubBrowserStorage();
    const { api } = await import('./api');

    const created = await api.createCollection({
      title: 'Regression BUG-005 Delete',
      theme: 'QA cache invalidation',
    });

    if (!created) {
      throw new Error('Expected mock collection creation to succeed');
    }

    await api.getCollections();
    expect(sessionStorage.getItem('kaboo_collections_cache')).not.toBeNull();

    const deleted = await api.deleteCollection(created.id);
    expect(deleted).toBe(true);
    expect(sessionStorage.getItem('kaboo_collections_cache')).toBeNull();

    const refreshedCollections = await api.getCollections();
    expect(refreshedCollections.some((collection) => collection.id === created.id)).toBe(false);
  });
});
