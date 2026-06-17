import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from '../components/Icons';
import {
  Collection,
  CollectionAsset,
  CollectionAssetCategory,
  CollectionAssetMediaType,
  CollectionResource,
  ScreenName,
} from '../types';
import { offlineManager } from '../lib/offline';
import { api } from '../lib/api';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { extractOriginalFileName } from '../lib/storage';
import { CollectionCoverSection } from '../components/CollectionCoverSection';
import { CharacterAvatar } from '../components/CharacterAvatar';
import { formatSegmentLabel, getCharacterBgColor, getCharacterColor, getCharacterImageUrl } from '../constants';
import { lookupBncc } from '../lib/bnccLookup';
import { lookupCasel } from '../lib/caselLookup';
import { COLLECTION_ASSET_META, canDownloadCollectionAsset, inferCollectionAssets } from '../lib/collectionAssets';
import { isPlaceholderImageUrl } from '../lib/appPaths';
import { layoutSpacing } from '../design-system/layout/spacing';
import {
  getCollectionDisplayCover,
  getCollectionPresentationCopy,
  getCollectionTypeMeta,
  getKitLinkedBookCount,
  getVisiblePrimaryCollectionAssets,
  shouldShowKitLinkedBooksPanel,
} from '../lib/collectionPresentation';

interface DetailsScreenProps {
  collection: Collection;
  onNavigate: (screen: ScreenName, params?: any) => void;
  onBack: () => void;
  onOpenCollection?: (collection: Collection) => void;
  parentCollection?: Collection | null;
}

type PreviewFileType = 'pdf' | 'audio' | 'video' | 'image' | 'other';

type StructuredLibraryItem = {
  id: string;
  title: string;
  category: CollectionAssetCategory;
  media_type: CollectionAssetMediaType;
  url: string;
  description?: string | null;
  size?: string;
  previewType: PreviewFileType;
  download_available?: boolean | null;
};

type PedagogicalTooltipState = {
  id: string;
  anchorRect: DOMRect;
  title: string;
  subtitle: string;
  description: string;
  skills?: string[];
};

const PEDAGOGICAL_TOOLTIP_VIEWPORT_PADDING = 16;
const PEDAGOGICAL_TOOLTIP_GAP = 12;
const PEDAGOGICAL_TOOLTIP_DESKTOP_WIDTH = 320;
const PEDAGOGICAL_TOOLTIP_MOBILE_WIDTH = 288;
const PEDAGOGICAL_TOOLTIP_TOP_THRESHOLD = 220;

type CharacterTagButtonProps = {
  character: string;
  onClick: () => void;
};

const CharacterTagButton: React.FC<CharacterTagButtonProps> = ({ character, onClick }) => {
  const imageSrc = getCharacterImageUrl(character);

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-12 items-center gap-2 rounded-full border border-gray-200 bg-white px-2.5 py-2 pr-3 text-sm font-bold leading-none text-gray-700 transition-all duration-200 ease-out hover:border-brand-primary/25 hover:bg-brand-primary/[0.03] active:scale-[0.98]"
    >
      <CharacterAvatar
        name={character}
        className="h-8 w-8 shrink-0 rounded-full border border-white/80 shadow-sm"
        imageClassName="relative z-10 h-full w-full object-cover"
        initialClassName="absolute inset-0 flex items-center justify-center text-[11px] font-black uppercase text-current"
      />
      <span className="whitespace-nowrap">{character}</span>
    </button>
  );
};

export const DetailsScreen: React.FC<DetailsScreenProps> = ({
  collection,
  onNavigate,
  onBack,
  onOpenCollection,
  parentCollection = null,
}) => {
  const themeColor = collection.color_theme || '#5D1F58';
  const collectionTypeMeta = getCollectionTypeMeta(collection);
  const presentationCopy = getCollectionPresentationCopy(collection);
  const isKit = collectionTypeMeta.type === 'kit';
  const collectionDisplayLabel = isKit ? 'Coleção' : collectionTypeMeta.label;
  const collectionDetailSummary = isKit
    ? 'Coleção com livro, mídia e materiais de apoio reunidos na mesma experiência.'
    : collectionTypeMeta.detailSummary;
  const collectionMaterialsDescription = isKit
    ? 'Materiais de apoio e recursos complementares desta coleção.'
    : presentationCopy.materialsDescription;
  const quickActionsTitle = isKit ? 'Itens dessa coleção' : 'Itens deste livro';
  const quickActionsDescription = isKit
    ? 'Abra o livro e os principais materiais sem perder o contexto desta coleção.'
    : 'Abra a leitura e os principais materiais deste livro.';
  const linkedBookIds = collection.kit_book_ids || [];

  // States for Offline Logic
  const [isOffline, setIsOffline] = useState(false);
  const [showExtraTools, setShowExtraTools] = useState(false);
  const [resources, setResources] = useState<CollectionResource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [linkedBooks, setLinkedBooks] = useState<Collection[]>([]);
  const [loadingLinkedBooks, setLoadingLinkedBooks] = useState(false);
  // Maps a source collection id → its display cover, so each item card inside a kit
  // can show the real cover of the material's source collection (matching the vitrine).
  const [sourceCoverById, setSourceCoverById] = useState<Record<string, string>>({});
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: PreviewFileType } | null>(null);
  const [fileSizes, setFileSizes] = useState<Record<string, string>>({});
  const [activePedagogicalTooltip, setActivePedagogicalTooltip] = useState<PedagogicalTooltipState | null>(null);
  const fetchedSizesRef = useRef<Set<string>>(new Set());
  const contentScrollRef = useRef<HTMLDivElement | null>(null);

  const collectionAssets = inferCollectionAssets(collection);
  const primaryAssets = collectionAssets.filter((asset) => asset.scope === 'primary');
  const linkedBookCount = getKitLinkedBookCount({
    linkedBookIdsCount: linkedBookIds.length,
    linkedBooksCount: linkedBooks.length,
    loadingLinkedBooks,
  });
  const shouldLoadLinkedBooks = isKit && linkedBookIds.length > 0;
  const showLinkedBooksPanel = isKit && shouldShowKitLinkedBooksPanel(linkedBookCount);
  const visiblePrimaryAssets = getVisiblePrimaryCollectionAssets(primaryAssets, showLinkedBooksPanel);
  const primaryReadingAsset = visiblePrimaryAssets.find((asset) => asset.category === 'reading')
    ?? primaryAssets.find((asset) => asset.category === 'reading')
    ?? null;
  const bookAudiolivroAsset = !isKit
    ? (primaryAssets.find((a) => a.category === 'storytelling' && a.is_published !== false) ?? null)
    : null;
  const bookVideoAsset = !isKit
    ? (primaryAssets.find((a) => a.category === 'animation' && a.is_published !== false) ?? null)
    : null;
  const libraryAssets = collectionAssets.filter((asset) => asset.scope === 'library');
  const hasLegacyExtraMaterials = (collection.extra_materials?.length ?? 0) > 0;
  const hasResources = libraryAssets.length > 0 || resources.length > 0 || hasLegacyExtraMaterials;

  useEffect(() => {
    setIsOffline(offlineManager.isOffline(collection.id));
    setShowExtraTools(false);
    setResources([]);
    setFileSizes({});
    fetchedSizesRef.current = new Set();

    api.getCollectionResources(collection.id)
      .then((data) => {
        setResources(data);
      })
      .catch(() => {
        setResources([]);
      });
  }, [collection.id]);

  useEffect(() => {
    if (!shouldLoadLinkedBooks) {
      setLinkedBooks([]);
      setLoadingLinkedBooks(false);
      return;
    }

    let isCancelled = false;
    setLoadingLinkedBooks(true);

    api.getCollections()
      .then((collections) => {
        if (isCancelled) {
          return;
        }

        const collectionsById = new Map(collections.map((item) => [item.id, item]));
        const nextLinkedBooks = linkedBookIds
          .map((id) => collectionsById.get(id))
          .filter((item): item is Collection => Boolean(item) && item.id !== collection.id);

        setLinkedBooks(nextLinkedBooks);
      })
      .catch(() => {
        if (!isCancelled) {
          setLinkedBooks([]);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoadingLinkedBooks(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [collection.id, linkedBookIds.join('|'), shouldLoadLinkedBooks]);

  // Build a source-collection cover map for kit item cards. A kit's primary assets
  // come from other collections (the source id is embedded in the asset URL); we
  // look up each source collection's real cover so the item thumbnails match the
  // vitrine instead of all showing the parent kit's cover.
  useEffect(() => {
    if (!isKit) {
      setSourceCoverById({});
      return;
    }
    let cancelled = false;
    api.getCollections()
      .then((collections) => {
        if (cancelled) return;
        const map: Record<string, string> = {};
        for (const item of collections) {
          map[item.id] = getCollectionDisplayCover(item) || item.cover_image || '';
        }
        setSourceCoverById(map);
      })
      .catch(() => {
        if (!cancelled) setSourceCoverById({});
      });
    return () => { cancelled = true; };
  }, [collection.id, isKit]);

  const handleShowExtraTools = () => {
    setShowExtraTools(true);
    setLoadingResources(true);
    api.getCollectionResources(collection.id)
      .then((data) => {
        setResources(data);
      })
      .catch(() => {
        setResources([]);
      })
      .finally(() => {
        setLoadingResources(false);
      });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const stripUrlDecorators = (url: string): string => {
    return url.split('#')[0]?.split('?')[0] ?? url;
  };

  const normalizeDisplayTitle = (value?: string, fallback?: string): string => {
    const source = value?.trim() || fallback || '';
    const extracted = extractOriginalFileName(source);

    return extracted
      .replace(/\.[a-z0-9]{1,6}$/i, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const getMediaTypeLabel = (mediaType: CollectionAssetMediaType): string => {
    if (mediaType === 'audio') {
      return 'Áudio';
    }

    if (mediaType === 'video') {
      return 'Vídeo';
    }

    return 'Documento';
  };

  const getPreviewFileTypeFromUrl = (url: string, mediaType: CollectionAssetMediaType): PreviewFileType => {
    const lowerUrl = stripUrlDecorators(url).toLowerCase();

    if (lowerUrl.includes('.pdf')) {
      return 'pdf';
    }

    if (lowerUrl.match(/\.(mp3|wav|ogg|m4a|aac)$/)) {
      return 'audio';
    }

    if (lowerUrl.match(/\.(mp4|webm|mov|avi|m4v)$/)) {
      return 'video';
    }

    if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
      return 'image';
    }

    if (mediaType === 'audio') {
      return 'audio';
    }

    if (mediaType === 'video') {
      return 'video';
    }

    return 'other';
  };

  const getPreviewFileTypeFromResource = (resource: CollectionResource): PreviewFileType => {
    if (resource.type === 'pdf') {
      return 'pdf';
    }

    if (resource.type === 'audio') {
      return 'audio';
    }

    if (resource.type === 'video') {
      return 'video';
    }

    return 'other';
  };

  const getFileIcon = (mediaType: CollectionAssetMediaType) => {
    if (mediaType === 'audio') {
      return <Icons.Headphones size={24} />;
    }

    if (mediaType === 'video') {
      return <Icons.Video size={24} />;
    }

    return <Icons.FileText size={24} />;
  };

  const getStructuredLibraryItems = (): StructuredLibraryItem[] => {
    const items: StructuredLibraryItem[] = [];
    const existingUrls = new Set<string>();

    const pushItem = (item: StructuredLibraryItem) => {
      if (!item.url || existingUrls.has(item.url)) {
        return;
      }

      existingUrls.add(item.url);
      items.push(item);
    };

    libraryAssets.forEach((asset) => {
      pushItem({
        id: asset.id,
        title: asset.title,
        category: asset.category,
        media_type: asset.media_type,
        url: asset.url,
        description: asset.description ?? null,
        size: fileSizes[asset.id],
        previewType: getPreviewFileTypeFromUrl(asset.url, asset.media_type),
        download_available: asset.download_available,
      });
    });

    resources.forEach((resource) => {
      const cleanedTitle = normalizeDisplayTitle(resource.title, resource.url) || 'Material extra';
      const inferredAsset = inferCollectionAssets({
        extra_materials: [resource.url],
      })[0];

      const resourceCategory = inferredAsset?.category ?? 'extra_material';
      const resourceMediaType = resource.type === 'audio'
        ? 'audio'
        : resource.type === 'video'
          ? 'video'
          : inferredAsset?.media_type ?? 'document';

      pushItem({
        id: resource.id,
        title: cleanedTitle,
        category: resourceCategory,
        media_type: resourceMediaType,
        url: resource.url,
        description: null,
        size: resource.size?.trim() || fileSizes[resource.id],
        previewType: getPreviewFileTypeFromResource(resource),
      });
    });

    return items;
  };

  const structuredLibraryItems = getStructuredLibraryItems();

  useEffect(() => {
    if (!showExtraTools) return;

    const fetchSizes = async () => {
      const sizesToFetch = getStructuredLibraryItems().filter((item) => {
        const hasSize = item.size && item.size.trim() !== '' && item.size !== '-';
        if (hasSize || fetchedSizesRef.current.has(item.id)) {
          return false;
        }

        fetchedSizesRef.current.add(item.id);
        return true;
      });

      if (sizesToFetch.length === 0) return;

      const newSizes: Record<string, string> = {};

      await Promise.all(
        sizesToFetch.map(async (item) => {
          try {
            const response = await fetch(item.url, { method: 'HEAD' });
            const contentLength = response.headers.get('content-length');
            if (contentLength) {
              newSizes[item.id] = formatFileSize(parseInt(contentLength, 10));
            }
          } catch {
            // Ignore size fetch failures and keep the item available.
          }
        })
      );

      if (Object.keys(newSizes).length > 0) {
        setFileSizes(prev => ({ ...prev, ...newSizes }));
      }
    };

    fetchSizes();
  }, [showExtraTools, resources, collection.collection_assets, collection.extra_materials]);

  const handlePrimaryAssetAction = (asset: CollectionAsset) => {
    if (asset.category === 'reading') {
      const bookParams: Record<string, unknown> = { collectionId: collection.id };
      if (isKit && linkedBooks.length > 0) {
        bookParams.bookTitle = linkedBooks[0].title;
      } else if (parentCollection) {
        bookParams.collectionTitle = parentCollection.title;
        bookParams.bookTitle = collection.title;
      }
      onNavigate('player_book', bookParams);
      return;
    }

    if (asset.category === 'storytelling') {
      onNavigate('player_audio', {
        collectionId: collection.id,
        assetUrl: asset.url,
        assetTitle: asset.title,
        lyricsUrl: asset.lyrics_url ?? undefined,
        assetOfflineAvailable: asset.offline_available ?? undefined,
        // Per-media cover (the audio's own/source cover) so the player matches the
        // collection item card instead of showing the launching collection's cover.
        coverImage: getAssetCover(asset),
      });
      return;
    }

    if (asset.category === 'animation' || asset.category === 'accessible_video') {
      onNavigate('player_video', {
        collectionId: collection.id,
        assetUrl: asset.url,
        assetTitle: asset.title,
        assetOfflineAvailable: asset.offline_available ?? undefined,
      });
      return;
    }

    setPreviewFile({
      url: asset.url,
      name: asset.title,
      type: getPreviewFileTypeFromUrl(asset.url, asset.media_type),
    });
  };

  const handleStandaloneReadAction = () => {
    if (primaryReadingAsset) {
      handlePrimaryAssetAction(primaryReadingAsset);
      return;
    }

    const bookParams: Record<string, unknown> = { collectionId: collection.id };
    if (isKit && linkedBooks.length > 0) {
      bookParams.bookTitle = linkedBooks[0].title;
    } else if (parentCollection) {
      bookParams.collectionTitle = parentCollection.title;
      bookParams.bookTitle = collection.title;
    }
    onNavigate('player_book', bookParams);
  };

  const handleBackToMain = () => {
    setShowExtraTools(false);
  };

  const handleTagClick = (tag: string) => {
    onNavigate('search', { query: tag });
  };

  const closePedagogicalTooltip = () => {
    setActivePedagogicalTooltip(null);
  };

  const openPedagogicalTooltip = (
    event: React.MouseEvent<HTMLButtonElement> | React.FocusEvent<HTMLButtonElement>,
    tooltip: Omit<PedagogicalTooltipState, 'anchorRect'>
  ) => {
    setActivePedagogicalTooltip({
      ...tooltip,
      anchorRect: event.currentTarget.getBoundingClientRect(),
    });
  };

  useEffect(() => {
    if (!activePedagogicalTooltip) {
      return;
    }

    const handleViewportChange = () => {
      setActivePedagogicalTooltip(null);
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [activePedagogicalTooltip]);

  useEffect(() => {
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTop = 0;
    }
  }, [collection.id, showExtraTools]);

  const activePedagogicalTooltipStyle = (() => {
    if (!activePedagogicalTooltip || typeof window === 'undefined') {
      return null;
    }

    const viewportWidth = window.innerWidth;
    const tooltipWidth = Math.min(
      viewportWidth < 768 ? PEDAGOGICAL_TOOLTIP_MOBILE_WIDTH : PEDAGOGICAL_TOOLTIP_DESKTOP_WIDTH,
      viewportWidth - (PEDAGOGICAL_TOOLTIP_VIEWPORT_PADDING * 2)
    );
    const anchorCenter = activePedagogicalTooltip.anchorRect.left + (activePedagogicalTooltip.anchorRect.width / 2);
    const maxLeft = viewportWidth - tooltipWidth - PEDAGOGICAL_TOOLTIP_VIEWPORT_PADDING;
    const left = Math.min(
      Math.max(anchorCenter - (tooltipWidth / 2), PEDAGOGICAL_TOOLTIP_VIEWPORT_PADDING),
      maxLeft
    );
    const renderAbove = activePedagogicalTooltip.anchorRect.top > PEDAGOGICAL_TOOLTIP_TOP_THRESHOLD;

    return {
      width: `${tooltipWidth}px`,
      left: `${left}px`,
      top: renderAbove
        ? `${activePedagogicalTooltip.anchorRect.top - PEDAGOGICAL_TOOLTIP_GAP}px`
        : `${activePedagogicalTooltip.anchorRect.bottom + PEDAGOGICAL_TOOLTIP_GAP}px`,
      transform: renderAbove ? 'translateY(-100%)' : undefined,
    };
  })();

  // Itens da coleção unificados: livros vinculados (que drilam) + mídias + materiais.
  const hasQuickActions = isKit && (visiblePrimaryAssets.length > 0 || hasResources || showLinkedBooksPanel);

  // Cover + name helpers for the "Itens dessa coleção" cards.
  const collectionItemCover = getCollectionDisplayCover(collection) || collection.cover_image || '';

  const getAssetTypeLabel = (asset: CollectionAsset) =>
    asset.category === 'reading' && isKit ? 'Livro' : COLLECTION_ASSET_META[asset.category].label;

  // Real item name (e.g. "Batatinha e o Espelho da Alegria"); falls back to the
  // type label when the asset has no distinct title.
  const getAssetItemName = (asset: CollectionAsset) => {
    const title = (asset.title || '').trim();
    const generic = COLLECTION_ASSET_META[asset.category].label;
    return title && title !== generic ? title : getAssetTypeLabel(asset);
  };

  const getAssetIcon = (asset: CollectionAsset, size: number) =>
    asset.category === 'reading' ? <Icons.BookOpen size={size} />
      : asset.category === 'storytelling' ? <Icons.Headphones size={size} />
        : <Icons.Video size={size} />;

  // Extracts the source collection id from a storage asset URL, e.g.
  // ".../object/public/collections/pdfs/<collectionId>/file.pdf".
  const extractSourceCollectionId = (url?: string | null): string => {
    const match = (url || '').match(/\/collections\/[^/]+\/([0-9a-fA-F-]{36})\//);
    return match?.[1] ?? '';
  };

  // Derives a YouTube thumbnail from a video URL (empty string when not YouTube).
  const getYoutubeThumb = (url?: string | null): string => {
    const value = url || '';
    const id =
      value.match(/youtu\.be\/([\w-]{6,})/i)?.[1] ??
      value.match(/[?&]v=([\w-]{6,})/i)?.[1] ??
      value.match(/youtube\.com\/embed\/([\w-]{6,})/i)?.[1] ??
      '';
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
  };

  // Cover for an item card: a video shows its own thumbnail (YouTube frame); other
  // materials use the real cover of their source collection (matches the vitrine),
  // falling back to this collection's own cover.
  const getAssetCover = (asset: CollectionAsset): string => {
    if (asset.media_type === 'video') {
      const thumb = getYoutubeThumb(asset.url);
      if (thumb) return thumb;
    }
    const sourceId = extractSourceCollectionId(asset.url);
    const sourceCover = sourceId ? sourceCoverById[sourceId] : '';
    return sourceCover || collectionItemCover;
  };

  // Representative cover for the aggregated "Materiais da Coleção" card: prefer a
  // video thumbnail (YouTube), then a source-collection cover; '' → icon fallback.
  const materialsCover = (() => {
    for (const asset of libraryAssets) {
      const thumb = getYoutubeThumb(asset.url);
      if (thumb) return thumb;
    }
    for (const asset of libraryAssets) {
      const sourceId = extractSourceCollectionId(asset.url);
      const cover = sourceId ? sourceCoverById[sourceId] : '';
      if (cover && !isPlaceholderImageUrl(cover)) return cover;
    }
    return '';
  })();

  // Small cover thumbnail with a type-icon badge (or an icon tile when there's no cover).
  const renderItemThumb = (cover: string, icon: React.ReactNode, iconBadge: React.ReactNode) => {
    const hasCover = Boolean(cover) && !isPlaceholderImageUrl(cover);
    return hasCover ? (
      <span className="relative h-16 w-16 flex-shrink-0">
        <img
          src={cover}
          alt=""
          aria-hidden="true"
          className="h-16 w-16 rounded-xl border border-gray-200 bg-gray-100 object-cover"
        />
        <span className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary text-white shadow ring-2 ring-white">
          {iconBadge}
        </span>
      </span>
    ) : (
      <span className="inline-flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-brand-primary/[0.08] text-brand-primary shadow-sm ring-1 ring-brand-primary/10">
        {icon}
      </span>
    );
  };

  const desktopQuickActions = (
    <>
      {/* Livros vinculados como itens da coleção — tocar DRILA pro modal do livro. */}
      {showLinkedBooksPanel && linkedBooks.map((book) => (
        <button
          key={book.id}
          onClick={() => onOpenCollection?.(book)}
          className="flex min-h-[120px] flex-col items-start gap-3 rounded-2xl border border-gray-100 bg-white/90 px-4 py-4 text-left text-gray-800 shadow-sm transition-all duration-200 hover:border-brand-primary/20 hover:bg-brand-primary/[0.04] active:scale-[0.98]"
        >
          {renderItemThumb(getCollectionDisplayCover(book) || book.cover_image, <Icons.BookOpen size={24} />, <Icons.BookOpen size={14} />)}
          <span className="min-w-0">
            <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-brand-primary/60">Livro</span>
            <span className="mt-0.5 block text-sm font-bold leading-tight text-gray-800 line-clamp-2">{book.title}</span>
          </span>
        </button>
      ))}

      {visiblePrimaryAssets.map((asset) => (
        <button
          key={asset.id}
          onClick={() => handlePrimaryAssetAction(asset)}
          className="flex min-h-[120px] flex-col items-start gap-3 rounded-2xl border border-gray-100 bg-white/90 px-4 py-4 text-left text-gray-800 shadow-sm transition-all duration-200 hover:border-brand-primary/20 hover:bg-brand-primary/[0.04] active:scale-[0.98]"
        >
          {renderItemThumb(getAssetCover(asset), getAssetIcon(asset, 24), getAssetIcon(asset, 14))}
          <span className="min-w-0">
            <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-brand-primary/60">
              {getAssetTypeLabel(asset)}
            </span>
            <span className="mt-0.5 block text-sm font-bold leading-tight text-gray-800 line-clamp-2">
              {getAssetItemName(asset)}
            </span>
          </span>
        </button>
      ))}

      {hasResources && (
        <button
          onClick={handleShowExtraTools}
          className="flex min-h-[120px] flex-col items-start gap-3 rounded-2xl border border-gray-100 bg-white/90 px-4 py-4 text-left text-gray-800 shadow-sm transition-all duration-200 hover:border-brand-primary/20 hover:bg-brand-primary/[0.04] active:scale-[0.98]"
        >
          {renderItemThumb(materialsCover, <Icons.Paperclip size={24} />, <Icons.Paperclip size={14} />)}
          <span className="min-w-0">
            <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-brand-primary/60">
              Materiais
            </span>
            <span className="mt-0.5 block text-sm font-bold leading-tight text-gray-800 line-clamp-2">
              {presentationCopy.materialsTitle}
            </span>
          </span>
        </button>
      )}
    </>
  );

  return (
    <div className="flex flex-col md:flex-row bg-white relative h-full w-full">

      {/* DESKTOP: LEFT SIDE (Cover & Aesthetics) / MOBILE: TOP HEADER */}
      <CollectionCoverSection
        collection={collection}
        isOffline={isOffline}
        typeLabelOverride={collectionDisplayLabel}
        headerContent={
          <div className="flex justify-center items-center w-full">
            <span className="font-bold text-lg opacity-90 md:hidden">Detalhes</span>
          </div>
        }
      />

      {/* DESKTOP: RIGHT SIDE (Content) / MOBILE: BOTTOM CARD */}
      <div ref={contentScrollRef} className="flex-1 overflow-y-auto z-10 no-scrollbar bg-white rounded-t-[2.5rem] md:rounded-none mt-0 relative shadow-[0_-10px_40px_rgba(0,0,0,0.05)] md:shadow-none md:h-full">
        <div className={layoutSpacing.detailBody}>

          {/* Back Button - Show when in Extra Tools view */}
          {showExtraTools && (
            <div className="mb-6">
              <button
                onClick={handleBackToMain}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors mb-4"
              >
                <Icons.ChevronLeft size={20} />
                <span className="font-bold text-sm">Voltar</span>
              </button>
            </div>
          )}

          {showExtraTools ? (
            <>
              <h1 className="text-2xl md:text-3xl font-black text-gray-800 mb-2">{presentationCopy.materialsTitle}</h1>
              <p className="text-gray-500 mb-8">{collectionMaterialsDescription}</p>

              {loadingResources ? (
                <div className="text-center text-gray-400 py-10">Carregando materiais...</div>
              ) : structuredLibraryItems.length === 0 ? (
                <div className="text-center text-gray-400 py-10 flex flex-col items-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Icons.FileText className="text-gray-300" size={32} />
                  </div>
                  <p>{presentationCopy.materialsEmptyState}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {structuredLibraryItems.map((item) => (
                    <div key={item.id} className="flex flex-col md:flex-row md:items-center p-4 border border-gray-100 rounded-2xl hover:border-brand-primary/30 hover:bg-brand-primary/5 transition-colors group gap-4">
                      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-0 mb-3 md:mb-0 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 md:mr-4 group-hover:bg-white group-hover:text-brand-primary transition-colors flex-shrink-0 self-start md:self-center">
                          {getFileIcon(item.media_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-800 text-sm mb-2 break-words">{item.title}</h4>
                          <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase text-gray-500">
                            <span className="bg-brand-primary/10 text-brand-primary px-2.5 py-1 rounded-full">
                              {COLLECTION_ASSET_META[item.category].label}
                            </span>
                            <span className="bg-gray-100 px-2.5 py-1 rounded-full">
                              {getMediaTypeLabel(item.media_type)}
                            </span>
                            {item.size && (
                              <span className="bg-gray-100 px-2.5 py-1 rounded-full">
                                {item.size}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-sm text-gray-500 mt-2 leading-relaxed">{item.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:ml-auto md:flex-shrink-0 w-full md:w-auto">
                        <button
                          onClick={() => {
                            // Video must not open a modal-over-modal: redirect to the
                            // dedicated player instead of the in-page preview.
                            if (item.media_type === 'video') {
                              onNavigate('player_video', {
                                collectionId: collection.id,
                                assetUrl: item.url,
                                assetTitle: item.title,
                              });
                              return;
                            }
                            setPreviewFile({ url: item.url, name: item.title, type: item.previewType });
                          }}
                          aria-label={item.media_type === 'video' ? 'Assistir vídeo' : 'Visualizar material'}
                          className="flex-1 md:flex-none flex items-center justify-center py-2 md:py-0 md:w-10 md:h-10 rounded-full border-2 border-brand-primary/20 text-brand-primary hover:bg-brand-primary hover:text-white transition-all text-sm font-bold"
                        >
                          {item.media_type === 'video' ? <Icons.Play size={20} /> : <Icons.Eye size={20} />}
                        </button>
                        {/* Download only for non-video materials the admin marked as downloadable. */}
                        {canDownloadCollectionAsset(item) && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Baixar material"
                            className="flex-1 md:flex-none flex items-center justify-center py-2 md:py-0 md:w-10 md:h-10 rounded-full border-2 border-brand-primary/20 text-brand-primary hover:bg-brand-primary hover:text-white transition-all text-sm font-bold"
                          >
                            <Icons.Download size={20} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Metadata Badges */}
              {parentCollection && (
                <div className="mb-6">
                  <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <Icons.ChevronLeft size={20} />
                    <span className="font-bold text-sm">Voltar à coleção</span>
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-4">
                <span className={`px-3 py-1 rounded-full border text-xs font-black uppercase tracking-[0.14em] ${collectionTypeMeta.softClassName}`}>
                  {collectionDisplayLabel}
                </span>
                <span className="px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold uppercase tracking-wide">
                  {formatSegmentLabel(collection.level)}
                </span>
                {collection.age_grade && collection.age_grade.length > 0 && (
                  <>
                    <span className="text-brand-primary/40 text-xs font-bold">|</span>
                    {collection.age_grade.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => handleTagClick(item)}
                        className="px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold uppercase tracking-wide hover:bg-brand-primary/20 transition-colors cursor-pointer"
                      >
                        {item}
                      </button>
                    ))}
                  </>
                )}
              </div>

              <h1 className="text-2xl md:text-4xl font-black text-center md:text-left text-gray-800 mb-6 leading-tight mt-6">
                {collection.title}
              </h1>

              {collectionDetailSummary && (
                <p className="text-sm font-medium leading-relaxed text-gray-500 mb-4 max-w-2xl">
                  {collectionDetailSummary}
                </p>
              )}

              {collection.synopsis && (
                <p className="text-sm text-gray-500 mt-2 mb-4 italic">{collection.synopsis}</p>
              )}

              {!isKit && (primaryReadingAsset || collection.pdf_url || bookAudiolivroAsset || bookVideoAsset) && (
                <div className="mb-8 flex flex-wrap gap-4">
                  {(primaryReadingAsset || collection.pdf_url) && (
                    <button
                      type="button"
                      onClick={handleStandaloneReadAction}
                      aria-label="Ler livro"
                      className="flex w-[168px] max-w-full min-h-[154px] flex-col items-start justify-between rounded-[30px] border border-brand-primary/10 bg-white px-5 py-4 text-left text-[#1F2940] shadow-[0_12px_24px_rgba(31,41,64,0.10),0_2px_6px_rgba(31,41,64,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(31,41,64,0.14),0_4px_10px_rgba(31,41,64,0.08)] active:translate-y-0 active:scale-[0.985]"
                    >
                      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-brand-primary/15 bg-brand-primary/[0.08] text-brand-primary shadow-sm ring-1 ring-brand-primary/10">
                        <Icons.BookOpen size={24} />
                      </span>
                      <span className="text-[1.125rem] font-bold leading-none">Ler livro</span>
                    </button>
                  )}
                  {bookAudiolivroAsset && (
                    <button
                      type="button"
                      onClick={() => handlePrimaryAssetAction(bookAudiolivroAsset)}
                      aria-label="Ouvir audiolivro"
                      className="flex w-[168px] max-w-full min-h-[154px] flex-col items-start justify-between rounded-[30px] border border-brand-primary/10 bg-white px-5 py-4 text-left text-[#1F2940] shadow-[0_12px_24px_rgba(31,41,64,0.10),0_2px_6px_rgba(31,41,64,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(31,41,64,0.14),0_4px_10px_rgba(31,41,64,0.08)] active:translate-y-0 active:scale-[0.985]"
                    >
                      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-brand-primary/15 bg-brand-primary/[0.08] text-brand-primary shadow-sm ring-1 ring-brand-primary/10">
                        <Icons.Headphones size={24} />
                      </span>
                      <span className="text-[1.125rem] font-bold leading-none">Ouvir</span>
                    </button>
                  )}
                  {bookVideoAsset && (
                    <button
                      type="button"
                      onClick={() => handlePrimaryAssetAction(bookVideoAsset)}
                      aria-label="Assistir vídeo do livro"
                      className="flex w-[168px] max-w-full min-h-[154px] flex-col items-start justify-between rounded-[30px] border border-brand-primary/10 bg-white px-5 py-4 text-left text-[#1F2940] shadow-[0_12px_24px_rgba(31,41,64,0.10),0_2px_6px_rgba(31,41,64,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(31,41,64,0.14),0_4px_10px_rgba(31,41,64,0.08)] active:translate-y-0 active:scale-[0.985]"
                    >
                      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-brand-primary/15 bg-brand-primary/[0.08] text-brand-primary shadow-sm ring-1 ring-brand-primary/10">
                        <Icons.Play size={24} />
                      </span>
                      <span className="text-[1.125rem] font-bold leading-none">Assistir</span>
                    </button>
                  )}
                </div>
              )}

              {hasQuickActions && (
                <div className="hidden md:block mb-8">
                  <div className="rounded-[28px] border border-brand-primary/10 bg-[linear-gradient(135deg,var(--color-brand-bg),rgba(255,255,255,0.98))] p-5 shadow-sm">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-brand-primary/70">{quickActionsTitle}</p>
                        <p className="mt-1 text-sm text-gray-500">{quickActionsDescription}</p>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-brand-primary shadow-sm ring-1 ring-brand-primary/10">
                        {visiblePrimaryAssets.length + (hasResources ? 1 : 0) + (showLinkedBooksPanel ? linkedBookCount : 0)} itens
                      </span>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {desktopQuickActions}
                    </div>
                  </div>
                </div>
              )}

              {/* Livros vinculados agora aparecem dentro de "Itens dessa coleção"
                  (unificado) — não há mais um painel "Livros da Coleção" separado. */}

              {collection.progress ? (
                <div className="w-full max-w-xs mx-auto md:mx-0 mb-8">
                  <div className="flex justify-between text-xs font-bold text-gray-400 mb-2">
                    <span>Progresso</span>
                    <span>{collection.progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${collection.progress}%`, backgroundColor: themeColor }}
                    />
                  </div>
                </div>
              ) : null}

              {hasQuickActions && (
                <div className="flex flex-wrap gap-4 mb-10 md:hidden">
                  {/* Livros vinculados como itens — tocar DRILA pro modal do livro. */}
                  {showLinkedBooksPanel && linkedBooks.map((book) => (
                    <button
                      key={book.id}
                      onClick={() => onOpenCollection?.(book)}
                      className="flex min-h-[88px] min-w-[calc(50%-0.5rem)] flex-1 flex-col items-center justify-center gap-2 rounded-2xl bg-gray-100 px-3 py-3 text-gray-800 transition-all duration-200 hover:bg-gray-200 active:scale-95"
                    >
                      {renderItemThumb(getCollectionDisplayCover(book) || book.cover_image, <Icons.BookOpen size={24} />, <Icons.BookOpen size={14} />)}
                      <span className="line-clamp-2 text-center text-xs font-bold leading-tight">{book.title}</span>
                    </button>
                  ))}

                  {visiblePrimaryAssets.map((asset) => {
                    const itemName = getAssetItemName(asset);

                    return (
                      <button
                        key={asset.id}
                        onClick={() => handlePrimaryAssetAction(asset)}
                        className="flex min-h-[88px] min-w-[calc(50%-0.5rem)] flex-1 flex-col items-center justify-center gap-2 rounded-2xl bg-gray-100 px-3 py-3 text-gray-800 transition-all duration-200 hover:bg-gray-200 active:scale-95"
                      >
                        {renderItemThumb(getAssetCover(asset), getAssetIcon(asset, 24), getAssetIcon(asset, 14))}
                        <span className={`line-clamp-2 text-center font-bold leading-tight ${itemName.length > 14 ? 'text-[10px]' : 'text-xs'}`}>
                          {itemName}
                        </span>
                      </button>
                    );
                  })}

                  {hasResources && (
                    <button
                      onClick={handleShowExtraTools}
                      className="flex min-h-[88px] min-w-[calc(50%-0.5rem)] flex-1 flex-col items-center justify-center gap-2 rounded-2xl bg-gray-100 px-3 py-3 text-gray-800 transition-all duration-200 hover:bg-gray-200 active:scale-95"
                    >
                      {renderItemThumb(materialsCover, <Icons.Paperclip size={24} />, <Icons.Paperclip size={14} />)}
                      <span className="line-clamp-2 text-center text-xs font-bold leading-tight">{presentationCopy.materialsTitle}</span>
                    </button>
                  )}

                </div>
              )}

              {/* --- PEDAGOGICAL INFORMATION SECTION --- */}
              {(collection.theme || collection.learning_objectives || collection.characters || collection.bncc_skills || collection.casel_competencies || collection.age_grade) && (
                <div className="border-t border-gray-100 pt-8 space-y-6">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Icons.BookOpen size={20} className="stroke-[2.5px]" />
                    Informações Pedagógicas
                  </h3>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Tema */}
                    {collection.theme && (
                      <div className="col-span-full">
                        <h4 className="text-sm font-bold text-gray-800 mb-1">Tema</h4>
                        <p className="text-gray-600 text-sm leading-relaxed">{collection.theme}</p>
                      </div>
                    )}

                    {/* Objetivo de Aprendizagem */}
                    {collection.learning_objectives && (
                      <div className="col-span-full">
                        <h4 className="text-sm font-bold text-gray-800 mb-1">Objetivo de Aprendizagem</h4>
                        <p className="text-gray-600 text-sm leading-relaxed">{collection.learning_objectives}</p>
                      </div>
                    )}

                    {/* Personagens Centrais */}
                    {collection.characters && collection.characters.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-gray-800 mb-2">Personagens Centrais</h4>
                        <div className="flex flex-wrap gap-2">
                          {collection.characters.map((char, i) => (
                            <CharacterTagButton
                              key={i}
                              character={char}
                              onClick={() => handleTagClick(char)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Habilidades BNCC */}
                    {collection.bncc_skills && collection.bncc_skills.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-gray-800 mb-2">Habilidades da BNCC</h4>
                        <div className="flex flex-wrap gap-2">
                          {collection.bncc_skills.map((code, i) => {
                            const bnccInfo = lookupBncc(code);
                            const tooltipId = `bncc:${code}`;
                            return (
                              <div key={i} className="relative inline-block">
                                <button
                                  onClick={(event) => {
                                    if (!bnccInfo) {
                                      handleTagClick(code);
                                      return;
                                    }

                                    openPedagogicalTooltip(event, {
                                      id: tooltipId,
                                      title: code,
                                      subtitle: `${bnccInfo.component} • ${bnccInfo.year}`,
                                      description: bnccInfo.description,
                                    });
                                  }}
                                  onMouseEnter={(event) => {
                                    if (bnccInfo) {
                                      openPedagogicalTooltip(event, {
                                        id: tooltipId,
                                        title: code,
                                        subtitle: `${bnccInfo.component} • ${bnccInfo.year}`,
                                        description: bnccInfo.description,
                                      });
                                    }
                                  }}
                                  onMouseLeave={closePedagogicalTooltip}
                                  onFocus={(event) => {
                                    if (bnccInfo) {
                                      openPedagogicalTooltip(event, {
                                        id: tooltipId,
                                        title: code,
                                        subtitle: `${bnccInfo.component} • ${bnccInfo.year}`,
                                        description: bnccInfo.description,
                                      });
                                    }
                                  }}
                                  onBlur={closePedagogicalTooltip}
                                  aria-describedby={activePedagogicalTooltip?.id === tooltipId ? tooltipId : undefined}
                                  aria-expanded={activePedagogicalTooltip?.id === tooltipId}
                                  className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-bold border border-sky-100 hover:bg-sky-100 transition-colors cursor-pointer text-left"
                                >
                                  {code}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* CASEL */}
                    {collection.casel_competencies && collection.casel_competencies.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-gray-800 mb-2">Competências CASEL</h4>
                        <div className="flex flex-wrap gap-2">
                          {collection.casel_competencies.map((casel, i) => {
                            const caselInfo = lookupCasel(casel);
                            const tooltipId = `casel:${casel}`;

                            return (
                              <div key={i} className="relative inline-block">
                                <button
                                  onClick={(event) => {
                                    if (!caselInfo) {
                                      handleTagClick(casel);
                                      return;
                                    }

                                    openPedagogicalTooltip(event, {
                                      id: tooltipId,
                                      title: caselInfo.label,
                                      subtitle: `${caselInfo.dimension} • ${caselInfo.focus}`,
                                      description: caselInfo.description,
                                      skills: caselInfo.skills,
                                    });
                                  }}
                                  onMouseEnter={(event) => {
                                    if (caselInfo) {
                                      openPedagogicalTooltip(event, {
                                        id: tooltipId,
                                        title: caselInfo.label,
                                        subtitle: `${caselInfo.dimension} • ${caselInfo.focus}`,
                                        description: caselInfo.description,
                                        skills: caselInfo.skills,
                                      });
                                    }
                                  }}
                                  onMouseLeave={closePedagogicalTooltip}
                                  onFocus={(event) => {
                                    if (caselInfo) {
                                      openPedagogicalTooltip(event, {
                                        id: tooltipId,
                                        title: caselInfo.label,
                                        subtitle: `${caselInfo.dimension} • ${caselInfo.focus}`,
                                        description: caselInfo.description,
                                        skills: caselInfo.skills,
                                      });
                                    }
                                  }}
                                  onBlur={closePedagogicalTooltip}
                                  aria-describedby={activePedagogicalTooltip?.id === tooltipId ? tooltipId : undefined}
                                  aria-expanded={activePedagogicalTooltip?.id === tooltipId}
                                  className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100 hover:bg-emerald-100 transition-colors cursor-pointer text-left"
                                >
                                  {casel}
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {activePedagogicalTooltip && activePedagogicalTooltipStyle && typeof document !== 'undefined' && createPortal(
                          <div
                            id={activePedagogicalTooltip.id}
                            role="tooltip"
                            className="pointer-events-none fixed z-[160] rounded-xl border border-gray-700 bg-gray-900 p-3 text-left shadow-2xl shadow-black/40"
                            style={activePedagogicalTooltipStyle}
                          >
                            <p className="break-words text-sm font-bold text-white">{activePedagogicalTooltip.title}</p>
                            <p className="mt-0.5 break-words text-xs text-gray-300">{activePedagogicalTooltip.subtitle}</p>
                            <p className="mt-1 break-words text-xs leading-relaxed text-gray-200">{activePedagogicalTooltip.description}</p>
                            {activePedagogicalTooltip.skills && activePedagogicalTooltip.skills.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {activePedagogicalTooltip.skills.map((skill) => (
                                  <span key={skill} className="rounded-full border border-emerald-200/30 bg-emerald-500/15 px-2 py-1 text-[10px] font-bold text-emerald-200">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>,
                          document.body
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          isOpen={!!previewFile}
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          fileType={previewFile.type}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
};
