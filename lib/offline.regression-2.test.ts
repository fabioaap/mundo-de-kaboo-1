import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Collection } from '../types';

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

const createCollection = (overrides: Partial<Collection> = {}): Collection => ({
  id: 'collection-1',
  title: 'Central Coruja e o Enigma',
  cover_image: 'https://cdn.example.com/cover.png',
  level: 'Fundamental I',
  pdf_url: 'https://cdn.example.com/book.pdf',
  ...overrides,
});

describe('offline manager brand scoping', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('scopes the offline collections list and cache name per active brand', async () => {
    // Regression (issue #59 / C2): offline_collections + kaboo-offline-v1 were brand-agnostic,
    // mixing brands on the shared dev/test origin. Non-kaboo brands must get a suffix; kaboo stays unsuffixed.
    const sessionStorage = createStorageMock();
    const localStorage = createStorageMock();
    const add = vi.fn().mockResolvedValue(undefined);
    const open = vi.fn().mockResolvedValue({ add });
    const cachesMock = { open };

    vi.stubGlobal('sessionStorage', sessionStorage);
    vi.stubGlobal('localStorage', localStorage);
    vi.stubGlobal('caches', cachesMock);
    vi.stubGlobal('window', {
      sessionStorage,
      localStorage,
      caches: cachesMock,
      location: { origin: 'https://pages.kaboo.test' },
    });

    const { setActiveBrandSlug } = await import('./activeBrand');
    const { offlineManager, getOfflineStorageKey, getOfflineCacheName } = await import('./offline');

    // Non-kaboo brand: keys get the brand suffix.
    setActiveBrandSlug('central-coruja');
    expect(getOfflineStorageKey()).toBe('offline_collections_central-coruja');
    expect(getOfflineCacheName()).toBe('kaboo-offline-v1-central-coruja');

    await offlineManager.enableOffline(createCollection(), {
      extraUrls: ['https://cdn.example.com/coruja.pdf'],
      preferExtraUrls: true,
    });

    expect(open).toHaveBeenCalledWith('kaboo-offline-v1-central-coruja');
    expect(localStorage.getItem('offline_collections_central-coruja')).toBe(JSON.stringify(['collection-1']));
    expect(localStorage.getItem('offline_collections')).toBeNull();

    // kaboo: no suffix (backward compatible with pre-scoping caches/keys).
    setActiveBrandSlug('kaboo');
    expect(getOfflineStorageKey()).toBe('offline_collections');
    expect(getOfflineCacheName()).toBe('kaboo-offline-v1');
    expect(offlineManager.isOffline('collection-1')).toBe(false);
  });
});
