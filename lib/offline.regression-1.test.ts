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
  title: 'Kaboo e a Carta Misteriosa',
  cover_image: 'https://cdn.example.com/cover.png',
  level: 'Fundamental I',
  pdf_url: 'https://cdn.example.com/book.pdf',
  audio_url: 'https://cdn.example.com/story.mp3',
  video_url: 'https://cdn.example.com/video.mp4',
  offline_available: true,
  ...overrides,
});

describe('offline manager media downloads', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('caches the current media url before marking the collection offline', async () => {
    // Regression: the collection CTA claimed offline availability without caching the active media
    // Found by user report on 2026-05-10
    // Report: conversational validation for Kaboo offline player flow
    const localStorage = createStorageMock();
    const add = vi.fn().mockResolvedValue(undefined);
    const open = vi.fn().mockResolvedValue({ add });
    const cachesMock = { open };

    vi.stubGlobal('localStorage', localStorage);
    vi.stubGlobal('caches', cachesMock);
    vi.stubGlobal('window', {
      localStorage,
      caches: cachesMock,
      location: { origin: 'https://app.kaboo.test' },
    });

    const { offlineManager } = await import('./offline');

    const result = await offlineManager.enableOffline(createCollection(), {
      extraUrls: [
        'https://cdn.example.com/libras.mp4#chapter-1',
        '/mock/lyrics/kaboo.txt',
      ],
      preferExtraUrls: true,
    });

    expect(open).toHaveBeenCalledWith('kaboo-offline-v1');
    expect(add).toHaveBeenCalledTimes(2);
    expect(add).toHaveBeenCalledWith('https://cdn.example.com/libras.mp4');
    expect(add).toHaveBeenCalledWith('https://app.kaboo.test/mock/lyrics/kaboo.txt');
    expect(result.cachedUrls).toContain('https://cdn.example.com/libras.mp4');
    expect(result.cachedUrls).not.toContain('https://cdn.example.com/story.mp3');
    expect(JSON.parse(localStorage.getItem('offline_collections') || '[]')).toEqual(['collection-1']);
    expect(offlineManager.isOffline('collection-1')).toBe(true);
  });

  it('checks cached media status using normalized player urls', async () => {
    const localStorage = createStorageMock();
    localStorage.setItem('offline_collections', JSON.stringify(['collection-1']));
    const match = vi.fn().mockImplementation((url: string) =>
      Promise.resolve(url === 'https://cdn.example.com/libras.mp4' ? { url } : undefined)
    );
    const open = vi.fn().mockResolvedValue({ match });
    const cachesMock = { open };

    vi.stubGlobal('localStorage', localStorage);
    vi.stubGlobal('caches', cachesMock);
    vi.stubGlobal('window', {
      localStorage,
      caches: cachesMock,
      location: { origin: 'https://app.kaboo.test' },
    });

    const { offlineManager } = await import('./offline');

    const status = await offlineManager.getDownloadStatus(createCollection(), {
      extraUrls: ['https://cdn.example.com/libras.mp4#player'],
      preferExtraUrls: true,
    });

    expect(match).toHaveBeenCalledWith('https://cdn.example.com/libras.mp4');
    expect(status.cachedUrls).toEqual(['https://cdn.example.com/libras.mp4']);
    expect(status.missingUrls).toEqual([]);
    expect(offlineManager.isOffline('collection-1')).toBe(true);
  });

  it('does not mark the collection offline when all cache attempts fail', async () => {
    const localStorage = createStorageMock();
    const add = vi.fn().mockRejectedValue(new Error('cache failed'));
    const open = vi.fn().mockResolvedValue({ add });
    const cachesMock = { open };

    vi.stubGlobal('localStorage', localStorage);
    vi.stubGlobal('caches', cachesMock);
    vi.stubGlobal('window', {
      localStorage,
      caches: cachesMock,
      location: { origin: 'https://app.kaboo.test' },
    });

    const { offlineManager } = await import('./offline');

    await expect(
      offlineManager.enableOffline(createCollection({ cover_image: '', audio_url: '', video_url: '', pdf_url: 'https://cdn.example.com/book.pdf' }))
    ).rejects.toThrow('Não foi possível baixar este conteúdo para offline agora.');

    expect(localStorage.getItem('offline_collections')).toBeNull();
    expect(offlineManager.isOffline('collection-1')).toBe(false);
  });
});
