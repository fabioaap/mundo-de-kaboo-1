import catalogSeed from '../data/catalog.seed.json';
import { CHARACTERS as CHARACTER_SEED } from '../data/characters';
import { CentralMaterial, Character, Collection } from '../types';

type CatalogSeedShape = {
  collections?: Collection[];
};

const HYGIENE_BRAND_SLUG = 'central-coruja';

const SEEDED_COLLECTION_IDS = new Set(
  (((catalogSeed as CatalogSeedShape).collections) ?? []).map((collection) => collection.id)
);

const SEEDED_CHARACTER_IDS = new Set(CHARACTER_SEED.map((character) => character.id));

const MOCK_MARKER_REGEX = /\b(?:bug(?:-\d+)?|regression|qa|mock|demo|test|tmp|dummy|sample)\b/i;

const SAMPLE_URL_PATTERNS: RegExp[] = [
  /cdn\.example\.com/i,
  /commondatastorage\.googleapis\.com\/gtv-videos-bucket\/sample/i,
  /soundhelix\.com\/examples\/mp3/i,
  /w3\.org\/WAI\/ER\/tests\/xhtml\/testfiles\/resources\/pdf\/dummy\.pdf/i,
  /africau\.edu\/images\/default\/sample\.pdf/i,
];

const isHygieneBrand = (brandSlug: string): boolean => brandSlug === HYGIENE_BRAND_SLUG;

const hasMockMarker = (value?: string | null): boolean => {
  return Boolean(value?.trim()) && MOCK_MARKER_REGEX.test(value as string);
};

const hasSampleUrl = (value?: string | null): boolean => {
  return Boolean(value?.trim()) && SAMPLE_URL_PATTERNS.some((pattern) => pattern.test(value as string));
};

type BrandScopedRecord = {
  brand_id?: string | null;
};

const normalizeBrandId = (value?: string | null): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const matchesBrandScope = <T extends BrandScopedRecord>(
  record: T,
  brandSlug: string,
  brandId?: string | null,
): boolean => {
  const resolvedBrandId = normalizeBrandId(brandId);
  if (!resolvedBrandId) {
    return true;
  }

  const recordBrandId = normalizeBrandId(record.brand_id);
  return recordBrandId === resolvedBrandId;
};

const isMockOrTestCollection = (collection: Collection): boolean => {
  const assetValues = (collection.collection_assets ?? []).flatMap((asset) => [
    asset.id,
    asset.title,
    asset.description ?? '',
    asset.url,
    asset.lyrics_url ?? '',
  ]);

  const candidateValues = [
    collection.title,
    collection.theme,
    collection.learning_objectives,
    collection.synopsis ?? '',
    collection.cover_image,
    collection.kit_cover_image ?? '',
    collection.pdf_url ?? '',
    collection.audio_url ?? '',
    collection.video_url ?? '',
    ...(collection.extra_materials ?? []),
    ...assetValues,
  ];

  return SEEDED_COLLECTION_IDS.has(collection.id)
    || collection.cover_image?.startsWith('/mock/')
    || candidateValues.some((value) => hasMockMarker(value) || hasSampleUrl(value));
};

const isMockOrTestCharacter = (character: Character): boolean => {
  return SEEDED_CHARACTER_IDS.has(character.id)
    || [character.name, character.description, character.image_url ?? '']
      .some((value) => hasMockMarker(value) || hasSampleUrl(value));
};

export const shouldUseSharedMediaCatalog = (brandSlug: string): boolean => {
  return !isHygieneBrand(brandSlug);
};

export const filterCollectionsForBrand = (
  collections: Collection[],
  brandSlug: string,
  brandId?: string | null,
  options?: { adminMode?: boolean; fromRemote?: boolean },
): Collection[] => {
  const brandScopedCollections = collections.filter((collection) => matchesBrandScope(collection, brandSlug, brandId));

  if (!isHygieneBrand(brandSlug)) {
    return brandScopedCollections;
  }

  // Admin mode sees all brand-scoped collections including ones with test-like titles.
  // Seed ids are excluded only for local seed/mock data: on the remote path a seed id means a
  // real row that a legacy backfill wrote into this brand, and hiding it leaves the admin unable
  // to see or clean it (the vitrine still drops it below, via isMockOrTestCollection).
  if (options?.adminMode) {
    return brandScopedCollections.filter((collection) =>
      (options.fromRemote || !SEEDED_COLLECTION_IDS.has(collection.id))
      && !collection.cover_image?.startsWith('/mock/'),
    );
  }

  return brandScopedCollections.filter((collection) =>
    // Remove mock/test content
    !isMockOrTestCollection(collection),
  );
};

export const filterCharactersForBrand = (
  characters: Character[],
  brandSlug: string,
  brandId?: string | null,
): Character[] => {
  const brandScopedCharacters = characters.filter((character) => matchesBrandScope(character, brandSlug, brandId));

  if (!isHygieneBrand(brandSlug)) {
    return brandScopedCharacters;
  }

  return brandScopedCharacters.filter((character) => !isMockOrTestCharacter(character));
};

export const filterCentralMaterialsForBrand = (materials: CentralMaterial[], brandSlug: string): CentralMaterial[] => {
  if (!isHygieneBrand(brandSlug)) {
    return materials;
  }

  return [];
};
