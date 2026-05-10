import { Collection } from '../types';
import { logger } from './logger';

const CACHE_NAME = 'kaboo-offline-v1';
const STORAGE_KEY = 'offline_collections';

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
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const setStoredOfflineCollectionIds = (collectionIds: string[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collectionIds));
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
      cache = await caches.open(CACHE_NAME);
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
      cache = await caches.open(CACHE_NAME);
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
   * Remove a coleção do modo offline
   */
  disableOffline: async (id: string): Promise<void> => {
    const updatedList = getStoredOfflineCollectionIds().filter((item: string) => item !== id);
    setStoredOfflineCollectionIds(updatedList);

    // Nota: Em uma implementação completa, deveríamos iterar sobre as chaves do cache
    // e deletar os arquivos específicos. Para este escopo, remover da lista de permissão é suficiente.
  }
};
