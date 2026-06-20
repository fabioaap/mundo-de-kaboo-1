import React from 'react';
import { Button } from '../design-system';
import { CollectionFiltersModal } from '../components/CollectionFiltersModal';
import { Icons } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';
import catalogSeed from '../data/catalog.seed.json';
import { LIBRARY_HUB_MOCKS, LibraryHubData, LibraryHubKind, LibraryMockItem, LibraryMockItemVariant } from '../data/library-hubs';
import { api } from '../lib/api';
import { useBrandConfig } from '../hooks/useBrandConfig';
import useIsMobile from '../hooks/useIsMobile';
import { Collection, Formation, Material, MediaHub, MediaHubResponse, MediaItemCard, ScreenName } from '../types';

interface LibraryHubScreenProps {
  screen: LibraryHubKind;
  onNavigate: (screen: ScreenName, params?: any) => void;
}

type CatalogSeed = {
  collections?: Collection[];
};

const libraryCollectionsById = new Map(
  (((catalogSeed as CatalogSeed).collections) ?? []).map((collection) => [collection.id, collection] as const),
);
const FALLBACK_LIBRARY_COLLECTION_ID = '784b3238-0916-4922-af3c-8627d74cc16c';

const ITEM_ICONS: Record<LibraryMockItemVariant, React.ComponentType<{ size?: number; className?: string }>> = {
  video: Icons.Video,
  track: Icons.Headphones,
  formation: Icons.BookOpen,
  material: Icons.FileText,
};

const ITEM_LABELS: Record<LibraryMockItemVariant, string> = {
  video: 'Vídeo',
  track: 'Faixa',
  formation: 'Percurso',
  material: 'Material',
};

const CARD_PREVIEW_ASPECT: Record<LibraryMockItemVariant, string> = {
  video: 'aspect-square',
  track: 'aspect-square',
  formation: 'aspect-square',
  material: 'aspect-square',
};

const FEATURED_PREVIEW_ASPECT: Record<LibraryMockItemVariant, string> = {
  video: 'aspect-[16/8.9]',
  track: 'aspect-[10/8]',
  formation: 'aspect-[16/9.6]',
  material: 'aspect-[16/9.6]',
};

const waveformBars = ['h-3', 'h-6', 'h-4', 'h-7', 'h-5', 'h-8', 'h-4', 'h-6'];

const NEUTRAL_LIBRARY_BADGE_CLASS = 'border-brand-primary/12 bg-white text-brand-primary/82 shadow-sm';
const NEUTRAL_LIBRARY_TAB_CLASS = 'border-brand-primary/10 bg-white text-brand-primary/75 hover:border-brand-primary/25';
const ACTIVE_LIBRARY_TAB_CLASS = 'border-brand-primary/14 bg-brand-primary/[0.08] text-brand-primary shadow-sm';

type CompactLibraryKind = Exclude<LibraryHubKind, 'videos'>;

const COMPACT_FILTER_LABELS: Partial<Record<CompactLibraryKind, string[]>> = {
  formations: ['Acolhimento', 'Roda', 'Conflitos', 'Percurso curto'],
  materials: ['Uso imediato', 'Planejamento', 'Convivência', 'Exploração'],
};

const buildBrandScopedLibraryConfig = (config: LibraryHubData, brandSlug: string): LibraryHubData => {
  if (brandSlug === 'kaboo') {
    return config;
  }

  return {
    ...config,
    quickFilters: [],
    featured: null,
    rails: [],
  };
};

const getLibraryEmptyStateMessage = (hub: LibraryHubKind, brandDisplayName: string): string => {
  switch (hub) {
    case 'videos':
      return `Publique videos nas colecoes de ${brandDisplayName} para começar esta biblioteca.`;
    case 'music':
      return `Publique musicas nas colecoes de ${brandDisplayName} para começar esta biblioteca.`;
    case 'formations':
      return `Publique guias e formacoes nas colecoes de ${brandDisplayName} para começar esta biblioteca.`;
    case 'materials':
      return `Publique materiais nas colecoes de ${brandDisplayName} para começar esta biblioteca.`;
    default:
      return 'Ainda nao ha conteudos publicados nesta biblioteca.';
  }
};

const getFormationStepLabel = (item: LibraryMockItem) => {
  const steps = Math.max(1, item.previewSteps ?? 1);
  return `${steps} ${steps === 1 ? 'etapa' : 'etapas'}`;
};

const getLibraryActionLabel = (item: LibraryMockItem) => {
  if (item.variant === 'material') {
    return 'Abrir PDF';
  }

  if (item.variant === 'formation') {
    return 'Ver percurso';
  }

  return item.ctaLabel;
};

type VideoLibraryFilter = 'Todos' | 'Infantil' | 'Professor' | 'Acessível';
type VideoSortMode = 'recentes' | 'titulo';

type LibraryCollectionFilterState = {
  characters: string[];
  bncc: string[];
  casel: string[];
  age: string[];
};

const INITIAL_LIBRARY_COLLECTION_FILTERS: LibraryCollectionFilterState = {
  characters: [],
  bncc: [],
  casel: [],
  age: [],
};

const LIBRARY_FILTER_AGE_ORDER = ['G3', 'G4', 'G5', '1º ano', '2º ano', '3º ano', '4º ano', '5º ano'];

const normalizeLibraryText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const sortLibraryAgeValues = (values: string[]) => values.sort((left, right) => {
  const leftIndex = LIBRARY_FILTER_AGE_ORDER.indexOf(left);
  const rightIndex = LIBRARY_FILTER_AGE_ORDER.indexOf(right);

  if (leftIndex !== -1 && rightIndex !== -1) {
    return leftIndex - rightIndex;
  }

  if (leftIndex !== -1) {
    return -1;
  }

  if (rightIndex !== -1) {
    return 1;
  }

  return left.localeCompare(right, 'pt-BR', { numeric: true });
});

const getLinkedLibraryCollection = (item: LibraryMockItem) => {
  if (!item.collectionId) {
    return undefined;
  }

  return libraryCollectionsById.get(item.collectionId);
};

const getLibraryCollectionFilterOptions = (items: LibraryMockItem[]) => {
  const options = {
    characters: new Set<string>(),
    bncc: new Set<string>(),
    casel: new Set<string>(),
    age: new Set<string>(),
  };

  items.forEach((item) => {
    const collection = getLinkedLibraryCollection(item);
    if (!collection) {
      return;
    }

    collection.characters?.forEach((value) => options.characters.add(value));
    collection.bncc_skills?.forEach((value) => options.bncc.add(value));
    collection.casel_competencies?.forEach((value) => options.casel.add(value));
    collection.age_grade?.forEach((value) => options.age.add(value));
  });

  return {
    characters: Array.from(options.characters).sort((left, right) => left.localeCompare(right, 'pt-BR')),
    bncc: Array.from(options.bncc).sort((left, right) => left.localeCompare(right, 'pt-BR', { numeric: true })),
    casel: Array.from(options.casel).sort((left, right) => left.localeCompare(right, 'pt-BR')),
    age: sortLibraryAgeValues(Array.from(options.age)),
  };
};

const matchesLibraryCollectionFilters = (item: LibraryMockItem, filters: LibraryCollectionFilterState) => {
  const hasActiveFilters = (Object.values(filters) as string[][]).some((values) => values.length > 0);

  if (!hasActiveFilters) {
    return true;
  }

  const collection = getLinkedLibraryCollection(item);
  if (!collection) {
    return false;
  }

  if (filters.characters.length > 0) {
    const hasCharacter = collection.characters?.some((value) => filters.characters.includes(value));
    if (!hasCharacter) {
      return false;
    }
  }

  if (filters.bncc.length > 0) {
    const hasBncc = collection.bncc_skills?.some((value) => filters.bncc.includes(value));
    if (!hasBncc) {
      return false;
    }
  }

  if (filters.casel.length > 0) {
    const hasCasel = collection.casel_competencies?.some((value) => filters.casel.includes(value));
    if (!hasCasel) {
      return false;
    }
  }

  if (filters.age.length > 0) {
    const hasAge = collection.age_grade?.some((value) => filters.age.includes(value));
    if (!hasAge) {
      return false;
    }
  }

  return true;
};

const buildCollectionContextSearchText = (item: LibraryMockItem) => {
  if (!item.collectionId) {
    return '';
  }

  const collection = libraryCollectionsById.get(item.collectionId);
  if (!collection) {
    return '';
  }

  return [
    collection.title,
    collection.level,
    collection.theme,
    collection.learning_objectives,
    collection.characters?.join(' '),
    collection.bncc_skills?.join(' '),
    collection.casel_competencies?.join(' '),
    collection.age_grade?.join(' '),
  ].filter(Boolean).join(' ');
};

const matchesVideoLibraryFilter = (item: LibraryMockItem, filter: VideoLibraryFilter) => {
  if (filter === 'Todos') {
    return true;
  }

  const searchableValues = [
    item.title,
    item.description,
    item.eyebrow,
    item.meta,
    item.secondaryMeta,
    item.relatedCollection,
    ...(item.chips ?? []),
  ].filter(Boolean).map((value) => normalizeLibraryText(value as string));

  if (filter === 'Acessível') {
    return searchableValues.some((value) => value.includes('acess') || value.includes('libras') || value.includes('inclus'));
  }

  const normalizedFilter = normalizeLibraryText(filter);
  return searchableValues.some((value) => value.includes(normalizedFilter));
};

const buildLibrarySearchText = (item: LibraryMockItem) => normalizeLibraryText([
  item.title,
  item.description,
  item.eyebrow,
  item.meta,
  item.secondaryMeta,
  item.relatedCollection,
  buildCollectionContextSearchText(item),
  ...(item.chips ?? []),
].filter(Boolean).join(' '));

const matchesCompactLibraryFilter = (item: LibraryMockItem, filter: string, hub: LibraryHubKind) => {
  if (filter === 'Todos') {
    return true;
  }

  const searchableText = buildLibrarySearchText(item);
  const normalizedFilter = normalizeLibraryText(filter);

  if (hub === 'music') {
    if (normalizedFilter.includes('ligad')) {
      return Boolean(item.relatedCollection);
    }

    if (normalizedFilter.includes('escuta')) {
      return searchableText.includes('escuta') || searchableText.includes('silencio') || searchableText.includes('respir') || searchableText.includes('calma');
    }

    if (normalizedFilter.includes('cantiga')) {
      return searchableText.includes('curta') || searchableText.includes('2 min') || searchableText.includes('3 min') || searchableText.includes('faixa');
    }

    if (normalizedFilter.includes('roda')) {
      return searchableText.includes('roda') || searchableText.includes('grupo');
    }
  }

  if (hub === 'formations') {
    if (normalizedFilter.includes('acolh')) {
      return searchableText.includes('acolh') || searchableText.includes('pertenc') || searchableText.includes('coragem');
    }

    if (normalizedFilter.includes('roda')) {
      return searchableText.includes('roda') || searchableText.includes('escuta');
    }

    if (normalizedFilter.includes('conflit')) {
      return searchableText.includes('conflit') || searchableText.includes('reparo') || searchableText.includes('conviv') || searchableText.includes('dialog');
    }

    if (normalizedFilter.includes('curto')) {
      return (item.previewSteps ?? 99) <= 2 || searchableText.includes('15 min');
    }
  }

  if (hub === 'materials') {
    if (normalizedFilter.includes('uso')) {
      return searchableText.includes('uso imediato') || searchableText.includes('consulta imediata') || searchableText.includes('pdf direto') || searchableText.includes('apoio de aula');
    }

    if (normalizedFilter.includes('planej')) {
      return searchableText.includes('planejamento') || searchableText.includes('consulta curta') || searchableText.includes('apoio');
    }

    if (normalizedFilter.includes('conviv')) {
      return searchableText.includes('conviv') || searchableText.includes('dialog') || searchableText.includes('conflit') || searchableText.includes('grupo');
    }

    if (normalizedFilter.includes('explora')) {
      return searchableText.includes('explora') || searchableText.includes('pistas') || searchableText.includes('cooper');
    }
  }

  return searchableText.includes(normalizedFilter)
    || normalizedFilter.split(' ').some((token) => token.length > 2 && searchableText.includes(token));
};

const cleanVideoMetaLabel = (meta: string) => meta.replace(/^vídeo\s*•\s*/i, '').trim();
const cleanTrackMetaLabel = (meta: string) => meta.replace(/^faixa\s*•\s*/i, '').trim();

const getMediaCardMetaLabel = (item: LibraryMockItem) => {
  if (item.variant === 'video') {
    const cleaned = cleanVideoMetaLabel(item.meta);
    const normalized = normalizeLibraryText(cleaned);
    return !normalized || normalized === 'video' ? '' : cleaned;
  }

  if (item.variant === 'track') {
    const cleaned = cleanTrackMetaLabel(item.meta);
    const normalized = normalizeLibraryText(cleaned);
    return !normalized || normalized === 'faixa' ? '' : cleaned;
  }

  return item.meta;
};

const getVideoThumbnailBadgeLabel = (item: LibraryMockItem) => {
  if (item.variant !== 'video' && item.assetType !== 'video') {
    return '';
  }

  return 'Vídeo';
};

const getDistinctVideoSupportingLine = (item: LibraryMockItem) => {
  const rawValue = (item.secondaryMeta || getMediaCardMetaLabel(item) || '').trim();
  const cleanedValue = cleanVideoMetaLabel(rawValue);
  const normalizedValue = normalizeLibraryText(cleanedValue);

  if (!normalizedValue || normalizedValue === 'video') {
    return '';
  }

  // Only suppress when the label matches the relatedCollection name — library-area
  // videos often share the category label as their asset title (e.g. "Como Jogar"),
  // so suppressing against the title hides the badge on those cards.
  const normalizedCollection = normalizeLibraryText(item.relatedCollection || '');

  if (normalizedCollection && (normalizedCollection.includes(normalizedValue) || normalizedValue.includes(normalizedCollection))) {
    return '';
  }

  return cleanedValue;
};

const getLibraryBadgeIcon = (item: LibraryMockItem) => {
  if (item.variant === 'video') {
    return Icons.Play;
  }

  if (item.variant === 'track') {
    return Icons.Headphones;
  }

  if (item.variant === 'formation') {
    return Icons.BookOpen;
  }

  return Icons.FileText;
};

const getLibraryBadgeLabel = (item: LibraryMockItem) => {
  if (item.variant === 'video') {
    return cleanVideoMetaLabel(item.meta) || 'Vídeo';
  }

  if (item.variant === 'track') {
    return cleanTrackMetaLabel(item.meta) || item.secondaryMeta || 'Faixa';
  }

  if (item.variant === 'formation') {
    return getFormationStepLabel(item);
  }

  return 'PDF';
};

const getLibrarySupportingText = (item: LibraryMockItem) => {
  if (item.variant === 'formation' || item.variant === 'material') {
    return item.description || item.relatedCollection || item.eyebrow;
  }

  return item.relatedCollection || item.description || item.eyebrow;
};

const renderMinimalLibraryCardBody = (item: LibraryMockItem, corujaTone: boolean = false) => {
  const BadgeIcon = getLibraryBadgeIcon(item);
  const ActionIcon = item.variant === 'material' ? Icons.ExternalLink : Icons.ChevronRight;
  const badgeLabel = getLibraryBadgeLabel(item);
  const supportingText = getLibrarySupportingText(item);

  return (
    <>
      <div className="min-w-0 flex-1">
        <h3 className={`text-[0.94rem] font-black leading-[1.1] tracking-[-0.03em] line-clamp-2 ${corujaTone ? 'text-[#FFF4E3]' : 'text-brand-primary'}`}>
          {item.title}
        </h3>

        {supportingText && supportingText !== item.relatedCollection && (
          <p className={`mt-1.5 text-[12px] leading-5 line-clamp-2 ${corujaTone ? 'text-[#D4DCF0]' : 'text-gray-500'}`}>
            {supportingText}
          </p>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${corujaTone ? 'border-[#f2d87b]/25 bg-white/10 text-[#FFF0C6] shadow-[0_10px_24px_rgba(4,27,36,0.16)] backdrop-blur-sm' : 'border-brand-primary/10 bg-white text-brand-primary/72 shadow-sm'}`}>
            <BadgeIcon size={12} className={item.variant === 'video' ? 'fill-current stroke-none' : 'stroke-[2.1px]'} />
            {badgeLabel}
          </span>
          {item.relatedCollection && (
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${corujaTone ? 'border-[#f2d87b]/15 bg-white/5 text-[#FFF0C6]/55' : 'border-brand-primary/10 bg-brand-primary/[0.04] text-brand-primary/50'}`}>
              <Icons.BookOpen size={9} className="shrink-0 stroke-[2px]" />
              {item.relatedCollection}
            </span>
          )}
        </div>
      </div>

      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${corujaTone ? 'bg-white/10 text-[#FFF0C6]/72 group-hover:bg-white/14 group-hover:text-[#FFB347]' : 'bg-black/[0.03] text-brand-primary/35 group-hover:bg-brand-primary/[0.08] group-hover:text-brand-primary'}`}>
        <ActionIcon
          size={16}
          className={item.variant === 'material' ? '' : 'transition-transform duration-200 group-hover:translate-x-0.5'}
        />
      </span>
    </>
  );
};

const buildUniqueLibraryItems = (items: LibraryMockItem[]) => Array.from(
  new Map(
    items.map((item) => [
      `${item.collectionId ?? item.relatedCollection ?? 'sem-colecao'}::${item.title.toLowerCase()}`,
      item,
    ]),
  ).values(),
);

const formatLibraryDurationLabel = (durationSeconds?: number | null) => {
  if (!durationSeconds || durationSeconds <= 0) {
    return '';
  }

  const totalMinutes = Math.max(1, Math.round(durationSeconds / 60));
  return `${totalMinutes} min`;
};

const getLibraryItemVariantFromMediaCard = (card: MediaItemCard): LibraryMockItemVariant => {
  if (card.hub === 'formations') {
    return 'formation';
  }

  if (card.hub === 'materials') {
    if (card.kind === 'video') {
      return 'video';
    }

    if (card.kind === 'audio') {
      return 'track';
    }

    return 'material';
  }

  return card.kind === 'video' ? 'video' : 'track';
};

const getLibraryItemAssetTypeFromMediaCard = (card: MediaItemCard): LibraryMockItem['assetType'] => {
  if (card.kind === 'video') {
    return 'video';
  }

  if (card.kind === 'audio') {
    return 'audio';
  }

  return 'pdf';
};

const buildLibraryItemMetaFromMediaCard = (
  card: MediaItemCard,
  variant: LibraryMockItemVariant,
  durationLabel: string,
): string => {
  if (variant === 'video') {
    return `vídeo${durationLabel ? ` • ${durationLabel}` : ''}`;
  }

  if (variant === 'track') {
    return `faixa${durationLabel ? ` • ${durationLabel}` : ''}`;
  }

  if (card.summary?.trim()) {
    return card.summary.trim();
  }

  if (variant === 'formation') {
    return card.kind === 'video' ? 'formação • videoaula' : 'formação • guia';
  }

  if (card.kind === 'video') {
    return 'material • vídeo';
  }

  if (card.kind === 'audio') {
    return 'material • áudio';
  }

  return 'PDF • material';
};

const adaptMediaCardToLibraryItem = (card: MediaItemCard): LibraryMockItem => {
  const isVideo = card.kind === 'video';
  const durationLabel = formatLibraryDurationLabel(card.durationSeconds);
  const clampedProgress = Math.max(0, Math.min(100, Math.round(card.progressPercent ?? 0)));
  const showVideoProgress = isVideo && clampedProgress > 0 && clampedProgress < 100;
  const variant = getLibraryItemVariantFromMediaCard(card);
  const assetType = getLibraryItemAssetTypeFromMediaCard(card);
  const chips = Array.from(new Set([
    ...(card.badges ?? []),
    ...(showVideoProgress ? ['Em andamento'] : []),
  ]));

  return {
    id: card.id,
    variant,
    eyebrow: card.collectionTitle ?? (variant === 'video' ? 'Vídeo' : variant === 'track' ? 'Faixa' : variant === 'formation' ? 'Formação' : 'Material'),
    title: card.title,
    description: card.description ?? card.summary ?? '',
    meta: buildLibraryItemMetaFromMediaCard(card, variant, durationLabel),
    secondaryMeta: variant === 'video' || variant === 'track' ? card.summary ?? undefined : undefined,
    relatedCollection: card.collectionTitle ?? undefined,
    collectionId: card.collectionId ?? undefined,
    coverImage: card.thumbnailUrl ?? undefined,
    progress: isVideo ? card.progressPercent : undefined,
    chips,
    ctaLabel: assetType === 'video' ? 'Assistir agora' : assetType === 'audio' ? 'Ouvir agora' : 'Abrir PDF',
    assetType,
    assetTitle: card.title,
    assetUrl: card.assetUrl ?? undefined,
  };
};

const flattenMediaHubResponseToLibraryItems = (hub: MediaHubResponse): LibraryMockItem[] => {
  const continueItems = hub.shelves
    .filter((shelf) => shelf.type === 'continue_watching')
    .flatMap((shelf) => shelf.items);
  const regularShelfItems = hub.shelves
    .filter((shelf) => shelf.type !== 'continue_watching')
    .flatMap((shelf) => shelf.items);

  const items = [
    ...continueItems,
    ...(hub.hero ? [hub.hero] : []),
    ...regularShelfItems,
  ];

  return buildUniqueLibraryItems(
    Array.from(new Map(items.map((item) => [item.id, item])).values()).map(adaptMediaCardToLibraryItem),
  );
};

const adaptMediaShelvesToLibraryItems = (
  hub: MediaHubResponse,
  allowedItemIds: Set<string>,
  heroItemId?: string,
) => hub.shelves
  .map((shelf) => ({
    id: shelf.id,
    type: shelf.type,
    title: shelf.title,
    description: shelf.description,
    items: shelf.items
      .map(adaptMediaCardToLibraryItem)
      .filter((item) => allowedItemIds.has(item.id) && item.id !== heroItemId),
  }))
  .filter((shelf) => shelf.items.length > 0);

const formationToLibraryItem = (f: Formation): LibraryMockItem => ({
  id: f.id,
  variant: 'formation',
  eyebrow: f.level ?? '',
  title: f.title,
  description: f.description ?? '',
  meta: `${f.steps_count ?? 1} etapa${(f.steps_count ?? 1) !== 1 ? 's' : ''}${f.duration_label ? ' • ' + f.duration_label : ''}`,
  coverImage: f.cover_image ?? undefined,
  chips: f.tags ?? [],
  ctaLabel: 'Explorar',
});

const materialToLibraryItem = (m: Material): LibraryMockItem => ({
  id: m.id,
  variant: 'material',
  eyebrow: (m.asset_type ?? 'pdf').toUpperCase(),
  title: m.title,
  description: m.description ?? '',
  meta: (m.asset_type ?? 'pdf').toUpperCase(),
  coverImage: m.cover_image ?? undefined,
  assetUrl: m.asset_url ?? undefined,
  assetType: m.asset_type as any,
  chips: m.tags ?? [],
  ctaLabel: 'Abrir',
});

const DEFAULT_LIBRARY_SURFACE = {
  page: 'bg-[radial-gradient(circle_at_top_right,rgba(93,31,88,0.1),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(78,168,222,0.08),transparent_26%),linear-gradient(180deg,#ffffff_0%,#fcfbfd_100%)]',
  stage: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(251,246,251,0.94))]',
  hero: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(251,245,251,0.96))]',
  rail: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(252,248,252,0.98))]',
  stat: 'border-[#ead9e8] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(252,246,252,0.95))]',
  card: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(252,246,252,0.96))]',
} as const;

const CORUJA_LIBRARY_SURFACE = {
  page: 'bg-[#041b24]',
  stage: 'border border-white/12 bg-[linear-gradient(180deg,rgba(7,32,42,0.76),rgba(4,27,36,0.68))] shadow-[0_20px_48px_rgba(4,27,36,0.24)] backdrop-blur-xl',
  hero: 'border border-white/12 bg-[linear-gradient(135deg,rgba(7,32,42,0.88),rgba(7,32,42,0.66))] shadow-[0_28px_72px_rgba(4,27,36,0.32)] backdrop-blur-xl',
  rail: 'border border-white/12 bg-white/10 text-white/80 hover:bg-white/14',
  stat: 'border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.08))] shadow-[0_16px_36px_rgba(4,27,36,0.22)] backdrop-blur-xl',
  card: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,245,252,0.95))]',
} as const;

const SCREEN_SURFACE_CLASSES: Record<LibraryHubKind, {
  page: string;
  stage: string;
  hero: string;
  rail: string;
  stat: string;
  card: string;
}> = {
  videos: DEFAULT_LIBRARY_SURFACE,
  music: DEFAULT_LIBRARY_SURFACE,
  formations: DEFAULT_LIBRARY_SURFACE,
  materials: DEFAULT_LIBRARY_SURFACE,
};

const CardContainer: React.FC<{
  item: LibraryMockItem;
  className: string;
  onOpen: (item: LibraryMockItem) => void;
  children: React.ReactNode;
}> = ({ item, className, onOpen, children }) => {
  if (!item.collectionId && !item.assetUrl && !item.assetType) {
    return <article className={className}>{children}</article>;
  }

  if (item.assetType === 'pdf' && item.assetUrl) {
    return (
      <a
        href={item.assetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${className} block cursor-pointer text-left`}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`${className} cursor-pointer text-left`}
    >
      {children}
    </button>
  );
};

const HorizontalFilterRail: React.FC<{
  tone: 'default' | 'coruja';
  children: React.ReactNode;
}> = ({ tone, children }) => {
  const railRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const syncScrollState = React.useCallback(() => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }

    const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
    setCanScrollLeft(rail.scrollLeft > 6);
    setCanScrollRight(maxScrollLeft - rail.scrollLeft > 6);
  }, []);

  React.useEffect(() => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }

    syncScrollState();
    rail.addEventListener('scroll', syncScrollState, { passive: true });
    window.addEventListener('resize', syncScrollState);

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => syncScrollState())
      : null;

    resizeObserver?.observe(rail);

    return () => {
      rail.removeEventListener('scroll', syncScrollState);
      window.removeEventListener('resize', syncScrollState);
      resizeObserver?.disconnect();
    };
  }, [children, syncScrollState]);

  const leftFadeClass = tone === 'coruja'
    ? 'from-[#0d2430] via-[#0d2430]/86 to-transparent'
    : 'from-white via-white/94 to-transparent';
  const rightFadeClass = tone === 'coruja'
    ? 'from-transparent via-[#0d2430]/86 to-[#0d2430]'
    : 'from-transparent via-white/94 to-white';
  const hintClass = tone === 'coruja'
    ? 'border-white/12 bg-[#0d2430]/88 text-white/72'
    : 'border-brand-primary/10 bg-white/96 text-brand-primary/60 shadow-sm';

  return (
    <div className="relative">
      <div
        ref={railRef}
        className="-mx-0.5 flex items-center gap-2 overflow-x-auto px-0.5 pb-0.5 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      {canScrollLeft && (
        <div className={`pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r ${leftFadeClass}`} />
      )}

      {canScrollRight && (
        <>
          <div className={`pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l ${rightFadeClass}`} />
          <div className={`pointer-events-none absolute right-1 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${hintClass}`}>
            <Icons.ChevronRight size={11} />
            Deslize
          </div>
        </>
      )}
    </div>
  );
};

const renderItemPreview = (item: LibraryMockItem, featured: boolean = false, corujaTone: boolean = false, compact: boolean = false) => {
  const PreviewIcon = getLibraryBadgeIcon(item);
  const usesVideoFrame = item.variant === 'video' || item.assetType === 'video';
  const previewRadiusClass = usesVideoFrame ? 'rounded-[12px]' : 'rounded-[1rem]';
  const aspectClassName = featured
    ? (usesVideoFrame ? 'aspect-video' : FEATURED_PREVIEW_ASPECT[item.variant])
    : (usesVideoFrame ? 'aspect-video' : CARD_PREVIEW_ASPECT[item.variant]);
  const hasCover = Boolean(item.coverImage);
  const itemTypeLabel = ITEM_LABELS[item.variant].toUpperCase();
  const isPlayable = item.variant === 'video' || item.variant === 'track';
  const videoProgressPercent = item.variant === 'video'
    ? Math.max(0, Math.min(100, Math.round(item.progress ?? 0)))
    : 0;
  const hasVideoProgress = item.variant === 'video' && videoProgressPercent > 0;

  if (corujaTone) {
    return (
      <div className={`relative overflow-hidden rounded-[28px] ${aspectClassName}`}>
        <div className="absolute inset-0 rounded-[28px] bg-[radial-gradient(60%_40%_at_14%_100%,rgba(93,30,118,0.26),transparent_70%),radial-gradient(46%_28%_at_100%_0%,rgba(234,154,59,0.28),transparent_72%)]" />
        <div className="absolute inset-[5px] overflow-hidden rounded-[24px] border-[2.5px] border-[#EA9A3B]/90 bg-[#0C1A34] shadow-[0_24px_44px_rgba(3,10,22,0.34)]">
          {hasCover ? (
            <img src={item.coverImage} alt={item.title} className="h-full w-full object-cover bg-[#091525] transition-transform duration-300 group-hover:scale-[1.03]" />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(234,154,59,0.22),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(93,30,118,0.28),transparent_55%),linear-gradient(180deg,#143043,#0C1A34)]" />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,245,214,0.03)_0%,rgba(19,35,52,0.02)_45%,rgba(7,12,24,0.30)_100%)]" />
          {isPlayable && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-[#0f2335]/70 text-[#FFF4E3] opacity-0 scale-95 shadow-[0_16px_30px_rgba(3,10,22,0.26)] backdrop-blur-sm transition-all duration-200 group-hover:opacity-100 group-hover:scale-100">
                <PreviewIcon size={18} className={item.variant === 'video' ? 'fill-current stroke-none' : 'stroke-[2.2px]'} />
              </span>
            </span>
          )}
          {hasVideoProgress && (
            <span className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] block h-1 bg-black/25">
              <span
                className="block h-full bg-[linear-gradient(90deg,#f2bf43_0%,#f6d96f_45%,#62b05c_100%)]"
                style={{ width: `${videoProgressPercent}%` }}
                aria-label={`Assistido ${videoProgressPercent}%`}
              />
            </span>
          )}
        </div>
        {!compact && (
          <span className="absolute left-3 top-3 max-w-[calc(100%-1.5rem)] truncate rounded-full border border-[#ffd28a]/70 bg-[#EA9A3B] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white shadow-[0_12px_22px_rgba(62,28,4,0.28)]">
            {itemTypeLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${previewRadiusClass} ${aspectClassName} border ${hasCover ? 'border-brand-primary/8 bg-slate-900' : 'border-brand-primary/10 bg-[linear-gradient(180deg,#ffffff,#f7f3f9)]'}`}
      style={hasCover ? { backgroundImage: `linear-gradient(180deg,rgba(15,23,42,0.06),rgba(15,23,42,0.16)), url(${item.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      <div className={`absolute inset-0 ${hasCover ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(15,23,42,0.18))]' : 'bg-[radial-gradient(circle_at_top_left,rgba(93,31,88,0.1),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0.02))]'}`} />
      <span className={`absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full ${hasCover ? 'bg-white/84 text-brand-primary shadow-sm' : 'border border-brand-primary/10 bg-white text-brand-primary/70 shadow-sm'}`}>
        <PreviewIcon size={14} className={item.variant === 'video' ? 'fill-current stroke-none' : 'stroke-[2.1px]'} />
      </span>
    </div>
  );
};

export const LibraryHubScreen: React.FC<LibraryHubScreenProps> = ({ screen, onNavigate }) => {
  const { bootstrap: brandBootstrap, slug: brandSlug } = useBrandConfig();
  const config = React.useMemo(
    () => buildBrandScopedLibraryConfig(LIBRARY_HUB_MOCKS[screen], brandSlug),
    [brandSlug, screen],
  );
  const brandDisplayName = brandBootstrap.settings.display_name || brandBootstrap.brand.name;
  const brandHomeHeroImageUrl = brandBootstrap.settings.home_hero_image_url || '';
  const isMobile = useIsMobile();
  const isCentralCoruja = brandSlug === 'central-coruja';
  const isCorujaLibraryHub = isCentralCoruja && Boolean(brandHomeHeroImageUrl);
  const screenSurface = isCorujaLibraryHub ? CORUJA_LIBRARY_SURFACE : SCREEN_SURFACE_CLASSES[screen];
  const isVideoHub = screen === 'videos';
  const isMusicHub = screen === 'music';
  const shouldUseMediaApi = true;
  const isMaterialsHub = screen === 'materials';
  const isFormationsHub = screen === 'formations';
  const [showLibraryFilters, setShowLibraryFilters] = React.useState(false);
  const [showLibraryBnccPicker, setShowLibraryBnccPicker] = React.useState(false);
  const [libraryBnccQuery, setLibraryBnccQuery] = React.useState('');
  const [libraryCollectionFilters, setLibraryCollectionFilters] = React.useState<LibraryCollectionFilterState>(INITIAL_LIBRARY_COLLECTION_FILTERS);
  const [videoQuery, setVideoQuery] = React.useState('');
  const [videoActiveFilter, setVideoActiveFilter] = React.useState<VideoLibraryFilter>('Todos');
  const [videoSortMode, setVideoSortMode] = React.useState<VideoSortMode>('recentes');
  const [compactQuery, setCompactQuery] = React.useState('');
  const [compactActiveFilter, setCompactActiveFilter] = React.useState('Todos');
  const [compactSortMode, setCompactSortMode] = React.useState<VideoSortMode>('recentes');
  const [mediaDrivenItems, setMediaDrivenItems] = React.useState<LibraryMockItem[]>([]);
  const [mediaHubData, setMediaHubData] = React.useState<MediaHubResponse | null>(null);
  const [mediaSourceStatus, setMediaSourceStatus] = React.useState<'idle' | 'loading' | 'ready' | 'fallback'>('idle');
  const mockFlattenedItems = React.useMemo(
    () => buildUniqueLibraryItems([
      ...(config.featured ? [config.featured] : []),
      ...config.rails.flatMap((rail) => rail.items),
    ]),
    [config],
  );

  React.useEffect(() => {
    setShowLibraryFilters(false);
    setShowLibraryBnccPicker(false);
    setLibraryBnccQuery('');
    setLibraryCollectionFilters(INITIAL_LIBRARY_COLLECTION_FILTERS);
    setVideoQuery('');
    setVideoActiveFilter('Todos');
    setVideoSortMode('recentes');
    setCompactQuery('');
    setCompactActiveFilter('Todos');
    setCompactSortMode('recentes');
  }, [screen]);

  React.useEffect(() => {
    let isActive = true;

    if (!shouldUseMediaApi) {
      setMediaDrivenItems([]);
      setMediaHubData(null);
      setMediaSourceStatus('idle');
      return () => {
        isActive = false;
      };
    }

    setMediaDrivenItems([]);
    setMediaHubData(null);
    setMediaSourceStatus('loading');

    const loadItems = async () => {
      api.getMediaHub(screen as MediaHub)
        .then((response) => {
          if (!isActive) return;
          const nextItems = flattenMediaHubResponseToLibraryItems(response);
          setMediaDrivenItems(nextItems);
          setMediaHubData(nextItems.length > 0 ? response : null);
          setMediaSourceStatus('ready');
        })
        .catch(() => {
          if (!isActive) return;
          setMediaDrivenItems([]);
          setMediaHubData(null);
          setMediaSourceStatus('ready');
        });
    };

    loadItems().catch(() => {
      if (!isActive) return;
      setMediaDrivenItems([]);
      setMediaSourceStatus('ready');
    });

    return () => {
      isActive = false;
    };
  }, [screen, shouldUseMediaApi]);

  const videoLibraryItems = isVideoHub
    ? (shouldUseMediaApi ? mediaDrivenItems : mockFlattenedItems)
    : [];
  const compactLibraryItems = !isVideoHub
    ? (shouldUseMediaApi ? mediaDrivenItems : mockFlattenedItems)
    : [];
  const isBaseVideoCatalogEmpty = isVideoHub && videoLibraryItems.length === 0;
  const isBaseCompactCatalogEmpty = !isVideoHub && compactLibraryItems.length === 0;
  const currentLibraryItems = isVideoHub ? videoLibraryItems : compactLibraryItems;
  const availableCollectionFilterOptions = getLibraryCollectionFilterOptions(currentLibraryItems);
  // O modal de Filtros (personagens/ano/BNCC/CASEL) só faz sentido quando há opções
  // derivadas das coleções vinculadas. Para conteúdo ao vivo (fora do catalog seed) o
  // lookup não acha a coleção e as opções vêm vazias — nesse caso escondemos o botão
  // em vez de abrir um modal vazio. (Suporte pleno depende de plumbar coleções ao vivo.)
  const hasCollectionFilterOptions =
    availableCollectionFilterOptions.characters.length > 0
    || availableCollectionFilterOptions.age.length > 0
    || availableCollectionFilterOptions.bncc.length > 0
    || availableCollectionFilterOptions.casel.length > 0;
  const activeLibraryFilterCount = (Object.values(libraryCollectionFilters) as string[][]).reduce((total, values) => total + values.length, 0);
  const hasLibraryFiltersApplied = activeLibraryFilterCount > 0;
  const normalizedLibraryBnccQuery = normalizeLibraryText(libraryBnccQuery.trim());
  const filteredLibraryBnccOptions = availableCollectionFilterOptions.bncc.filter((code) => {
    if (!normalizedLibraryBnccQuery) {
      return true;
    }

    return normalizeLibraryText(code).includes(normalizedLibraryBnccQuery);
  });
  const normalizedVideoQuery = normalizeLibraryText(videoQuery.trim());
  const filteredVideoItems = isVideoHub
    ? videoLibraryItems.filter((item) => {
      if (!matchesLibraryCollectionFilters(item, libraryCollectionFilters)) {
        return false;
      }

      if (!matchesVideoLibraryFilter(item, videoActiveFilter)) {
        return false;
      }

      if (!normalizedVideoQuery) {
        return true;
      }

      return buildLibrarySearchText(item).includes(normalizedVideoQuery);
    })
    : [];
  const sortedVideoItems = isVideoHub
    ? [...filteredVideoItems].sort((left, right) => {
      if (videoSortMode === 'titulo') {
        return left.title.localeCompare(right.title, 'pt-BR');
      }

      return 0;
    })
    : [];
  const videoFilterTabs = isVideoHub
    && videoLibraryItems.length > 0
    ? [
      { label: 'Todos' as VideoLibraryFilter, count: videoLibraryItems.length, active: videoActiveFilter === 'Todos' },
      { label: 'Infantil' as VideoLibraryFilter, count: videoLibraryItems.filter((item) => matchesVideoLibraryFilter(item, 'Infantil')).length, active: videoActiveFilter === 'Infantil' },
      { label: 'Professor' as VideoLibraryFilter, count: videoLibraryItems.filter((item) => matchesVideoLibraryFilter(item, 'Professor')).length, active: videoActiveFilter === 'Professor' },
      { label: 'Acessível' as VideoLibraryFilter, count: videoLibraryItems.filter((item) => matchesVideoLibraryFilter(item, 'Acessível')).length, active: videoActiveFilter === 'Acessível' },
    ]
    : [];
  const normalizedCompactQuery = normalizeLibraryText(compactQuery.trim());
  const compactFilterSource = !isVideoHub
    ? (compactLibraryItems.length === 0 ? [] : COMPACT_FILTER_LABELS[screen as CompactLibraryKind] ?? config.quickFilters)
    : [];
  const compactFilterLabels = !isVideoHub ? ['Todos', ...compactFilterSource] : [];
  const filteredCompactItems = !isVideoHub
    ? compactLibraryItems.filter((item) => {
      if (!matchesLibraryCollectionFilters(item, libraryCollectionFilters)) {
        return false;
      }

      if (!matchesCompactLibraryFilter(item, compactActiveFilter, screen)) {
        return false;
      }

      if (!normalizedCompactQuery) {
        return true;
      }

      return buildLibrarySearchText(item).includes(normalizedCompactQuery);
    })
    : [];
  const sortedCompactItems = !isVideoHub
    ? [...filteredCompactItems].sort((left, right) => {
      if (compactSortMode === 'titulo') {
        return left.title.localeCompare(right.title, 'pt-BR');
      }

      return 0;
    })
    : [];
  const currentFilteredItems = isVideoHub ? sortedVideoItems : sortedCompactItems;
  const musicGridClassName = 'sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';
  const filteredMediaItemIds = React.useMemo(
    () => new Set(currentFilteredItems.map((item) => item.id)),
    [currentFilteredItems],
  );
  const mediaHeroItem = React.useMemo(() => {
    if (!mediaHubData?.hero) {
      return null;
    }

    const adaptedHero = adaptMediaCardToLibraryItem(mediaHubData.hero);
    return filteredMediaItemIds.has(adaptedHero.id) ? adaptedHero : null;
  }, [filteredMediaItemIds, mediaHubData]);
  const mediaRailSections = React.useMemo(() => {
    if (!mediaHubData) {
      return [];
    }

    return adaptMediaShelvesToLibraryItems(mediaHubData, filteredMediaItemIds, mediaHeroItem?.id);
  }, [filteredMediaItemIds, mediaHeroItem?.id, mediaHubData]);
  const compactFilterTabs = !isVideoHub
    ? compactFilterLabels.map((label) => ({
      label,
      count: label === 'Todos'
        ? compactLibraryItems.length
        : compactLibraryItems.filter((item) => matchesCompactLibraryFilter(item, label, screen)).length,
      active: compactActiveFilter === label,
    }))
    : [];
  const compactEmptyStateMessage = isBaseCompactCatalogEmpty
    ? getLibraryEmptyStateMessage(screen, brandDisplayName)
    : 'Ajuste a busca ou limpe os filtros para voltar ao acervo completo.';
  const compactSectionTitle = isMaterialsHub
    ? (isBaseCompactCatalogEmpty ? 'Nenhum material publicado ainda.' : 'Documentos para abrir agora.')
    : isFormationsHub
      ? (isBaseCompactCatalogEmpty ? 'Nenhum roteiro publicado ainda.' : 'Escolha o roteiro pelo momento da conversa.')
      : `${sortedCompactItems.length} entradas disponíveis para explorar.`;
  const compactGridClassName = isCorujaLibraryHub ? 'md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4';
  const videoEmptyStateMessage = isBaseVideoCatalogEmpty
    ? getLibraryEmptyStateMessage('videos', brandDisplayName)
    : 'Ajuste a busca ou limpe os filtros para voltar ao acervo completo.';
  const musicEmptyStateMessage = compactLibraryItems.length === 0
    ? getLibraryEmptyStateMessage('music', brandDisplayName)
    : 'Ajuste a busca ou limpe os filtros para voltar ao acervo completo.';
  const libraryFilterTabs = isVideoHub ? videoFilterTabs : compactFilterTabs;
  const librarySectionTitle = isVideoHub
    ? (isBaseVideoCatalogEmpty ? 'Nenhum video publicado ainda.' : `${sortedVideoItems.length} entradas disponíveis para explorar.`)
    : compactSectionTitle;
  const corujaSortActiveClass = 'border-[#7A2A98] bg-[#5D1E76] text-white shadow-[0_14px_28px_rgba(93,30,118,0.35)]';
  const corujaSortIdleClass = 'border-white/12 bg-white/10 text-white/82 hover:bg-white/14';
  const corujaStageShellClass = 'border border-white/12 bg-[linear-gradient(180deg,rgba(7,32,42,0.78),rgba(4,27,36,0.72))] shadow-[0_20px_48px_rgba(4,27,36,0.24)] backdrop-blur-xl';
  const corujaSearchFieldClass = 'flex min-h-14 flex-1 items-center gap-3 rounded-[28px] border border-white/12 bg-white/10 pl-4 pr-3 text-sm text-white/72 shadow-[0_12px_28px_rgba(4,27,36,0.18)] backdrop-blur-xl transition-colors focus-within:border-[#EA9A3B]/45';
  const corujaSearchResultBadgeClass = 'inline-flex items-center rounded-full bg-white/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/78';
  const corujaSectionTitleClass = 'text-[1.12rem] font-black leading-[1] tracking-[-0.03em] text-[#FFB347] md:text-[1.2rem]';
  const corujaMediaCardClass = 'group rounded-[1.2rem] border border-white/[0.08] bg-[rgba(12,26,52,0.45)] p-2.5 pb-3 shadow-[0_8px_32px_rgba(3,10,22,0.28)] backdrop-blur-xl transition-all duration-200 md:hover:-translate-y-1 hover:border-white/[0.14] hover:bg-[rgba(12,26,52,0.55)] hover:shadow-[0_22px_42px_rgba(4,27,36,0.32)] active:scale-[0.995]';
  const corujaCompactCardClass = 'group flex items-start gap-3 rounded-[1.2rem] border border-white/[0.08] bg-[rgba(12,26,52,0.45)] p-3 shadow-[0_8px_32px_rgba(3,10,22,0.28)] backdrop-blur-xl transition-all duration-200 md:hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-[rgba(12,26,52,0.55)] hover:shadow-[0_22px_42px_rgba(4,27,36,0.28)] active:scale-[0.995]';
  const defaultVideoShellClass = 'border border-brand-primary/10 bg-white/92 shadow-[0_16px_34px_rgba(93,31,88,0.04)]';
  const defaultCompactShellClass = 'border border-brand-primary/10 bg-white/92 shadow-[0_16px_34px_rgba(27,31,35,0.04)]';
  const defaultSearchFieldClass = 'flex min-h-14 flex-1 items-center gap-3 rounded-[28px] border border-gray-200 bg-white pl-4 pr-3 text-sm text-gray-500 shadow-sm transition-colors hover:border-brand-primary/24 focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/10';
  const defaultSearchResultBadgeClass = 'inline-flex items-center rounded-full bg-brand-primary/[0.06] px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-brand-primary/72';
  const desktopSearchBarLayoutClass = 'flex flex-col gap-3 xl:flex-row xl:items-center';
  const desktopSearchMetaClass = 'flex min-w-0 flex-wrap items-center gap-2 xl:w-auto xl:min-w-[15rem] xl:max-w-[26rem] xl:justify-end';
  const desktopFilterRailSpacingClass = 'pt-1.5 xl:pt-2';
  const toggleLibraryCollectionFilter = (category: keyof LibraryCollectionFilterState, value: string) => {
    setLibraryCollectionFilters((prev) => {
      const currentValues = prev[category];
      const hasValue = currentValues.includes(value);

      return {
        ...prev,
        [category]: hasValue
          ? currentValues.filter((entry) => entry !== value)
          : [...currentValues, value],
      };
    });
  };
  const clearLibraryFilters = () => {
    setLibraryCollectionFilters(INITIAL_LIBRARY_COLLECTION_FILTERS);
  };
  const clearLibraryBnccFilters = () => {
    setLibraryCollectionFilters((prev) => ({
      ...prev,
      bncc: [],
    }));
  };
  const closeLibraryBnccPicker = () => {
    setShowLibraryBnccPicker(false);
    setLibraryBnccQuery('');
  };
  const openCollection = (collectionId?: string) => {
    if (!collectionId) {
      return;
    }

    onNavigate('home', { collectionId });
  };

  const openItem = async (item: LibraryMockItem) => {
    const fallbackCollectionId = item.collectionId || FALLBACK_LIBRARY_COLLECTION_ID;
    // Abre janela em branco ANTES do await para preservar o gesto do usuário.
    // Não usar noopener aqui: no Chrome moderno window.open com noopener retorna null,
    // impossibilitando a navegação posterior via pendingDocumentWindow.location.href.
    const pendingDocumentWindow = item.assetType === 'pdf' && !item.assetUrl
      ? window.open('', '_blank')
      : null;
    const shouldResolvePlayback = item.assetType === 'audio'
      || item.assetType === 'video'
      || item.assetType === 'pdf'
      || !item.assetUrl;
    const resolvedPlayback = shouldResolvePlayback
      ? await api.resolveMediaPlayback(item.id)
      : null;

    const resolvedUrl = resolvedPlayback?.source.url ?? item.assetUrl;
    const resolvedAssetType = resolvedPlayback?.item.kind === 'video'
      ? 'video'
      : resolvedPlayback?.item.kind === 'audio'
        ? 'audio'
        : resolvedUrl
          ? 'pdf'
          : item.assetType;
    const resolvedTitle = resolvedPlayback?.item.title ?? item.assetTitle ?? item.title;

    if (resolvedAssetType === 'audio' && resolvedUrl) {
      pendingDocumentWindow?.close();
      onNavigate('player_audio', {
        collectionId: fallbackCollectionId,
        mediaItemId: item.id,
        assetUrl: resolvedUrl,
        assetTitle: resolvedTitle,
      });
      return;
    }

    if (resolvedAssetType === 'video' && resolvedUrl) {
      pendingDocumentWindow?.close();
      onNavigate('player_video', {
        collectionId: fallbackCollectionId,
        mediaItemId: item.id,
        assetUrl: resolvedUrl,
        assetTitle: resolvedTitle,
        assetOfflineAvailable: item.assetOfflineAvailable ?? undefined,
      });
      return;
    }

    if (resolvedAssetType === 'pdf' && resolvedUrl) {
      if (pendingDocumentWindow) {
        pendingDocumentWindow.location.href = resolvedUrl;
      } else {
        window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    pendingDocumentWindow?.close();
    openCollection(item.collectionId);
  };

  const LibraryFilterDrawer = () => (
    <CollectionFiltersModal
      availableOptions={availableCollectionFilterOptions}
      activeFilters={libraryCollectionFilters}
      onToggleFilter={toggleLibraryCollectionFilter}
      onClear={clearLibraryFilters}
      onClose={() => setShowLibraryFilters(false)}
      resultsCount={currentLibraryItems.length === 0 ? 0 : (isVideoHub ? sortedVideoItems.length : sortedCompactItems.length)}
      onOpenBncc={() => setShowLibraryBnccPicker(true)}
    />
  );

  const LibraryBnccPicker = () => (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={closeLibraryBnccPicker} />

      <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#fcfbff] shadow-2xl md:h-[82vh] md:w-[720px] md:rounded-[32px]">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-white px-5 py-4 md:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-green-600">Filtro pedagógico</p>
            <h2 className="mt-1 text-xl font-black text-gray-800">Selecionar BNCC</h2>
            <p className="mt-1 text-sm text-gray-500">
              Encontre habilidades por código para refinar os itens desta biblioteca.
            </p>
          </div>

          <button
            type="button"
            onClick={closeLibraryBnccPicker}
            aria-label="Fechar seletor de BNCC"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
          >
            <Icons.X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 md:px-6">
          <div className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
            <label className="flex items-center gap-3 rounded-[20px] border border-gray-200 bg-white px-4 py-3 shadow-sm transition-colors focus-within:border-green-300 focus-within:ring-2 focus-within:ring-green-100">
              <Icons.Search size={16} className="text-gray-400" />
              <input
                type="search"
                value={libraryBnccQuery}
                onChange={(event) => setLibraryBnccQuery(event.target.value)}
                placeholder="Pesquisar código BNCC"
                className="min-w-0 flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {filteredLibraryBnccOptions.map((code) => {
              const isActive = libraryCollectionFilters.bncc.includes(code);

              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggleLibraryCollectionFilter('bncc', code)}
                  className={`rounded-xl border px-4 py-2 text-sm font-bold transition-all active:scale-95 ${isActive
                    ? 'bg-green-500 text-white border-green-500 shadow-md shadow-green-500/20'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-green-500/30'
                    }`}
                >
                  {code}
                </button>
              );
            })}
          </div>

          {filteredLibraryBnccOptions.length === 0 && (
            <div className="mt-6 rounded-[24px] border border-dashed border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
              Nenhuma habilidade encontrada para esse termo.
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-white shrink-0 flex gap-4">
          <button
            type="button"
            onClick={clearLibraryBnccFilters}
            className="px-6 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
          >
            Limpar
          </button>
          <Button fullWidth onClick={closeLibraryBnccPicker}>
            <Icons.Check size={20} />
            Continuar
          </Button>
        </div>
      </div>
    </div>
  );

  const renderLibraryGridCard = (item: LibraryMockItem, itemIndex: number, cardClassName: string) => {
    if (isVideoHub || isMusicHub) {
      const usesVideoFrame = item.variant === 'video' || item.assetType === 'video';
      const isSpotifyAudioCard = isMusicHub && (item.variant === 'track' || item.assetType === 'audio');
      const previewRadiusClass = usesVideoFrame ? 'rounded-[12px]' : isSpotifyAudioCard ? 'rounded-[10px]' : 'rounded-[1rem]';
      const mediaMetaLabel = getMediaCardMetaLabel(item);
      const videoThumbnailBadgeLabel = usesVideoFrame ? getVideoThumbnailBadgeLabel(item) : '';
      const videoSupportingLine = usesVideoFrame ? getDistinctVideoSupportingLine(item) : '';
      const audioSupportingLine = isSpotifyAudioCard
        ? (item.relatedCollection || item.description || item.eyebrow)
        : (item.description || item.relatedCollection || item.eyebrow);
      const videoProgressPercent = usesVideoFrame
        ? Math.max(0, Math.min(100, Math.round(item.progress ?? 0)))
        : 0;
      const hasVideoProgress = usesVideoFrame && videoProgressPercent > 0;

      return (
        <CardContainer
          key={`${item.id}-${itemIndex}`}
          item={item}
          onOpen={openItem}
          className={cardClassName}
        >
          {isCorujaLibraryHub ? renderItemPreview(item, false, true) : (
            <div className={`relative overflow-hidden ${previewRadiusClass} border ${isSpotifyAudioCard ? 'border-brand-primary/10 bg-[linear-gradient(180deg,#fdf9fe,#f6eff8)]' : 'border-brand-primary/10 bg-slate-100'} ${usesVideoFrame ? 'aspect-video' : 'aspect-square'}`}>
              {item.coverImage ? (
                <img src={item.coverImage} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
              ) : (
                <div className={`h-full w-full ${isSpotifyAudioCard ? 'bg-[radial-gradient(circle_at_top_left,rgba(93,31,88,0.22),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(78,168,222,0.12),transparent_50%),linear-gradient(180deg,#fcf8fd,#f2ebf6)]' : 'bg-[radial-gradient(circle_at_top_left,rgba(93,31,88,0.14),transparent_55%),linear-gradient(180deg,#f8f4fa,#f2ebf5)]'}`} />
              )}

              <div className={`absolute inset-0 ${isSpotifyAudioCard ? 'bg-brand-primary/0 transition-colors duration-200 group-hover:bg-brand-primary/10' : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(15,23,42,0.34))]'}`} />
              {!isSpotifyAudioCard && (
                <div className={`absolute inset-0 transition-colors duration-200 ${usesVideoFrame ? 'bg-brand-primary/0 group-hover:bg-brand-primary/16' : 'bg-black/0 group-hover:bg-black/24'}`} />
              )}
              {usesVideoFrame ? (
                <>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <span className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-brand-primary text-white opacity-0 scale-95 shadow-[0_16px_30px_rgba(93,31,88,0.32)] backdrop-blur-[2px] transition-all duration-200 group-hover:opacity-100 group-hover:scale-100">
                      <Icons.Play size={18} className="fill-current stroke-none" />
                    </span>
                  </span>
                  <span className="pointer-events-none absolute bottom-2 right-2 z-[2] inline-flex items-center rounded-[4px] bg-black/80 px-1.5 py-1 text-[10px] font-black leading-none text-white shadow-sm">
                    {videoThumbnailBadgeLabel}
                  </span>
                </>
              ) : isSpotifyAudioCard ? (
                <span className="pointer-events-none absolute bottom-3 right-3 z-[2] inline-flex items-center justify-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary text-white opacity-0 translate-y-2 shadow-[0_14px_26px_rgba(93,31,88,0.28)] transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                    <Icons.Headphones size={18} className="stroke-[2.2px]" />
                  </span>
                </span>
              ) : (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/60 text-white opacity-0 scale-95 shadow-lg backdrop-blur-[2px] transition-all duration-200 group-hover:opacity-100 group-hover:scale-100">
                    {isVideoHub ? (
                      <Icons.Play size={18} className="fill-current stroke-none" />
                    ) : (
                      <Icons.Headphones size={18} className="stroke-[2.2px]" />
                    )}
                  </span>
                </span>
              )}

              {hasVideoProgress && (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] block h-1 bg-black/25">
                  <span
                    className="block h-full bg-red-500"
                    style={{ width: `${videoProgressPercent}%` }}
                    aria-label={`Assistido ${videoProgressPercent}%`}
                  />
                </span>
              )}
            </div>
          )}

          <div className={`min-w-0 ${usesVideoFrame ? 'mt-3 flex min-h-[68px] flex-col' : isSpotifyAudioCard ? 'mt-2.5 flex min-h-[56px] flex-col px-1 pb-1' : 'mt-2.5'}`}>
            {/* Category badge — shown before title for video cards, matching admin card style */}
            {usesVideoFrame && videoSupportingLine && (
              <div className="mb-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${isCorujaLibraryHub ? 'bg-white/10 text-[#FFB347]' : 'bg-brand-primary/10 text-brand-primary'}`}>
                  {videoSupportingLine}
                </span>
              </div>
            )}
            <h3 className={`line-clamp-2 ${usesVideoFrame ? 'text-[14px] font-bold leading-[1.35] tracking-normal' : isSpotifyAudioCard ? 'text-[13px] font-bold leading-[1.35] tracking-[-0.01em]' : 'text-[15px] font-black leading-[1.18] tracking-[-0.02em]'} ${isCorujaLibraryHub ? 'text-[#FFF4E3]' : 'text-brand-primary'}`}>
              {item.title}
            </h3>
            {audioSupportingLine && (
              <p className={`${isSpotifyAudioCard ? 'mt-1 line-clamp-2 text-[12px] leading-4 text-gray-500' : usesVideoFrame ? 'mt-1 line-clamp-1 text-[13px] leading-4' : 'mt-1.5 line-clamp-1 text-[12px]'} ${isCorujaLibraryHub ? 'text-[#D4DCF0]' : 'text-gray-500'}`}>
                {audioSupportingLine}
              </p>
            )}
            {!isSpotifyAudioCard && !usesVideoFrame && mediaMetaLabel && (
              <p className={`mt-1 line-clamp-1 text-[11px] font-semibold uppercase tracking-[0.13em] ${isCorujaLibraryHub ? 'text-[#FFB347]' : 'text-brand-primary/65'}`}>
                {mediaMetaLabel}
              </p>
            )}
          </div>
        </CardContainer>
      );
    }

    if (isFormationsHub) {
      const ILLUSTRATED_PALETTES = [
        { bg: 'bg-violet-50', border: 'border-violet-200/60', badge: 'bg-violet-100 text-violet-700', gradient: 'from-violet-50' },
        { bg: 'bg-rose-50', border: 'border-rose-200/60', badge: 'bg-rose-100 text-rose-700', gradient: 'from-rose-50' },
        { bg: 'bg-amber-50', border: 'border-amber-200/60', badge: 'bg-amber-100 text-amber-700', gradient: 'from-amber-50' },
        { bg: 'bg-sky-50', border: 'border-sky-200/60', badge: 'bg-sky-100 text-sky-700', gradient: 'from-sky-50' },
        { bg: 'bg-emerald-50', border: 'border-emerald-200/60', badge: 'bg-emerald-100 text-emerald-700', gradient: 'from-emerald-50' },
        { bg: 'bg-orange-50', border: 'border-orange-200/60', badge: 'bg-orange-100 text-orange-700', gradient: 'from-orange-50' },
      ] as const;
      const palette = ILLUSTRATED_PALETTES[itemIndex % ILLUSTRATED_PALETTES.length];
      const PreviewIcon = getLibraryBadgeIcon(item);

      return (
        <CardContainer
          key={`${item.id}-${itemIndex}`}
          item={item}
          onOpen={openItem}
          className={`group rounded-[1.6rem] border overflow-hidden shadow-[0_12px_28px_rgba(93,31,88,0.05)] transition-all duration-200 md:hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(93,31,88,0.08)] active:scale-[0.995] ${palette.border} ${palette.bg}`}
        >
          <div className="relative flex flex-col min-h-[152px] p-4">
            {/* Cover image — absolute right */}
            <div className="absolute right-0 top-0 bottom-0 w-[42%] pointer-events-none select-none">
              {item.coverImage ? (
                <img src={item.coverImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <PreviewIcon size={44} className="opacity-[0.12]" />
                </div>
              )}
              <div className={`absolute inset-0 bg-gradient-to-r ${palette.gradient} to-transparent`} />
            </div>

            {/* Left content */}
            <div className="pr-[44%] flex flex-col flex-1 gap-2">
              {item.eyebrow && (
                <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.13em] ${palette.badge}`}>
                  {item.eyebrow}
                </span>
              )}
              <h3 className="font-black text-gray-800 text-[1rem] leading-[1.2] tracking-[-0.02em] line-clamp-2">
                {item.title}
              </h3>
              {item.description && (
                <p className="text-xs text-gray-500 line-clamp-2 leading-5">
                  {item.description}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-900/8 pr-[44%]">
              <span className="text-[11px] font-bold text-gray-500">{item.meta}</span>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-brand-primary transition-transform duration-150 group-hover:translate-x-0.5">
                {item.ctaLabel}
                <Icons.ChevronRight size={14} />
              </span>
            </div>
          </div>
        </CardContainer>
      );
    }

    return (
      <CardContainer
        key={`${item.id}-${itemIndex}`}
        item={item}
        onOpen={openItem}
        className={cardClassName}
      >
        {isCorujaLibraryHub ? (
          <>
            <div className="w-20 shrink-0">
              {renderItemPreview(item, false, isCorujaLibraryHub, true)}
            </div>

            {renderMinimalLibraryCardBody(item, isCorujaLibraryHub)}
          </>
        ) : (
          (() => {
            const PreviewIcon = getLibraryBadgeIcon(item);
            const badgeLabel = getLibraryBadgeLabel(item);
            const supportingText = getLibrarySupportingText(item);
            const detailChipLabel = item.variant === 'material'
              ? (item.assetType === 'audio' ? 'Áudio' : item.assetType === 'video' ? 'Vídeo' : 'Documento')
              : 'Percurso';
            const actionLabel = item.variant === 'material' ? 'Abrir' : 'Explorar';

            return (
              <>
                <div className="flex items-start gap-4">
                  <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-xl border border-brand-primary/10 bg-[linear-gradient(180deg,#fdf9fe,#f6eff8)] shadow-sm">
                    {item.coverImage ? (
                      <img src={item.coverImage} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(93,31,88,0.16),transparent_45%),linear-gradient(180deg,#f8f4fa,#f2ebf5)] text-brand-primary/55">
                        <PreviewIcon size={24} className={item.variant === 'video' ? 'fill-current stroke-none' : 'stroke-[2px]'} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-brand-primary/[0.08] px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-brand-primary">
                        {badgeLabel}
                      </span>
                    </div>

                    <h3 className="line-clamp-2 text-[1.02rem] font-black leading-[1.15] tracking-[-0.02em] text-brand-primary">
                      {item.title}
                    </h3>

                    {supportingText && (
                      <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-gray-500">
                        {supportingText}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-brand-primary/8 pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                      {detailChipLabel}
                    </span>
                    {item.variant === 'formation' && badgeLabel !== detailChipLabel && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                        {badgeLabel}
                      </span>
                    )}
                  </div>

                  <span className="inline-flex items-center gap-1 text-sm font-bold text-brand-primary transition-transform group-hover:translate-x-0.5">
                    {actionLabel}
                    <Icons.ChevronRight size={16} />
                  </span>
                </div>
              </>
            );
          })()
        )}
      </CardContainer>
    );
  };

  const renderMediaRailBlocks = (
    cardClassName: string,
    gridClassName: string,
    emptyTitle: string,
    options?: {
      compactMode?: boolean;
      flatItems?: LibraryMockItem[];
    },
  ) => {
    // Compact mode: lista plana de items (usado quando há poucos itens)
    if (options?.compactMode) {
      const flatItems = options.flatItems ?? [];
      if (flatItems.length > 0) {
        return (
          <div className={`mt-3 grid gap-3 ${gridClassName}`}>
            {flatItems.map((item, itemIndex) => renderLibraryGridCard(item, itemIndex, cardClassName))}
          </div>
        );
      }
      return (
        <div className={`mt-4 rounded-[1.35rem] px-5 py-8 text-center ${isCorujaLibraryHub ? 'border border-white/12 bg-white/10 shadow-[0_16px_34px_rgba(4,27,36,0.18)] backdrop-blur-xl' : 'border border-dashed border-brand-primary/18 bg-white/90 shadow-sm'}`}>
          <p className={`text-[11px] font-black uppercase tracking-[0.18em] ${isCorujaLibraryHub ? 'text-white/55' : 'text-brand-primary/55'}`}>Nenhum resultado</p>
          <p className={`mt-2 text-sm leading-6 ${isCorujaLibraryHub ? 'text-white/72' : 'text-gray-500'}`}>{emptyTitle}</p>
        </div>
      );
    }

    // Coleta todos os items: hero primeiro, depois todos os rails, sem headers de seção
    const allItems: LibraryMockItem[] = [
      ...(mediaHeroItem ? [mediaHeroItem] : []),
      ...mediaRailSections.flatMap((shelf) => shelf.items),
    ];

    if (allItems.length > 0) {
      return (
        <div className={`mt-3 grid gap-3 ${gridClassName}`}>
          {allItems.map((item, itemIndex) => renderLibraryGridCard(item, itemIndex, cardClassName))}
        </div>
      );
    }

    return (
      <div className={`mt-4 rounded-[1.35rem] px-5 py-8 text-center ${isCorujaLibraryHub ? 'border border-white/12 bg-white/10 shadow-[0_16px_34px_rgba(4,27,36,0.18)] backdrop-blur-xl' : 'border border-dashed border-brand-primary/18 bg-white/90 shadow-sm'}`}>
        <p className={`text-[11px] font-black uppercase tracking-[0.18em] ${isCorujaLibraryHub ? 'text-white/55' : 'text-brand-primary/55'}`}>Nenhum resultado</p>
        <p className={`mt-2 text-sm leading-6 ${isCorujaLibraryHub ? 'text-white/72' : 'text-gray-500'}`}>{emptyTitle}</p>
      </div>
    );
  };

  return (
    <div className={`relative flex h-full flex-col ${screenSurface.page} pb-24 md:pb-0`}>
      {isCorujaLibraryHub && (
        <div
          className="fixed inset-x-0 top-0 z-0 h-[520px] overflow-hidden pointer-events-none md:h-[860px]"
          aria-hidden="true"
        >
          <div
            className="absolute inset-[-4%]"
            style={{
              transform: 'scale(1.06)',
              transformOrigin: isMobile ? 'center top' : '72% top',
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${isMobile ? '/coruja-hero-mobile.webp' : brandHomeHeroImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: isMobile ? 'center top' : 'right 20%',
                backgroundRepeat: 'no-repeat',
                filter: 'saturate(1.08) brightness(1.02)',
              }}
            />
          </div>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: isMobile
                ? 'radial-gradient(circle at 82% 14%, rgba(255,214,120,0.16) 0%, transparent 26%), linear-gradient(180deg, rgba(4,27,36,0.06) 0%, rgba(4,27,36,0.18) 18%, rgba(4,27,36,0.34) 38%, rgba(4,27,36,0.50) 58%, rgba(4,27,36,0.68) 78%, rgba(4,27,36,0.82) 92%, #041b24 100%)'
                : 'radial-gradient(circle at 72% 24%, rgba(255,214,120,0.18) 0%, rgba(255,214,120,0.08) 14%, transparent 30%), linear-gradient(90deg, rgba(4,27,36,0.78) 0%, rgba(4,27,36,0.42) 24%, rgba(4,27,36,0.12) 46%, rgba(4,27,36,0.18) 100%), linear-gradient(180deg, rgba(4,27,36,0.08) 0%, rgba(4,27,36,0.16) 18%, rgba(4,27,36,0.28) 38%, rgba(4,27,36,0.44) 56%, rgba(4,27,36,0.62) 74%, rgba(4,27,36,0.80) 88%, rgba(4,27,36,0.92) 100%)',
            }}
          />
          <div className="absolute inset-x-0 bottom-[-1px] h-40 bg-[linear-gradient(180deg,rgba(4,27,36,0)_0%,rgba(4,27,36,0.10)_20%,rgba(4,27,36,0.22)_42%,rgba(4,27,36,0.42)_66%,rgba(4,27,36,0.68)_84%,rgba(4,27,36,0.88)_100%)] md:h-60" />
        </div>
      )}

      <PageHeader
        title={config.title}
        onBack={() => onNavigate('home')}
        className={isCorujaLibraryHub ? '!bg-transparent [&_h1]:!text-white [&_button]:!bg-white/10 [&_button]:!text-white [&_button]:!shadow-none' : ''}
      />

      <div className={`flex-1 overflow-y-auto px-4 pb-8 md:px-8 md:pb-12 ${isCorujaLibraryHub ? 'relative z-10 pt-[88px] md:pt-8' : ''}`}>
        <div>
          {isVideoHub ? (
            <>
              <div className={`mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] animate-fade-in-up ${isCorujaLibraryHub ? 'text-white/58' : 'text-brand-primary/55'}`}>
                <span>Bibliotecas</span>
                <span className={isCorujaLibraryHub ? 'text-white/28' : 'text-brand-primary/25'}>/</span>
                <span className={isCorujaLibraryHub ? 'text-white/78' : 'text-brand-primary/72'}>Vídeos</span>
              </div>

              <section className={`animate-fade-in-up rounded-[1.35rem] px-4 py-3.5 md:px-5 ${isCorujaLibraryHub ? corujaStageShellClass : defaultVideoShellClass}`}>
                <div className="flex w-full flex-col gap-3">
                  <div className={desktopSearchBarLayoutClass}>
                    <label className={isCorujaLibraryHub ? corujaSearchFieldClass : defaultSearchFieldClass}>
                      <Icons.Search size={18} className={isCorujaLibraryHub ? 'text-white/60 shrink-0' : 'text-brand-primary/55 shrink-0'} />
                      <input
                        type="search"
                        value={videoQuery}
                        onChange={(event) => setVideoQuery(event.target.value)}
                        placeholder="Pesquisar por título, coleção ou contexto de uso"
                        aria-label="Pesquisar vídeos"
                        className={`min-w-0 flex-1 bg-transparent text-[14px] outline-none ${isCorujaLibraryHub ? 'text-white placeholder:text-white/42' : 'text-brand-primary placeholder:text-gray-400'}`}
                      />
                    </label>

                    <div className={desktopSearchMetaClass}>
                      <span className={isCorujaLibraryHub ? corujaSearchResultBadgeClass : defaultSearchResultBadgeClass}>
                        {sortedVideoItems.length} resultados
                      </span>
                      {hasCollectionFilterOptions && (
                      <button
                        type="button"
                        onClick={() => setShowLibraryFilters(true)}
                        className={`inline-flex h-10 items-center gap-2 rounded-[20px] border px-3 md:px-4 transition-all active:scale-95 ${isCorujaLibraryHub
                          ? (activeLibraryFilterCount > 0 || showLibraryFilters ? corujaSortActiveClass : corujaSortIdleClass)
                          : activeLibraryFilterCount > 0 || showLibraryFilters
                            ? 'border-brand-primary bg-brand-primary text-white shadow-brand-primary/20'
                            : 'border-gray-200 bg-gray-50 text-gray-600 shadow-sm hover:border-brand-primary/20 hover:bg-white'}`}
                        title="Refinar busca"
                      >
                        <Icons.Filter size={18} strokeWidth={activeLibraryFilterCount > 0 || showLibraryFilters ? 2.5 : 2} />
                        <span className="hidden text-sm font-bold md:inline">Filtros</span>
                        {activeLibraryFilterCount > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-black text-white">
                            {activeLibraryFilterCount}
                          </span>
                        )}
                      </button>
                      )}
                    </div>
                  </div>

                  {hasLibraryFiltersApplied && (
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {libraryCollectionFilters.characters.map((value) => (
                        <button
                          key={`character-${value}`}
                          type="button"
                          onClick={() => toggleLibraryCollectionFilter('characters', value)}
                          className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          {value}
                          <Icons.X size={12} />
                        </button>
                      ))}
                      {libraryCollectionFilters.bncc.map((value) => (
                        <button
                          key={`bncc-${value}`}
                          type="button"
                          onClick={() => toggleLibraryCollectionFilter('bncc', value)}
                          className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          {value}
                          <Icons.X size={12} />
                        </button>
                      ))}
                      {libraryCollectionFilters.casel.map((value) => (
                        <button
                          key={`casel-${value}`}
                          type="button"
                          onClick={() => toggleLibraryCollectionFilter('casel', value)}
                          className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          {value}
                          <Icons.X size={12} />
                        </button>
                      ))}
                      {libraryCollectionFilters.age.map((value) => (
                        <button
                          key={`age-${value}`}
                          type="button"
                          onClick={() => toggleLibraryCollectionFilter('age', value)}
                          className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          {value}
                          <Icons.X size={12} />
                        </button>
                      ))}
                    </div>
                  )}

                  {videoFilterTabs.length > 0 && (
                    <div className={desktopFilterRailSpacingClass}>
                      <HorizontalFilterRail tone={isCorujaLibraryHub ? 'coruja' : 'default'}>
                        {videoFilterTabs.map((filter) => (
                          <button
                            key={`video-filter-${filter.label}`}
                            type="button"
                            onClick={() => setVideoActiveFilter(filter.label)}
                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition-all duration-200 ${filter.active
                              ? (isCorujaLibraryHub ? corujaSortActiveClass : ACTIVE_LIBRARY_TAB_CLASS)
                              : (isCorujaLibraryHub ? corujaSortIdleClass : NEUTRAL_LIBRARY_TAB_CLASS)}`}
                          >
                            <span>{filter.label}</span>
                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] leading-none ${isCorujaLibraryHub ? (filter.active ? 'bg-white/18 text-white' : 'bg-white/10 text-white/72') : 'bg-black/[0.04] text-brand-primary/70'}`}>
                              {filter.count}
                            </span>
                          </button>
                        ))}
                      </HorizontalFilterRail>
                    </div>
                  )}
                </div>
              </section>

              <section className={isCorujaLibraryHub ? 'pt-2 md:pt-3' : 'mt-4 animate-fade-in-up'} style={isCorujaLibraryHub ? undefined : { animationDelay: '100ms', opacity: 0 }}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className={isCorujaLibraryHub ? corujaSectionTitleClass : 'text-[1.08rem] font-black leading-[1] tracking-[-0.03em] text-brand-primary md:text-[1.2rem]'}>
                      {librarySectionTitle}
                    </h2>
                    {mediaSourceStatus === 'loading' && (
                      <p className={`mt-1 text-xs font-semibold ${isCorujaLibraryHub ? 'text-white/68' : 'text-brand-primary/55'}`}>
                        Atualizando catálogo de vídeos.
                      </p>
                    )}
                    {mediaSourceStatus === 'fallback' && (
                      <p className={`mt-1 text-xs font-semibold ${isCorujaLibraryHub ? 'text-white/68' : 'text-amber-700'}`}>
                        Exibindo catálogo de apoio enquanto os dados remotos não respondem.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                    <button
                      type="button"
                      onClick={() => setVideoSortMode('recentes')}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all duration-200 ${isCorujaLibraryHub ? (videoSortMode === 'recentes' ? corujaSortActiveClass : corujaSortIdleClass) : (videoSortMode === 'recentes' ? ACTIVE_LIBRARY_TAB_CLASS : NEUTRAL_LIBRARY_TAB_CLASS)}`}
                    >
                      <Icons.ArrowUpDown size={14} />
                      Mais recentes
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoSortMode('titulo')}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all duration-200 ${isCorujaLibraryHub ? (videoSortMode === 'titulo' ? corujaSortActiveClass : corujaSortIdleClass) : (videoSortMode === 'titulo' ? ACTIVE_LIBRARY_TAB_CLASS : NEUTRAL_LIBRARY_TAB_CLASS)}`}
                    >
                      <Icons.Type size={14} />
                      A-Z
                    </button>
                  </div>
                </div>

                {shouldUseMediaApi && mediaSourceStatus !== 'fallback'
                  ? renderMediaRailBlocks(
                    isCorujaLibraryHub
                      ? corujaMediaCardClass
                      : 'group rounded-[18px] border border-[#eaddeb] bg-white p-2.5 shadow-[0_10px_24px_rgba(93,31,88,0.05)] transition-all duration-200 md:hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(93,31,88,0.08)] active:scale-[0.995]',
                    'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
                    videoEmptyStateMessage,
                    {
                      compactMode: videoActiveFilter === 'Todos' && sortedVideoItems.length <= 10,
                      flatItems: sortedVideoItems,
                    },
                  )
                  : (
                    <>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                        {sortedVideoItems.map((item, itemIndex) => renderLibraryGridCard(
                          item,
                          itemIndex,
                          isCorujaLibraryHub
                            ? corujaMediaCardClass
                            : 'group rounded-[18px] border border-[#eaddeb] bg-white p-2.5 shadow-[0_10px_24px_rgba(93,31,88,0.05)] transition-all duration-200 md:hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(93,31,88,0.08)] active:scale-[0.995]',
                        ))}
                      </div>

                      {sortedVideoItems.length === 0 && (
                        <div className={`mt-4 rounded-[1.35rem] px-5 py-8 text-center ${isCorujaLibraryHub ? 'border border-white/12 bg-white/10 shadow-[0_16px_34px_rgba(4,27,36,0.18)] backdrop-blur-xl' : 'border border-dashed border-brand-primary/18 bg-white/90 shadow-sm'}`}>
                          <p className={`text-[11px] font-black uppercase tracking-[0.18em] ${isCorujaLibraryHub ? 'text-white/55' : 'text-brand-primary/55'}`}>Nenhum resultado</p>
                          <p className={`mt-2 text-sm leading-6 ${isCorujaLibraryHub ? 'text-white/72' : 'text-gray-500'}`}>
                            Ajuste a busca ou limpe os filtros para voltar ao acervo completo.
                          </p>
                        </div>
                      )}
                    </>
                  )}
              </section>
            </>
          ) : (
            <>
              <div className={`mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] animate-fade-in-up ${isCorujaLibraryHub ? 'text-white/58' : 'text-brand-primary/55'}`}>
                <span>Bibliotecas</span>
                <span className={isCorujaLibraryHub ? 'text-white/28' : 'text-brand-primary/25'}>/</span>
                <span className={isCorujaLibraryHub ? 'text-white/78' : 'text-brand-primary/72'}>{config.title}</span>
              </div>

              <section className={`animate-fade-in-up rounded-[1.35rem] px-4 py-3.5 md:px-5 ${isCorujaLibraryHub ? corujaStageShellClass : defaultCompactShellClass}`}>
                <div className="flex w-full flex-col gap-3">
                  <div className={desktopSearchBarLayoutClass}>
                    <label className={isCorujaLibraryHub ? corujaSearchFieldClass : defaultSearchFieldClass}>
                      <Icons.Search size={18} className={isCorujaLibraryHub ? 'text-white/60 shrink-0' : 'text-brand-primary/55 shrink-0'} />
                      <input
                        type="search"
                        value={compactQuery}
                        onChange={(event) => setCompactQuery(event.target.value)}
                        placeholder="Pesquisar por título, coleção ou contexto de uso"
                        aria-label={`Pesquisar em ${config.title}`}
                        className={`min-w-0 flex-1 bg-transparent text-[14px] outline-none ${isCorujaLibraryHub ? 'text-white placeholder:text-white/42' : 'text-brand-primary placeholder:text-gray-400'}`}
                      />
                    </label>

                    <div className={desktopSearchMetaClass}>
                      <span className={isCorujaLibraryHub ? corujaSearchResultBadgeClass : defaultSearchResultBadgeClass}>
                        {sortedCompactItems.length} resultados
                      </span>
                      {hasCollectionFilterOptions && (
                      <button
                        type="button"
                        onClick={() => setShowLibraryFilters(true)}
                        className={`inline-flex h-10 items-center gap-2 rounded-[20px] border px-3 md:px-4 transition-all active:scale-95 ${isCorujaLibraryHub
                          ? (activeLibraryFilterCount > 0 || showLibraryFilters ? corujaSortActiveClass : corujaSortIdleClass)
                          : activeLibraryFilterCount > 0 || showLibraryFilters
                            ? 'border-brand-primary bg-brand-primary text-white shadow-brand-primary/20'
                            : 'border-gray-200 bg-gray-50 text-gray-600 shadow-sm hover:border-brand-primary/20 hover:bg-white'}`}
                        title="Refinar busca"
                      >
                        <Icons.Filter size={18} strokeWidth={activeLibraryFilterCount > 0 || showLibraryFilters ? 2.5 : 2} />
                        <span className="hidden text-sm font-bold md:inline">Filtros</span>
                        {activeLibraryFilterCount > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-black text-white">
                            {activeLibraryFilterCount}
                          </span>
                        )}
                      </button>
                      )}
                    </div>
                  </div>

                  {hasLibraryFiltersApplied && (
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {libraryCollectionFilters.characters.map((value) => (
                        <button
                          key={`compact-character-${value}`}
                          type="button"
                          onClick={() => toggleLibraryCollectionFilter('characters', value)}
                          className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          {value}
                          <Icons.X size={12} />
                        </button>
                      ))}
                      {libraryCollectionFilters.bncc.map((value) => (
                        <button
                          key={`compact-bncc-${value}`}
                          type="button"
                          onClick={() => toggleLibraryCollectionFilter('bncc', value)}
                          className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          {value}
                          <Icons.X size={12} />
                        </button>
                      ))}
                      {libraryCollectionFilters.casel.map((value) => (
                        <button
                          key={`compact-casel-${value}`}
                          type="button"
                          onClick={() => toggleLibraryCollectionFilter('casel', value)}
                          className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          {value}
                          <Icons.X size={12} />
                        </button>
                      ))}
                      {libraryCollectionFilters.age.map((value) => (
                        <button
                          key={`compact-age-${value}`}
                          type="button"
                          onClick={() => toggleLibraryCollectionFilter('age', value)}
                          className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          {value}
                          <Icons.X size={12} />
                        </button>
                      ))}
                    </div>
                  )}

                  {compactFilterTabs.length > 0 && (
                    <div className={desktopFilterRailSpacingClass}>
                      <HorizontalFilterRail tone={isCorujaLibraryHub ? 'coruja' : 'default'}>
                        {compactFilterTabs.map((filter) => (
                          <button
                            key={`compact-filter-${filter.label}`}
                            type="button"
                            onClick={() => setCompactActiveFilter(filter.label)}
                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition-all duration-200 ${filter.active
                              ? (isCorujaLibraryHub ? corujaSortActiveClass : ACTIVE_LIBRARY_TAB_CLASS)
                              : (isCorujaLibraryHub ? corujaSortIdleClass : NEUTRAL_LIBRARY_TAB_CLASS)}`}
                          >
                            <span>{filter.label}</span>
                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] leading-none ${isCorujaLibraryHub ? (filter.active ? 'bg-white/18 text-white' : 'bg-white/10 text-white/72') : 'bg-black/[0.04] text-brand-primary/70'}`}>
                              {filter.count}
                            </span>
                          </button>
                        ))}
                      </HorizontalFilterRail>
                    </div>
                  )}
                </div>
              </section>

              <section className={isCorujaLibraryHub ? 'pt-2 md:pt-3' : 'mt-4 animate-fade-in-up'} style={isCorujaLibraryHub ? undefined : { animationDelay: '100ms', opacity: 0 }}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className={isCorujaLibraryHub ? corujaSectionTitleClass : 'text-[1.08rem] font-black leading-[1] tracking-[-0.03em] text-brand-primary md:text-[1.2rem]'}>
                      {compactSectionTitle}
                    </h2>
                    {isMusicHub && mediaSourceStatus === 'loading' && (
                      <p className={`mt-1 text-xs font-semibold ${isCorujaLibraryHub ? 'text-white/68' : 'text-brand-primary/55'}`}>
                        Atualizando catálogo de áudios.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                    <button
                      type="button"
                      onClick={() => setCompactSortMode('recentes')}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all duration-200 ${isCorujaLibraryHub ? (compactSortMode === 'recentes' ? corujaSortActiveClass : corujaSortIdleClass) : (compactSortMode === 'recentes' ? ACTIVE_LIBRARY_TAB_CLASS : NEUTRAL_LIBRARY_TAB_CLASS)}`}
                    >
                      <Icons.ArrowUpDown size={14} />
                      Recomendados
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompactSortMode('titulo')}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all duration-200 ${isCorujaLibraryHub ? (compactSortMode === 'titulo' ? corujaSortActiveClass : corujaSortIdleClass) : (compactSortMode === 'titulo' ? ACTIVE_LIBRARY_TAB_CLASS : NEUTRAL_LIBRARY_TAB_CLASS)}`}
                    >
                      <Icons.Type size={14} />
                      A-Z
                    </button>
                  </div>
                </div>

                {isMusicHub && shouldUseMediaApi
                  ? renderMediaRailBlocks(
                    isCorujaLibraryHub
                      ? corujaMediaCardClass
                      : 'group rounded-[16px] border border-brand-primary/10 bg-white p-2 shadow-[0_10px_24px_rgba(93,31,88,0.05)] transition-all duration-200 md:hover:-translate-y-1 hover:border-brand-primary/20 hover:shadow-[0_14px_24px_rgba(93,31,88,0.10)] active:scale-[0.995]',
                    musicGridClassName,
                    musicEmptyStateMessage,
                    {
                      compactMode: sortedCompactItems.length <= 10,
                      flatItems: sortedCompactItems,
                    },
                  )
                  : (
                    <>
                      <div className={`mt-3 grid gap-3 ${isMusicHub ? musicGridClassName : compactGridClassName}`}>
                        {sortedCompactItems.map((item, itemIndex) => renderLibraryGridCard(
                          item,
                          itemIndex,
                          isCorujaLibraryHub
                            ? (isMusicHub ? corujaMediaCardClass : corujaCompactCardClass)
                            : `${isMusicHub ? 'group rounded-[16px] border border-brand-primary/10 bg-white p-2 shadow-[0_10px_24px_rgba(93,31,88,0.05)] transition-all duration-200 md:hover:-translate-y-1 hover:border-brand-primary/20 hover:shadow-[0_14px_24px_rgba(93,31,88,0.10)] active:scale-[0.995]' : `group rounded-[1.6rem] border border-brand-primary/10 bg-white p-4 shadow-[0_12px_28px_rgba(93,31,88,0.05)] transition-all duration-200 md:hover:-translate-y-0.5 hover:border-brand-primary/18 hover:shadow-[0_18px_34px_rgba(93,31,88,0.08)] active:scale-[0.995] ${screenSurface.card}`}`,
                        ))}
                      </div>

                      {sortedCompactItems.length === 0 && (
                        <div className={`mt-4 rounded-[1.35rem] px-5 py-8 text-center ${isCorujaLibraryHub ? 'border border-white/12 bg-white/10 shadow-[0_16px_34px_rgba(4,27,36,0.18)] backdrop-blur-xl' : 'border border-dashed border-brand-primary/18 bg-white/90 shadow-sm'}`}>
                          <p className={`text-[11px] font-black uppercase tracking-[0.18em] ${isCorujaLibraryHub ? 'text-white/55' : 'text-brand-primary/55'}`}>Nenhum resultado</p>
                          <p className={`mt-2 text-sm leading-6 ${isCorujaLibraryHub ? 'text-white/72' : 'text-gray-500'}`}>
                            {compactEmptyStateMessage}
                          </p>
                        </div>
                      )}
                    </>
                  )}
              </section>
            </>
          )}
        </div>
      </div>

      {showLibraryFilters && hasCollectionFilterOptions && <LibraryFilterDrawer />}
      {showLibraryBnccPicker && <LibraryBnccPicker />}
    </div>
  );
};
