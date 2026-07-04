import { supabase, isSupabaseConfigured } from './supabase';
import { deleteFile, getSignedUrl } from './storage';
import { getOfflineStorageKey, getOfflineCacheName } from './offline';
import { setActiveBrandSlug } from './activeBrand';
import catalogSeed from '../data/catalog.seed.json';
import { LIBRARY_HUB_MOCKS, LibraryHubKind, LibraryMockItem } from '../data/library-hubs';
import {
  Character,
  Collection,
  CollectionAsset,
  CollectionAssetCategory,
  CollectionResource,
  CentralMaterial,
  Material,
  MediaAccessMode,
  MediaHub,
  MediaHubResponse,
  MediaItemCard,
  MediaItemDetail,
  MediaKind,
  MediaPlaybackSession,
  MediaPlaybackSource,
  MediaProvider,
  MediaRelatedCollection,
  MediaShelf,
  SaveMediaProgressInput,
  RegisterWithVoucherInput,
  RegisterWithVoucherResult,
  ToggleMediaFavoriteResult,
  UserProfile,
  Voucher,
  VoucherRedemptionResult,
  VoucherValidationResult,
} from '../types';
import { logger } from './logger';
import { buildAppUrl, isPlaceholderImageUrl } from './appPaths';
import {
  filterCentralMaterialsForBrand,
  filterCharactersForBrand,
  filterCollectionsForBrand,
  shouldUseSharedMediaCatalog,
} from './contentHygiene';
import {
  getMockCharactersLive,
  mockCreateCharacter,
  mockUpdateCharacter,
  normalizeCharacter,
  normalizeCharacterLookupKey,
  setCharacterRegistrySnapshot,
  syncCollectionCharacters,
} from './characters';
import { COLLECTION_ASSET_META, syncCollectionWithAssets } from './collectionAssets';
import { getMockCentralMaterials } from './centralMaterials';
import {
  createMockUser,
  deleteMockUserById,
  getMockAllUsers,
  updateMockUserById,
  getMockCollectionResources,
  getMockCurrentUserId,
  getMockProfile,
  getMockUserProgress,
  getMockVoucherSamples,
  redeemMockVoucher,
  saveMockProfile,
  signInMockUser,
  signOutMockUser,
  validateMockVoucher,
  mockCreateCollection,
  mockUpdateCollection,
  mockUpdateCollectionAsset,
  mockDeleteCollection,
  getMockCollectionsLive,
  getMockCollectionByIdLive,
} from './mockData';
import {
  calculateRenewedAccessExpiry,
  getProfileAccessStatus,
  getVoucherErrorMessage,
  normalizeVoucherCode,
} from './access';
import { getActiveGrantsForUser, hasGrantForCollection } from './mockVoucherData';
import { extractSourceCollectionId, getCollectionDisplayCover, normalizeSingleKitBookIds } from './collectionPresentation';

// Cache management for collections
const COLLECTIONS_CACHE_KEY = 'kaboo_collections_cache';
// Max age for the collections cache. The cache is explicitly cleared on writes
// (createCollection/updateCollection/etc.) within the same tab, but sessionStorage is
// per-tab: a vitrine open in a separate tab never sees that clear and would otherwise
// serve stale content indefinitely. A short TTL lets stale reads self-heal.
const COLLECTIONS_CACHE_TTL_MS = 60_000;
const PROFILE_CACHE_KEY = 'kaboo_profile_cache';
const SESSION_KEY = 'kaboo_session_id';

// Active brand slug for cache isolation — set by App.tsx alongside setMockActiveBrand.
let _activeBrandSlugForApi = 'kaboo';
let _activeBrandIdForApi: string | null = null;
const brandIdCacheBySlug = new Map<string, string>();

const normalizeBrandId = (value?: string | null): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/** Set by App.tsx once per brand slug change. Keeps collection cache isolated per brand. */
export const setActiveBrandForApi = (slug: string, brandId?: string | null): void => {
  _activeBrandSlugForApi = slug;
  _activeBrandIdForApi = normalizeBrandId(brandId);
  // Mirror into the dependency-free holder so light modules (offline.ts) can scope
  // their storage keys per brand without importing this module's heavy dep chain.
  setActiveBrandSlug(slug);

  if (_activeBrandIdForApi && !_activeBrandIdForApi.startsWith('mock-')) {
    brandIdCacheBySlug.set(slug, _activeBrandIdForApi);
  }
};

const getCollectionsCacheKey = (): string =>
  _activeBrandSlugForApi === 'kaboo'
    ? COLLECTIONS_CACHE_KEY
    : `${COLLECTIONS_CACHE_KEY}_${_activeBrandSlugForApi}`;

const getProfileCacheKey = (): string =>
  _activeBrandSlugForApi === 'kaboo'
    ? PROFILE_CACHE_KEY
    : `${PROFILE_CACHE_KEY}_${_activeBrandSlugForApi}`;

const getActiveBrandScopeCacheKey = (): string => _activeBrandSlugForApi;

// DEV-only: flag indicating we're running with a mock demo user despite Supabase being configured
// Persisted in sessionStorage so it survives HMR and page reloads
const DEV_MOCK_SESSION_KEY = 'kaboo_dev_mock_session';
let devMockSession = import.meta.env.DEV && sessionStorage.getItem(DEV_MOCK_SESSION_KEY) === '1';

function setDevMockSession(value: boolean) {
  devMockSession = value;
  if (value) {
    sessionStorage.setItem(DEV_MOCK_SESSION_KEY, '1');
  } else {
    sessionStorage.removeItem(DEV_MOCK_SESSION_KEY);
  }
}

/** Check if we're in a DEV mock session (demo user with Supabase configured) */
export function isDevMockSession(): boolean {
  return devMockSession;
}
const DEV_SUPABASE_VOUCHER_FALLBACKS: Record<string, Voucher['duration_months']> = {
  'KABOO-LIVR-0001': 3,
};

let userProgressTableAvailable: boolean | null = null;
let mediaProgressTableAvailable: boolean | null = null;
let charactersTableAvailable: boolean | null = null;
const remoteCharactersCacheByBrand = new Map<string, Character[]>();
let mediaTablesAvailable: boolean | null = null;

type MediaItemRow = {
  id: string;
  hub: MediaHub;
  media_kind: MediaKind;
  provider: MediaProvider;
  access_mode: MediaAccessMode;
  title: string;
  summary?: string | null;
  description?: string | null;
  status: 'draft' | 'published' | 'archived' | 'failed';
  storage_bucket?: string | null;
  storage_path?: string | null;
  thumbnail_bucket?: string | null;
  thumbnail_path?: string | null;
  external_url?: string | null;
  external_ref?: string | null;
  mime_type?: string | null;
  duration_seconds?: number | null;
  featured_order?: number | null;
  metadata?: Record<string, unknown> | null;
};

const cloneCharacters = (characters: Character[]): Character[] => {
  return JSON.parse(JSON.stringify(characters)) as Character[];
};

const isMissingUserProgressError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: string; message?: string; details?: string };
  const combinedMessage = `${candidate.message ?? ''} ${candidate.details ?? ''}`.toLowerCase();

  return candidate.code === 'PGRST205'
    || candidate.code === '42P01'
    || combinedMessage.includes('user_progress');
};

const resolveActiveBrandId = async (): Promise<string | null> => {
  if (_activeBrandIdForApi && !_activeBrandIdForApi.startsWith('mock-')) {
    return _activeBrandIdForApi;
  }

  const cachedBrandId = brandIdCacheBySlug.get(_activeBrandSlugForApi);
  if (cachedBrandId) {
    _activeBrandIdForApi = cachedBrandId;
    return cachedBrandId;
  }

  if (!isSupabaseConfigured || devMockSession) {
    return null;
  }

  const { data, error } = await supabase
    .from('brands')
    .select('id')
    .eq('slug', _activeBrandSlugForApi)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    logger.error('Error resolving active brand id:', error);
    return null;
  }

  const brandId = normalizeBrandId((data as { id?: string | null } | null)?.id);

  if (!brandId) {
    logger.error(`No active brand id found for slug "${_activeBrandSlugForApi}".`);
    return null;
  }

  brandIdCacheBySlug.set(_activeBrandSlugForApi, brandId);
  _activeBrandIdForApi = brandId;
  return brandId;
};

const applyActiveBrandScope = (query: any, brandId: string) => {
  return query.eq('brand_id', brandId);
};

const PRESENTATION_SEED_COLLECTIONS_BY_ID = new Map(
  (((catalogSeed as { collections?: Collection[] }).collections) || []).map((collection) => [collection.id, collection])
);

const hydrateCollectionPresentationFields = (collection: Collection, characters?: Character[]): Collection => {
  const seedCollection = PRESENTATION_SEED_COLLECTIONS_BY_ID.get(collection.id);
  const normalizedKitBookIds = normalizeSingleKitBookIds(collection.kit_book_ids);

  if (!seedCollection) {
    return syncCollectionCharacters(syncCollectionWithAssets({
      ...collection,
      kit_book_ids: normalizedKitBookIds,
    }), characters);
  }

  return syncCollectionCharacters(syncCollectionWithAssets({
    ...seedCollection,
    ...collection,
    collection_type: collection.collection_type ?? seedCollection.collection_type,
    kit_cover_image: collection.kit_cover_image ?? seedCollection.kit_cover_image ?? null,
    kit_book_ids: normalizedKitBookIds.length > 0
      ? normalizedKitBookIds
      : seedCollection.kit_book_ids ?? [],
    collection_assets: (collection.collection_assets?.length ?? 0) > 0
      ? collection.collection_assets
      : seedCollection.collection_assets,
  }), characters);
};

const hydrateCollectionsPresentationFields = (collections: Collection[], characters?: Character[]): Collection[] => {
  return collections.map((collection) => hydrateCollectionPresentationFields(collection, characters));
};

// Swap a legacy `collections`-bucket public URL for a signed URL (SEC-58: the
// bucket is now private). Non-bucket values (placeholder SVGs, seed assets,
// external URLs, YouTube frames) yield null from getSignedUrl and pass through
// unchanged, so the app keeps its `string | null` field contract. Callers of
// getCollections/getCollectionById are already async, so this signing happens
// once at the data layer — no screen/component changes.
//
// IMPORTANT: this MUST run AFTER hydrateCollectionPresentationFields. That
// hydration calls inferCollectionAssets, which keys assets in a Map by raw URL
// and matches the pdf_url/audio_url/video_url primary fields to their assets by
// URL equality. Signing before hydration would change those keys and split the
// merge. normalizeAsset/mergeAssetCandidate only trim url/cover_image/lyrics_url
// (they do not drop or rewrite them), so signed values survive re-hydration on a
// cache round-trip. Hence: hydrate first, sign last.
const signCoverField = async (value?: string | null): Promise<string | null | undefined> => {
  if (!value) return value;
  const signed = await getSignedUrl(value);
  return signed ?? value;
};

// Sign a list of storage URLs (e.g. extra_materials). Each entry keeps its
// original value when it is not a `collections`-bucket URL (getSignedUrl → null).
const signUrlList = async (urls: string[]): Promise<string[]> => {
  return Promise.all(urls.map(async (url) => (await signCoverField(url)) ?? url));
};

// Sign every `collections`-bucket URL field on a single asset (url is required;
// cover_image/lyrics_url are optional per-asset overrides).
const signCollectionAsset = async (asset: CollectionAsset): Promise<CollectionAsset> => {
  const [url, coverImage, lyricsUrl] = await Promise.all([
    signCoverField(asset.url),
    signCoverField(asset.cover_image),
    signCoverField(asset.lyrics_url),
  ]);

  return {
    ...asset,
    url: url ?? asset.url,
    ...(asset.cover_image !== undefined ? { cover_image: coverImage ?? asset.cover_image } : {}),
    ...(asset.lyrics_url !== undefined ? { lyrics_url: lyricsUrl ?? asset.lyrics_url } : {}),
  };
};

const signCollectionCovers = async (collection: Collection): Promise<Collection> => {
  const [
    coverImage,
    kitCoverImage,
    pdfUrl,
    audioUrl,
    videoUrl,
    extraMaterials,
    collectionAssets,
  ] = await Promise.all([
    signCoverField(collection.cover_image),
    signCoverField(collection.kit_cover_image),
    signCoverField(collection.pdf_url),
    signCoverField(collection.audio_url),
    signCoverField(collection.video_url),
    collection.extra_materials
      ? signUrlList(collection.extra_materials)
      : Promise.resolve(collection.extra_materials),
    collection.collection_assets
      ? Promise.all(collection.collection_assets.map((asset) => signCollectionAsset(asset)))
      : Promise.resolve(collection.collection_assets),
  ]);

  return {
    ...collection,
    cover_image: coverImage ?? collection.cover_image,
    kit_cover_image: kitCoverImage ?? collection.kit_cover_image,
    ...(collection.pdf_url !== undefined ? { pdf_url: pdfUrl ?? collection.pdf_url } : {}),
    ...(collection.audio_url !== undefined ? { audio_url: audioUrl ?? collection.audio_url } : {}),
    ...(collection.video_url !== undefined ? { video_url: videoUrl ?? collection.video_url } : {}),
    ...(collection.extra_materials !== undefined ? { extra_materials: extraMaterials } : {}),
    ...(collection.collection_assets !== undefined ? { collection_assets: collectionAssets } : {}),
  };
};

const signCollectionsCovers = async (collections: Collection[]): Promise<Collection[]> => {
  return Promise.all(collections.map((collection) => signCollectionCovers(collection)));
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Keep only valid UUID strings from a `uuid[]` column value. Drops client-generated
 * asset ids ("collection-asset:…", "storytelling-…"), mock-session ids ("mock-…"),
 * and any other non-uuid junk. Returns `undefined` when the input is not an array
 * (so the caller leaves the field untouched).
 */
const keepValidUuids = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  return value.filter((v): v is string => typeof v === 'string' && UUID_RE.test(v.trim()));
};

const sanitizeCollectionPayload = (collection: Partial<Collection>, characters?: Character[]): Partial<Collection> => {
  const syncedCollection = syncCollectionCharacters(syncCollectionWithAssets(collection), characters);

  // `character_ids` and `kit_book_ids` are `uuid[]` columns. A SINGLE non-uuid
  // value (a client asset id, a mock-session id, …) makes Postgres reject the
  // entire UPDATE/INSERT with `22P02` (invalid input syntax for type uuid). That
  // is a *type* error, not a missing-column error, so the retry in
  // create/updateCollection (which only recovers from PGRST204) can't save it —
  // the whole write is lost and the user's change (e.g. publish/unpublish)
  // silently never persists. Strip the bad entries here so the valid data saves.
  const next: Partial<Collection> = { ...syncedCollection };
  // character_ids is TEXT[] in Supabase — keep any non-empty string (IDs like 'kaboo', 'baratao').
  if (Array.isArray(next.character_ids)) {
    next.character_ids = next.character_ids.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
  }
  const cleanKitBookIds = keepValidUuids(next.kit_book_ids);
  if (cleanKitBookIds && cleanKitBookIds.length !== (next.kit_book_ids?.length ?? 0)) {
    logger.warn('sanitizeCollectionPayload: dropped non-uuid kit_book_ids', next.kit_book_ids);
  }
  if (cleanKitBookIds) next.kit_book_ids = cleanKitBookIds;

  return next;
};

export const stripMissingCollectionColumns = (
  payload: Partial<Collection>,
  missingColumnNames: string[]
): Partial<Collection> => {
  const nextPayload = { ...payload };

  for (const columnName of missingColumnNames) {
    delete nextPayload[columnName as keyof Collection];
  }

  return nextPayload;
};

/**
 * Propaga o renome de um livro para os kits que o embutem.
 *
 * Os assets do kit guardam um SNAPSHOT do título no momento do vínculo, então
 * renomear a mídia-fonte não refletia na coleção (o "Audiolivro" continuava com
 * o título antigo). Aqui atualizamos o título dos assets cujo `url` referencia o
 * id do livro renomeado, em todos os kits que o listam em `kit_book_ids`.
 * Best-effort: qualquer falha é logada e ignorada (não bloqueia o update).
 */
const propagateBookTitleToKits = async (
  bookId: string,
  existing: Collection | null,
  updated: Collection | null,
  activeBrandId: string,
): Promise<void> => {
  const newTitle = updated?.title?.trim();
  if (!existing || !newTitle || existing.title === newTitle) return;

  try {
    let kitsQuery = supabase
      .from('collections')
      .select('id, collection_assets')
      .eq('collection_type', 'kit')
      .contains('kit_book_ids', [bookId]);
    kitsQuery = applyActiveBrandScope(kitsQuery, activeBrandId);
    const { data: kits, error } = await kitsQuery;
    if (error || !Array.isArray(kits)) return;

    for (const kit of kits as Array<{ id: string; collection_assets: unknown }>) {
      const assets = Array.isArray(kit.collection_assets)
        ? (kit.collection_assets as Array<Record<string, unknown>>)
        : [];
      let changed = false;
      const nextAssets = assets.map((asset) => {
        const url = asset?.url;
        if (typeof url === 'string' && url.includes(bookId) && asset.title !== newTitle) {
          changed = true;
          return { ...asset, title: newTitle };
        }
        return asset;
      });
      if (!changed) continue;

      const { error: propErr } = await supabase
        .from('collections')
        .update({ collection_assets: nextAssets })
        .eq('id', kit.id);
      if (propErr) {
        logger.warn('Falha ao propagar título do livro para o kit', { kitId: kit.id, error: propErr });
      }
    }
  } catch (err) {
    logger.warn('Erro ao propagar renome do livro para kits:', err);
  }
};

const isMissingColumnError = (error: unknown, columnName: string): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { message?: string; details?: string };
  const combinedMessage = `${candidate.message ?? ''} ${candidate.details ?? ''}`.toLowerCase();

  return combinedMessage.includes(columnName.toLowerCase());
};

/** Extract the missing column name from a PGRST204 error, if any. */
const extractMissingColumnName = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') return null;
  const candidate = error as { code?: string; message?: string };
  if (candidate.code !== 'PGRST204' && candidate.code !== '42703') return null;
  // PGRST204 message: "Could not find the 'description' column of 'collections' in the schema cache"
  const match = candidate.message?.match(/the '(\w+)' column/i)
    ?? candidate.message?.match(/column "(\w+)"/i);
  return match?.[1] ?? null;
};

const STRIPPABLE_COLLECTION_COLUMNS = new Set([
  'character_ids', 'offline_available',
]);

const isMissingRelationError = (error: unknown, relationName: string): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: string; message?: string; details?: string };
  const combinedMessage = `${candidate.message ?? ''} ${candidate.details ?? ''}`.toLowerCase();

  return candidate.code === 'PGRST205'
    || candidate.code === '42P01'
    || (combinedMessage.includes(relationName.toLowerCase()) && combinedMessage.includes('does not exist'))
    || (combinedMessage.includes(relationName.toLowerCase()) && combinedMessage.includes('could not find'));
};

const mapLibraryHubToMediaHub = (hub: LibraryHubKind): MediaHub => hub;

const COLLECTION_BACKED_HUB_CATEGORIES: Record<MediaHub, CollectionAssetCategory[]> = {
  // Deve espelhar LIBRARY_AREA_LISTING_CATEGORIES.videos do admin — senão vídeos
  // publicados em story_video/formation aparecem no admin mas somem da vitrine.
  // Catálogo navegável no hub Vídeos: animação avulsa + contação em vídeo (+ overlap de
  // Formações). Removidos os "acompanhamentos" de uma obra: accessible_video (Com Libras,
  // variante da obra) e how_to_play (Como Jogar, instrução do kit) — acessíveis dentro da obra.
  // Ver docs/decisao-arquitetura-hubs-2026-06.md.
  videos: ['animation', 'story_video', 'video_lesson', 'formation'],
  // Apenas faixas de música no hub "Músicas". Narração de livro (storytelling) é áudio
  // com dono (1 faixa/livro) e fica acessível dentro do livro — não na exploração do hub.
  music: ['music'],
  formations: ['teacher_guide', 'video_lesson'],
  // reading (PDF do livro) pertence EXCLUSIVAMENTE ao hub Livros — Materiais é só
  // material de apoio (extra_material). Alinhado ao admin (LIBRARY_AREA_LISTING_CATEGORIES).
  materials: ['extra_material'],
};

const buildCollectionAssetMediaItemId = (hub: MediaHub, collectionId: string, assetId: string): string => {
  return `collection-asset:${hub}:${collectionId}:${assetId}`;
};

const parseCollectionAssetMediaItemId = (mediaItemId: string): { hub: MediaHub; collectionId: string; assetId: string } | null => {
  const match = mediaItemId.match(/^collection-asset:(videos|music|formations|materials):([^:]+):(.+)$/);
  if (!match) {
    return null;
  }

  return {
    hub: match[1] as MediaHub,
    collectionId: match[2],
    assetId: match[3],
  };
};

const mapMockVariantToMediaKind = (item: LibraryMockItem): MediaKind => {
  if (item.assetType === 'video') {
    return 'video';
  }

  if (item.assetType === 'audio') {
    return 'audio';
  }

  if (item.assetType === 'pdf') {
    return item.variant === 'formation' ? 'training' : 'document';
  }

  if (item.variant === 'video') {
    return 'video';
  }

  if (item.variant === 'track') {
    return 'audio';
  }

  if (item.variant === 'formation') {
    return 'training';
  }

  return 'document';
};

const buildCollectionBackedVariant = (hub: MediaHub, asset: CollectionAsset): LibraryMockItem['variant'] => {
  if (hub === 'music') {
    return 'track';
  }

  if (hub === 'formations') {
    return 'formation';
  }

  if (hub === 'materials') {
    if (asset.media_type === 'video') {
      return 'video';
    }

    if (asset.media_type === 'audio') {
      return 'track';
    }

    return 'material';
  }

  return 'video';
};

const buildCollectionBackedAssetType = (asset: CollectionAsset): LibraryMockItem['assetType'] => {
  if (asset.media_type === 'video') {
    return 'video';
  }

  if (asset.media_type === 'audio') {
    return 'audio';
  }

  return 'pdf';
};

const getCollectionBackedShelfMeta = (_hub: MediaHub): { title: string; description: string } => {
  return { title: '', description: '' };
};

const buildCollectionBackedDescription = (hub: MediaHub, collection: Collection, asset: CollectionAsset): string => {
  const explicitDescription = asset.description?.trim();
  if (explicitDescription) {
    return explicitDescription;
  }

  const collectionDescription = collection.description?.trim();
  if (collectionDescription) {
    return collectionDescription;
  }

  const theme = collection.theme?.trim();
  if (theme) {
    return theme;
  }

  switch (hub) {
    case 'videos':
      return `Conteúdo em vídeo vinculado à coleção ${collection.title}.`;
    case 'music':
      return `Faixa de apoio vinculada à coleção ${collection.title}.`;
    case 'formations':
      return asset.media_type === 'video'
        ? `Videoaula aplicada vinculada à coleção ${collection.title}.`
        : `Percurso de mediação vinculado à coleção ${collection.title}.`;
    case 'materials':
      return `Material de apoio vinculado à coleção ${collection.title}.`;
    default:
      return `Conteúdo vinculado à coleção ${collection.title}.`;
  }
};

const buildCollectionBackedMeta = (hub: MediaHub, asset: CollectionAsset): string => {
  const label = COLLECTION_ASSET_META[asset.category]?.label ?? asset.title;

  switch (hub) {
    case 'videos':
      return `vídeo • ${label}`;
    case 'music':
      return `faixa • ${label}`;
    case 'formations':
      return asset.media_type === 'video' ? 'formação • videoaula' : 'formação • guia';
    case 'materials':
      if (asset.media_type === 'video') {
        return 'material • vídeo';
      }

      if (asset.media_type === 'audio') {
        return 'material • áudio';
      }

      return 'PDF • material';
    default:
      return label;
  }
};

const buildCollectionBackedEyebrow = (hub: MediaHub, asset: CollectionAsset): string => {
  const label = COLLECTION_ASSET_META[asset.category]?.label ?? asset.title;

  switch (hub) {
    case 'videos':
      return label;
    case 'music':
      return 'Faixa vinculada';
    case 'formations':
      return asset.media_type === 'video' ? 'Videoaula aplicada' : 'Percurso aplicado';
    case 'materials':
      return asset.category === 'reading' ? 'Leitura da coleção' : 'Material complementar';
    default:
      return label;
  }
};

const buildCollectionBackedChips = (collection: Collection, asset: CollectionAsset): string[] => {
  return Array.from(new Set([
    COLLECTION_ASSET_META[asset.category]?.label ?? asset.title,
    collection.level,
    ...(collection.characters?.slice(0, 1) ?? []),
  ].filter(Boolean) as string[]));
};

const getCollectionBackedThumbnail = (collection: Collection): string | undefined => {
  const primaryCoverImage = collection.cover_image?.trim();

  if (primaryCoverImage && !isPlaceholderImageUrl(primaryCoverImage)) {
    return primaryCoverImage;
  }

  return getCollectionDisplayCover(collection) || undefined;
};

// Derives a YouTube thumbnail from a video URL ('' when not a YouTube link).
const getYoutubeThumbnailUrl = (url?: string | null): string => {
  const value = url || '';
  const id =
    value.match(/youtu\.be\/([\w-]{6,})/i)?.[1] ??
    value.match(/[?&]v=([\w-]{6,})/i)?.[1] ??
    value.match(/youtube\.com\/embed\/([\w-]{6,})/i)?.[1] ??
    '';
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
};

// Cover for a collection-backed media item. A media should show its OWN cover, not the
// cover of whatever collection it happens to be linked into (e.g. an audio reused inside a
// kit must not show the kit cover). Order: YouTube frame for videos → cover of the
// collection that OWNS the file (id embedded in the storage URL) → the linking collection
// cover. The structural fix (per-media cover) is tracked in the roadmap backlog.
const getCollectionBackedAssetThumbnail = (
  collection: Collection,
  asset: CollectionAsset,
  collectionsById?: Map<string, Collection>,
): string | undefined => {
  const ownCover = asset.cover_image?.trim();
  if (ownCover && !isPlaceholderImageUrl(ownCover)) {
    return ownCover;
  }

  if (asset.media_type === 'video') {
    const youtubeThumb = getYoutubeThumbnailUrl(asset.url);
    if (youtubeThumb) {
      return youtubeThumb;
    }
  }

  const sourceId = extractSourceCollectionId(asset.url);
  if (sourceId && collectionsById && sourceId !== collection.id) {
    const source = collectionsById.get(sourceId);
    if (source) {
      const sourceCover = getCollectionBackedThumbnail(source);
      if (sourceCover) {
        return sourceCover;
      }
    }
  }

  return getCollectionBackedThumbnail(collection);
};

const buildCollectionBackedLibraryItem = (hub: MediaHub, collection: Collection, asset: CollectionAsset, collectionsById?: Map<string, Collection>): LibraryMockItem => {
  const variant = buildCollectionBackedVariant(hub, asset);
  const assetType = buildCollectionBackedAssetType(asset);

  return {
    id: buildCollectionAssetMediaItemId(hub, collection.id, asset.id),
    variant,
    eyebrow: buildCollectionBackedEyebrow(hub, asset),
    title: asset.title,
    description: buildCollectionBackedDescription(hub, collection, asset),
    meta: buildCollectionBackedMeta(hub, asset),
    previewSteps: hub === 'formations' ? (asset.category === 'video_lesson' ? 1 : 2) : undefined,
    secondaryMeta: hub === 'formations'
      ? (asset.media_type === 'video' ? 'Videoaula aplicada' : 'Guia pedagógico')
      : undefined,
    relatedCollection: collection.title,
    collectionId: collection.id,
    coverImage: getCollectionBackedAssetThumbnail(collection, asset, collectionsById),
    progress: 0,
    chips: buildCollectionBackedChips(collection, asset),
    ctaLabel: assetType === 'video'
      ? 'Assistir agora'
      : assetType === 'audio'
        ? 'Ouvir agora'
        : 'Abrir PDF',
    assetType,
    assetUrl: asset.url,
    assetTitle: asset.title,
    assetOfflineAvailable: asset.offline_available ?? null,
  };
};

const getCollectionBackedItemsForHub = (hub: MediaHub, collections: Collection[]): LibraryMockItem[] => {
  const allowedCategories = COLLECTION_BACKED_HUB_CATEGORIES[hub];

  // WS-2 — escopo: conteúdo com dono não vaza para os hubs globais.
  // Kits: nunca aparecem em hub — seu conteúdo pertence à vitrine da coleção.
  // Books com PDF (reading): seus assets (vídeo, música, material) ficam dentro da obra,
  // não aparecem em nenhum hub. Materiais avulsos do admin vêm da tabela `materials`.
  const isHubEligible = (collection: Collection): boolean => {
    if (collection.collection_type === 'kit') return false;
    if (collection.collection_type === 'book' &&
        (collection.collection_assets ?? []).some((a) => a.category === 'reading')) return false;
    return true;
  };

  const collectionsById = new Map(collections.map((collection) => [collection.id, collection]));

  const pairs = collections
    .filter(isHubEligible)
    .flatMap((collection) => (collection.collection_assets ?? [])
      // On the public storefront, hide assets that were explicitly unpublished (is_published=false).
      // undefined/null means published (backward-compat with assets created before per-asset flags).
      // Avulso vs vinculado é decidido pela ESTRUTURA (isHubEligible: obra com PDF/kit fica fora),
      // não por flag — ver docs/architecture/modelo-conteudo-e-hubs.md.
      .filter((asset) => allowedCategories.includes(asset.category) && asset.is_published !== false)
      .map((asset) => ({ collection, asset })));

  // Dedup por arquivo (URL): a mesma mídia copiada em vários kits/coleções (ex.: kit
  // que copiou o áudio do livro) aparece UMA vez só na vitrine, preferindo a coleção
  // DONA do arquivo (ID no caminho de storage .../collections/<pasta>/<ID>/<arquivo>).
  const ownerIdFromUrl = (url: string): string | null => {
    const match = url.match(/\/collections\/[^/]+\/([0-9a-fA-F-]{36})\//);
    return match ? match[1] : null;
  };
  const byUrl = new Map<string, (typeof pairs)[number]>();
  for (const pair of pairs) {
    const url = (pair.asset.url ?? '').trim();
    const dedupKey = url || `nourl:${pair.collection.id}:${pair.asset.id}`;
    const existing = byUrl.get(dedupKey);
    if (!existing) {
      byUrl.set(dedupKey, pair);
      continue;
    }
    const owner = url ? ownerIdFromUrl(url) : null;
    if (owner && pair.collection.id === owner && existing.collection.id !== owner) {
      byUrl.set(dedupKey, pair);
    }
  }

  return Array.from(byUrl.values())
    .sort((left, right) => {
      const categoryDiff = allowedCategories.indexOf(left.asset.category) - allowedCategories.indexOf(right.asset.category);
      if (categoryDiff !== 0) {
        return categoryDiff;
      }

      const collectionDiff = left.collection.title.localeCompare(right.collection.title, 'pt-BR');
      if (collectionDiff !== 0) {
        return collectionDiff;
      }

      return left.asset.title.localeCompare(right.asset.title, 'pt-BR');
    })
    .map(({ collection, asset }) => buildCollectionBackedLibraryItem(hub, collection, asset, collectionsById));
};

const mapMockAssetToProvider = (item: LibraryMockItem): MediaProvider => {
  if (item.assetType === 'audio' && item.assetUrl?.includes('youtube')) {
    return 'youtube';
  }

  if (item.assetType === 'video' && item.assetUrl?.includes('youtube')) {
    return 'youtube';
  }

  if (item.assetType === 'audio') {
    return 'external_audio';
  }

  return 'internal';
};

const buildMockMediaItemCard = (hub: MediaHub, item: LibraryMockItem): MediaItemCard => ({
  id: item.id,
  hub,
  kind: mapMockVariantToMediaKind(item),
  title: item.title,
  summary: item.meta,
  description: item.description,
  thumbnailUrl: item.coverImage ?? null,
  durationSeconds: null,
  featuredOrder: 0,
  collectionId: item.collectionId ?? null,
  collectionTitle: item.relatedCollection ?? null,
  provider: mapMockAssetToProvider(item),
  locked: false,
  isFavorite: false,
  progressPercent: item.progress ?? 0,
  lastPositionSeconds: undefined,
  badges: item.chips ?? [],
  assetUrl: item.assetUrl ?? null,
});

const buildCollectionBackedMediaHubResponse = (hub: MediaHub, collections: Collection[]): MediaHubResponse => {
  const items = getCollectionBackedItemsForHub(hub, collections);
  const [heroItem, ...shelfItems] = items;
  const shelfMeta = getCollectionBackedShelfMeta(hub);

  return {
    hub,
    hero: heroItem ? buildMockMediaItemCard(hub, heroItem) : null,
    shelves: shelfItems.length > 0
      ? [{
        id: `${hub}-collection-assets`,
        hub,
        type: 'rail',
        title: shelfMeta.title,
        description: shelfMeta.description,
        items: shelfItems.map((item) => buildMockMediaItemCard(hub, item)),
      }]
      : [],
    counts: {
      total: items.length,
      favorites: 0,
      continueWatching: 0,
    },
  };
};

const buildEmptyMediaHubResponse = (hub: MediaHub): MediaHubResponse => ({
  hub,
  hero: null,
  shelves: [],
  counts: {
    total: 0,
    favorites: 0,
    continueWatching: 0,
  },
});

const buildMaterialLibraryItem = (material: Material): LibraryMockItem => {
  const variant = material.asset_type === 'video'
    ? 'video'
    : material.asset_type === 'audio'
      ? 'track'
      : 'material';
  return {
    id: `material-${material.id}`,
    variant,
    eyebrow: 'Material',
    title: material.title,
    description: material.description ?? '',
    meta: '',
    ctaLabel: material.asset_type === 'video'
      ? 'Assistir'
      : material.asset_type === 'audio'
        ? 'Ouvir'
        : 'Abrir material',
    coverImage: material.cover_image ?? undefined,
    assetType: material.asset_type,
    assetUrl: material.asset_url ?? undefined,
    assetTitle: material.title,
  };
};

/**
 * Constrói a resposta do hub Materiais a partir da tabela `materials` (materiais
 * avulsos do módulo admin Materiais). O hub só lia media_items/extra_material, então
 * materiais publicados nessa tabela ficavam "publicados mas não listados" na vitrine.
 * Mesclado em getMediaHub.
 */
const buildMaterialsTableHubResponse = (materials: Material[]): MediaHubResponse => {
  const items = materials.map(buildMaterialLibraryItem);
  const [heroItem, ...shelfItems] = items;
  return {
    hub: 'materials',
    hero: heroItem ? buildMockMediaItemCard('materials', heroItem) : null,
    shelves: shelfItems.length > 0
      ? [{
        id: 'materials-standalone',
        hub: 'materials',
        type: 'rail',
        title: '',
        description: '',
        items: shelfItems.map((item) => buildMockMediaItemCard('materials', item)),
      }]
      : [],
    counts: {
      total: items.length,
      favorites: 0,
      continueWatching: 0,
    },
  };
};

const buildFormationLibraryItem = (formation: import('../types').Formation, progressPercent?: number): LibraryMockItem => ({
  id: formation.id,
  variant: 'formation',
  eyebrow: 'Formação',
  title: formation.title,
  description: formation.description ?? '',
  meta: formation.duration_label ?? (formation.steps_count ? `${formation.steps_count} aulas` : ''),
  ctaLabel: 'Ver percurso',
  coverImage: formation.cover_image ?? undefined,
  progress: progressPercent && progressPercent > 0 ? progressPercent : undefined,
});

const buildFormationsTableHubResponse = (formations: import('../types').Formation[], progressMap: Record<string, number> = {}): MediaHubResponse => {
  const items = formations.map(f => buildFormationLibraryItem(f, progressMap[f.id]));
  const [heroItem, ...shelfItems] = items;
  return {
    hub: 'formations',
    hero: heroItem ? buildMockMediaItemCard('formations', heroItem) : null,
    shelves: shelfItems.length > 0
      ? [{
        id: 'formations-standalone',
        hub: 'formations',
        type: 'rail',
        title: '',
        description: '',
        items: shelfItems.map((item) => buildMockMediaItemCard('formations', item)),
      }]
      : [],
    counts: {
      total: items.length,
      favorites: 0,
      continueWatching: 0,
    },
  };
};

const buildMockMediaHubResponse = (hub: MediaHub): MediaHubResponse => {
  const mock = LIBRARY_HUB_MOCKS[hub as LibraryHubKind];
  const hero = mock.featured ? buildMockMediaItemCard(hub, mock.featured) : null;
  const shelves: MediaShelf[] = mock.rails.map((rail) => ({
    id: rail.id,
    hub,
    type: 'rail',
    title: rail.title,
    description: rail.description,
    items: rail.items.map((item) => buildMockMediaItemCard(hub, item)),
  }));

  return {
    hub,
    hero,
    shelves,
    counts: {
      total: shelves.reduce((accumulator, shelf) => accumulator + shelf.items.length, 0) + (hero ? 1 : 0),
      favorites: 0,
      continueWatching: 0,
    },
  };
};

const findCollectionBackedMediaItem = (
  mediaItemId: string,
  collections: Collection[]
): { hub: MediaHub; item: LibraryMockItem } | null => {
  const parsedItemId = parseCollectionAssetMediaItemId(mediaItemId);
  if (!parsedItemId) {
    return null;
  }

  const collection = collections.find((entry) => entry.id === parsedItemId.collectionId);
  if (!collection) {
    return null;
  }

  const asset = (collection.collection_assets ?? []).find((entry) => entry.id === parsedItemId.assetId);
  if (!asset || !COLLECTION_BACKED_HUB_CATEGORIES[parsedItemId.hub].includes(asset.category)) {
    return null;
  }

  return {
    hub: parsedItemId.hub,
    item: buildCollectionBackedLibraryItem(parsedItemId.hub, collection, asset),
  };
};

const findMockMediaItem = (
  mediaItemId: string,
  collections: Collection[] = []
): { hub: MediaHub; item: LibraryMockItem } | null => {
  const collectionBackedMatch = findCollectionBackedMediaItem(mediaItemId, collections);
  if (collectionBackedMatch) {
    return collectionBackedMatch;
  }

  if (_activeBrandSlugForApi !== 'kaboo') {
    return null;
  }

  const hubs = Object.entries(LIBRARY_HUB_MOCKS) as Array<[LibraryHubKind, typeof LIBRARY_HUB_MOCKS[LibraryHubKind]]>;

  for (const [hub, mock] of hubs) {
    if (mock.featured?.id === mediaItemId) {
      return { hub: mapLibraryHubToMediaHub(hub), item: mock.featured };
    }

    for (const rail of mock.rails) {
      const match = rail.items.find((item) => item.id === mediaItemId);
      if (match) {
        return { hub: mapLibraryHubToMediaHub(hub), item: match };
      }
    }
  }

  return null;
};

const getMediaHubCards = (hubResponse: MediaHubResponse): MediaItemCard[] => {
  const cards = [
    ...(hubResponse.hero ? [hubResponse.hero] : []),
    ...hubResponse.shelves.flatMap((shelf) => shelf.items),
  ];

  return Array.from(new Map(cards.map((card) => [card.id, card])).values());
};

const getMediaHubResponseCount = (hubResponse: MediaHubResponse): number => {
  return hubResponse.counts?.total ?? getMediaHubCards(hubResponse).length;
};

const normalizeMediaCardKeySegment = (value?: string | null): string => {
  return (value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

const buildMediaCardContentKey = (card: MediaItemCard): string => {
  const normalizedKind = card.kind === 'training' ? 'document' : card.kind;
  const collectionKey = normalizeMediaCardKeySegment(card.collectionId ?? card.collectionTitle);
  const titleKey = normalizeMediaCardKeySegment(card.title);

  return `${collectionKey}::${titleKey}::${normalizedKind}`;
};

const mergeMediaHubResponses = (primary: MediaHubResponse, secondary: MediaHubResponse): MediaHubResponse => {
  if (getMediaHubResponseCount(secondary) === 0) {
    return primary;
  }

  const existingContentKeys = new Set(getMediaHubCards(primary).map(buildMediaCardContentKey));
  const secondaryCards = getMediaHubCards(secondary).filter((card) => {
    const contentKey = buildMediaCardContentKey(card);
    if (existingContentKeys.has(contentKey)) {
      return false;
    }

    existingContentKeys.add(contentKey);
    return true;
  });

  if (secondaryCards.length === 0) {
    return primary;
  }

  const mergedHero = primary.hero ?? secondary.hero ?? null;
  const secondaryShelfMeta = getCollectionBackedShelfMeta(primary.hub);
  const appendedCards = secondaryCards.filter((card) => card.id !== mergedHero?.id);
  const mergedShelves = appendedCards.length > 0
    ? [
      ...primary.shelves,
      {
        id: `${primary.hub}-collection-assets-bridge`,
        hub: primary.hub,
        type: 'rail' as const,
        title: secondaryShelfMeta.title,
        description: secondaryShelfMeta.description,
        items: appendedCards,
      },
    ]
    : primary.shelves;
  const mergedResponse: MediaHubResponse = {
    hub: primary.hub,
    hero: mergedHero,
    shelves: mergedShelves,
    counts: {
      total: getMediaHubCards({
        hub: primary.hub,
        hero: mergedHero,
        shelves: mergedShelves,
      }).length,
      favorites: primary.counts?.favorites ?? 0,
      continueWatching: primary.counts?.continueWatching ?? 0,
    },
  };

  return mergedResponse;
};

const getMediaItemResolvedUrl = async (item: MediaItemRow): Promise<string | null> => {
  const metadata = item.metadata ?? {};
  const metadataPlaybackUrl = typeof metadata.playback_url === 'string'
    ? metadata.playback_url
    : typeof metadata.resolved_url === 'string'
      ? metadata.resolved_url
      : null;

  if (item.provider === 'internal') {
    if (item.storage_bucket && item.storage_path && isSupabaseConfigured && !devMockSession) {
      const signedUrl = await getSignedUrl(item.storage_bucket, item.storage_path);
      if (signedUrl) {
        return signedUrl;
      }
    }

    return metadataPlaybackUrl;
  }

  return item.external_url ?? metadataPlaybackUrl;
};

const getYouTubeVideoId = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const shortMatch = value.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/i);
  if (shortMatch?.[1]) {
    return shortMatch[1];
  }

  const watchMatch = value.match(/[?&]v=([A-Za-z0-9_-]{6,})/i);
  if (watchMatch?.[1]) {
    return watchMatch[1];
  }

  const embedMatch = value.match(/(?:embed|shorts)\/([A-Za-z0-9_-]{6,})/i);
  if (embedMatch?.[1]) {
    return embedMatch[1];
  }

  return null;
};

const isDirectImageUrl = (value?: string | null): value is string => {
  if (!value) {
    return false;
  }

  return /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(value);
};

const getMediaItemThumbnailUrl = async (item: MediaItemRow): Promise<string | null> => {
  const metadata = item.metadata ?? {};
  const metadataThumbnail = [
    metadata.thumbnail_url,
    metadata.thumbnailUrl,
    metadata.poster_url,
    metadata.posterUrl,
    metadata.image_url,
    metadata.imageUrl,
    metadata.cover_image,
    metadata.coverImage,
  ].find((value): value is string => typeof value === 'string' && value.length > 0) ?? null;

  if (item.thumbnail_bucket && item.thumbnail_path && isSupabaseConfigured && !devMockSession) {
    const signedUrl = await getSignedUrl(item.thumbnail_bucket, item.thumbnail_path);
    if (signedUrl) {
      return signedUrl;
    }
  }

  if (metadataThumbnail) {
    return metadataThumbnail;
  }

  const youtubeVideoId = getYouTubeVideoId(item.external_url ?? item.external_ref ?? null);
  if (youtubeVideoId) {
    return `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`;
  }

  if (isDirectImageUrl(item.external_url)) {
    return item.external_url;
  }

  return null;
};

const toMediaItemCard = async (
  item: MediaItemRow,
  options?: {
    progressByItemId?: Record<string, { progressPercent: number; lastPositionSeconds: number }>;
    favoriteIds?: Set<string>;
    relatedCollections?: MediaRelatedCollection[];
  },
): Promise<MediaItemCard> => {
  const progress = options?.progressByItemId?.[item.id];
  const primaryCollection = options?.relatedCollections?.[0];

  return {
    id: item.id,
    hub: item.hub,
    kind: item.media_kind,
    title: item.title,
    summary: item.summary ?? null,
    description: item.description ?? null,
    thumbnailUrl: await getMediaItemThumbnailUrl(item),
    durationSeconds: item.duration_seconds ?? null,
    featuredOrder: item.featured_order ?? 0,
    collectionId: primaryCollection?.collectionId ?? null,
    collectionTitle: primaryCollection?.title ?? null,
    provider: item.provider,
    locked: false,
    isFavorite: options?.favoriteIds?.has(item.id) ?? false,
    progressPercent: progress?.progressPercent ?? 0,
    lastPositionSeconds: progress?.lastPositionSeconds,
    badges: (item.metadata as Record<string, unknown>)?.chips as string[] ?? [],
  };
};

const getCurrentUserId = async (): Promise<string | null> => {
  if (!isSupabaseConfigured || devMockSession) {
    return getMockCurrentUserId();
  }

  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
};

const getRemoteMediaUserState = async (userId: string) => {
  const skipProgress = mediaProgressTableAvailable === false;
  const [progressResult, favoritesResult] = await Promise.all([
    skipProgress
      ? { data: [], error: null }
      : supabase
        .from('user_media_progress')
        .select('media_item_id, progress_percent, last_position_seconds, last_played_at')
        .eq('user_id', userId)
        .order('last_played_at', { ascending: false }),
    supabase
      .from('user_media_favorites')
      .select('media_item_id')
      .eq('user_id', userId),
  ]);

  const progressByItemId: Record<string, { progressPercent: number; lastPositionSeconds: number }> = {};
  const favoriteIds = new Set<string>();
  const continueItemIds: string[] = [];

  if (progressResult.error) {
    mediaProgressTableAvailable = false;
  } else if (!skipProgress) {
    (progressResult.data || []).forEach((entry: any) => {
      progressByItemId[entry.media_item_id] = {
        progressPercent: entry.progress_percent ?? 0,
        lastPositionSeconds: entry.last_position_seconds ?? 0,
      };

      if ((entry.progress_percent ?? 0) > 0 && (entry.progress_percent ?? 0) < 100) {
        continueItemIds.push(entry.media_item_id);
      }
    });
  }

  if (!favoritesResult.error) {
    (favoritesResult.data || []).forEach((entry: any) => {
      favoriteIds.add(entry.media_item_id);
    });
  }

  return { progressByItemId, favoriteIds, continueItemIds };
};

const loadRemoteCharacters = async (forceRefresh: boolean = false): Promise<Character[] | null> => {
  if (!isSupabaseConfigured || devMockSession || charactersTableAvailable === false) {
    return null;
  }

  const cacheKey = getActiveBrandScopeCacheKey();
  const cachedCharacters = remoteCharactersCacheByBrand.get(cacheKey);
  if (!forceRefresh && cachedCharacters) {
    return cloneCharacters(filterCharactersForBrand(cachedCharacters, _activeBrandSlugForApi, _activeBrandIdForApi));
  }

  const activeBrandId = await resolveActiveBrandId();
  if (!activeBrandId) {
    logger.error(`Unable to scope remote characters for brand "${_activeBrandSlugForApi}".`);
    return [];
  }

  let query = supabase
    .from('characters')
    .select('*')
    .order('name', { ascending: true });

  query = applyActiveBrandScope(query, activeBrandId);

  const { data, error } = await query;

  if (error) {
    if (isMissingRelationError(error, 'characters')) {
      charactersTableAvailable = false;
      logger.warn('characters table unavailable; falling back to local registry for this session.', error);
      return null;
    }

    logger.error('Error fetching characters:', error);
    return null;
  }

  const remoteCharacters = ((data || []) as Character[]).map((character) => normalizeCharacter(character));
  const visibleRemoteCharacters = filterCharactersForBrand(remoteCharacters, _activeBrandSlugForApi, activeBrandId);
  charactersTableAvailable = true;
  remoteCharactersCacheByBrand.set(cacheKey, cloneCharacters(remoteCharacters));
  setCharacterRegistrySnapshot(visibleRemoteCharacters);

  return cloneCharacters(visibleRemoteCharacters);
};

const getSupabaseDevFallbackVoucher = (voucherCode: string): Voucher | null => {
  if (!import.meta.env.DEV || !isSupabaseConfigured) {
    return null;
  }

  const normalizedCode = normalizeVoucherCode(voucherCode);
  const durationMonths = DEV_SUPABASE_VOUCHER_FALLBACKS[normalizedCode];
  if (!durationMonths) {
    return null;
  }

  return {
    id: `dev-fallback-${normalizedCode.toLowerCase()}`,
    code: normalizedCode,
    duration_months: durationMonths,
    status: 'active',
    expires_at: null,
    consumed_at: null,
    consumed_by_user_id: null,
  };
};

const normalizeProfile = (profile: UserProfile): UserProfile => {
  return {
    ...profile,
    access_status: getProfileAccessStatus(profile)
  };
};

// Get or create session ID (unique per browser session)
const getSessionId = (): string => {
  if (typeof window === 'undefined') return '';

  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
};

// Clear collections cache
export const clearCollectionsCache = (): void => {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(getCollectionsCacheKey());
  }
};

// Clear profile cache
export const clearProfileCache = (): void => {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(getProfileCacheKey());
  }
};

// Clear all user-related caches (profile, collections, session ID, and offline collections)
// This should be called when logging out to prevent showing previous user's data
export const clearAllUserCache = (): void => {
  if (typeof window !== 'undefined') {
    // Clear sessionStorage caches
    sessionStorage.removeItem(getProfileCacheKey());
    sessionStorage.removeItem(getCollectionsCacheKey());
    sessionStorage.removeItem(SESSION_KEY);

    // Clear offline collections list (user-specific, scoped to the active brand)
    localStorage.removeItem(getOfflineStorageKey());

    // Clear Cache API (offline assets) for the active brand
    if ('caches' in window) {
      caches.delete(getOfflineCacheName()).catch(err => {
        logger.error('Error clearing offline cache:', err);
      });
    }
  }
};

// Get cached collections if available
const getCachedCollections = (): Collection[] | null => {
  if (typeof window === 'undefined') return null;

  try {
    const cached = sessionStorage.getItem(getCollectionsCacheKey());
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    // Expire stale cache by age so edits made in another tab/context surface without a
    // manual reload (the timestamp was always stored but never enforced).
    if (typeof parsed.timestamp === 'number' && Date.now() - parsed.timestamp > COLLECTIONS_CACHE_TTL_MS) {
      sessionStorage.removeItem(getCollectionsCacheKey());
      return null;
    }
    // Verify it's from the current session
    if (parsed.sessionId === getSessionId()) {
      const hydratedCollections = filterCollectionsForBrand(
        hydrateCollectionsPresentationFields(parsed.collections || []),
        _activeBrandSlugForApi,
        _activeBrandIdForApi,
      );

      if (JSON.stringify(hydratedCollections) !== JSON.stringify(parsed.collections || [])) {
        saveCollectionsCache(hydratedCollections);
      }

      return hydratedCollections;
    }
    // If session changed, clear old cache
    sessionStorage.removeItem(getCollectionsCacheKey());
    return null;
  } catch (error) {
    logger.error('Error reading collections cache:', error);
    return null;
  }
};

// Export function to get cached collections synchronously (for initial state)
export const getCachedCollectionsSync = (): Collection[] | null => {
  return getCachedCollections();
};

// Get cached profile if available
const getCachedProfile = async (): Promise<UserProfile | null> => {
  if (typeof window === 'undefined') return null;

  try {
    const cached = sessionStorage.getItem(getProfileCacheKey());
    if (!cached) return null;

    const parsed = JSON.parse(cached);

    // Verify it's from the current session
    if (parsed.sessionId !== getSessionId()) {
      // If session changed, clear old cache
      sessionStorage.removeItem(getProfileCacheKey());
      return null;
    }

    if (!isSupabaseConfigured) {
      const currentMockUserId = getMockCurrentUserId();
      if (!currentMockUserId || parsed.userId !== currentMockUserId) {
        sessionStorage.removeItem(getProfileCacheKey());
        return null;
      }
      return parsed.profile;
    }

    // Verify the cached profile belongs to the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || parsed.userId !== user.id) {
      // User ID doesn't match - clear cache
      sessionStorage.removeItem(getProfileCacheKey());
      return null;
    }

    return parsed.profile;
  } catch (error) {
    logger.error('Error reading profile cache:', error);
    return null;
  }
};

// Export function to get cached profile synchronously (for initial state)
// Note: This doesn't validate user ID, so it should only be used for initial display
// The actual profile fetch will validate and update if needed
export const getCachedProfileSync = (): UserProfile | null => {
  if (typeof window === 'undefined') return null;

  try {
    const cached = sessionStorage.getItem(getProfileCacheKey());
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    // Only verify session ID synchronously - user ID check happens async
    if (parsed.sessionId === getSessionId()) {
      if (!isSupabaseConfigured) {
        const currentMockUserId = getMockCurrentUserId();
        if (!currentMockUserId || parsed.userId !== currentMockUserId) {
          sessionStorage.removeItem(getProfileCacheKey());
          return null;
        }
      }
      return parsed.profile;
    }
    // If session changed, clear old cache
    sessionStorage.removeItem(getProfileCacheKey());
    return null;
  } catch (error) {
    logger.error('Error reading profile cache:', error);
    return null;
  }
};

// Save profile to cache
const saveProfileCache = async (profile: UserProfile): Promise<void> => {
  if (typeof window === 'undefined') return;

  try {
    let userId = getMockCurrentUserId() || 'mock-anonymous';

    if (isSupabaseConfigured && !devMockSession) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;
    }

    const cacheData = {
      profile,
      userId,
      sessionId: getSessionId(),
      timestamp: Date.now()
    };
    sessionStorage.setItem(getProfileCacheKey(), JSON.stringify(cacheData));
  } catch (error) {
    logger.error('Error saving profile cache:', error);
  }
};

// Save collections to cache
const saveCollectionsCache = (collections: Collection[]): void => {
  if (typeof window === 'undefined') return;

  try {
    const cacheData = {
      collections,
      sessionId: getSessionId(),
      timestamp: Date.now()
    };
    sessionStorage.setItem(getCollectionsCacheKey(), JSON.stringify(cacheData));
  } catch (error) {
    logger.error('Error saving collections cache:', error);
  }
};

export const api = {
  async signIn(email: string, password: string): Promise<{ success: boolean; profile?: UserProfile | null; error?: string }> {
    if (!isSupabaseConfigured) {
      const result = signInMockUser(email, password);
      if (result.success && result.profile) {
        await saveProfileCache(normalizeProfile(result.profile));
      }

      return {
        success: result.success,
        profile: result.profile || null,
        error: result.error
      };
    }

    // DEV-only: allow the explicit demo credential to bypass Supabase when needed
    const normalizedEmail = email.trim().toLowerCase();
    const canUseMockBypass = normalizedEmail === 'demo@mundodekaboo.local';

    if (import.meta.env.DEV && isSupabaseConfigured && canUseMockBypass) {
      const mockResult = signInMockUser(email, password);
      if (mockResult.success && mockResult.profile) {
        logger.warn('DEV: using mock demo user bypass for', email);
        setDevMockSession(true);
        clearCollectionsCache();
        await saveProfileCache(normalizeProfile(mockResult.profile));
        return { success: true, profile: mockResult.profile };
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    if (!data.session) {
      return {
        success: false,
        error: 'Nao foi possivel iniciar a sessao.'
      };
    }

    const profile = await this.getProfile(true);
    return {
      success: true,
      profile
    };
  },

  async signOut(): Promise<void> {
    const wasMockSession = devMockSession;
    clearAllUserCache();
    setDevMockSession(false);

    if (!isSupabaseConfigured) {
      signOutMockUser();
      return;
    }

    // Clean up mock session state if we were in a dev mock session
    if (wasMockSession) {
      signOutMockUser();
    }

    await supabase.auth.signOut();
  },

  async getVoucherSamples(): Promise<Voucher[]> {
    if (!isSupabaseConfigured || devMockSession) {
      return getMockVoucherSamples();
    }

    return [];
  },

  async validateVoucher(voucherCode: string): Promise<VoucherValidationResult> {
    if (!voucherCode.trim()) {
      return {
        success: false,
        code: 'invalid_code',
        message: getVoucherErrorMessage('invalid_code')
      };
    }

    if (!isSupabaseConfigured || devMockSession) {
      return validateMockVoucher(voucherCode);
    }

    try {
      const { data, error } = await supabase.rpc('validate_voucher', {
        p_code: normalizeVoucherCode(voucherCode)
      });

      if (error) {
        logger.error('Error validating voucher:', error);
        return {
          success: false,
          code: 'unknown',
          message: getVoucherErrorMessage('unknown', error.message)
        };
      }

      if (!data?.success) {
        const fallbackVoucher = data?.code === 'invalid_code'
          ? getSupabaseDevFallbackVoucher(voucherCode)
          : null;

        if (fallbackVoucher) {
          logger.warn('Using DEV Supabase voucher fallback during validation:', fallbackVoucher.code);
          return {
            success: true,
            voucher: fallbackVoucher,
          };
        }

        return {
          success: false,
          code: data?.code || 'unknown',
          message: getVoucherErrorMessage(data?.code) || data?.message
        };
      }

      return {
        success: true,
        voucher: data.voucher as Voucher | undefined
      };
    } catch (error: any) {
      logger.error('Unexpected voucher validation error:', error);
      return {
        success: false,
        code: 'unknown',
        message: getVoucherErrorMessage('unknown', error?.message)
      };
    }
  },

  async redeemVoucher(voucherCode: string): Promise<VoucherRedemptionResult> {
    if (!voucherCode.trim()) {
      return {
        success: false,
        code: 'invalid_code',
        message: getVoucherErrorMessage('invalid_code')
      };
    }

    if (!isSupabaseConfigured || devMockSession) {
      const result = redeemMockVoucher(voucherCode);
      if (result.success && result.profile) {
        await saveProfileCache(normalizeProfile(result.profile));
      }
      return result;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        code: 'not_authenticated',
        message: getVoucherErrorMessage('not_authenticated')
      };
    }

    try {
      const { data, error } = await supabase.rpc('redeem_voucher', {
        p_code: normalizeVoucherCode(voucherCode)
      });

      if (error) {
        logger.error('Error redeeming voucher:', error);
        return {
          success: false,
          code: 'unknown',
          message: getVoucherErrorMessage('unknown', error.message)
        };
      }

      if (!data?.success) {
        const fallbackVoucher = data?.code === 'invalid_code'
          ? getSupabaseDevFallbackVoucher(voucherCode)
          : null;

        if (fallbackVoucher) {
          logger.warn('Using DEV Supabase voucher fallback during redemption:', fallbackVoucher.code);
          return this.redeemSupabaseDevFallbackVoucher(fallbackVoucher);
        }

        return {
          success: false,
          code: data?.code || 'unknown',
          message: getVoucherErrorMessage(data?.code) || data?.message
        };
      }

      const profile = await this.getProfile(true);
      return {
        success: true,
        profile,
        voucher: data.voucher as Voucher | undefined,
        message: data?.message
      };
    } catch (error: any) {
      logger.error('Unexpected voucher redemption error:', error);
      return {
        success: false,
        code: 'unknown',
        message: getVoucherErrorMessage('unknown', error?.message)
      };
    }
  },

  async redeemSupabaseDevFallbackVoucher(voucher: Voucher): Promise<VoucherRedemptionResult> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        code: 'not_authenticated',
        message: getVoucherErrorMessage('not_authenticated')
      };
    }

    const currentProfile = await this.getProfile(true);
    const now = new Date();
    const nextProfile = await this.updateProfile({
      access_status: 'active',
      access_starts_at: currentProfile?.access_starts_at ?? now.toISOString(),
      access_expires_at: calculateRenewedAccessExpiry(currentProfile, voucher.duration_months, now),
    });

    if (!nextProfile) {
      return {
        success: false,
        code: 'unknown',
        message: getVoucherErrorMessage('unknown')
      };
    }

    return {
      success: true,
      profile: nextProfile,
      voucher,
    };
  },

  async registerWithVoucher(input: RegisterWithVoucherInput): Promise<RegisterWithVoucherResult> {
    const validation = await this.validateVoucher(input.voucherCode);
    if (!validation.success) {
      return {
        success: false,
        error: validation.message || getVoucherErrorMessage(validation.code)
      };
    }

    if (!isSupabaseConfigured) {
      const creation = createMockUser({
        email: input.email,
        password: input.password,
        full_name: input.full_name,
        role: 'viewer',
        signIn: true,
      });

      if (!creation.success || !creation.userId) {
        return {
          success: false,
          error: creation.error || 'Nao foi possivel criar sua conta.'
        };
      }

      const redemption = redeemMockVoucher(input.voucherCode);
      if (!redemption.success || !redemption.profile) {
        return {
          success: false,
          error: redemption.message || getVoucherErrorMessage(redemption.code)
        };
      }

      await saveProfileCache(normalizeProfile(redemption.profile));

      return {
        success: true,
        profile: redemption.profile
      };
    }

    try {
      const _brandParam = _activeBrandSlugForApi !== 'kaboo' ? `&brand=${_activeBrandSlugForApi}` : '';
      const emailRedirectTo = typeof window !== 'undefined'
        ? buildAppUrl(`?confirmation=success${_brandParam}`)
        : undefined;

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          emailRedirectTo,
          data: {
            full_name: input.full_name,
            brand_id: _activeBrandIdForApi,
            // Persiste o código no servidor (raw_user_meta_data → trigger handle_new_user)
            // para o resgate sobreviver a troca de dispositivo/limpeza de localStorage.
            pending_voucher_code: input.voucherCode,
          }
        }
      });

      if (signUpError) {
        logger.error('Error signing up with voucher:', signUpError);
        return { success: false, error: signUpError.message };
      }

      if (!signUpData.user) {
        return { success: false, error: 'Nao foi possivel criar a conta.' };
      }

      // O perfil inicial é criado pelo trigger handle_new_user no banco.
      // Evita erro de RLS quando o sign-up ainda não abriu sessão autenticada.

      if (!signUpData.session) {
        return {
          success: true,
          requiresLogin: true,
          requiresEmailConfirmation: true,
          email: input.email,
          message: 'Conta criada. Confirme seu e-mail para concluir o cadastro e depois faça login para ativar seu codigo de acesso.'
        };
      }

      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: signUpData.session.access_token,
        refresh_token: signUpData.session.refresh_token,
      });

      if (setSessionError) {
        logger.error('Error persisting session after sign up:', setSessionError);
        return {
          success: false,
          error: 'Conta criada, mas nao foi possivel finalizar a ativacao automaticamente. Tente entrar novamente para continuar.'
        };
      }

      let redemption = await this.redeemVoucher(input.voucherCode);
      if (!redemption.success && redemption.code === 'not_authenticated') {
        await new Promise((resolve) => setTimeout(resolve, 150));
        redemption = await this.redeemVoucher(input.voucherCode);
      }

      if (!redemption.success) {
        return {
          success: false,
          error: redemption.message || getVoucherErrorMessage(redemption.code)
        };
      }

      return {
        success: true,
        profile: redemption.profile || undefined
      };
    } catch (error: any) {
      logger.error('Unexpected registerWithVoucher error:', error);
      return {
        success: false,
        error: error?.message || 'Ocorreu um erro ao criar a conta.'
      };
    }
  },

  /**
   * Fetch all collections/books (with cache support)
   * @param forceRefresh - If true, bypass cache and fetch from server
   */
  async getCollections(forceRefresh: boolean = false, adminMode: boolean = false): Promise<Collection[]> {
    // Check cache first (unless force refresh or admin mode).
    // Admin mode MUST bypass the cache because the vitrine cache only stores published
    // collections; reading it in admin mode would make unpublished items appear as published
    // after the user visits the public storefront.
    if (!forceRefresh && !adminMode) {
      const cached = getCachedCollections();
      if (cached) {
        await loadRemoteCharacters();
        // Re-sign covers: a cache entry may predate SEC-58 (raw public URLs) or hold
        // signed URLs approaching expiry. getSignedUrl re-extracts the path from either
        // form, so signing is idempotent and safe on a cache hit.
        return signCollectionsCovers(cached);
      }
    }

    if (!isSupabaseConfigured || devMockSession) {
      const mockRaw = getMockCollectionsLive();
      // Seed/mock data has no brand_id — stamp with active brand so brand filter works
      const brandId = _activeBrandIdForApi;
      const stamped = brandId
        ? mockRaw.map(c => c.brand_id ? c : { ...c, brand_id: brandId })
        : mockRaw;
      const filtered = filterCollectionsForBrand(stamped, _activeBrandSlugForApi, _activeBrandIdForApi, { adminMode });
      // Mirror the Supabase behaviour: vitrine only sees published collections.
      const published = adminMode ? filtered : filtered.filter(c => c.is_published);
      const collections = await signCollectionsCovers(published);
      // Only cache non-admin responses so the vitrine never reads admin-mode data.
      if (!adminMode) saveCollectionsCache(collections);
      return collections;
    }

    const activeBrandId = await resolveActiveBrandId();
    if (!activeBrandId) {
      logger.error(`Unable to scope remote collections for brand "${_activeBrandSlugForApi}".`);
      return [];
    }

    const remoteCharacters = await loadRemoteCharacters(forceRefresh);

    // Fetch from server
    let query = supabase
      .from('collections')
      .select('*')
      .order('created_at', { ascending: false });

    if (!adminMode) {
      query = query.eq('is_published', true);
    }

    query = applyActiveBrandScope(query, activeBrandId);

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching collections:', error);
      return [];
    }

    const collections = await signCollectionsCovers(filterCollectionsForBrand(
      hydrateCollectionsPresentationFields((data || []) as Collection[], remoteCharacters ?? undefined),
      _activeBrandSlugForApi,
      activeBrandId,
    ));

    // Only cache non-admin responses so the vitrine never reads admin-mode data
    // (admin fetches include unpublished collections which must not leak into the vitrine cache).
    if (!adminMode) saveCollectionsCache(collections);

    return collections;
  },

  /**
   * Fetch a single collection by ID
   */
  async getCollectionById(id: string): Promise<Collection | null> {
    if (!isSupabaseConfigured || devMockSession) {
      const mockCollection = getMockCollectionByIdLive(id);
      if (!mockCollection) return null;
      // Stamp missing brand_id — mirrors getCollections mock path so the brand filter works.
      const brandId = _activeBrandIdForApi;
      const stamped = brandId && !mockCollection.brand_id ? { ...mockCollection, brand_id: brandId } : mockCollection;
      const scoped = filterCollectionsForBrand([stamped], _activeBrandSlugForApi, _activeBrandIdForApi)[0] ?? null;
      return scoped ? signCollectionCovers(scoped) : null;
    }

    const activeBrandId = await resolveActiveBrandId();
    if (!activeBrandId) {
      logger.error(`Unable to scope collection lookup for brand "${_activeBrandSlugForApi}".`);
      return null;
    }

    const remoteCharacters = await loadRemoteCharacters();

    let query = supabase
      .from('collections')
      .select('*')
      .eq('id', id);

    query = applyActiveBrandScope(query, activeBrandId);

    const { data, error } = await query.single();

    if (error || !data) return null;

    const scoped = filterCollectionsForBrand(
      [hydrateCollectionPresentationFields(data as Collection, remoteCharacters ?? undefined)],
      _activeBrandSlugForApi,
      activeBrandId,
    )[0] ?? null;

    return scoped ? signCollectionCovers(scoped) : null;
  },

  /**
   * Fetch resources (files) for a specific collection
   */
  async getCollectionResources(collectionId: string): Promise<CollectionResource[]> {
    const collection = await this.getCollectionById(collectionId);
    if (!collection) {
      return [];
    }

    if (!isSupabaseConfigured) {
      return getMockCollectionResources(collectionId);
    }

    const { data, error } = await supabase
      .from('collection_resources')
      .select('*')
      .eq('collection_id', collectionId);

    if (error) return [];
    return data || [];
  },

  async getMediaHub(hub: MediaHub): Promise<MediaHubResponse> {
    const collections = await this.getCollections();
    let collectionBackedResponse = buildCollectionBackedMediaHubResponse(hub, collections);

    // Materiais avulsos (tabela `materials`, módulo admin Materiais) também alimentam o
    // hub Materiais. O hub só lia media_items/extra_material, então materiais publicados
    // ali ficavam "publicados mas não listados". Busca e mescla aqui (escopado por marca).
    if (hub === 'materials' && isSupabaseConfigured && !devMockSession) {
      try {
        const materialsBrandId = await resolveActiveBrandId();
        if (materialsBrandId) {
          const { data: materialRows, error: materialsError } = await supabase
            .from('materials')
            .select('*')
            .eq('brand_id', materialsBrandId)
            .eq('is_published', true)
            .order('published_at', { ascending: false });
          if (materialsError) {
            if (!isMissingRelationError(materialsError, 'materials')) {
              logger.error('Erro ao buscar materiais avulsos para o hub:', materialsError);
            }
          } else if (Array.isArray(materialRows) && materialRows.length > 0) {
            const materialsResponse = buildMaterialsTableHubResponse(materialRows as Material[]);
            collectionBackedResponse = mergeMediaHubResponses(materialsResponse, collectionBackedResponse);
          }
        }
      } catch (materialsErr) {
        logger.warn('Falha ao mesclar materiais avulsos no hub:', materialsErr);
      }
    }

    // Formações da tabela `formations` (módulo admin Formações) alimentam o hub Formações.
    if (hub === 'formations' && isSupabaseConfigured && !devMockSession) {
      try {
        const formationsBrandId = await resolveActiveBrandId();
        if (formationsBrandId) {
          const { data: formationRows, error: formationsError } = await supabase
            .from('formations')
            .select('*')
            .eq('brand_id', formationsBrandId)
            .eq('is_published', true)
            .order('published_at', { ascending: false });
          if (formationsError) {
            if (!isMissingRelationError(formationsError, 'formations')) {
              logger.error('Erro ao buscar formações para o hub:', formationsError);
            }
          } else if (Array.isArray(formationRows) && formationRows.length > 0) {
            let formationProgressMap: Record<string, number> = {};
            try {
              const userId = await getCurrentUserId();
              if (userId) {
                const { data: progressRows } = await supabase
                  .from('user_formation_progress')
                  .select('formation_id, progress_percent')
                  .eq('user_id', userId)
                  .in('formation_id', formationRows.map((f: any) => f.id));
                if (progressRows) {
                  for (const row of progressRows as Array<{ formation_id: string; progress_percent: number }>) {
                    formationProgressMap[row.formation_id] = row.progress_percent;
                  }
                }
              }
            } catch (_) {}
            const formationsResponse = buildFormationsTableHubResponse(formationRows as import('../types').Formation[], formationProgressMap);
            collectionBackedResponse = mergeMediaHubResponses(formationsResponse, collectionBackedResponse);
          }
        }
      } catch (formationsErr) {
        logger.warn('Falha ao mesclar formações no hub:', formationsErr);
      }
    }

    const staticFallbackResponse = buildEmptyMediaHubResponse(hub);
    const preferredFallbackResponse = getMediaHubResponseCount(collectionBackedResponse) > 0
      ? collectionBackedResponse
      : staticFallbackResponse;

    if (!isSupabaseConfigured || devMockSession || mediaTablesAvailable === false) {
      return preferredFallbackResponse;
    }

    if (!shouldUseSharedMediaCatalog(_activeBrandSlugForApi)) {
      return preferredFallbackResponse;
    }

    const { data: items, error: itemsError } = await supabase
      .from('media_items')
      .select('*')
      .eq('hub', hub)
      .eq('status', 'published')
      .order('featured_order', { ascending: true })
      .order('published_at', { ascending: false });

    if (itemsError) {
      if (isMissingRelationError(itemsError, 'media_items')) {
        mediaTablesAvailable = false;
        return preferredFallbackResponse;
      }

      logger.error('Error fetching media hub items:', itemsError);
      return preferredFallbackResponse;
    }

    mediaTablesAvailable = true;

    const { data: shelves, error: shelvesError } = await supabase
      .from('media_shelves')
      .select('*')
      .eq('hub', hub)
      .eq('is_published', true)
      .order('order_index', { ascending: true });

    if (shelvesError && !isMissingRelationError(shelvesError, 'media_shelves')) {
      logger.error('Error fetching media shelves:', shelvesError);
    }

    const shelfIds = (shelves || []).map((shelf: any) => shelf.id);
    const { data: shelfItems } = shelfIds.length > 0
      ? await supabase
        .from('media_shelf_items')
        .select('*')
        .in('shelf_id', shelfIds)
        .order('order_index', { ascending: true })
      : { data: [] as any[] };

    const currentUserId = await getCurrentUserId();
    const { progressByItemId, favoriteIds, continueItemIds } = currentUserId
      ? await getRemoteMediaUserState(currentUserId)
      : { progressByItemId: {}, favoriteIds: new Set<string>(), continueItemIds: [] as string[] };

    const itemRows = ((items || []) as MediaItemRow[]);
    const itemsById = new Map(itemRows.map((item) => [item.id, item]));
    const hero = itemRows[0] ? await toMediaItemCard(itemRows[0], { progressByItemId, favoriteIds }) : null;

    const mappedShelves: MediaShelf[] = (await Promise.all((shelves || []).map(async (shelf: any) => {
      const itemsForShelf = await Promise.all((shelfItems || [])
        .filter((entry: any) => entry.shelf_id === shelf.id)
        .map((entry: any) => itemsById.get(entry.media_item_id))
        .filter(Boolean)
        .map((item) => toMediaItemCard(item as MediaItemRow, { progressByItemId, favoriteIds })));

      return {
        id: shelf.id,
        hub,
        type: shelf.shelf_type,
        title: shelf.title,
        description: shelf.description,
        items: itemsForShelf,
      };
    }))).filter((shelf) => shelf.items.length > 0);

    const continueItems = await Promise.all(continueItemIds
      .map((itemId) => itemsById.get(itemId))
      .filter(Boolean)
      .map((item) => toMediaItemCard(item as MediaItemRow, { progressByItemId, favoriteIds })));

    const continueShelf = continueItems.length > 0
      ? {
        id: `${hub}-continue-watching`,
        hub,
        type: 'continue_watching' as const,
        title: hub === 'music' ? 'Continue ouvindo' : 'Continue assistindo',
        description: 'Retome de onde parou.',
        items: continueItems,
      }
      : null;

    const orderedShelves: MediaShelf[] = continueShelf
      ? [continueShelf, ...mappedShelves.filter((shelf) => shelf.type !== 'continue_watching')]
      : mappedShelves;

    const fallbackShelf: MediaShelf[] = orderedShelves.length > 0
      ? orderedShelves
      : [{
        id: `${hub}-all-items`,
        hub,
        type: 'rail',
        title: '',
        description: '',
        items: await Promise.all(itemRows.map((item) => toMediaItemCard(item, { progressByItemId, favoriteIds }))),
      }];

    const remoteResponse: MediaHubResponse = {
      hub,
      hero,
      shelves: fallbackShelf,
      counts: {
        total: itemRows.length,
        favorites: favoriteIds.size,
        continueWatching: Object.values(progressByItemId).filter((entry) => entry.progressPercent > 0 && entry.progressPercent < 100).length,
      },
    };

    // When Supabase media_items has data, it is the authoritative catalog.
    // Do NOT merge with collection-backed items — they would duplicate content
    // because their dedup keys differ structurally (collection prefix vs. none).
    // Collection-backed path is a fallback only for when media_items is empty.
    if (getMediaHubResponseCount(remoteResponse) > 0) {
      return remoteResponse;
    }
    return getMediaHubResponseCount(collectionBackedResponse) > 0 ? collectionBackedResponse : staticFallbackResponse;
  },

  async getMediaItem(mediaItemId: string): Promise<MediaItemDetail | null> {
    const isCollectionBackedItem = Boolean(parseCollectionAssetMediaItemId(mediaItemId));
    let collections: Collection[] = [];

    if (!shouldUseSharedMediaCatalog(_activeBrandSlugForApi) && !isCollectionBackedItem) {
      return null;
    }

    if (isCollectionBackedItem || !isSupabaseConfigured || devMockSession || mediaTablesAvailable === false) {
      collections = await this.getCollections();
      const mockMatch = findMockMediaItem(mediaItemId, collections);
      if (!mockMatch) {
        if (!isCollectionBackedItem && (isSupabaseConfigured && !devMockSession && mediaTablesAvailable !== false)) {
          collections = [];
        } else {
          return null;
        }
      }

      if (mockMatch) {
        const relatedCollections: MediaRelatedCollection[] = mockMatch.item.collectionId
          ? [{
            collectionId: mockMatch.item.collectionId,
            title: mockMatch.item.relatedCollection ?? mockMatch.item.title,
            linkType: 'contextual',
          }]
          : [];

        return {
          ...buildMockMediaItemCard(mockMatch.hub, mockMatch.item),
          accessMode: 'active_subscription',
          metadata: {},
          relatedCollections,
        };
      }
    }

    // IDs de mock não são UUIDs válidos (ex: "formation-dialogue").
    // Enviá-los ao banco causa erro 400 (invalid input syntax for type uuid).
    // Se não é um UUID, resolve via mock catalog sem consultar o banco.
    const isDbId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mediaItemId);
    if (!isDbId) {
      const fallbackCollections = collections.length > 0 ? collections : await this.getCollections();
      const fallbackMatch = findMockMediaItem(mediaItemId, fallbackCollections);
      if (!fallbackMatch) return null;
      const mockRelatedCollections: MediaRelatedCollection[] = fallbackMatch.item.collectionId
        ? [{ collectionId: fallbackMatch.item.collectionId, title: fallbackMatch.item.relatedCollection ?? fallbackMatch.item.title, linkType: 'contextual' as const }]
        : [];
      return {
        ...buildMockMediaItemCard(fallbackMatch.hub, fallbackMatch.item),
        accessMode: 'active_subscription',
        metadata: {},
        relatedCollections: mockRelatedCollections,
      };
    }

    const { data, error } = await supabase
      .from('media_items')
      .select('*')
      .eq('id', mediaItemId)
      .single();

    if (error || !data) {
      if (error && isMissingRelationError(error, 'media_items')) {
        mediaTablesAvailable = false;
      }

      const fallbackCollections = collections.length > 0 ? collections : await this.getCollections();
      const fallbackMatch = findMockMediaItem(mediaItemId, fallbackCollections);
      if (!fallbackMatch) {
        return null;
      }

      const relatedCollections: MediaRelatedCollection[] = fallbackMatch.item.collectionId
        ? [{
          collectionId: fallbackMatch.item.collectionId,
          title: fallbackMatch.item.relatedCollection ?? fallbackMatch.item.title,
          linkType: 'contextual',
        }]
        : [];

      return {
        ...buildMockMediaItemCard(fallbackMatch.hub, fallbackMatch.item),
        accessMode: 'active_subscription',
        metadata: {},
        relatedCollections,
      };
    }

    const { data: links } = await supabase
      .from('media_collection_links')
      .select('collection_id, link_type, collections(id, title)')
      .eq('media_item_id', mediaItemId);

    const relatedCollections: MediaRelatedCollection[] = ((links || []) as any[]).map((link) => ({
      collectionId: link.collection_id,
      title: link.collections?.title ?? 'Coleção relacionada',
      linkType: link.link_type,
    }));

    const currentUserId = await getCurrentUserId();
    const { progressByItemId, favoriteIds } = currentUserId
      ? await getRemoteMediaUserState(currentUserId)
      : { progressByItemId: {}, favoriteIds: new Set<string>() };

    return {
      ...(await toMediaItemCard(data as MediaItemRow, { progressByItemId, favoriteIds, relatedCollections })),
      accessMode: (data as MediaItemRow).access_mode,
      metadata: ((data as MediaItemRow).metadata ?? {}) as Record<string, unknown>,
      relatedCollections,
    };
  },

  async resolveMediaPlayback(mediaItemId: string): Promise<MediaPlaybackSession | null> {
    const item = await this.getMediaItem(mediaItemId);
    if (!item) {
      return null;
    }

    const isDbPlaybackId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mediaItemId);

    if (parseCollectionAssetMediaItemId(mediaItemId) || !isDbPlaybackId || !isSupabaseConfigured || devMockSession || mediaTablesAvailable === false) {
      const collections = await this.getCollections();
      const mockMatch = findMockMediaItem(mediaItemId, collections);
      if (!mockMatch) {
        return null;
      }

      const source: MediaPlaybackSource = {
        url: mockMatch.item.assetUrl ?? null,
        provider: buildMockMediaItemCard(mockMatch.hub, mockMatch.item).provider,
        mimeType: null,
      };

      return {
        item,
        source,
        canPlay: Boolean(source.url),
      };
    }

    const { data, error } = await supabase
      .from('media_items')
      .select('*')
      .eq('id', mediaItemId)
      .single();

    if (error || !data) {
      return null;
    }

    const row = data as MediaItemRow;
    const source: MediaPlaybackSource = {
      url: await getMediaItemResolvedUrl(row),
      provider: row.provider,
      mimeType: row.mime_type ?? null,
      externalRef: row.external_ref ?? null,
      storageBucket: row.storage_bucket ?? null,
      storagePath: row.storage_path ?? null,
    };

    return {
      item,
      source,
      canPlay: Boolean(source.url || (source.storageBucket && source.storagePath)),
    };
  },

  async saveMediaProgress(input: SaveMediaProgressInput): Promise<{ ok: boolean; error?: string }> {
    if (!isSupabaseConfigured || devMockSession || mediaProgressTableAvailable === false) {
      return { ok: true };
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return { ok: false, error: 'Usuário não autenticado.' };
    }

    const { error } = await supabase
      .from('user_media_progress')
      .upsert({
        user_id: userId,
        media_item_id: input.mediaItemId,
        last_position_seconds: input.lastPositionSeconds,
        progress_percent: input.progressPercent,
        completed_at: input.completed ? new Date().toISOString() : null,
        last_played_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,media_item_id',
      });

    if (error) {
      // Any error (missing table, missing column, RLS, etc.) → disable for this session
      mediaProgressTableAvailable = false;
      logger.warn('user_media_progress unavailable; disabling remote progress persistence for this session.', error);
      return { ok: true };
    }

    mediaProgressTableAvailable = true;
    return { ok: true };
  },

  async toggleMediaFavorite(mediaItemId: string, shouldFavorite?: boolean): Promise<ToggleMediaFavoriteResult | null> {
    if (!isSupabaseConfigured || devMockSession) {
      return {
        mediaItemId,
        isFavorite: shouldFavorite ?? true,
      };
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return null;
    }

    let nextFavoriteState = shouldFavorite;

    if (typeof nextFavoriteState !== 'boolean') {
      const { data } = await supabase
        .from('user_media_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('media_item_id', mediaItemId)
        .maybeSingle();

      nextFavoriteState = !data;
    }

    if (nextFavoriteState) {
      const { error } = await supabase
        .from('user_media_favorites')
        .upsert({
          user_id: userId,
          media_item_id: mediaItemId,
        }, {
          onConflict: 'user_id,media_item_id',
        });

      if (error) {
        logger.error('Error favoriting media item:', error);
        return null;
      }
    } else {
      const { error } = await supabase
        .from('user_media_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('media_item_id', mediaItemId);

      if (error) {
        logger.error('Error unfavoriting media item:', error);
        return null;
      }
    }

    return {
      mediaItemId,
      isFavorite: nextFavoriteState,
    };
  },

  async getCentralMaterials(): Promise<CentralMaterial[]> {
    return filterCentralMaterialsForBrand(getMockCentralMaterials(), _activeBrandSlugForApi);
  },

  async getCharacters(): Promise<Character[]> {
    if (!isSupabaseConfigured || devMockSession) {
      const mockRaw = getMockCharactersLive();
      const brandId = _activeBrandIdForApi;
      const stamped = brandId
        ? mockRaw.map(c => c.brand_id ? c : { ...c, brand_id: brandId })
        : mockRaw;
      return filterCharactersForBrand(stamped, _activeBrandSlugForApi, _activeBrandIdForApi);
    }

    const remoteCharacters = await loadRemoteCharacters();
    return filterCharactersForBrand(
      remoteCharacters ?? getMockCharactersLive(),
      _activeBrandSlugForApi,
      _activeBrandIdForApi,
    );
  },

  async createCharacter(character: Partial<Character> & { name: string }): Promise<Character | null> {
    if (!isSupabaseConfigured || devMockSession) {
      try {
        return mockCreateCharacter(character);
      } catch (error) {
        logger.error('Error creating character:', error);
        return null;
      }
    }

    try {
      const activeBrandId = await resolveActiveBrandId();
      if (!activeBrandId) {
        logger.error(`Unable to scope character creation for brand "${_activeBrandSlugForApi}".`);
        return null;
      }

      const payload = {
        ...normalizeCharacter(character),
        brand_id: activeBrandId,
      };
      const { data, error } = await supabase
        .from('characters')
        .insert(payload)
        .select()
        .single();

      if (error) {
        if (isMissingRelationError(error, 'characters')) {
          charactersTableAvailable = false;
          return mockCreateCharacter(character);
        }

        logger.error('Error creating character:', error);
        return null;
      }

      const nextCharacter = normalizeCharacter(data as Character);
      await loadRemoteCharacters(true);
      clearCollectionsCache();
      return nextCharacter;
    } catch (error) {
      logger.error('Error creating character:', error);
      return null;
    }
  },

  async updateCharacter(id: string, updates: Partial<Character>): Promise<Character | null> {
    if (!isSupabaseConfigured || devMockSession) {
      try {
        return mockUpdateCharacter(id, updates);
      } catch (error) {
        logger.error('Error updating character:', error);
        return null;
      }
    }

    try {
      const currentCharacters = await this.getCharacters();
      const currentCharacter = currentCharacters.find((character) => character.id === id);

      if (!currentCharacter) {
        return null;
      }

      const requestedName = updates.name?.trim() || currentCharacter.name;
      const hasRenamedCharacter =
        normalizeCharacterLookupKey(requestedName) !== normalizeCharacterLookupKey(currentCharacter.name);
      const aliases = hasRenamedCharacter
        ? [...(currentCharacter.aliases || []), ...(updates.aliases || []), currentCharacter.name]
        : updates.aliases ?? currentCharacter.aliases;

      const payload = normalizeCharacter({
        ...currentCharacter,
        ...updates,
        id,
        name: requestedName,
        aliases,
      });

      const activeBrandId = await resolveActiveBrandId();
      if (!activeBrandId) {
        logger.error(`Unable to scope character update for brand "${_activeBrandSlugForApi}".`);
        return null;
      }

      let query = supabase
        .from('characters')
        .update({
          name: payload.name,
          description: payload.description,
          traits: payload.traits,
          aliases: payload.aliases || [],
          image_url: payload.image_url,
          status: payload.status,
          brand_id: activeBrandId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      query = applyActiveBrandScope(query, activeBrandId);

      const { data, error } = await query.select().single();

      if (error) {
        if (isMissingRelationError(error, 'characters')) {
          charactersTableAvailable = false;
          return mockUpdateCharacter(id, updates);
        }

        logger.error('Error updating character:', error);
        return null;
      }

      const nextCharacter = normalizeCharacter(data as Character);
      await loadRemoteCharacters(true);
      clearCollectionsCache();
      return nextCharacter;
    } catch (error) {
      logger.error('Error updating character:', error);
      return null;
    }
  },

  /**
   * Fetch user progress (Merged logic would go here in a real app)
   * For now, returns a simple dictionary of { collection_id: percent }
   */
  async getUserProgress(): Promise<Record<string, number>> {
    if (!isSupabaseConfigured) {
      return getMockUserProgress();
    }

    if (userProgressTableAvailable === false) {
      return {};
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    const { data, error } = await supabase
      .from('user_progress')
      .select('collection_id, progress_percent')
      .eq('user_id', user.id);

    // The current branch can run against remotes that do not have this table yet.
    if (error) {
      if (isMissingUserProgressError(error)) {
        userProgressTableAvailable = false;
        logger.warn('user_progress table unavailable; skipping progress fetches for this session.', error);
      }
      return {};
    }

    userProgressTableAvailable = true;

    const progressMap: Record<string, number> = {};
    data?.forEach((p: any) => {
      progressMap[p.collection_id] = p.progress_percent;
    });
    return progressMap;
  },

  /**
   * Create a new collection (Admin/Editor only)
   */
  async createCollection(collection: Partial<Collection>): Promise<Collection | null> {
    if (!isSupabaseConfigured || devMockSession) {
      const created = mockCreateCollection(collection);
      if (created) {
        clearCollectionsCache();
      }
      return created;
    }
    const activeBrandId = await resolveActiveBrandId();
    if (!activeBrandId) {
      const brandErrMsg = `brand_not_resolved: Unable to scope collection creation for brand "${_activeBrandSlugForApi}".`;
      logger.error(brandErrMsg);
      throw new Error(brandErrMsg);
    }

    let currentPayload: Partial<Collection> & { brand_id: string } = {
      ...sanitizeCollectionPayload(collection, (await loadRemoteCharacters()) ?? undefined),
      brand_id: activeBrandId,
    };
    // Preserve values that may be stripped by the retry loop so we can recover them.
    const originalCharacterIds = [...(currentPayload.character_ids ?? [])];
    let data: Collection | null = null;
    let error: unknown = null;
    const stripped: string[] = [];

    // Retry loop: strip missing columns one at a time (max 5 iterations)
    for (let attempt = 0; attempt < 5; attempt++) {
      ({ data, error } = await supabase
        .from('collections')
        .insert(currentPayload)
        .select()
        .single());

      if (!error) break;

      const missingCol = extractMissingColumnName(error);
      if (!missingCol || !STRIPPABLE_COLLECTION_COLUMNS.has(missingCol) || stripped.includes(missingCol)) {
        break; // not a strippable column error, or already stripped
      }
      stripped.push(missingCol);
      currentPayload = stripMissingCollectionColumns(currentPayload, stripped) as typeof currentPayload;
      logger.warn(`Retrying collection insert without column: ${missingCol}`);
    }

    if (error) {
      logger.error('Error creating collection:', error);
      return null;
    }

    // If character_ids was stripped by the retry loop (schema cache miss), follow up
    // with a targeted update so the characters are never silently lost.
    if (data && stripped.includes('character_ids') && originalCharacterIds.length > 0) {
      logger.warn('character_ids was stripped from insert; recovering via follow-up update', { id: data.id, character_ids: originalCharacterIds });
      const { data: recovered, error: recoverError } = await supabase
        .from('collections')
        .update({ character_ids: originalCharacterIds })
        .eq('id', data.id)
        .select()
        .single();
      if (!recoverError && recovered) {
        data = recovered as Collection;
      } else if (recoverError) {
        logger.warn('character_ids recovery update failed (column may be absent in this env):', recoverError);
      }
    }

    // Clear cache after creation
    clearCollectionsCache();

    // Sign covers on the returned row: it's a raw DB row (public URLs) and the
    // caller may render it before the next getCollections re-fetch.
    return data ? signCollectionCovers(data as Collection) : data;
  },

  /**
   * Update an existing collection (Admin/Editor only)
   */
  async updateCollection(id: string, updates: Partial<Collection>): Promise<Collection | null> {
    if (!isSupabaseConfigured || devMockSession) {
      const updated = mockUpdateCollection(id, updates);
      if (updated) {
        clearCollectionsCache();
      }
      return updated;
    }
    const activeBrandId = await resolveActiveBrandId();
    if (!activeBrandId) {
      logger.error(`Unable to scope collection update for brand "${_activeBrandSlugForApi}".`);
      return null;
    }

    const payload = {
      ...sanitizeCollectionPayload(updates, (await loadRemoteCharacters()) ?? undefined),
      brand_id: activeBrandId,
    };
    // Preserve character_ids before the retry loop may strip them.
    const originalCharacterIds = [...(payload.character_ids ?? [])];
    // First, verify the collection exists and we can access it
    const existing = await this.getCollectionById(id);
    if (!existing) {
      logger.error('Collection not found or no access:', id);
      return null;
    }

    // Merge is_published from DB so wholesale saves never clobber values set
    // by the set_collection_asset_published RPC (the sole owner of this flag).
    if (payload.collection_assets && existing.collection_assets?.length) {
      const dbById = new Map<string, CollectionAsset>(existing.collection_assets.map(a => [a.id, a]));
      const dbByUrl = new Map<string, CollectionAsset>(existing.collection_assets.map(a => [a.url, a]));
      payload.collection_assets = payload.collection_assets.map(a => {
        const dbAsset: CollectionAsset | undefined = dbById.get(a.id) ?? dbByUrl.get(a.url);
        return dbAsset !== undefined ? { ...a, is_published: dbAsset.is_published } : a;
      });
    }

    // Perform the update with retry for missing columns
    let currentPayload = { ...payload };
    let data: Collection | null = null;
    let error: { code?: string; message?: string } | null = null;
    const stripped: string[] = [];

    for (let attempt = 0; attempt < 5; attempt++) {
      let query = supabase
        .from('collections')
        .update(currentPayload)
        .eq('id', id);
      query = applyActiveBrandScope(query, activeBrandId);
      ({ data, error } = await query.select().single());

      if (!error) break;

      const missingCol = extractMissingColumnName(error);
      if (!missingCol || !STRIPPABLE_COLLECTION_COLUMNS.has(missingCol) || stripped.includes(missingCol)) {
        break;
      }
      stripped.push(missingCol);
      currentPayload = stripMissingCollectionColumns(payload, stripped) as typeof currentPayload;
      logger.warn(`Retrying collection update without column: ${missingCol}`);
    }

    // If character_ids was stripped by the retry loop (schema cache miss), follow up
    // with a targeted update so the new character selection is never silently lost.
    if (!error && data && stripped.includes('character_ids') && originalCharacterIds.length > 0) {
      logger.warn('character_ids was stripped from update; recovering via follow-up update', { id, character_ids: originalCharacterIds });
      const { data: recovered, error: recoverError } = await supabase
        .from('collections')
        .update({ character_ids: originalCharacterIds })
        .eq('id', id)
        .select()
        .single();
      if (!recoverError && recovered) {
        data = recovered as Collection;
      } else if (recoverError) {
        logger.warn('character_ids recovery update failed (column may be absent in this env):', recoverError);
      }
    }

    if (error) {
      logger.error('Error updating collection:', error);
      logger.error('Update details:', { id, payload, error });

      // Check for RLS policy error
      if (error.code === 'PGRST116' || error.message?.includes('0 rows')) {
        logger.error('RLS Policy Issue: Update matched 0 rows. Check RLS policies for UPDATE on collections table.');
        return null;
      }

      return null;
    }

    if (!data) {
      logger.error('Update succeeded but no data returned. RLS might be blocking SELECT after UPDATE.');
      // Try to fetch the updated collection
      const fetched = await this.getCollectionById(id);
      // Clear cache after update
      clearCollectionsCache();
      return fetched;
    }

    // Renome de livro → propaga o novo título para os kits que o embutem.
    await propagateBookTitleToKits(id, existing, data as Collection, activeBrandId);

    // Clear cache after update
    clearCollectionsCache();

    // Sign covers on the returned row: it's a raw DB row (public URLs) and the
    // caller may render it before the next getCollections re-fetch.
    return data ? signCollectionCovers(data as Collection) : data;
  },

  /**
   * Publish a collection (sets is_published = true and records published_at)
   */
  async publishCollection(id: string): Promise<boolean> {
    if (!isSupabaseConfigured || devMockSession) {
      const updated = mockUpdateCollection(id, { is_published: true, published_at: new Date().toISOString() });
      if (updated) clearCollectionsCache();
      return !!updated;
    }
    try {
      const { data, error } = await supabase
        .from('collections')
        .update({ is_published: true, published_at: new Date().toISOString() })
        .eq('id', id)
        .select('id');
      if (error) { logger.error('publishCollection error', error); return false; }
      // PostgREST returns no error when RLS blocks the write — it just affects 0 rows.
      // Treat 0 rows as a failure so the UI surfaces an honest error instead of a fake success.
      if (!data || data.length === 0) {
        logger.error('publishCollection: 0 rows updated (RLS denied or id not found)', id);
        return false;
      }
      clearCollectionsCache();
      return true;
    } catch (err) {
      logger.error('publishCollection exception', err);
      return false;
    }
  },

  /**
   * Unpublish a collection (sets is_published = false and clears published_at)
   */
  async unpublishCollection(id: string): Promise<boolean> {
    if (!isSupabaseConfigured || devMockSession) {
      const updated = mockUpdateCollection(id, { is_published: false, published_at: null });
      if (updated) clearCollectionsCache();
      return !!updated;
    }
    try {
      const { data, error } = await supabase
        .from('collections')
        .update({ is_published: false, published_at: null })
        .eq('id', id)
        .select('id');
      if (error) { logger.error('unpublishCollection error', error); return false; }
      // PostgREST returns no error when RLS blocks the write — it just affects 0 rows.
      // Treat 0 rows as a failure so the UI surfaces an honest error instead of a fake success.
      if (!data || data.length === 0) {
        logger.error('unpublishCollection: 0 rows updated (RLS denied or id not found)', id);
        return false;
      }
      clearCollectionsCache();
      return true;
    } catch (err) {
      logger.error('unpublishCollection exception', err);
      return false;
    }
  },

  /**
   * Publish a single asset within a collection (sets asset.is_published = true).
   * This does NOT affect other assets or the collection-level is_published flag.
   */
  async publishAsset(collectionId: string, assetId: string): Promise<boolean> {
    if (!isSupabaseConfigured || devMockSession) {
      const ok = mockUpdateCollectionAsset(collectionId, assetId, true);
      if (ok) clearCollectionsCache();
      return ok;
    }
    try {
      const { data, error } = await supabase.rpc('set_collection_asset_published', {
        p_collection_id: collectionId,
        p_asset_id: assetId,
        p_is_published: true,
      });
      if (error) { logger.error('publishAsset error', error); return false; }
      if (!data) { logger.error('publishAsset: RLS denied or asset not found', collectionId, assetId); return false; }
      clearCollectionsCache();
      return true;
    } catch (err) {
      logger.error('publishAsset exception', err);
      return false;
    }
  },

  /**
   * Unpublish a single asset within a collection (sets asset.is_published = false).
   * The parent collection and other assets are NOT affected — the collection kit may
   * remain visible in the Coleções screen; only this asset is hidden from its hub.
   */
  async unpublishAsset(collectionId: string, assetId: string): Promise<boolean> {
    if (!isSupabaseConfigured || devMockSession) {
      const ok = mockUpdateCollectionAsset(collectionId, assetId, false);
      if (ok) clearCollectionsCache();
      return ok;
    }
    try {
      const { data, error } = await supabase.rpc('set_collection_asset_published', {
        p_collection_id: collectionId,
        p_asset_id: assetId,
        p_is_published: false,
      });
      if (error) { logger.error('unpublishAsset error', error); return false; }
      if (!data) { logger.error('unpublishAsset: RLS denied or asset not found', collectionId, assetId); return false; }
      clearCollectionsCache();
      return true;
    } catch (err) {
      logger.error('unpublishAsset exception', err);
      return false;
    }
  },

  /**
   * Delete a collection (Admin only) — cascata: resources + storage + collection
   */
  async deleteCollection(id: string): Promise<boolean> {
    if (!isSupabaseConfigured || devMockSession) {
      const deleted = mockDeleteCollection(id);
      if (deleted) {
        clearCollectionsCache();
      }
      return deleted;
    }

    const activeBrandId = await resolveActiveBrandId();
    if (!activeBrandId) {
      logger.error(`Unable to scope collection deletion for brand "${_activeBrandSlugForApi}".`);
      return false;
    }

    const existing = await this.getCollectionById(id);
    if (!existing) {
      logger.error('Collection not found or no access:', id);
      return false;
    }

    // 1. Buscar todos os recursos associados antes de deletar
    const { data: resources, error: resourcesError } = await supabase
      .from('collection_resources')
      .select('id, url')
      .eq('collection_id', id);

    if (resourcesError) {
      logger.error('Error fetching collection resources before delete:', resourcesError);
      return false;
    }

    // 2. Deletar arquivos do Storage (best-effort: continua mesmo se algum falhar)
    if (resources && resources.length > 0) {
      const deleteResults = await Promise.allSettled(
        resources
          .filter(r => r.url)
          .map(r => deleteFile(r.url))
      );

      const failures = deleteResults.filter(r => r.status === 'rejected').length;
      if (failures > 0) {
        logger.warn(`deleteCollection: ${failures}/${resources.length} storage files failed to delete`);
      }

      // 3. Deletar registros de collection_resources
      const { error: resourcesDeleteError } = await supabase
        .from('collection_resources')
        .delete()
        .eq('collection_id', id);

      if (resourcesDeleteError) {
        logger.error('Error deleting collection resources:', resourcesDeleteError);
        return false;
      }
    }

    // 4. Deletar a coleção
    let query = supabase
      .from('collections')
      .delete()
      .eq('id', id);

    query = applyActiveBrandScope(query, activeBrandId);

    const { error } = await query;

    if (error) {
      logger.error('Error deleting collection:', error);
      return false;
    }

    // Clear cache after deletion
    clearCollectionsCache();

    return true;
  },

  /**
   * Fetch user profile (with cache support)
   * @param forceRefresh - If true, bypass cache and fetch from server
   */
  async getProfile(forceRefresh: boolean = false): Promise<UserProfile | null> {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = await getCachedProfile();
      if (cached) {
        return cached;
      }
    }

    if (!isSupabaseConfigured) {
      const currentUserId = getMockCurrentUserId();
      if (!currentUserId) {
        clearProfileCache();
        return null;
      }

      const mockProfile = getMockProfile();
      if (!mockProfile) {
        clearProfileCache();
        return null;
      }

      const profile = normalizeProfile(mockProfile);

      await saveProfileCache(profile);
      return profile;
    }

    // Fetch from server
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching profile:', error);
      return null;
    }

    let profile: UserProfile | null = null;

    if (data) {
      profile = normalizeProfile(data);
    } else {
      // Profile doesn't exist, create it from auth metadata
      profile = normalizeProfile({
        id: user.id,
        full_name: user.user_metadata?.full_name || 'Professor(a)',
        email: user.email || null,
        avatar_id: null,
        access_status: 'pending_voucher',
        voucher_id: null,
        access_starts_at: null,
        access_expires_at: null
      });
    }

    // Save to cache
    if (profile) {
      await saveProfileCache(profile);
    }

    return profile;
  },

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile | null> {
    if (!isSupabaseConfigured) {
      const saved = saveMockProfile(updates);
      if (!saved) {
        return null;
      }

      const profile = normalizeProfile(saved);
      await saveProfileCache(profile);
      return profile;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        ...updates,
        school_name: null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error('Error updating profile:', error);
      return null;
    }

    // Update cache
    if (data) {
      await saveProfileCache(normalizeProfile(data));
    }

    return data ? normalizeProfile(data) : null;
  },

  /**
   * Get all users/profiles (Admin only)
   */
  async getAllUsers(): Promise<UserProfile[]> {
    if (!isSupabaseConfigured) {
      return getMockAllUsers();
    }

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('admin-list-users');

      if (fnError) {
        logger.error('Error invoking admin-list-users function:', fnError);
        throw fnError;
      }

      if (!fnData?.success || !Array.isArray(fnData.users)) {
        const errMsg = fnData?.error ?? 'Erro ao listar usuários do administrador';
        logger.error('admin-list-users function returned error:', errMsg);
        throw new Error(errMsg);
      }

      return fnData.users.map((user: UserProfile) => normalizeProfile(user));
    } catch (error) {
      logger.error('Unexpected error fetching admin-list-users:', error);
      throw error;
    }
  },

  /**
   * Create a new user (Admin only)
   */
  async createUser(userData: {
    email: string;
    full_name: string;
    role?: 'admin' | 'editor' | 'viewer';
    password?: string;
  }): Promise<{ success: boolean; error?: string; userId?: string }> {
    const assignedRole = userData.role || 'viewer';
    const isOperationalRole = assignedRole === 'admin' || assignedRole === 'editor';

    if (!isSupabaseConfigured) {
      // Em modo mock, gera senha aleatória internamente — o colaborador nunca a vê
      const mockPassword = userData.password ?? crypto.randomUUID();
      const result = createMockUser({
        email: userData.email,
        password: mockPassword,
        full_name: userData.full_name,
        role: assignedRole,
        signIn: false,
        created_by: getMockCurrentUserId(),
      });

      return {
        success: result.success,
        error: result.error,
        userId: result.userId,
      };
    }

    try {
      // Usa a Edge Function invite-user que roda com service_role no servidor.
      // Isso garante segurança (service_role nunca exposta ao browser) e usa
      // admin.inviteUserByEmail() que cria o usuário e envia um único e-mail de convite.
      const _brandParam2 = _activeBrandSlugForApi !== 'kaboo' ? `?brand=${_activeBrandSlugForApi}` : '';
      const redirectTo = buildAppUrl(_brandParam2);

      const { data: fnData, error: fnError } = await supabase.functions.invoke('invite-user', {
        body: {
          email: userData.email,
          full_name: userData.full_name,
          role: assignedRole,
          redirect_to: redirectTo,
          ...(userData.password ? { password: userData.password } : {}),
        },
      });

      if (fnError) {
        logger.error('Error invoking invite-user function:', fnError);
        return { success: false, error: fnError.message };
      }

      if (!fnData?.success) {
        const errMsg = fnData?.error ?? 'Erro ao convidar usuário';
        logger.error('invite-user function returned error:', errMsg);
        return { success: false, error: errMsg };
      }

      return { success: true, userId: fnData.userId };
    } catch (error: any) {
      logger.error('Error creating user:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  },

  /**
   * Get active content grants for the current user.
   * Returns collection IDs the user has been granted access to via content-based vouchers.
   */
  async getUserContentGrants(): Promise<import('../types').UserContentGrant[]> {
    if (!isSupabaseConfigured) {
      const userId = getMockCurrentUserId();
      if (!userId) return [];
      return getActiveGrantsForUser(userId);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_content_grants')
      .select('*')
      .eq('user_id', user.id)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    if (error) {
      logger.error('Error fetching user content grants:', error);
      return [];
    }

    return this.expandKitGrants(data || []);
  },

  /**
   * A voucher that grants a KIT must also unlock the kit's linked books/medias,
   * which live as separate collections referenced by `collections.kit_book_ids`.
   * The grant rows only store the kit's collection_id, so we expand them here:
   * for each granted kit, add (synthetic) grants for its linked collections that
   * aren't already granted. Keeps canAccessCollection working unchanged everywhere.
   */
  async expandKitGrants(
    grants: import('../types').UserContentGrant[]
  ): Promise<import('../types').UserContentGrant[]> {
    if (!grants.length) return grants;

    const grantedIds = grants.map(g => g.collection_id);
    const { data: kits, error } = await supabase
      .from('collections')
      .select('id, kit_book_ids')
      .in('id', grantedIds)
      .eq('collection_type', 'kit');

    if (error || !kits?.length) return grants;

    const known = new Set(grantedIds);
    const extra: import('../types').UserContentGrant[] = [];
    for (const kit of kits) {
      const bookIds: string[] = (kit as { kit_book_ids?: string[] | null }).kit_book_ids ?? [];
      const source = grants.find(g => g.collection_id === kit.id);
      if (!source) continue;
      for (const bookId of bookIds) {
        if (!bookId || known.has(bookId)) continue;
        known.add(bookId);
        extra.push({ ...source, id: `${source.id}:kit-book:${bookId}`, collection_id: bookId });
      }
    }

    return extra.length ? [...grants, ...extra] : grants;
  },

  /**
   * Update any user profile by ID (Admin only)
   */
  async updateUser(
    userId: string,
    updates: { full_name?: string; role?: 'admin' | 'editor' | 'viewer' }
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      const updated = updateMockUserById(userId, updates);
      return updated ? { success: true } : { success: false, error: 'Usuário não encontrado.' };
    }

    const nextProfileUpdates: Record<string, unknown> = {
      ...updates,
      school_name: null,
      updated_at: new Date().toISOString(),
    };

    if (updates.role) {
      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('voucher_id, access_expires_at, access_starts_at')
        .eq('id', userId)
        .single();

      if (profileError) {
        logger.error('Error fetching current user profile before update:', profileError);
        return { success: false, error: profileError.message };
      }

      const isOperationalRole = updates.role === 'admin' || updates.role === 'editor';
      if (isOperationalRole) {
        nextProfileUpdates.access_status = 'active';
        nextProfileUpdates.access_starts_at = currentProfile?.access_starts_at || new Date().toISOString();
      } else if (!currentProfile?.voucher_id && !currentProfile?.access_expires_at) {
        nextProfileUpdates.access_status = 'pending_voucher';
        nextProfileUpdates.access_starts_at = null;
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update(nextProfileUpdates)
      .eq('id', userId);

    if (error) {
      logger.error('Error updating user:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      return deleteMockUserById(userId);
    }

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId },
      });

      if (fnError) {
        logger.error('Error invoking delete-user function:', fnError);
        return { success: false, error: fnError.message };
      }

      if (!fnData?.success) {
        const errMsg = fnData?.error ?? 'Erro ao excluir usuário';
        logger.error('delete-user function returned error:', errMsg);
        return { success: false, error: errMsg };
      }

      return { success: true };
    } catch (error: any) {
      logger.error('Error deleting user:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  },

  /**
   * Check if current user has a grant for a specific collection.
   */
  async hasContentGrant(collectionId: string): Promise<boolean> {
    if (!isSupabaseConfigured) {
      const userId = getMockCurrentUserId();
      if (!userId) return false;
      return hasGrantForCollection(userId, collectionId);
    }

    const grants = await this.getUserContentGrants();
    return grants.some(g => g.collection_id === collectionId);
  },

  // ── Formations ────────────────────────────────────────────

  async getFormations(adminMode: boolean = false): Promise<import('../types').Formation[]> {
    if (!isSupabaseConfigured || isDevMockSession()) return [];
    const activeBrandId = await resolveActiveBrandId();
    if (!activeBrandId) return [];

    let query = supabase.from('formations').select('*').eq('brand_id', activeBrandId).order('created_at', { ascending: false });
    if (!adminMode) query = query.eq('is_published', true);

    const { data, error } = await query;
    if (error) { logger.error('getFormations error:', error); return []; }
    return (data ?? []) as import('../types').Formation[];
  },

  async getFormationById(id: string): Promise<import('../types').Formation | null> {
    if (!isSupabaseConfigured || isDevMockSession()) return null;
    const activeBrandId = await resolveActiveBrandId();
    if (!activeBrandId) return null;

    const { data, error } = await supabase.from('formations').select('*').eq('id', id).eq('brand_id', activeBrandId).single();
    if (error) { logger.error('getFormationById error:', error); return null; }
    return data as import('../types').Formation | null;
  },

  async createFormation(formation: Omit<import('../types').Formation, 'id' | 'created_at' | 'updated_at'>): Promise<import('../types').Formation | null> {
    if (!isSupabaseConfigured || isDevMockSession()) return null;
    const activeBrandId = await resolveActiveBrandId();
    if (!activeBrandId) { logger.error('createFormation: no active brand'); return null; }

    const { data, error } = await supabase.from('formations').insert({ ...formation, brand_id: activeBrandId }).select().single();
    if (error) { logger.error('createFormation error:', error); return null; }
    return data as import('../types').Formation;
  },

  async updateFormation(id: string, updates: Partial<import('../types').Formation>): Promise<import('../types').Formation | null> {
    if (!isSupabaseConfigured || isDevMockSession()) return null;
    const activeBrandId = await resolveActiveBrandId();
    if (!activeBrandId) return null;

    const { data, error } = await supabase.from('formations').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).eq('brand_id', activeBrandId).select().single();
    if (error) { logger.error('updateFormation error:', error); return null; }
    return data as import('../types').Formation;
  },

  async deleteFormation(id: string): Promise<boolean> {
    if (!isSupabaseConfigured || isDevMockSession()) return false;
    const activeBrandId = await resolveActiveBrandId();
    if (!activeBrandId) return false;

    const { error } = await supabase.from('formations').delete().eq('id', id).eq('brand_id', activeBrandId);
    if (error) { logger.error('deleteFormation error:', error); return false; }
    return true;
  },

  async publishFormation(id: string): Promise<import('../types').Formation | null> {
    return this.updateFormation(id, { is_published: true, published_at: new Date().toISOString() });
  },

  async unpublishFormation(id: string): Promise<import('../types').Formation | null> {
    return this.updateFormation(id, { is_published: false, published_at: null });
  },

  // ── Formation progress ────────────────────────────────────

  async getFormationProgress(formationId: string): Promise<import('../types').UserFormationProgress | null> {
    if (!isSupabaseConfigured || isDevMockSession()) return null;

    const userId = await getCurrentUserId();
    if (!userId) return null;

    const { data, error } = await supabase
      .from('user_formation_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('formation_id', formationId)
      .maybeSingle();

    if (error) { logger.error('getFormationProgress error:', error); return null; }
    return data as import('../types').UserFormationProgress | null;
  },

  async saveFormationProgress(params: {
    formationId: string;
    completedLessonIds: string[];
    lastLessonId: string | null;
    progressPercent: number;
  }): Promise<void> {
    if (!isSupabaseConfigured || isDevMockSession()) return;

    const userId = await getCurrentUserId();
    if (!userId) return;

    const { error } = await supabase
      .from('user_formation_progress')
      .upsert({
        user_id: userId,
        formation_id: params.formationId,
        completed_lesson_ids: params.completedLessonIds,
        last_lesson_id: params.lastLessonId,
        progress_percent: params.progressPercent,
      }, {
        onConflict: 'user_id,formation_id',
      });

    if (error) logger.error('saveFormationProgress error:', error);
  },

  async toggleLessonComplete(
    formationId: string,
    lessonId: string,
    allLessons: import('../types').FormationLesson[],
    currentCompleted: string[],
  ): Promise<{ completedLessonIds: string[]; progressPercent: number }> {
    const isCompleted = currentCompleted.includes(lessonId);
    const newCompleted = isCompleted
      ? currentCompleted.filter(id => id !== lessonId)
      : [...currentCompleted, lessonId];

    const progressPercent = allLessons.length > 0
      ? Math.round((newCompleted.length / allLessons.length) * 100)
      : 0;

    this.saveFormationProgress({
      formationId,
      completedLessonIds: newCompleted,
      lastLessonId: lessonId,
      progressPercent,
    }).catch((e) => logger.error('toggleLessonComplete persist error:', e));

    return { completedLessonIds: newCompleted, progressPercent };
  },

  // ── Materials ─────────────────────────────────────────────

  async getMaterials(adminMode: boolean = false): Promise<import('../types').Material[]> {
    if (!isSupabaseConfigured || isDevMockSession()) return [];
    const activeBrandId = await resolveActiveBrandId();
    if (!activeBrandId) return [];

    let query = supabase.from('materials').select('*').eq('brand_id', activeBrandId).order('created_at', { ascending: false });
    if (!adminMode) query = query.eq('is_published', true);

    const { data, error } = await query;
    if (error) { logger.error('getMaterials error:', error); return []; }
    return (data ?? []) as import('../types').Material[];
  },

  async getMaterialById(id: string): Promise<import('../types').Material | null> {
    if (!isSupabaseConfigured || isDevMockSession()) return null;
    const activeBrandId = await resolveActiveBrandId();
    if (!activeBrandId) return null;

    const { data, error } = await supabase.from('materials').select('*').eq('id', id).eq('brand_id', activeBrandId).single();
    if (error) { logger.error('getMaterialById error:', error); return null; }
    return data as import('../types').Material | null;
  },

  async createMaterial(material: Omit<import('../types').Material, 'id' | 'created_at' | 'updated_at'>): Promise<import('../types').Material | null> {
    if (!isSupabaseConfigured || isDevMockSession()) return null;
    const activeBrandId = await resolveActiveBrandId();
    if (!activeBrandId) { logger.error('createMaterial: no active brand'); return null; }

    const { data, error } = await supabase.from('materials').insert({ ...material, brand_id: activeBrandId }).select().single();
    if (error) { logger.error('createMaterial error:', error); return null; }
    return data as import('../types').Material;
  },

  async updateMaterial(id: string, updates: Partial<import('../types').Material>): Promise<import('../types').Material | null> {
    if (!isSupabaseConfigured || isDevMockSession()) return null;
    const activeBrandId = await resolveActiveBrandId();
    if (!activeBrandId) return null;

    const { data, error } = await supabase.from('materials').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).eq('brand_id', activeBrandId).select().single();
    if (error) { logger.error('updateMaterial error:', error); return null; }
    return data as import('../types').Material;
  },

  async deleteMaterial(id: string): Promise<boolean> {
    if (!isSupabaseConfigured || isDevMockSession()) return false;
    const activeBrandId = await resolveActiveBrandId();
    if (!activeBrandId) return false;

    const { error } = await supabase.from('materials').delete().eq('id', id).eq('brand_id', activeBrandId);
    if (error) { logger.error('deleteMaterial error:', error); return false; }
    return true;
  },

  async publishMaterial(id: string): Promise<import('../types').Material | null> {
    return this.updateMaterial(id, { is_published: true, published_at: new Date().toISOString() });
  },

  async unpublishMaterial(id: string): Promise<import('../types').Material | null> {
    return this.updateMaterial(id, { is_published: false, published_at: null });
  },
};
