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
};

describe('api collection schema compatibility helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    stubBrowserStorage();
  });

  it('strips legacy collection columns that are missing from older remote schemas', async () => {
    // Regression: remote collection create broke when the schema cache did not expose offline_available
    // Found during Central Coruja real catalog registration on 2026-05-21
    const { stripMissingCollectionColumns } = await import('./api');

    const payload = {
      title: 'Livro',
      character_ids: ['coruja'],
      offline_available: false,
      pdf_url: 'https://cdn.example.com/livro.pdf',
    };

    expect(stripMissingCollectionColumns(payload, ['offline_available'])).toEqual({
      title: 'Livro',
      character_ids: ['coruja'],
      pdf_url: 'https://cdn.example.com/livro.pdf',
    });

    expect(stripMissingCollectionColumns(payload, ['character_ids', 'offline_available'])).toEqual({
      title: 'Livro',
      pdf_url: 'https://cdn.example.com/livro.pdf',
    });
  });
});
