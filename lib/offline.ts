import { Collection } from '../types';
import { logger } from './logger';
import { getActiveBrandSlug } from './activeBrand';

const CACHE_NAME_BASE = 'kaboo-offline-v1';
const STORAGE_KEY_BASE = 'offline_collections';

// Both the Cache API name and the localStorage list are scoped per brand so the
// dev/test deploy on GitHub Pages (all brands on the same origin, brand chosen via
// `?brand=`) never mixes one brand's offline downloads with another's. In production
// each brand is its own domain/Storage Account, so same-origin already isolates them,
// but scoping keeps the behavior identical across environments. Follows the same
// `kaboo` === no-suffix convention as the collection/profile session caches in api.ts.
const brandSuffix = (): string => {
  const slug = getActiveBrandSlug();
  return slug === 'kaboo' ? '' : `_${slug}`;
};

export const getOfflineStorageKey = (): string => `${STORAGE_KEY_BASE}${brandSuffix()}`;

// The Service Worker owns the actual media cache and can only read the brand from a
// query param on its own URL (see registration in index.tsx). It hyphenates the suffix
// (`kaboo-offline-v1-central-coruja`) to keep the cache name a valid single token; the
// app side must build the exact same string so reads/writes hit the same cache.
export const getOfflineCacheName = (): string => {
  const slug = getActiveBrandSlug();
  return slug === 'kaboo' ? CACHE_NAME_BASE : `${CACHE_NAME_BASE}-${slug}`;
};

type EnableOfflineOptions = {
  extraUrls?: Array<string | null | undefined>;
  preferExtraUrls?: boolean;
};

type OfflineDownloadResult = {
  cachedUrls: string[];
  failedUrls: string[];
};

type OfflineDownloadStatus = {
  cachedUrls: string[];
  missingUrls: string[];
};

const getStoredOfflineCollectionIds = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(getOfflineStorageKey()) || '[]');
  } catch {
    return [];
  }
};

const setStoredOfflineCollectionIds = (collectionIds: string[]): void => {
  localStorage.setItem(getOfflineStorageKey(), JSON.stringify(collectionIds));
};

const normalizeCacheUrl = (value?: string | null): string | null => {
  const trimmedValue = (value ?? '').trim();

  if (!trimmedValue || typeof window === 'undefined') {
    return null;
  }

  try {
    const resolvedUrl = new URL(trimmedValue, window.location.origin);
    resolvedUrl.hash = '';

    if (resolvedUrl.protocol !== 'http:' && resolvedUrl.protocol !== 'https:') {
      return null;
    }

    return resolvedUrl.toString();
  } catch {
    return null;
  }
};

const getOfflineCacheUrls = (
  collection: Collection,
  extraUrls: Array<string | null | undefined> = [],
  preferExtraUrls = false
): string[] => {
  const normalizedExtraUrls = extraUrls
    .map((url) => normalizeCacheUrl(url))
    .filter((url): url is string => Boolean(url));

  const sourceUrls =
    preferExtraUrls && normalizedExtraUrls.length > 0
      ? normalizedExtraUrls
      : [
          collection.cover_image,
          collection.audio_url,
          collection.video_url,
          collection.pdf_url,
          ...normalizedExtraUrls,
        ];

  return Array.from(
    new Set(
      sourceUrls
        .map((url) => normalizeCacheUrl(url))
        .filter((url): url is string => Boolean(url))
    )
  );
};

export const offlineManager = {
  /**
   * Verifica se uma coleção está marcada como offline
   */
  isOffline: (id: string): boolean => {
    return getStoredOfflineCollectionIds().includes(id);
  },

  /**
   * Salva a coleção para uso offline (Cache + LocalStorage)
   */
  enableOffline: async (
    collection: Collection,
    options: EnableOfflineOptions = {}
  ): Promise<OfflineDownloadResult> => {
    if (typeof window === 'undefined' || !('caches' in window)) {
      throw new Error('Seu dispositivo não suporta download offline neste navegador.');
    }

    const urlsToCache = getOfflineCacheUrls(
      collection,
      options.extraUrls,
      options.preferExtraUrls
    );

    if (urlsToCache.length === 0) {
      throw new Error('Esta mídia não possui arquivos compatíveis com download offline.');
    }

    let cache: Cache;

    try {
      cache = await caches.open(getOfflineCacheName());
    } catch (error) {
      logger.error('Erro ao acessar Cache API:', error);
      throw new Error('Não foi possível preparar o download offline agora.');
    }

    const results = await Promise.all(
      urlsToCache.map(async (url) => {
        try {
          await cache.add(url);
          return { url, ok: true as const };
        } catch (error) {
          logger.warn(`Falha ao cachear ${url}:`, error);
          return { url, ok: false as const };
        }
      })
    );

    const cachedUrls = results.filter((result) => result.ok).map((result) => result.url);
    const failedUrls = results.filter((result) => !result.ok).map((result) => result.url);

    if (cachedUrls.length === 0) {
      throw new Error('Não foi possível baixar este conteúdo para offline agora.');
    }

    const storedCollectionIds = getStoredOfflineCollectionIds();

    if (!storedCollectionIds.includes(collection.id)) {
      setStoredOfflineCollectionIds([...storedCollectionIds, collection.id]);
    }

    return {
      cachedUrls,
      failedUrls,
    };
  },

  getDownloadStatus: async (
    collection: Collection,
    options: EnableOfflineOptions = {}
  ): Promise<OfflineDownloadStatus> => {
    const urlsToCheck = getOfflineCacheUrls(
      collection,
      options.extraUrls,
      options.preferExtraUrls
    );

    if (
      urlsToCheck.length === 0 ||
      typeof window === 'undefined' ||
      !('caches' in window)
    ) {
      return {
        cachedUrls: [],
        missingUrls: urlsToCheck,
      };
    }

    let cache: Cache;

    try {
      cache = await caches.open(getOfflineCacheName());
    } catch (error) {
      logger.warn('Erro ao consultar Cache API:', error);
      return {
        cachedUrls: [],
        missingUrls: urlsToCheck,
      };
    }

    const results = await Promise.all(
      urlsToCheck.map(async (url) => {
        try {
          const match = await cache.match(url);
          return { url, ok: Boolean(match) };
        } catch (error) {
          logger.warn(`Falha ao verificar cache de ${url}:`, error);
          return { url, ok: false };
        }
      })
    );

    return {
      cachedUrls: results.filter((result) => result.ok).map((result) => result.url),
      missingUrls: results.filter((result) => !result.ok).map((result) => result.url),
    };
  },

  /**
   * Remove a coleção do modo offline: apaga arquivos do Cache API e remove do localStorage
   */
  disableOffline: async (
    collection: Collection,
    options: EnableOfflineOptions = {}
  ): Promise<void> => {
    const updatedList = getStoredOfflineCollectionIds().filter(
      (item: string) => item !== collection.id
    );
    setStoredOfflineCollectionIds(updatedList);

    if (typeof window === 'undefined' || !('caches' in window)) {
      return;
    }

    const urlsToDelete = getOfflineCacheUrls(
      collection,
      options.extraUrls,
      options.preferExtraUrls
    );

    if (urlsToDelete.length === 0) {
      return;
    }

    let cache: Cache;

    try {
      cache = await caches.open(getOfflineCacheName());
    } catch (error) {
      logger.warn('Erro ao acessar Cache API para remoção:', error);
      return;
    }

    await Promise.all(
      urlsToDelete.map(async (url) => {
        try {
          await cache.delete(url);
        } catch (error) {
          logger.warn(`Falha ao remover cache de ${url}:`, error);
        }
      })
    );
  },
};
