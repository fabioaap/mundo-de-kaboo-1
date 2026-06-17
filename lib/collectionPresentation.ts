import { Collection, CollectionAsset, CollectionType } from '../types';
import { isPlaceholderImageUrl } from './appPaths';

type CollectionTypeMeta = {
  type: CollectionType;
  label: string;
  shortLabel: string;
  softClassName: string;
  coverClassName: string;
  detailSummary: string;
};

type CollectionPresentationCopy = {
  materialsTitle: string;
  materialsDescription: string;
  materialsEmptyState: string;
};

export type CollectionFormatKind = 'reading' | 'audio' | 'video' | 'materials';

type KitLinkedBookState = {
  linkedBookIdsCount: number;
  linkedBooksCount: number;
  loadingLinkedBooks: boolean;
};

export const normalizeSingleKitBookIds = (value?: string[] | null): string[] => {
  return Array.from(new Set((value || []).map((id) => id?.trim()).filter(Boolean) as string[])).slice(0, 1);
};

const COLLECTION_TYPE_META: Record<CollectionType, CollectionTypeMeta> = {
  book: {
    type: 'book',
    label: 'Livro',
    shortLabel: 'Livro',
    softClassName: 'bg-sky-50 text-sky-700 border-sky-100',
    coverClassName: 'bg-sky-500/90 text-white border-white/30 shadow-lg shadow-sky-950/20',
    detailSummary: '',
  },
  kit: {
    type: 'kit',
    label: 'Kit multimodal',
    shortLabel: 'Kit',
    softClassName: 'bg-amber-50 text-amber-800 border-amber-200',
    coverClassName: 'bg-amber-500/90 text-white border-white/30 shadow-lg shadow-amber-950/20',
    detailSummary: 'Kit multimodal com livro, mídia e materiais de apoio reunidos na mesma experiência.',
  },
};

const normalizeImageUrl = (value?: string | null): string => {
  return value?.trim() || '';
};

export const getCollectionType = (collection?: Partial<Collection> | null): CollectionType => {
  if (collection?.collection_type) {
    return collection.collection_type;
  }

  const hasLinkedBooks = normalizeSingleKitBookIds(collection?.kit_book_ids).length > 0;
  const hasKitCover = Boolean(normalizeImageUrl(collection?.kit_cover_image));

  return hasLinkedBooks || hasKitCover ? 'kit' : 'book';
};

export const getCollectionTypeMeta = (collection?: Partial<Collection> | null): CollectionTypeMeta => {
  return COLLECTION_TYPE_META[getCollectionType(collection)];
};

export const getCollectionPresentationCopy = (
  collection?: Partial<Collection> | null
): CollectionPresentationCopy => {
  const type = getCollectionType(collection);

  return {
    materialsTitle: 'Materiais da Coleção',
    materialsDescription: type === 'kit'
      ? 'Materiais de apoio e recursos complementares deste kit multimodal.'
      : 'Materiais de apoio e recursos complementares deste livro e da sua coleção.',
    materialsEmptyState: 'Nenhum material da coleção disponível.',
  };
};

export const getKitLinkedBookCount = ({
  linkedBookIdsCount,
  linkedBooksCount,
  loadingLinkedBooks,
}: KitLinkedBookState): number => {
  return loadingLinkedBooks ? linkedBookIdsCount : linkedBooksCount;
};

export const shouldShowKitLinkedBooksPanel = (linkedBookCount: number): boolean => {
  // >= 1: mesmo um kit com um único livro mostra o painel de livros, para que
  // tocar no livro DRILE até o modal do livro (slide), em vez de pular direto
  // pro leitor — preservando o acesso ao audiolivro/vídeo do livro.
  return linkedBookCount >= 1;
};

export const getVisiblePrimaryCollectionAssets = (
  primaryAssets: CollectionAsset[],
  showLinkedBooksPanel: boolean
): CollectionAsset[] => {
  return showLinkedBooksPanel
    ? primaryAssets.filter((asset) => asset.category !== 'reading')
    : primaryAssets;
};

export const getCollectionFormatKinds = (
  collection?: Partial<Collection> | null
): CollectionFormatKind[] => {
  if (!collection) {
    return [];
  }

  const assets = collection.collection_assets || [];
  const linkedBookIds = normalizeSingleKitBookIds(collection.kit_book_ids);
  const hasReading = linkedBookIds.length > 0
    || Boolean(normalizeImageUrl(collection.pdf_url))
    || assets.some((asset) => asset.category === 'reading');
  const hasAudio = Boolean(normalizeImageUrl(collection.audio_url))
    || assets.some((asset) => asset.media_type === 'audio');
  const hasVideo = Boolean(normalizeImageUrl(collection.video_url))
    || assets.some((asset) => asset.media_type === 'video');
  const hasMaterials = (collection.extra_materials?.length || 0) > 0
    || assets.some((asset) => asset.media_type === 'document' && asset.category !== 'reading');

  return [
    hasReading ? 'reading' : null,
    hasAudio ? 'audio' : null,
    hasVideo ? 'video' : null,
    hasMaterials ? 'materials' : null,
  ].filter(Boolean) as CollectionFormatKind[];
};

export const isStandaloneReadableBook = (
  collection?: Partial<Collection> | null
): boolean => {
  if (getCollectionType(collection) !== 'book') {
    return false;
  }

  return getCollectionFormatKinds(collection).includes('reading');
};

export const getCollectionDisplayCover = (collection?: Partial<Collection> | null): string => {
  if (!collection) {
    return '';
  }

  const collectionType = getCollectionType(collection);
  const primaryCoverImage = normalizeImageUrl(collection.cover_image);
  const kitCoverImage = normalizeImageUrl(collection.kit_cover_image);

  // Prefer the real uploaded cover_image. The generic "-kit.svg" badge stored in
  // kit_cover_image (seed/hydration default) is only a fallback for kits that have
  // no real cover — otherwise the public vitrine would show the placeholder badge
  // while the admin catalog (which forces kit_cover_image=null) shows the real art.
  if (primaryCoverImage && !isPlaceholderImageUrl(primaryCoverImage)) {
    return primaryCoverImage;
  }

  if (collectionType === 'kit' && kitCoverImage) {
    return kitCoverImage;
  }

  return '';
};

// Derives a YouTube thumbnail from a video URL (empty string when not YouTube).
export const getYoutubeThumbnail = (url?: string | null): string => {
  const value = url || '';
  const id =
    value.match(/youtu\.be\/([\w-]{6,})/i)?.[1] ??
    value.match(/[?&]v=([\w-]{6,})/i)?.[1] ??
    value.match(/youtube\.com\/embed\/([\w-]{6,})/i)?.[1] ??
    '';
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
};

// Extracts the source collection id from a storage asset URL, e.g.
// ".../object/public/collections/pdfs/<collectionId>/file.pdf".
export const extractSourceCollectionId = (url?: string | null): string => {
  const match = (url || '').match(/\/collections\/[^/]+\/([0-9a-fA-F-]{36})\//);
  return match?.[1] ?? '';
};

// Resolves the cover to show for a media asset in admin library lists.
// PALLIATIVE (display only): a media has no cover of its own — covers live on
// collections — so when the same file is linked into a kit the list would show
// the kit's cover. Prefer, in order: the YouTube thumbnail (videos), then the
// cover of the collection that OWNS the file (id embedded in the storage URL),
// then the owner-collection cover. Returns '' so callers can apply their own
// category/placeholder fallback. The underlying structural fix (per-media cover)
// is tracked in the roadmap backlog.
export const getLibraryAssetCoverImage = (
  asset: { url?: string | null; media_type?: string | null },
  ownerCollection?: Partial<Collection> | null,
  collectionsById?: Map<string, Collection>,
): string => {
  if (asset?.media_type === 'video') {
    const thumb = getYoutubeThumbnail(asset.url);
    if (thumb) {
      return thumb;
    }
  }

  const sourceId = extractSourceCollectionId(asset?.url);
  if (sourceId && collectionsById) {
    const source = collectionsById.get(sourceId);
    if (source) {
      const sourceCover = getCollectionDisplayCover(source) || normalizeImageUrl(source.cover_image);
      if (sourceCover) {
        return sourceCover;
      }
    }
  }

  if (ownerCollection) {
    return getCollectionDisplayCover(ownerCollection) || normalizeImageUrl(ownerCollection.cover_image);
  }

  return '';
};
