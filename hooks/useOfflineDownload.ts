import { useCallback, useEffect, useMemo, useState } from 'react';

import { Collection } from '../types';
import { offlineManager } from '../lib/offline';
import { useBrandConfig } from './useBrandConfig';

export const useOfflineDownload = (
  collection: Collection,
  extraUrls: Array<string | null | undefined> = [],
  /** Per-asset override. null/undefined = inherits collection-level flag. false = disabled even if collection allows. */
  assetOfflineAvailable?: boolean | null
) => {
  const { isFeatureEnabled } = useBrandConfig();
  const brandAllowsOffline = isFeatureEnabled('content.offline');
  // Gate hierarchy (all must allow): brand flag → collection → asset.
  // The brand toggle is the top-level opt-in and is authoritative: turning it off
  // disables offline regardless of collection/asset defaults. Collection and asset
  // flags default to "allowed" and only opt out when explicitly set to false.
  const collectionAllows = collection.offline_available !== false;
  const isAvailable = assetOfflineAvailable !== false && brandAllowsOffline && collectionAllows;
  const hasExplicitTargets = extraUrls.length > 0;
  const relevantUrlsKey = extraUrls
    .filter((url): url is string => typeof url === 'string')
    .map((url) => url.trim())
    .filter(Boolean)
    .join('||');
  const relevantUrls = useMemo(
    () =>
      Array.from(
        new Set(
          relevantUrlsKey
            .split('||')
            .map((url) => url.trim())
            .filter(Boolean)
        )
      ),
    [relevantUrlsKey]
  );
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    if (!isAvailable) {
      setIsDownloaded(false);
      setIsDownloading(false);
      setDownloadError(null);
      return () => {
        isActive = false;
      };
    }

    const syncDownloadState = async () => {
      if (hasExplicitTargets) {
        if (relevantUrls.length === 0) {
          if (isActive) {
            setIsDownloaded(false);
            setDownloadError(null);
          }
          return;
        }

        const status = await offlineManager.getDownloadStatus(collection, {
          extraUrls: relevantUrls,
          preferExtraUrls: true,
        });

        if (!isActive) {
          return;
        }

        setIsDownloaded(status.missingUrls.length === 0 && status.cachedUrls.length > 0);
        setDownloadError(null);
        return;
      }

      if (!isActive) {
        return;
      }

      setIsDownloaded(offlineManager.isOffline(collection.id));
      setDownloadError(null);
    };

    syncDownloadState();

    return () => {
      isActive = false;
    };
  }, [collection.id, hasExplicitTargets, isAvailable, relevantUrlsKey]);

  const handleDownload = useCallback(async () => {
    if (!isAvailable || isDownloading || isDownloaded) {
      return;
    }

    if (hasExplicitTargets && relevantUrls.length === 0) {
      setDownloadError('Este conteúdo ainda não está pronto para download offline.');
      return;
    }

    setDownloadError(null);
    setIsDownloading(true);

    try {
      const result = await offlineManager.enableOffline(collection, {
        extraUrls: relevantUrls,
        preferExtraUrls: hasExplicitTargets,
      });

      if (hasExplicitTargets) {
        const status = await offlineManager.getDownloadStatus(collection, {
          extraUrls: relevantUrls,
          preferExtraUrls: true,
        });

        const fullyDownloaded = status.missingUrls.length === 0 && status.cachedUrls.length > 0;
        setIsDownloaded(fullyDownloaded);

        if (!fullyDownloaded || result.failedUrls.length > 0) {
          setDownloadError('Alguns arquivos deste conteúdo ainda não puderam ser baixados para offline.');
        }
      } else {
        setIsDownloaded(true);
      }
    } catch (error) {
      setDownloadError(
        error instanceof Error
          ? error.message
          : 'Não foi possível baixar este conteúdo para offline.'
      );
    } finally {
      setIsDownloading(false);
    }
  }, [
    collection,
    hasExplicitTargets,
    isAvailable,
    isDownloaded,
    isDownloading,
    relevantUrls,
  ]);

  const handleRemove = useCallback(async () => {
    if (!isAvailable || !isDownloaded || isDownloading) {
      return;
    }

    setDownloadError(null);

    try {
      await offlineManager.disableOffline(collection, {
        extraUrls: relevantUrls,
        preferExtraUrls: hasExplicitTargets,
      });
      setIsDownloaded(false);
    } catch (error) {
      setDownloadError(
        error instanceof Error
          ? error.message
          : 'Não foi possível remover o conteúdo offline.'
      );
    }
  }, [
    collection,
    hasExplicitTargets,
    isAvailable,
    isDownloaded,
    isDownloading,
    relevantUrls,
  ]);

  return {
    isAvailable,
    isDownloaded,
    isDownloading,
    downloadError,
    handleDownload,
    handleRemove,
  };
};
