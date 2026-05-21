import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MediaHub } from '../types';

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
  sessionStorage.setItem('kaboo_dev_mock_session', '1');

  vi.stubGlobal('sessionStorage', sessionStorage);
  vi.stubGlobal('localStorage', localStorage);
  vi.stubGlobal('window', {
    sessionStorage,
    localStorage,
    location: {
      hash: '',
      href: 'http://localhost:4100/',
      hostname: 'localhost',
      origin: 'http://localhost:4100',
      port: '4100',
      protocol: 'http:',
      search: '',
    },
  });

  return { sessionStorage, localStorage };
};

describe('api brand-aware media hub fallback', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('keeps Central Coruja hubs empty until the brand has its own published media content', async () => {
    // Regression: brand media fallback leaked Kaboo hub seed content into Central Coruja
    // Found by user report on 2026-05-09
    // Report: conversational validation during Central Coruja catalog cleanup
    stubBrowserStorage();

    const { api, setActiveBrandForApi } = await import('./api');
    const { setMockActiveBrand } = await import('./mockData');

    setMockActiveBrand('central-coruja');
    setActiveBrandForApi('central-coruja');

    await expect(api.getCollections()).resolves.toEqual([]);
    await expect(api.getCharacters()).resolves.toEqual([]);
    await expect(api.getCentralMaterials()).resolves.toEqual([]);

    const hubs: MediaHub[] = ['videos', 'music', 'formations', 'materials'];

    for (const hub of hubs) {
      const response = await api.getMediaHub(hub);

      expect(response.hero).toBeNull();
      expect(response.shelves).toHaveLength(0);
      expect(response.counts.total).toBe(0);
    }

    await expect(api.getMediaItem('formation-featured-mediation')).resolves.toBeNull();
  });
});
