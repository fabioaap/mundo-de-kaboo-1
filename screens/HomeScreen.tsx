import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Icons } from '../components/Icons';
import { Collection, ScreenName, UserContentGrant, UserProfile } from '../types';
import { api, clearCollectionsCache, getCachedCollectionsSync, getCachedProfileSync } from '../lib/api';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { TABS, LOGO_URL, formatSegmentLabel, getCharacterBgColor, getCharacterColor, getCharacterImageUrl } from '../constants';
import { canAccessCollection, formatAccessDate, getAccessStatusLabel, getDaysUntilAccessExpiry, getProfileAccessStatus } from '../lib/access';
import { PageHeader } from '../components/PageHeader';
import { Button, Input } from '../design-system';
import { layoutSpacing } from '../design-system/layout/spacing';
import { Card3D } from '../components/Card3D';
import { CharacterAvatar } from '../components/CharacterAvatar';
import { CollectionFiltersModal } from '../components/CollectionFiltersModal';
import { HeroParallaxBackdrop } from '../components/HeroParallaxBackdrop';
import { useParallaxMotion } from '../hooks/useParallaxMotion';
import { useBrandConfig } from '../hooks/useBrandConfig';
import useIsMobile from '../hooks/useIsMobile';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { getCollectionDisplayCover, getCollectionTypeMeta } from '../lib/collectionPresentation';
import { lookupBncc } from '../lib/bnccLookup';
// @ts-ignore
import confetti from 'canvas-confetti';

interface HomeScreenProps {
  onNavigate: (screen: ScreenName, params?: any) => void;
  params?: any;
  accessProfile?: UserProfile | null;
  screenName?: 'home' | 'search';
  searchMode?: boolean;
}

// Define filter types
interface FilterState {
  characters: string[];
  bncc: string[];
  casel: string[];
  age: string[];
}

const INITIAL_FILTERS: FilterState = {
  characters: [],
  bncc: [],
  casel: [],
  age: []
};

const getInitialFilters = (params?: any): FilterState => {
  const filterCharacter = typeof params?.filterCharacter === 'string' ? params.filterCharacter.trim() : '';

  if (!filterCharacter) {
    return INITIAL_FILTERS;
  }

  return {
    ...INITIAL_FILTERS,
    characters: [filterCharacter],
  };
};

const AGE_ORDER = ['3 anos', '4 anos', '5 anos', '1º ano', '2º ano', '3º ano', '4º ano', '5º ano'];

const normalizeSearch = (str: string) => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

const capitalizeFirst = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

type HomeCollectionGroup = 'kits' | 'books';

const matchesCollectionGroup = (collection: Collection, group: HomeCollectionGroup) => {
  const type = getCollectionTypeMeta(collection).type;
  return group === 'books' ? type === 'book' : type === 'kit';
};

const formatBnccYear = (year: string) => year.replace(/;\s*/g, ' • ');

const formatBnccSelectionLabel = (count: number) => {
  if (count === 0) {
    return 'Nenhuma selecionada';
  }

  return `${count} ${count === 1 ? 'habilidade selecionada' : 'habilidades selecionadas'}`;
};

const collectionMatchesQuery = (collection: Collection, query: string) => {
  if (!query) return true;

  const searchIndex = [
    collection.title,
    collection.level,
    collection.theme,
    collection.learning_objectives,
    collection.characters?.join(' '),
    collection.bncc_skills?.join(' '),
    collection.casel_competencies?.join(' '),
    collection.age_grade?.join(' '),
  ]
    .filter(Boolean)
    .join(' ');

  return normalizeSearch(searchIndex).includes(query);
};

const ACCESS_BANNER_DISMISS_STORAGE_KEY = 'kaboo_access_banner_dismissed';

const getDismissedAccessBannerKey = (): string | null => {
  try {
    return localStorage.getItem(ACCESS_BANNER_DISMISS_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to read dismissed access banner state:', error);
    return null;
  }
};

const setDismissedAccessBannerKey = (value: string | null) => {
  try {
    if (value) {
      localStorage.setItem(ACCESS_BANNER_DISMISS_STORAGE_KEY, value);
      return;
    }

    localStorage.removeItem(ACCESS_BANNER_DISMISS_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to persist dismissed access banner state:', error);
  }
};

// Grid View Component - Responsive grid with multiple breakpoints
interface GridViewProps {
  collections: (Collection & { progress?: number })[];
  onCollectionClick: (collection: Collection) => void;
  grants: UserContentGrant[];
  tone?: 'default' | 'central-coruja';
}

const GridView: React.FC<GridViewProps> = ({ collections, onCollectionClick, grants, tone = 'default' }) => {
  const isCorujaTone = tone === 'central-coruja';
  const usesCollectionLayout = !isCorujaTone
    && collections.length > 0
    && collections.every((collection) => getCollectionTypeMeta(collection).type === 'kit');

  return (
    <div
      className={`grid auto-rows-fr ${isCorujaTone
        ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
          : usesCollectionLayout
            ? 'grid-cols-1'
          : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'} ${layoutSpacing.cardGridGap}`}
        style={{
          contain: 'layout style',
          ...(usesCollectionLayout
          ? { gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 24.75rem), 1fr))' }
          : null)
        }}
      >
      {collections.map((collection) => (
        <div key={collection.id} className="h-full w-full">
          <Card3D
            collection={collection}
            onCollectionClick={onCollectionClick}
            locked={!canAccessCollection(grants, collection.id)}
            tone={tone}
          />
        </div>
      ))}
    </div>
  );
};

interface CharacterFilterButtonProps {
  character: string;
  isActive: boolean;
  onClick: () => void;
  onPrepare?: () => void;
}

const CharacterFilterButton: React.FC<CharacterFilterButtonProps> = ({
  character,
  isActive,
  onClick,
  onPrepare,
}) => {
  const imageSrc = getCharacterImageUrl(character);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onPrepare}
      onFocus={onPrepare}
      className={`inline-flex min-h-12 items-center gap-2 rounded-full border px-2.5 py-2 pr-3 text-sm font-bold leading-none transition-all duration-200 ease-out active:scale-[0.98] ${isActive
        ? 'border-kaboo-primary/30 bg-kaboo-primary/[0.08] text-kaboo-primary shadow-[0_10px_24px_rgba(111,37,108,0.12)]'
        : 'border-gray-200 bg-white text-gray-600 hover:border-kaboo-primary/25 hover:bg-kaboo-primary/[0.03]'
        }`}
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

interface BnccPickerOption {
  code: string;
  description: string;
  component: string;
  year: string;
  yearTokens: string[];
  stage: string;
  knowledgeObject?: string;
  searchIndex: string;
}

interface BnccPickerFilters {
  stage: string;
  component: string;
  year: string;
}

const INITIAL_BNCC_PICKER_FILTERS: BnccPickerFilters = {
  stage: '',
  component: '',
  year: '',
};

interface BnccSummaryEntryProps {
  selectedCodes: string[];
  onOpen: () => void;
}

const BnccSummaryEntry: React.FC<BnccSummaryEntryProps> = ({ selectedCodes, onOpen }) => {
  const previewCodes = selectedCodes.slice(0, 2);
  const extraCount = selectedCodes.length - previewCodes.length;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      className="w-full rounded-[24px] border border-gray-200 bg-white p-4 text-left transition-all duration-200 hover:border-green-300 hover:bg-green-50/40 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-gray-400">
            <Icons.BookOpen size={14} />
            Habilidades BNCC
          </div>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            Procure por código, descrição ou componente.
          </p>
          <p className={`mt-3 text-sm font-bold ${selectedCodes.length > 0 ? 'text-green-700' : 'text-gray-600'}`}>
            {formatBnccSelectionLabel(selectedCodes.length)}
          </p>
          {selectedCodes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {previewCodes.map((code) => (
                <span
                  key={code}
                  className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-green-700"
                >
                  {code}
                </span>
              ))}
              {extraCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-gray-500">
                  +{extraCount}
                </span>
              )}
            </div>
          )}
        </div>

        <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-green-700">
          Abrir
          <Icons.ChevronLeft className="rotate-180" size={14} />
        </span>
      </div>
    </button>
  );
};

interface BnccPickerSheetProps {
  query: string;
  options: BnccPickerOption[];
  selectedCodes: string[];
  filters: BnccPickerFilters;
  stageOptions: string[];
  componentOptions: string[];
  yearOptions: string[];
  onQueryChange: (value: string) => void;
  onFilterChange: (category: keyof BnccPickerFilters, value: string) => void;
  onToggle: (code: string) => void;
  onClear: () => void;
  onClose: () => void;
  onApply: () => void;
}

const BnccPickerSheet: React.FC<BnccPickerSheetProps> = ({
  query,
  options,
  selectedCodes,
  filters,
  stageOptions,
  componentOptions,
  yearOptions,
  onQueryChange,
  onFilterChange,
  onToggle,
  onClear,
  onClose,
  onApply,
}) => {
  const selectedCount = selectedCodes.length;

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bncc-picker-title"
        aria-describedby="bncc-picker-description"
        className="relative flex h-full w-full flex-col overflow-hidden bg-[#fcfbff] shadow-2xl md:h-[82vh] md:w-[720px] md:rounded-[32px]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-white px-5 py-4 md:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-green-600">Filtro pedagógico</p>
            <h2 id="bncc-picker-title" className="mt-1 text-xl font-black text-gray-800">Selecionar BNCC</h2>
            <p id="bncc-picker-description" className="mt-1 text-sm text-gray-500">
              Encontre habilidades por código ou pelo texto da habilidade.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar seletor de BNCC"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
          >
            <Icons.X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 md:px-6">
          <div className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
            <Input
              autoFocus
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Ex.: EF15LP03, leitura, escuta"
              aria-label="Buscar habilidades BNCC"
              hint="Você pode buscar pelo código BNCC ou pela descrição da habilidade."
              className="rounded-2xl border-gray-200 bg-white"
            />

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-[0.12em] text-gray-500">
                Etapa
                <select
                  value={filters.stage}
                  onChange={(event) => onFilterChange('stage', event.target.value)}
                  className="h-11 rounded-2xl border border-gray-200 bg-white px-3 text-sm font-bold normal-case text-gray-700"
                >
                  <option value="">Todas</option>
                  {stageOptions.map((stage) => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-[0.12em] text-gray-500">
                Componente
                <select
                  value={filters.component}
                  onChange={(event) => onFilterChange('component', event.target.value)}
                  className="h-11 rounded-2xl border border-gray-200 bg-white px-3 text-sm font-bold normal-case text-gray-700"
                >
                  <option value="">Todos</option>
                  {componentOptions.map((component) => (
                    <option key={component} value={component}>{component}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-[0.12em] text-gray-500">
                Faixa
                <select
                  value={filters.year}
                  onChange={(event) => onFilterChange('year', event.target.value)}
                  className="h-11 rounded-2xl border border-gray-200 bg-white px-3 text-sm font-bold normal-case text-gray-700"
                >
                  <option value="">Todas</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-gray-500">
                {options.length} {options.length === 1 ? 'resultado' : 'resultados'}
              </span>
              <span aria-live="polite" className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${selectedCount > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {formatBnccSelectionLabel(selectedCount)}
              </span>
            </div>
          </div>

          <div className="mt-5 space-y-3 pb-24">
            {options.map((option) => {
              const isSelected = selectedCodes.includes(option.code);

              return (
                <button
                  type="button"
                  key={option.code}
                  onClick={() => onToggle(option.code)}
                  aria-pressed={isSelected}
                  className={`w-full rounded-[26px] border p-4 text-left shadow-sm transition-[transform,border-color,box-shadow,background-color] duration-200 ease-out active:scale-[0.99] ${isSelected
                    ? 'border-green-400 bg-[linear-gradient(135deg,rgba(240,253,244,0.96)_0%,rgba(255,255,255,1)_72%)] shadow-[0_18px_34px_rgba(34,197,94,0.12)]'
                    : 'border-gray-200 bg-white md:hover:-translate-y-0.5 hover:border-green-200 hover:shadow-[0_16px_28px_rgba(15,23,42,0.07)]'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm transition-colors ${isSelected
                      ? 'border-kaboo-primary bg-kaboo-primary text-white'
                      : 'border-gray-300 bg-white text-transparent'
                      }`}>
                      <Icons.Check size={14} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${isSelected
                          ? 'border-green-200 bg-white text-green-700'
                          : 'border-gray-200 bg-gray-50 text-gray-500'
                          }`}>
                          {option.code}
                        </span>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-green-700">
                            <Icons.Check size={11} />
                            Selecionada
                          </span>
                        )}
                      </span>
                      <span className="mt-2 block text-sm font-bold leading-relaxed text-gray-800">{option.description}</span>
                      <span className="mt-2 block text-xs font-medium leading-relaxed text-gray-500">
                        {option.component} • {formatBnccYear(option.year)}
                      </span>
                    </span>
                  </div>
                </button>
              );
            })}

            {options.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-gray-200 bg-white px-5 py-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                  <Icons.Search size={24} />
                </div>
                <p className="mt-4 text-sm font-bold text-gray-700">Nenhuma habilidade encontrada</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-500">Tente outro código, componente ou palavra-chave.</p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 bg-white px-4 py-4 md:px-6">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClear}
              className="rounded-2xl px-5 py-3 text-sm font-bold text-gray-500 transition-colors hover:bg-gray-100"
            >
              Limpar
            </button>
            <Button fullWidth onClick={onApply}>
              <Icons.Check size={18} />
              {selectedCount === 0
                ? 'Aplicar filtros'
                : `Aplicar ${selectedCount} ${selectedCount === 1 ? 'habilidade' : 'habilidades'}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SearchResultsListProps {
  collections: (Collection & { progress?: number })[];
  onCollectionClick: (collection: Collection) => void;
  searchTerm: string;
  availableLabelSingular: string;
  availableLabelPlural: string;
}

const SearchResultsList: React.FC<SearchResultsListProps> = ({
  collections,
  onCollectionClick,
  searchTerm,
  availableLabelSingular,
  availableLabelPlural,
}) => {
  const normalizedTerm = normalizeSearch(searchTerm.trim());
  const hasSearchTerm = normalizedTerm.length > 0;

  return (
    <div className="space-y-4 pt-4 animate-fade-in-up">
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
        {hasSearchTerm
          ? `${collections.length} ${collections.length === 1 ? 'Resultado encontrado' : 'Resultados encontrados'}`
          : `${collections.length} ${capitalizeFirst(collections.length === 1 ? availableLabelSingular : availableLabelPlural)}`}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {collections.map((collection) => {
          const displayCoverImage = getCollectionDisplayCover(collection) || collection.cover_image;
          const collectionTypeMeta = getCollectionTypeMeta(collection);
          const segmentLabel = collection.segments?.length
            ? formatSegmentLabel(collection.segments[0])
            : formatSegmentLabel(collection.level);
          const hasMatchingBncc = normalizedTerm
            ? collection.bncc_skills?.some((skill) => normalizeSearch(skill).includes(normalizedTerm))
            : false;

          return (
            <button
              key={collection.id}
              type="button"
              onClick={() => onCollectionClick(collection)}
              className="flex gap-4 p-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-kaboo-primary/20 transition-all active:scale-[0.98] cursor-pointer h-full text-left"
            >
              <img
                src={displayCoverImage}
                alt={collection.title}
                className="w-16 h-16 rounded-xl object-cover bg-gray-200 shrink-0"
              />

              <div className="flex-1 flex flex-col justify-center min-w-0">
                <h3 className="font-bold text-gray-800 text-sm mb-1 leading-tight line-clamp-2">{collection.title}</h3>

                <div className="flex mt-1 gap-1 flex-wrap">
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-black uppercase tracking-[0.12em] border ${collectionTypeMeta.softClassName}`}>
                    {collectionTypeMeta.shortLabel}
                  </span>

                  {segmentLabel && (
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md font-bold uppercase">
                      {segmentLabel}
                    </span>
                  )}

                  {hasMatchingBncc && (
                    <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-md font-bold uppercase">
                      BNCC
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center text-gray-300 shrink-0">
                <Icons.ChevronLeft className="rotate-180" size={20} />
              </div>
            </button>
          );
        })}
      </div>

      {collections.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
            <Icons.Search size={32} />
          </div>
          <p className="text-gray-600 font-bold">Nenhum resultado encontrado</p>
          <p className="text-sm text-gray-400 mt-1">Tente buscar por outras palavras-chave.</p>
        </div>
      )}
    </div>
  );
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate, params, accessProfile, screenName = 'home', searchMode = false }) => {
  const isSearchExperience = searchMode || Boolean(params?.inlineSearch);
  const currentCollectionGroup: HomeCollectionGroup = params?.collectionGroup === 'books' ? 'books' : 'kits';
  const baseHomeParams = currentCollectionGroup === 'books' ? { collectionGroup: 'books' as const } : undefined;
  const collectionGroupTitle = currentCollectionGroup === 'books' ? 'Livros' : 'Coleções';
  const allCollectionGroupTitle = currentCollectionGroup === 'books' ? 'Todos os Livros' : 'Todas as Coleções';
  const filteredCollectionGroupTitle = currentCollectionGroup === 'books' ? 'Livros filtrados' : 'Coleções filtradas';
  const searchCollectionGroupTitle = currentCollectionGroup === 'books' ? 'Busca em Livros' : 'Busca em Coleções';
  const availableLabelSingular = currentCollectionGroup === 'books' ? 'livro disponível' : 'coleção disponível';
  const availableLabelPlural = currentCollectionGroup === 'books' ? 'livros disponíveis' : 'coleções disponíveis';
  const { bootstrap: brandBootstrap, slug: brandSlug, isFeatureEnabled } = useBrandConfig();
  const brandDisplayName = brandBootstrap.settings.display_name || brandBootstrap.brand.name;
  const brandLogoUrl = brandBootstrap.settings.logo_url || (brandSlug === 'kaboo' ? LOGO_URL : '');
  const brandHomeHeroImageUrl = brandBootstrap.settings.home_hero_image_url || '';
  // Initialize collections from cache if available
  const cachedCollections = getCachedCollectionsSync();
  // Initialize profile from cache if available
  const cachedProfile = getCachedProfileSync();

  // Data State
  const [collections, setCollections] = useState<Collection[]>(cachedCollections || []);
  const [userProgress, setUserProgress] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<string>('all');
  // Only show loading if we don't have cached data
  const [loading, setLoading] = useState(!cachedCollections);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter State
  const [showFilters, setShowFilters] = useState(false);
  const [showBnccPicker, setShowBnccPicker] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState>(() => getInitialFilters(params));
  const [draftBnccSelection, setDraftBnccSelection] = useState<string[]>([]);
  const [bnccPickerQuery, setBnccPickerQuery] = useState('');
  const [bnccPickerFilters, setBnccPickerFilters] = useState<BnccPickerFilters>(INITIAL_BNCC_PICKER_FILTERS);
  const [searchTerm, setSearchTerm] = useState(() => typeof params?.query === 'string' ? params.query : '');
  const [filterDrawerFocus, setFilterDrawerFocus] = useState<keyof FilterState | null>(null);
  const [sortByAge, setSortByAge] = useState(false);

  // User Profile State for Header - Initialize from cache
  const [profile, setProfile] = useState<UserProfile | null>(accessProfile || cachedProfile);
  const [dismissedAccessBanner, setDismissedAccessBanner] = useState<string | null>(() => getDismissedAccessBannerKey());

  // Welcome Modal State
  const [showWelcome, setShowWelcome] = useState(false);
  const [isClosingWelcome, setIsClosingWelcome] = useState(false);

  // Content grants for per-collection access control
  const [contentGrants, setContentGrants] = useState<UserContentGrant[]>([]);

  // Confetti Refs
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
  const confettiInstance = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const filterSectionRefs = useRef<Record<keyof FilterState, HTMLDivElement | null>>({
    characters: null,
    bncc: null,
    casel: null,
    age: null,
  });
  const [canvasReady, setCanvasReady] = useState(false);

  // Track preloaded avatar images to prevent duplicate preloads
  const preloadedAvatarsRef = useRef<Set<string>>(new Set());

  // Preload avatar image to ensure it's cached
  const preloadAvatarImage = (avatarId: string | null) => {
    if (!avatarId) return;

    // Skip if already preloaded
    if (preloadedAvatarsRef.current.has(avatarId)) return;

    const imageUrl = getCharacterImageUrl(avatarId);
    if (!imageUrl) return;

    // Mark as preloading
    preloadedAvatarsRef.current.add(avatarId);

    // Create a new Image object to preload and cache the image
    const img = new Image();
    img.src = imageUrl;
    // Set crossOrigin to allow caching
    img.crossOrigin = 'anonymous';
    // Preload the image - browser will cache it
    img.onload = () => {
      // Image is now cached
    };
    img.onerror = () => {
      // Remove from set on error so we can retry
      preloadedAvatarsRef.current.delete(avatarId);
    };
  };

  const isCentralCoruja = brandSlug === 'central-coruja';
  const isKabooWelcomeLayout = brandSlug === 'kaboo' && !isSearchExperience;
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();
  const heroParallaxFeature = brandBootstrap.features['hero.parallax'];
  const heroParallaxModeRaw = heroParallaxFeature?.config?.mode;
  const heroParallaxMode =
    heroParallaxModeRaw === 'subtle' || heroParallaxModeRaw === 'standard' || heroParallaxModeRaw === 'off'
      ? heroParallaxModeRaw
      : (isFeatureEnabled('hero.parallax') ? 'subtle' : 'off');

  const shouldRenderWhiteLabelParallax =
    isCentralCoruja &&
    isFeatureEnabled('hero.parallax') &&
    !isSearchExperience &&
    !brandHomeHeroImageUrl;
  const isCorujaHeroImageLayout = isCentralCoruja && Boolean(brandHomeHeroImageUrl) && !isSearchExperience;
  const shouldShowDesktopHeader = (!isCentralCoruja && !isKabooWelcomeLayout) || isSearchExperience;
  const shouldRenderBrandHero = !isSearchExperience && (Boolean(brandHomeHeroImageUrl) || isCentralCoruja || brandSlug === 'kaboo');
  const isCorujaHomeLayout = isCentralCoruja && !isSearchExperience;
  const isCorujaPinnedShelfLayout = isCorujaHomeLayout && Boolean(brandHomeHeroImageUrl);
  const desktopShellPaddingClass = isCorujaPinnedShelfLayout
    ? 'px-[var(--space-page-x)] md:mx-auto md:w-full md:max-w-[78rem] md:px-0'
    : isCentralCoruja
      ? 'px-[var(--space-page-x)] md:px-[var(--space-page-x)]'
      : 'px-4 sm:px-6 lg:px-8 xl:mx-auto xl:w-full xl:max-w-[68rem]';
  const desktopSkeletonHeaderPaddingClass = isCorujaPinnedShelfLayout
    ? 'hidden md:block shrink-0 md:mx-auto md:w-full md:max-w-[78rem] md:pt-[var(--space-page-header-top-desktop)] md:pb-[var(--space-page-inset-y)]'
    : 'hidden md:block shrink-0 px-[var(--space-page-x-desktop)] pt-[var(--space-page-header-top-desktop)] pb-[var(--space-page-inset-y)] xl:mx-auto xl:w-full xl:max-w-[68rem]';
  const corujaHeroLayerDepths = useMemo(() => (isMobile ? [0.8, 0.36] : [1.4, 0.6]), [isMobile]);
  const { containerRef: corujaHeroMotionContainerRef, setLayerRef: setCorujaHeroLayerRef } = useParallaxMotion({
    disabled: !isCorujaHeroImageLayout || prefersReducedMotion,
    layerDepths: corujaHeroLayerDepths,
    smoothness: 0.14,
    scrollInfluence: 0,
    enablePointerTracking: false,
    enableScrollTracking: false,
  });

  // Preload avatar image immediately if cached profile exists
  useEffect(() => {
    if (cachedProfile?.avatar_id) {
      preloadAvatarImage(cachedProfile.avatar_id);
    }
  }, []); // Run only once on mount

  useEffect(() => {
    // Only load data if we don't have cached collections
    // If we have cache, load in background to check for updates, but don't show loading
    if (!cachedCollections) {
      loadData(false, true); // Show loading if no cache
    } else {
      // Load data in background to check for updates silently
      // This ensures we have the latest data but doesn't show loading state
      loadData(false, false); // Don't show loading if we have cache
    }
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!accessProfile) {
      return;
    }

    setProfile(accessProfile);

    if (accessProfile.avatar_id) {
      preloadAvatarImage(accessProfile.avatar_id);
    }
  }, [accessProfile?.id, accessProfile?.avatar_id, accessProfile?.full_name, accessProfile?.access_status, accessProfile?.access_expires_at]);

  // Preload avatar image whenever profile changes
  useEffect(() => {
    if (profile?.avatar_id) {
      preloadAvatarImage(profile.avatar_id);
    }
  }, [profile?.avatar_id]);

  // Listen for params changes (specifically for new user registration)
  useEffect(() => {
    if (params?.isNewUser) {
      setShowWelcome(true);
      setCanvasReady(false); // Reset canvas ready state
    }
  }, [params]);

  useEffect(() => {
    if (typeof params?.query === 'string') {
      setSearchTerm(params.query);
    }
  }, [params?.query]);

  useEffect(() => {
    if (!isSearchExperience) {
      return;
    }

    if (typeof params?.query === 'string' || typeof params?.filterCharacter === 'string') {
      return;
    }

    setSearchTerm('');
    setActiveFilters(INITIAL_FILTERS);
    setActiveTab('all');
  }, [isSearchExperience, params?.query, params?.filterCharacter, params?.searchNonce]);

  useEffect(() => {
    const filterCharacter = typeof params?.filterCharacter === 'string' ? params.filterCharacter.trim() : '';

    if (!filterCharacter) {
      return;
    }

    setActiveTab('all');
    setSearchTerm('');
    setActiveFilters({
      ...INITIAL_FILTERS,
      characters: [filterCharacter],
    });
  }, [params?.filterCharacter]);

  useEffect(() => {
    if (!showFilters || !filterDrawerFocus) {
      return;
    }

    const target = filterSectionRefs.current[filterDrawerFocus];
    if (!target) {
      return;
    }

    const timer = window.setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [showFilters, filterDrawerFocus]);

  useEffect(() => {
    if (showFilters) {
      return;
    }

    setShowBnccPicker(false);
    setBnccPickerQuery('');
    setDraftBnccSelection([]);
  }, [showFilters]);

  useEffect(() => {
    if (!showBnccPicker) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      setShowBnccPicker(false);
      setBnccPickerQuery('');
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showBnccPicker]);

  useEffect(() => {
    if (!isSearchExperience && !params?.focusSearch) {
      return;
    }

    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [isSearchExperience, params?.focusSearch]);

  // Reset canvas ready when modal closes
  useEffect(() => {
    if (!showWelcome) {
      setCanvasReady(false);
    }
  }, [showWelcome]);

  // Update canvas dimensions when window resizes
  useEffect(() => {
    const updateCanvasSize = () => {
      if (confettiCanvasRef.current && showWelcome) {
        confettiCanvasRef.current.width = window.innerWidth;
        confettiCanvasRef.current.height = window.innerHeight;
      }
    };

    if (showWelcome) {
      updateCanvasSize();
      window.addEventListener('resize', updateCanvasSize);
    }

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [showWelcome]);

  // Effect to handle confetti when modal opens
  useEffect(() => {
    let interval: any;

    if (showWelcome && !isClosingWelcome && canvasReady && confettiCanvasRef.current) {
      try {
        // Create confetti instance with the canvas
        if (!confettiInstance.current) {
          confettiInstance.current = confetti.create(confettiCanvasRef.current, {
            resize: true,
            useWorker: false
          });
        }

        const colors = [
          '#5D1F58', '#883E82', '#4EA8DE', '#70E000', '#FFD166',
          '#FF595E', '#FFCA3A', '#8AC926', '#1982C4', '#6A4C93', '#F72585', '#4CC9F0'
        ];

        const fireConfetti = () => {
          if (isClosingWelcome || !showWelcome || !confettiInstance.current) {
            if (interval) clearInterval(interval);
            return;
          }

          try {
            confettiInstance.current({
              particleCount: 3,
              angle: 60,
              spread: 55,
              origin: { x: 0, y: 0.35 },
              colors: colors,
              gravity: 0.8,
              scalar: 1.1,
              drift: 0,
              ticks: 300,
              startVelocity: 45,
              disableForReducedMotion: true,
            });

            confettiInstance.current({
              particleCount: 3,
              angle: 120,
              spread: 55,
              origin: { x: 1, y: 0.35 },
              colors: colors,
              gravity: 0.8,
              scalar: 1.1,
              drift: 0,
              ticks: 300,
              startVelocity: 45,
              disableForReducedMotion: true,
            });

            if (Math.random() > 0.6) {
              confettiInstance.current({
                particleCount: 8,
                angle: 90,
                spread: 120,
                origin: { x: 0.5, y: 0.4 },
                colors: colors,
                gravity: 1,
                scalar: 0.8,
                drift: 0,
                ticks: 200,
                startVelocity: 30,
                disableForReducedMotion: true,
              });
            }
          } catch (err) {
            console.error('Confetti error:', err);
          }
        };

        // Start firing confetti
        fireConfetti();
        interval = setInterval(fireConfetti, 50);
      } catch (err) {
        console.error('Failed to create confetti:', err);
      }
    }

    // Stop confetti when closing
    if (isClosingWelcome) {
      if (interval) clearInterval(interval);
      if (confettiInstance.current) {
        try {
          confettiInstance.current.reset();
        } catch (e) {
          console.error('Error resetting confetti:', e);
        }
      }
    }

    return () => {
      if (interval) clearInterval(interval);
      if (!showWelcome && confettiInstance.current) {
        try {
          confettiInstance.current.reset();
        } catch (e) {
          console.error('Error resetting confetti on cleanup:', e);
        }
        confettiInstance.current = null;
      }
    };
  }, [showWelcome, isClosingWelcome, canvasReady]);

  const handleCloseWelcome = () => {
    setIsClosingWelcome(true);
    setTimeout(() => {
      setShowWelcome(false);
      setIsClosingWelcome(false);
    }, 300);
  };

  const loadData = async (forceRefresh: boolean = false, showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const [cols, prog, grants] = await Promise.all([
        api.getCollections(forceRefresh),
        api.getUserProgress(),
        api.getUserContentGrants(),
      ]);
      setCollections(cols);
      setUserProgress(prog);
      setContentGrants(grants);
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    clearCollectionsCache();
    await loadData(true, true); // Force refresh and show loading
  };

  const loadProfile = async () => {
    try {
      // Force refresh to ensure we get the correct user's profile
      // Cache validation will handle user ID mismatch, but force refresh ensures correctness
      const profileData = await api.getProfile(true); // Force refresh to ensure correct user

      if (profileData) {
        setProfile(profileData);
        // Preload avatar image when profile is loaded
        if (profileData.avatar_id) {
          preloadAvatarImage(profileData.avatar_id);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getFirstName = (name: string) => {
    if (!name) return 'Professor(a)';
    return name.trim().split(' ')[0];
  };

  const profileFullName = (profile?.full_name || 'Professor(a)').trim();
  const profileDisplayFirstName = getFirstName(profileFullName);
  const profileCompactName = profileFullName.split(/\s+/).slice(0, 2).join(' ');
  const profileInitials = profileFullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment.charAt(0).toUpperCase())
    .join('') || 'EC';
  const profileRoleLabel = profile?.role ? capitalizeFirst(profile.role) : 'Conta';
  const profileAvatarUrl = profile?.avatar_id ? getCharacterImageUrl(profile.avatar_id) : '';


  const groupedCollections = useMemo(
    () => collections.filter((collection) => matchesCollectionGroup(collection, currentCollectionGroup)),
    [collections, currentCollectionGroup]
  );
  const kabooHeroTitle = currentCollectionGroup === 'books'
    ? 'Bem-vindo à biblioteca do Kaboo!'
    : 'Bem-vindo ao Mundo de Kaboo!';
  const kabooHeroDescription = currentCollectionGroup === 'books'
    ? 'Escolha leituras com começo, meio e continuidade. Busque por título, personagem ou BNCC e transforme a descoberta em trilha guiada.'
    : 'Explore coleções vivas com leitura, áudio e vídeo no mesmo lugar. Comece pela busca e encontre a combinação certa para o seu momento de aprendizagem.';

  const availableOptions = useMemo(() => {
    const opts = {
      characters: new Set<string>(),
      bncc: new Set<string>(),
      casel: new Set<string>(),
      age: new Set<string>()
    };

    groupedCollections.forEach(c => {
      c.characters?.forEach(x => opts.characters.add(x));
      c.bncc_skills?.forEach(x => opts.bncc.add(x));
      c.casel_competencies?.forEach(x => opts.casel.add(x));
      c.age_grade?.forEach(x => opts.age.add(x));
    });

    return {
      characters: Array.from(opts.characters).sort(),
      bncc: Array.from(opts.bncc).sort(),
      casel: Array.from(opts.casel).sort(),
      age: Array.from(opts.age).sort((a, b) => {
        const indexA = AGE_ORDER.indexOf(a);
        const indexB = AGE_ORDER.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b, undefined, { numeric: true });
      }),
    };
  }, [groupedCollections]);

  useEffect(() => {
    availableOptions.characters.forEach(preloadAvatarImage);
  }, [availableOptions.characters]);

  const bnccPickerOptions = useMemo<BnccPickerOption[]>(() => {
    return availableOptions.bncc.map((code) => {
      const info = lookupBncc(code);
      const description = info?.description || 'Descrição indisponível no momento.';
      const component = info?.component || 'Componente não informado';
      const year = info?.year || 'Faixa não informada';
      const yearTokens = year
        .split(';')
        .map((value) => value.trim())
        .filter(Boolean);

      return {
        code,
        description,
        component,
        year,
        yearTokens,
        stage: info?.stage || '',
        knowledgeObject: info?.knowledge_object,
        searchIndex: normalizeSearch([code, description, component, year, info?.stage, info?.knowledge_object].filter(Boolean).join(' ')),
      };
    });
  }, [availableOptions.bncc]);

  const bnccPickerFacets = useMemo(() => {
    const stages = new Set<string>();
    const components = new Set<string>();
    const years = new Set<string>();

    bnccPickerOptions.forEach((option) => {
      if (option.stage) {
        stages.add(option.stage);
      }
      if (option.component) {
        components.add(option.component);
      }
      option.yearTokens.forEach((yearToken) => years.add(yearToken));
    });

    return {
      stages: Array.from(stages).sort((a, b) => a.localeCompare(b, 'pt-BR')),
      components: Array.from(components).sort((a, b) => a.localeCompare(b, 'pt-BR')),
      years: Array.from(years).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true })),
    };
  }, [bnccPickerOptions]);

  const filteredBnccPickerOptions = useMemo(() => {
    const normalizedBnccQuery = normalizeSearch(bnccPickerQuery.trim());

    return bnccPickerOptions
      .filter((option) => !normalizedBnccQuery || option.searchIndex.includes(normalizedBnccQuery))
      .filter((option) => !bnccPickerFilters.stage || option.stage === bnccPickerFilters.stage)
      .filter((option) => !bnccPickerFilters.component || option.component === bnccPickerFilters.component)
      .filter((option) => !bnccPickerFilters.year || option.yearTokens.includes(bnccPickerFilters.year))
      .sort((optionA, optionB) => {
        const optionASelected = draftBnccSelection.includes(optionA.code);
        const optionBSelected = draftBnccSelection.includes(optionB.code);

        if (optionASelected !== optionBSelected) {
          return optionASelected ? -1 : 1;
        }

        return optionA.code.localeCompare(optionB.code, undefined, { numeric: true });
      });
  }, [bnccPickerOptions, bnccPickerQuery, bnccPickerFilters, draftBnccSelection]);

  const normalizedSearchTerm = useMemo(() => normalizeSearch(searchTerm.trim()), [searchTerm]);
  const hasSearchQuery = normalizedSearchTerm.length > 0;

  const filteredCollections = useMemo(() => {
    // Explicitly casting the mapped result to ensure correct type inference for filteredCollections
    const result = (groupedCollections.map(c => ({
      ...c,
      progress: userProgress[c.id] || undefined
    })) as (Collection & { progress?: number })[]).filter(c => {
      if (activeTab === 'fund1') {
        const matchesEI = c.segments?.length
          ? c.segments.includes('Educação Infantil')
          : c.level === 'Educação Infantil';
        if (!matchesEI) return false;
      }
      if (activeTab === 'fund2') {
        const matchesFund = c.segments?.length
          ? c.segments.includes('E.F. Anos Iniciais')
          : c.level === 'Fundamental I';
        if (!matchesFund) return false;
      }

      if (normalizedSearchTerm && !collectionMatchesQuery(c, normalizedSearchTerm)) {
        return false;
      }

      if (activeFilters.characters.length > 0) {
        const hasChar = c.characters?.some(char => activeFilters.characters.includes(char));
        if (!hasChar) return false;
      }

      if (activeFilters.bncc.length > 0) {
        const hasBncc = c.bncc_skills?.some(skill => activeFilters.bncc.includes(skill));
        if (!hasBncc) return false;
      }

      if (activeFilters.casel.length > 0) {
        const hasCasel = c.casel_competencies?.some(comp => activeFilters.casel.includes(comp));
        if (!hasCasel) return false;
      }

      if (activeFilters.age.length > 0) {
        const hasAge = c.age_grade?.some(age => activeFilters.age.includes(age));
        if (!hasAge) return false;
      }

      return true;
    });

    if (sortByAge) {
      result.sort((a, b) => {
        const numA = parseInt((Array.isArray(a.age_grade) ? a.age_grade[0] : a.age_grade) || '999', 10);
        const numB = parseInt((Array.isArray(b.age_grade) ? b.age_grade[0] : b.age_grade) || '999', 10);
        return numA - numB;
      });
    }

    return result;
  }, [groupedCollections, userProgress, activeTab, activeFilters, normalizedSearchTerm, sortByAge]);

  const searchBackdropCollections = useMemo(() => {
    const result = groupedCollections.map((collection) => ({
      ...collection,
      progress: userProgress[collection.id] || undefined,
    })) as (Collection & { progress?: number })[];

    if (sortByAge) {
      result.sort((a, b) => {
        const numA = parseInt((Array.isArray(a.age_grade) ? a.age_grade[0] : a.age_grade) || '999', 10);
        const numB = parseInt((Array.isArray(b.age_grade) ? b.age_grade[0] : b.age_grade) || '999', 10);
        return numA - numB;
      });
    }

    return result;
  }, [groupedCollections, userProgress, sortByAge]);

  const inProgressCollections = groupedCollections.filter(c => (userProgress[c.id] || 0) > 0);

  const handleCollectionClick = (collection: Collection) => {
    if (!canAccessCollection(contentGrants, collection.id)) {
      // Collection is locked — don't open details
      return;
    }
    const isStandaloneBook = currentCollectionGroup === 'books' && getCollectionTypeMeta(collection).type === 'book';
    if (isStandaloneBook) {
      onNavigate('player_book', { collectionId: collection.id });
      return;
    }
    // Open modal instead of navigating to details screen - stay on current screen
    onNavigate(screenName, { ...baseHomeParams, collectionId: collection.id });
  };

  const toggleFilter = (category: keyof FilterState, value: string) => {
    setActiveFilters(prev => {
      const current = prev[category];
      const exists = current.includes(value);
      return {
        ...prev,
        [category]: exists
          ? current.filter(item => item !== value)
          : [...current, value]
      };
    });
  };

  const toggleDraftBncc = (code: string) => {
    setDraftBnccSelection((prev) => {
      const exists = prev.includes(code);

      return exists
        ? prev.filter((item) => item !== code)
        : [...prev, code];
    });
  };

  const resetBnccPickerState = () => {
    setShowBnccPicker(false);
    setDraftBnccSelection([]);
    setBnccPickerQuery('');
    setBnccPickerFilters(INITIAL_BNCC_PICKER_FILTERS);
  };

  const clearFilterSelections = () => {
    setActiveFilters(INITIAL_FILTERS);
    resetBnccPickerState();
  };

  const resetDiscovery = () => {
    setSearchTerm('');
    clearFilterSelections();
    setActiveTab('all');
  };

  const openBnccPicker = () => {
    setDraftBnccSelection(activeFilters.bncc);
    setBnccPickerQuery('');
    setBnccPickerFilters(INITIAL_BNCC_PICKER_FILTERS);
    setShowBnccPicker(true);
  };

  const closeBnccPicker = () => {
    setShowBnccPicker(false);
    setBnccPickerQuery('');
    setBnccPickerFilters(INITIAL_BNCC_PICKER_FILTERS);
  };

  const applyBnccPicker = () => {
    setActiveFilters((prev) => ({
      ...prev,
      bncc: draftBnccSelection,
    }));
    closeBnccPicker();
  };

  const clearBnccDraft = () => {
    setDraftBnccSelection([]);
    setBnccPickerQuery('');
    setBnccPickerFilters(INITIAL_BNCC_PICKER_FILTERS);
  };

  const handleBnccFilterChange = (category: keyof BnccPickerFilters, value: string) => {
    setBnccPickerFilters((prev) => ({
      ...prev,
      [category]: value,
    }));
  };

  const openFilterDrawer = (category?: keyof FilterState) => {
    setFilterDrawerFocus(category ?? null);
    setShowFilters(true);
  };

  const closeInlineSearch = () => {
    onNavigate('home', baseHomeParams);
  };

  useEffect(() => {
    if (!isSearchExperience || showFilters || showBnccPicker) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      closeInlineSearch();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchExperience, showFilters, showBnccPicker]);

  // Fixed type inference by casting Object.values results to string[][]
  const activeFilterCount = (Object.values(activeFilters) as string[][]).reduce((acc, curr) => acc + curr.length, 0);
  const hasRefinedDiscovery = hasSearchQuery || activeFilterCount > 0 || activeTab !== 'all';
  const hasFilterOnlySelection = activeFilterCount > 0 && !hasSearchQuery;
  const showSearchOverlayPanel = hasSearchQuery;

  const animationKey = `${activeTab}-${JSON.stringify(activeFilters)}`;

  const accessStatus = useMemo(() => getProfileAccessStatus(profile), [profile?.id, profile?.access_status, profile?.access_expires_at]);

  const accessBanner = useMemo(() => {
    if (!profile || accessStatus !== 'active') {
      return null;
    }

    if (!profile.access_expires_at) {
      return null;
    }

    const daysLeft = getDaysUntilAccessExpiry(profile.access_expires_at);

    if (daysLeft !== null && daysLeft <= 1) {
      return {
        tone: 'warning' as const,
        eyebrow: 'Atenção',
        title: 'Seu acesso vence hoje',
        description: 'Renove agora para continuar usando a plataforma sem interrupção.',
        dismissKey: `${profile.id}:expires:${profile.access_expires_at}:today`
      };
    }

    if (daysLeft !== null && daysLeft <= 7) {
      return {
        tone: 'warning' as const,
        eyebrow: 'Aviso de vigência',
        title: `Seu acesso vence em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`,
        description: 'Faça a renovação para manter seu acesso ativo à plataforma.',
        dismissKey: `${profile.id}:expires:${profile.access_expires_at}:soon`
      };
    }

    return null;
  }, [profile, accessStatus]);

  const shouldShowAccessBanner = !!accessBanner && accessBanner.dismissKey !== dismissedAccessBanner;

  const handleDismissAccessBanner = () => {
    if (!accessBanner?.dismissKey) {
      return;
    }

    setDismissedAccessBanner(accessBanner.dismissKey);
    setDismissedAccessBannerKey(accessBanner.dismissKey);
  };

  const AccessStatusBanner = () => {
    if (isSearchExperience) {
      return null;
    }

    if (!accessBanner || !shouldShowAccessBanner) {
      return null;
    }

    return (
      <div className={`${desktopShellPaddingClass} mb-4 shrink-0`}>
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 md:px-5 md:py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0 text-amber-700">
              <Icons.AlertCircle size={18} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                {accessBanner.eyebrow}
              </p>
              <p className="mt-1 text-sm md:text-[15px] font-bold text-gray-800">
                {accessBanner.title}
              </p>
              <p className="mt-1 text-xs md:text-sm text-gray-600 leading-relaxed">
                {accessBanner.description}
              </p>
            </div>

            <button
              type="button"
              onClick={handleDismissAccessBanner}
              className="shrink-0 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white/80 px-2.5 py-1.5 text-[11px] font-bold text-amber-800 transition-colors hover:bg-white"
              aria-label="Fechar aviso de vigência"
            >
              <Icons.X size={14} />
              <span>Fechar</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const FilterModal = () => (
    <CollectionFiltersModal
      availableOptions={availableOptions}
      activeFilters={activeFilters}
      tone={isCentralCoruja ? 'central-coruja' : 'default'}
      onToggleFilter={toggleFilter}
      onClear={clearFilterSelections}
      onClose={() => setShowFilters(false)}
      resultsCount={filteredCollections.length}
      onOpenBncc={openBnccPicker}
      onPrepareCharacter={preloadAvatarImage}
      sectionRefHandlers={{
        characters: (node) => { filterSectionRefs.current.characters = node; },
        age: (node) => { filterSectionRefs.current.age = node; },
        bncc: (node) => { filterSectionRefs.current.bncc = node; },
        casel: (node) => { filterSectionRefs.current.casel = node; },
      }}
    />
  );

  const renderSegmentTabs = (tone: 'hero' | 'default' | 'kaboo-hero' = 'default') => (
    <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const activeClass = tone === 'hero'
          ? 'bg-[#5D1E76] text-white border-[#7A2A98] shadow-[0_14px_28px_rgba(93,30,118,0.35)]'
          : tone === 'kaboo-hero'
            ? 'bg-kaboo-primary text-white border-kaboo-primary shadow-[0_14px_30px_rgba(93,31,88,0.28)]'
            : 'bg-kaboo-primary text-white border-kaboo-primary shadow-md shadow-kaboo-primary/20';
        const inactiveClass = tone === 'hero'
          ? 'bg-white/8 text-white/82 border-white/12 hover:bg-white/14'
          : tone === 'kaboo-hero'
            ? 'bg-white/78 text-gray-600 border-white/70 hover:bg-white'
            : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100';

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2.5 text-sm font-bold transition-all active:scale-95 md:py-2 ${isActive ? activeClass : inactiveClass}`}
          >
            {tab.id === 'all' && <Icons.Grid size={14} />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  const renderDiscoveryControlPanel = (tone: 'hero' | 'default' | 'kaboo-hero' = 'default') => {
    const isHeroTone = tone === 'hero';
    const isKabooHeroTone = tone === 'kaboo-hero';
    const panelClass = isHeroTone
      ? 'rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(4,27,36,0.84)_0%,rgba(4,27,36,0.72)_100%)] p-4 text-white shadow-[0_28px_60px_rgba(0,0,0,0.26)] backdrop-blur-xl md:p-5'
      : isKabooHeroTone
        ? 'rounded-[28px] border border-white/70 bg-white/72 p-4 shadow-[0_28px_60px_rgba(93,31,88,0.12)] backdrop-blur-xl md:px-5 md:py-4'
        : 'rounded-[28px] border border-gray-200 bg-white p-4 shadow-[0_20px_45px_rgba(15,23,42,0.08)] md:px-5 md:py-4';
    const eyebrowClass = isHeroTone ? 'text-[#FFD58A]' : 'text-kaboo-primary';
    const bodyClass = isHeroTone ? 'text-white/78' : isKabooHeroTone ? 'text-slate-600' : 'text-gray-500';
    const dividerClass = isHeroTone ? 'border-white/12' : isKabooHeroTone ? 'border-white/70' : 'border-gray-100';
    const searchSurfaceClass = isHeroTone
      ? 'border-white/60 bg-white text-gray-700 shadow-[0_18px_36px_rgba(0,0,0,0.18)] hover:border-[#EA9A3B]/60'
      : isKabooHeroTone
        ? 'border-white/85 bg-white/95 text-gray-500 shadow-[0_14px_30px_rgba(93,31,88,0.08)] hover:border-kaboo-primary/24'
        : 'border-gray-200 bg-white text-gray-500 shadow-sm hover:border-kaboo-primary/20';
    const closeButtonClass = isHeroTone
      ? 'border-white/15 bg-white/10 text-white/82 hover:bg-white/14 hover:text-white'
      : isKabooHeroTone
        ? 'border-white/70 bg-white/82 text-gray-500 hover:border-kaboo-primary/20 hover:text-kaboo-primary'
        : 'border-gray-200 bg-white text-gray-500 hover:border-kaboo-primary/20 hover:text-kaboo-primary';
    const filterButtonClass = activeFilterCount > 0
      ? isHeroTone
        ? 'border-[#7A2A98] bg-[#5D1E76] text-white shadow-[0_14px_30px_rgba(93,30,118,0.32)]'
        : isKabooHeroTone
          ? 'border-kaboo-primary bg-kaboo-primary text-white shadow-[0_14px_30px_rgba(93,31,88,0.22)]'
          : 'border-kaboo-primary bg-kaboo-primary text-white shadow-sm'
      : isHeroTone
        ? 'border-white/12 bg-white/10 text-white/88 hover:bg-white/14'
        : isKabooHeroTone
          ? 'border-white/70 bg-white/84 text-gray-700 hover:border-kaboo-primary/20 hover:bg-white'
          : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-kaboo-primary/20 hover:bg-white';

    return (
      <div className={panelClass}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
              <p className={`text-[11px] font-black uppercase tracking-[0.18em] ${eyebrowClass}`}>
                {isSearchExperience ? searchCollectionGroupTitle : 'Comece pela busca'}
              </p>
              <p className={`mt-1 text-sm leading-relaxed md:mt-0.5 md:text-[13px] ${bodyClass}`}>
                {isSearchExperience
                  ? 'Busque por texto e refine o acervo com filtros e segmentos.'
                  : 'Busque por título, tema, BNCC ou personagem. Refine com filtros e segmentos.'}
              </p>
            </div>

          {isSearchExperience && (
            <button
              type="button"
              onClick={closeInlineSearch}
              className={`inline-flex h-10 shrink-0 items-center justify-center rounded-full border px-3 transition-colors ${closeButtonClass}`}
              aria-label="Fechar busca"
              title="Fechar busca"
            >
              <Icons.X size={16} />
              <span className="ml-2 hidden text-sm font-bold md:inline">Fechar</span>
            </button>
          )}
        </div>

        <div className={`mt-3 flex flex-col gap-3 md:mt-2.5 md:gap-2.5 ${isHeroTone ? '' : 'sm:flex-row sm:items-center'}`}>
          <div className="relative min-w-0 flex-1">
            <div className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-gray-400">
              <Icons.Search size={18} />
            </div>

            <Input
                ref={searchInputRef}
                aria-label={`Buscar ${collectionGroupTitle.toLowerCase()}`}
                placeholder="Título, BNCC, personagem, competência..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className={`h-14 rounded-[26px] pl-11 pr-12 md:h-12 md:rounded-[24px] ${searchSurfaceClass}`}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 transition-colors hover:text-gray-700"
                  title="Limpar busca"
                >
                  <Icons.X size={16} />
                </button>
              )}
          </div>

          <button
            type="button"
            onClick={() => openFilterDrawer()}
            className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 self-start rounded-[20px] border px-4 text-sm font-bold transition-all active:scale-95 sm:h-12 sm:min-w-[136px] ${filterButtonClass}`}
            title="Refinar busca"
          >
            <Icons.Filter size={18} strokeWidth={activeFilterCount > 0 ? 2.5 : 2} />
            <span>Filtros</span>
            {activeFilterCount > 0 && (
              <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black ${isHeroTone ? 'bg-white/18 text-white' : 'bg-white/20 text-white'}`}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div className={`mt-3 border-t pt-3 ${dividerClass}`}>
          <p className={`text-[11px] font-black uppercase tracking-[0.18em] ${isHeroTone ? 'text-white/52' : 'text-gray-400'}`}>
            Explorar por segmento
          </p>
          <div className="mt-2.5 md:mt-2">
            {renderSegmentTabs(isHeroTone ? 'hero' : isKabooHeroTone ? 'kaboo-hero' : 'default')}
          </div>
        </div>
      </div>
    );
  };

  const renderImmersiveHeroControls = (tone: 'coruja' | 'kaboo' = 'coruja') => {
    const isKabooTone = tone === 'kaboo';
    const searchInputClass = isKabooTone
      ? 'h-14 rounded-[28px] border border-gray-200 bg-white pl-11 pr-14 shadow-sm hover:border-kaboo-primary/24 focus:border-kaboo-primary'
      : 'h-14 rounded-[28px] border-transparent bg-white/92 pl-11 pr-14 shadow-sm hover:border-transparent focus:border-kaboo-primary';
    const passiveFilterClass = isKabooTone
      ? 'bg-white text-kaboo-primary border-gray-200 shadow-sm hover:border-kaboo-primary/24'
      : 'bg-white/95 text-[#0C1A34] border-white/50 shadow-[0_10px_22px_rgba(0,0,0,0.18)] hover:border-[#EA9A3B]/60';
    const passiveTabClass = isKabooTone
      ? 'bg-white text-kaboo-primary border-gray-200 hover:bg-gray-50 hover:border-kaboo-primary/24'
      : 'bg-white/95 text-[#0C1A34] border-white/50 shadow-[0_8px_16px_rgba(0,0,0,0.14)] hover:bg-white';

    return (
      <div className="space-y-3 md:space-y-4">
        <div className="relative z-10 flex w-full flex-col gap-3 lg:max-w-[60rem] lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <div className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-gray-400">
              <Icons.Search size={18} />
            </div>
            <Input
              ref={searchInputRef}
              aria-label={`Buscar ${collectionGroupTitle.toLowerCase()}`}
              placeholder="Título, BNCC, personagem, competência..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className={searchInputClass}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/90 text-gray-500 backdrop-blur-sm transition-colors hover:text-gray-700"
                title="Limpar busca"
              >
                <Icons.X size={16} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
            <button
              type="button"
              onClick={() => openFilterDrawer()}
              className={`inline-flex h-10 items-center gap-2 rounded-[20px] border px-3 transition-all active:scale-95 md:px-4 ${activeFilterCount > 0 ? 'border-[#5D1E76] bg-[#5D1E76] text-white shadow-[0_12px_26px_rgba(93,30,118,0.35)]' : passiveFilterClass}`}
              title="Refinar busca"
            >
              <Icons.Filter size={18} strokeWidth={activeFilterCount > 0 ? 2.5 : 2} />
              <span className="hidden text-sm font-bold md:inline">Filtros</span>
              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-black text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {isSearchExperience && (
              <button
                type="button"
                onClick={closeInlineSearch}
                className="hidden md:inline-flex h-10 items-center gap-2 rounded-[20px] border border-white/30 bg-white/90 px-3 text-gray-500 backdrop-blur-sm transition-colors hover:text-gray-700"
                title="Fechar busca"
              >
                <Icons.X size={16} />
                <span className="text-sm font-bold">Fechar</span>
              </button>
            )}
          </div>
        </div>

        {!isSearchExperience && (
          <div className="relative z-20 flex flex-wrap gap-3 overflow-x-auto no-scrollbar pb-1 lg:max-w-[60rem] lg:overflow-visible">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all active:scale-95 flex items-center gap-2 border ${isActive ? 'bg-[#5D1E76] text-white border-[#7A2A98]' : passiveTabClass}`}
                >
                  {tab.id === 'all' && <Icons.Grid size={14} />}
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderKabooWelcomeHero = () => (
    <div className="relative space-y-3 pb-4 pt-3 md:space-y-4 md:pb-6 md:pt-5">
      <div className="max-w-2xl">
        <p className="text-sm font-bold text-kaboo-primary/72">Olá, {profileDisplayFirstName}.</p>
        <h2 className="mt-2 text-[1.95rem] font-black leading-[1.04] tracking-[-0.03em] text-kaboo-primary md:text-[2.3rem]">
          {kabooHeroTitle}
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 md:text-[15px]">
          {kabooHeroDescription}
        </p>
      </div>

      {renderImmersiveHeroControls('kaboo')}
    </div>
  );

  const renderCorujaHeroControls = () => renderImmersiveHeroControls('coruja');

  // Skeleton loader component
  const HomeScreenSkeleton = () => (
    <div className="flex flex-col min-h-full bg-white pb-24 md:pb-0 relative">
      <div className="flex flex-col">

        {/* MOBILE HEADER SKELETON */}
        <div className={`md:hidden flex justify-center items-center shrink-0 bg-white z-30 border-b border-gray-50 ${layoutSpacing.pageInset}`}>
          <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* DESKTOP HEADER SKELETON */}
        <div className={desktopSkeletonHeaderPaddingClass}>
          <div className="flex justify-between items-center">
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="flex items-center gap-4">
              <div className="h-8 w-40 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-11 h-11 rounded-full bg-gray-200 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* TABS AND FILTERS SKELETON */}
        <div className={`${desktopShellPaddingClass} mb-4 mt-2 flex items-center justify-between gap-4 shrink-0`}>
          <div className="flex gap-3 flex-1">
            <div className="h-10 w-24 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
          <div className="h-11 w-20 bg-gray-200 rounded-2xl animate-pulse"></div>
        </div>

        {/* CONTENT AREA SKELETON */}
          <div className={`${desktopShellPaddingClass} pt-2 md:pt-[var(--space-page-header-top-desktop)] pb-[var(--space-page-section-y)] md:pb-[var(--space-page-section-y-desktop)]`}>
          {/* TITLE AND COUNT SKELETON */}
          <div className="flex justify-between items-end pb-4 border-b border-gray-100">
            <div className="h-7 w-48 bg-gray-200 rounded animate-pulse"></div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-8 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="w-7 h-7 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>

          {/* GRID SKELETON */}
          <div className="mt-6">
            <div className={`grid ${currentCollectionGroup === 'kits' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'} ${layoutSpacing.cardGridGap}`}>
              {[...Array(12)].map((_, i) => (
                <div key={i} className="w-full animate-pulse">
                  <div className={`mb-3 overflow-hidden relative bg-gray-200 ${currentCollectionGroup === 'kits' ? 'rounded-[30px] aspect-[1.7/1]' : 'rounded-lg aspect-square'}`}></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <HomeScreenSkeleton />;
  }

  return (
    <div
      className={`flex flex-col min-h-full pb-24 md:pb-0 relative ${isCorujaHomeLayout ? 'bg-[#041b24]' : 'bg-white'}`}
      style={isCorujaHomeLayout
        ? {
          backgroundImage:
            'radial-gradient(circle at 18% 12%, rgba(49,104,116,0.28) 0%, transparent 28%), radial-gradient(circle at 82% 0%, rgba(93,30,118,0.26) 0%, transparent 24%), linear-gradient(180deg, #082B37 0%, #062733 38%, #041B24 100%)',
        }
        : undefined}
    >
      {/* Coruja hero: fixed background image behind the upper fold */}
      {isCentralCoruja && brandHomeHeroImageUrl && (
        <div
          className="fixed inset-x-0 top-0 h-[520px] md:h-[860px] z-0 pointer-events-none overflow-hidden"
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
              ref={setCorujaHeroLayerRef(0)}
              className="absolute inset-0 will-change-transform"
              style={{
                backgroundImage: `url(${isMobile ? '/coruja-hero-mobile.webp' : brandHomeHeroImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: isMobile ? 'center top' : 'right 20%',
                backgroundRepeat: 'no-repeat',
                filter: 'saturate(1.08) brightness(1.02)',
              }}
            />
            {/* 10% dark overlay for improved element readability */}
            <div className="absolute inset-0 bg-[rgba(4,27,36,0.10)]" />
          </div>
          <div
            ref={setCorujaHeroLayerRef(1)}
            className="absolute inset-0"
            style={{
              backgroundImage: isMobile
                ? 'radial-gradient(circle at 82% 14%, rgba(255,214,120,0.16) 0%, transparent 26%), linear-gradient(180deg, rgba(4,27,36,0.06) 0%, rgba(4,27,36,0.18) 18%, rgba(4,27,36,0.34) 38%, rgba(4,27,36,0.50) 58%, rgba(4,27,36,0.68) 78%, rgba(4,27,36,0.82) 92%, #041b24 100%)'
                : 'radial-gradient(circle at 72% 24%, rgba(255,214,120,0.18) 0%, rgba(255,214,120,0.08) 14%, transparent 30%), linear-gradient(90deg, rgba(4,27,36,0.78) 0%, rgba(4,27,36,0.42) 24%, rgba(4,27,36,0.12) 46%, rgba(4,27,36,0.18) 100%), linear-gradient(180deg, rgba(4,27,36,0.08) 0%, rgba(4,27,36,0.16) 18%, rgba(4,27,36,0.28) 38%, rgba(4,27,36,0.44) 56%, rgba(4,27,36,0.62) 74%, rgba(4,27,36,0.80) 88%, rgba(4,27,36,0.92) 100%)',
            }}
          />
        </div>
      )}

      <div className={`flex flex-col ${isCentralCoruja && brandHomeHeroImageUrl ? 'relative z-10' : ''}`}>

        <>
          {/* MOBILE HEADER: Fixed background color, reduced padding, no top margin */}
          <div className={`md:hidden flex justify-center items-center shrink-0 z-30 transition-all border-b ${layoutSpacing.pageInset} ${isCentralCoruja ? 'bg-[#082B37] border-white/10' : 'bg-white border-gray-50'}`}>
            <button onClick={() => onNavigate('home', baseHomeParams)} aria-label="Ir para a home" className="flex items-center justify-center">
              {brandLogoUrl ? (
                <img src={brandLogoUrl} alt={brandDisplayName} className="h-10 w-auto object-contain" />
              ) : (
                <div className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-800 shadow-sm">
                  {brandDisplayName}
                </div>
              )}
            </button>
          </div>

          {shouldShowDesktopHeader && (
            <div className="hidden shrink-0 md:block">
              <PageHeader
                title={collectionGroupTitle}
                className="!pb-4"
              />
            </div>
          )}
        </>

        <AccessStatusBanner />

        <div ref={corujaHeroMotionContainerRef} className={`${desktopShellPaddingClass} relative z-0 shrink-0 ${isSearchExperience ? 'pb-4 pt-3 space-y-3' : isCorujaHomeLayout ? 'pb-5 pt-4 md:pb-6 md:pt-6 space-y-4' : isKabooWelcomeLayout ? 'pb-4 pt-3 md:pb-5 md:pt-5 space-y-4' : 'mb-4 mt-2 space-y-3'}`}>
          {shouldRenderWhiteLabelParallax && (
            <HeroParallaxBackdrop
              enabled
              brandId={isCentralCoruja ? 'central-coruja' : 'kaboo'}
              mode={heroParallaxMode}
            />
          )}

          {/* Central Coruja with hero image: content floats over parallax background */}
          {isCentralCoruja && brandHomeHeroImageUrl ? (
            <div className="relative space-y-3 pt-[108px] pb-4 md:pt-8 md:pb-6 md:space-y-4">
              {shouldRenderBrandHero && (
                <div className="max-w-xl md:max-w-[54%]">
                  <p className="text-sm font-bold text-white/78">Olá, {profileDisplayFirstName}.</p>
                  <h2 className="mt-2 text-[1.95rem] font-black leading-[1.04] tracking-[-0.03em] text-[#FFB347] drop-shadow-[0_12px_28px_rgba(0,0,0,0.28)] md:text-[2.3rem]">
                    Bem-vindo à {brandDisplayName}!
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/76 md:text-[15px]">
                    Histórias, vídeos e experiências de aprendizagem organizados para você começar pela busca e explorar com mais clareza.
                  </p>
                </div>
              )}

              {renderCorujaHeroControls()}
            </div>
          ) : (
            <div className="relative z-10 space-y-3">
              {isCentralCoruja ? (
                <>
                  {shouldRenderBrandHero && (
                    <section
                      className="relative overflow-hidden rounded-[30px] border border-white/18 p-5 text-white shadow-[0_28px_60px_rgba(0,0,0,0.28)] md:p-6"
                      style={{
                        backgroundImage: 'radial-gradient(ellipse 44% 58% at 88% 18%, rgba(242,211,102,0.22) 0%, transparent 42%), radial-gradient(circle at 78% 22%, rgba(93,30,118,0.52) 0%, transparent 38%), radial-gradient(circle at 18% 85%, rgba(234,154,59,0.18) 0%, transparent 30%), linear-gradient(135deg, #102A3D 0%, #12384A 30%, #0B3343 56%, #0C1A34 100%)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        fontFamily: brandBootstrap.settings.font_family || undefined,
                      }}
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_24%,rgba(255,229,150,0.14),transparent_18%),radial-gradient(circle_at_84%_18%,rgba(234,154,59,0.16),transparent_24%),linear-gradient(180deg,rgba(5,11,20,0.04),rgba(5,11,20,0.28))]" />
                      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} aria-hidden="true" />
                      <div className="relative z-10 max-w-2xl">
                        <p className="text-sm font-bold text-white/78">Olá, {profileDisplayFirstName}.</p>
                        <h2 className="mt-2 text-[1.95rem] font-black leading-[1.04] tracking-[-0.03em] text-[#FFB347] md:text-[2.2rem]">
                          Bem-vindo à {brandDisplayName}!
                        </h2>
                        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/76 md:text-[15px]">
                          Histórias, vídeos e experiências de aprendizagem organizados para você começar pela busca e explorar com mais clareza.
                        </p>
                      </div>
                    </section>
                  )}

                  {renderCorujaHeroControls()}
                </>
              ) : (
                <>
                  {shouldRenderBrandHero && (
                    renderKabooWelcomeHero()
                  )}

                  {isSearchExperience && (
                    <div className="flex items-start justify-between gap-3 rounded-[24px] border border-kaboo-primary/10 bg-kaboo-primary/[0.03] px-4 py-3 animate-fade-in-up md:hidden">
                      <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-kaboo-primary">{searchCollectionGroupTitle}</p>
                        <p className="mt-1 text-sm text-gray-500">Pesquise por texto e use os filtros para explorar personagem, CASEL, BNCC ou idade-série.</p>
                      </div>
                      <button type="button" onClick={closeInlineSearch} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-kaboo-primary/15 bg-white text-kaboo-primary transition-colors hover:bg-kaboo-primary/5" aria-label="Fechar busca">
                        <Icons.X size={16} />
                      </button>
                    </div>
                  )}

                  {isSearchExperience && (
                    <div className="hidden animate-fade-in-up items-center justify-between gap-4 text-sm text-gray-500 md:flex">
                      <p>Pesquise por texto e abra os filtros para refinar por personagem, CASEL, BNCC ou idade-série.</p>
                    </div>
                  )}

                  {!isKabooWelcomeLayout && renderDiscoveryControlPanel('default')}
                </>
              )}
            </div>
          )}
        </div>

        {(activeFilterCount > 0 || (!isSearchExperience && hasSearchQuery)) && (
          <div className={`${desktopShellPaddingClass} mb-4 flex gap-2 flex-wrap animate-fade-in-up shrink-0`}>
            {!isSearchExperience && hasSearchQuery && (
              <span onClick={() => setSearchTerm('')} className="cursor-pointer px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 transition-colors group bg-kaboo-primary/10 text-kaboo-primary hover:bg-red-50 hover:text-red-500">
                Busca: {searchTerm.trim()} <Icons.X size={12} className="group-hover:scale-110" />
              </span>
            )}
            {activeFilters.characters.map(f => (
              <span key={f} onClick={() => toggleFilter('characters', f)} className="cursor-pointer px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 transition-colors group bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500">
                {f} <Icons.X size={12} className="group-hover:scale-110" />
              </span>
            ))}
            {activeFilters.bncc.map(f => (
              <span key={f} onClick={() => toggleFilter('bncc', f)} className="cursor-pointer px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 transition-colors group bg-green-50 text-green-700 hover:bg-red-50 hover:text-red-500">
                {f} <Icons.X size={12} className="group-hover:scale-110" />
              </span>
            ))}
            {activeFilters.casel.map(f => (
              <span key={f} onClick={() => toggleFilter('casel', f)} className="cursor-pointer px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 transition-colors group bg-orange-50 text-orange-700 hover:bg-red-50 hover:text-red-500">
                {f} <Icons.X size={12} className="group-hover:scale-110" />
              </span>
            ))}
            {activeFilters.age.map(f => (
              <span key={f} onClick={() => toggleFilter('age', f)} className="cursor-pointer px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 transition-colors group bg-teal-50 text-teal-700 hover:bg-red-50 hover:text-red-500">
                {f} <Icons.X size={12} className="group-hover:scale-110" />
              </span>
            ))}
            {!isSearchExperience && (
              <button onClick={resetDiscovery} className="ml-1 text-xs font-bold text-kaboo-primary hover:underline">
                Limpar tudo
              </button>
            )}
          </div>
        )}

        {!isSearchExperience && inProgressCollections.length > 0 && !hasRefinedDiscovery && (
          <div className="mb-4 shrink-0">
            <h2 className={`${desktopShellPaddingClass} text-xl font-bold mb-4 text-gray-800`}>Continue onde parou</h2>
            <div className={`flex gap-4 overflow-x-auto ${desktopShellPaddingClass} pb-6 no-scrollbar snap-x snap-mandatory`}>
              {inProgressCollections.map((c) => {
                const progress = userProgress[c.id] || 0;
                const collectionTypeMeta = getCollectionTypeMeta(c);
                const displayCoverImage = getCollectionDisplayCover(c) || c.cover_image;
                return (
                  <div
                    key={c.id}
                    onClick={() => handleCollectionClick(c)}
                    className="flex-shrink-0 w-64 rounded-2xl p-3 snap-center cursor-pointer active:scale-95 transition-transform bg-white shadow-lg shadow-gray-100/50 border border-gray-50 hover:border-kaboo-primary/30"
                  >
                    <div className="flex gap-4">
                      <div className="relative flex-shrink-0">
                        <img src={displayCoverImage} alt={c.title} className="w-20 h-20 rounded-xl object-cover shadow-sm bg-gray-200" />
                        <span className={`absolute -top-2 left-2 inline-flex items-center px-2 py-1 rounded-full border text-[9px] font-black uppercase tracking-[0.12em] ${collectionTypeMeta.softClassName}`}>
                          {collectionTypeMeta.shortLabel}
                        </span>
                      </div>
                      <div className="flex-1 py-1">
                        <h3 className="font-bold text-gray-800 text-sm leading-tight line-clamp-2 mb-2">{c.title}</h3>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.14em]">{collectionTypeMeta.label}</p>
                      </div>
                    </div>
                    <div className="mt-3 px-1">
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                         <div className="h-full rounded-full bg-kaboo-primary" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className={`${desktopShellPaddingClass} relative ${isCorujaHeroImageLayout ? '-mt-3 md:-mt-6 pb-10' : 'pt-2 md:pt-6 pb-8'}`}>
          <div
            className={`relative ${isCorujaHeroImageLayout ? 'z-10 pt-2 md:pt-3' : ''}`}
          >
            {isSearchExperience ? (
            hasFilterOnlySelection ? (
              <>
                <div className="flex justify-between items-end pb-4 border-b border-gray-100">
                  <div>
                      <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-kaboo-primary">Filtros aplicados</p>
                    <h2 className="text-xl font-bold text-gray-800">{filteredCollectionGroupTitle}</h2>
                    <p className="text-sm text-gray-500 mt-1">{filteredCollections.length} {filteredCollections.length === 1 ? availableLabelSingular : availableLabelPlural}</p>
                  </div>
                  <button
                    type="button"
                    onClick={resetDiscovery}
                     className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-500 transition-colors hover:border-kaboo-primary/20 hover:text-kaboo-primary"
                  >
                    Limpar
                  </button>
                </div>

                {filteredCollections.length > 0 ? (
                  <div className="mt-6">
                    <GridView
                      key={`filter-only-${animationKey}`}
                      collections={filteredCollections}
                      onCollectionClick={handleCollectionClick}
                      grants={contentGrants}
                      tone="default"
                    />
                  </div>
                ) : (
                  <div className="py-20 text-center flex flex-col items-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                      <Icons.Search size={32} />
                    </div>
                    <h3 className="text-gray-800 font-bold mb-2">Nenhum item encontrado</h3>
                    <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
                      Não encontramos resultados para os filtros selecionados.
                    </p>
                    <button
                      onClick={resetDiscovery}
                      className="px-6 py-3 rounded-xl font-bold transition-colors bg-kaboo-primary/10 text-kaboo-primary hover:bg-kaboo-primary/20"
                    >
                      Limpar filtros
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div aria-hidden="true" className="select-none">
                  <div className="flex justify-between items-end pb-4 border-b border-gray-100">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400 mb-1">Acervo</p>
                      <h2 className="text-xl font-bold text-gray-800">{allCollectionGroupTitle}</h2>
                      <p className="text-sm text-gray-500 mt-1">{searchBackdropCollections.length} {searchBackdropCollections.length === 1 ? availableLabelSingular : availableLabelPlural}</p>
                    </div>
                    <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                      {searchBackdropCollections.length}
                    </span>
                  </div>

                  <div className="mt-6">
                    <GridView
                      key={`search-backdrop-${sortByAge ? 'age' : 'default'}`}
                      collections={searchBackdropCollections}
                      onCollectionClick={handleCollectionClick}
                      grants={contentGrants}
                      tone="default"
                    />
                  </div>
                </div>

                <div
                  aria-hidden="true"
                  onClick={closeInlineSearch}
                  className="absolute inset-0 z-10 rounded-[32px] bg-white/62 backdrop-blur-[3px]"
                />

                <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
                  {showSearchOverlayPanel ? (
                    <div className="mx-auto max-w-5xl pointer-events-auto rounded-[30px] border border-white/80 bg-white/95 p-4 md:p-5 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-kaboo-primary/80">
                            {hasSearchQuery ? 'Resultados rápidos' : 'Filtros aplicados'}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            A busca fica por cima da grade, mantendo o contexto do acervo enquanto você refina.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={resetDiscovery}
                           className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-500 transition-colors hover:border-kaboo-primary/20 hover:text-kaboo-primary"
                        >
                          Limpar
                        </button>
                      </div>

                      <div className="max-h-[min(68vh,calc(100vh-18rem))] overflow-y-auto pr-1">
                        <SearchResultsList
                          collections={filteredCollections}
                          onCollectionClick={handleCollectionClick}
                          searchTerm={searchTerm}
                          availableLabelSingular={availableLabelSingular}
                          availableLabelPlural={availableLabelPlural}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center pt-8">
                      <div className="rounded-full border border-white/80 bg-white/88 px-4 py-2 text-sm font-medium text-gray-500 shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                        Digite para buscar ou abra os filtros, os cards continuam visíveis ao fundo.
                      </div>
                    </div>
                  )}
                </div>
              </>
            )
          ) : (
            <>
              <div className={`flex justify-between items-end pb-4 ${isCorujaHomeLayout ? 'border-b border-white/14' : 'border-b border-gray-100'}`}>
                <div>
                  {hasSearchQuery && (
                    <p className={`mb-1 text-xs font-bold uppercase tracking-[0.14em] ${isCorujaHomeLayout ? 'text-[#FFB347]' : 'text-kaboo-primary'}`}>Busca ativa</p>
                  )}
                  <h2 className={`text-xl font-bold ${isCorujaHomeLayout ? 'text-[#FFB347]' : 'text-gray-800'}`}>
                    {hasSearchQuery ? 'Resultados da busca' :
                      activeTab === 'all' && activeFilterCount === 0 ? allCollectionGroupTitle :
                        activeFilterCount > 0 ? filteredCollectionGroupTitle :
                          activeTab === 'fund1' ? 'Ed. Infantil' : 'E.F. Anos Iniciais'}
                  </h2>
                  {hasSearchQuery && (
                    <p className={`text-sm mt-1 line-clamp-1 ${isCorujaHomeLayout ? 'text-white/70' : 'text-gray-500'}`}>Pesquisando por “{searchTerm.trim()}”</p>
                  )}
                </div>
                {!isCorujaHomeLayout && (
                  <div className="flex items-center gap-1.5 rounded-full border border-gray-200/80 bg-white/90 px-2 py-1 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                    <button
                      onClick={() => setSortByAge(prev => !prev)}
                      className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-black uppercase tracking-[0.08em] transition-all ${sortByAge
                        ? isCorujaHomeLayout
                          ? 'bg-[#5D1E76] text-white shadow-[0_10px_22px_rgba(93,30,118,0.3)]'
                          : 'bg-kaboo-primary text-white shadow-sm'
                        : isCorujaHomeLayout
                          ? 'bg-white/10 text-white/80 hover:bg-white/14'
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                        }`}
                      title="Ordenar por faixa etária"
                    >
                      <Icons.ArrowUpDown size={12} />
                      Idade
                    </button>
                    <span className={`inline-flex h-8 min-w-[2rem] items-center justify-center rounded-full px-2 text-[11px] font-black ${isCorujaHomeLayout ? 'text-white/70 bg-white/10' : 'text-gray-400 bg-gray-50'}`}>
                      {filteredCollections.length}
                    </span>
                    <button
                      onClick={handleRefresh}
                      disabled={isRefreshing || loading}
                      className={`h-8 w-8 rounded-full active:scale-95 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${isCorujaHomeLayout ? 'bg-white/10 hover:bg-white/14' : 'bg-gray-50 hover:bg-gray-100'}`}
                      title="Atualizar coleções"
                    >
                      <Icons.RotateCw
                        size={14}
                        className={`${isCorujaHomeLayout ? 'text-white/80' : 'text-gray-600'} ${isRefreshing ? 'animate-spin' : ''}`}
                      />
                    </button>
                  </div>
                )}
              </div>

              {filteredCollections.length > 0 ? (
                <div className="relative z-10 mt-6">
                  <GridView
                    key={animationKey}
                    collections={filteredCollections}
                    onCollectionClick={handleCollectionClick}
                    grants={contentGrants}
                    tone="default"
                  />
                </div>
              ) : (
                <div className="py-20 text-center flex flex-col items-center">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${isCorujaHomeLayout ? 'bg-white/10 text-white/55' : 'bg-gray-50 text-gray-300'}`}>
                    <Icons.Search size={32} />
                  </div>
                  <h3 className={`font-bold mb-2 ${isCorujaHomeLayout ? 'text-white' : 'text-gray-800'}`}>Nenhum item encontrado</h3>
                  <p className={`text-sm mb-6 max-w-xs mx-auto ${isCorujaHomeLayout ? 'text-white/65' : 'text-gray-400'}`}>
                    Não encontramos resultados para a combinação atual de busca e filtros.
                  </p>
                  <button
                    onClick={resetDiscovery}
                    className={`px-6 py-3 rounded-xl font-bold transition-colors ${isCorujaHomeLayout ? 'bg-white/10 text-[#FFB347] hover:bg-white/14' : 'bg-kaboo-primary/10 text-kaboo-primary hover:bg-kaboo-primary/20'}`}
                  >
                    Limpar busca e filtros
                  </button>
                </div>
              )}
            </>
            )}
          </div>
        </div>
      </div>

      {showFilters && <FilterModal />}

      {showBnccPicker && (
        <BnccPickerSheet
          query={bnccPickerQuery}
          options={filteredBnccPickerOptions}
          selectedCodes={draftBnccSelection}
          filters={bnccPickerFilters}
          stageOptions={bnccPickerFacets.stages}
          componentOptions={bnccPickerFacets.components}
          yearOptions={bnccPickerFacets.years}
          onQueryChange={setBnccPickerQuery}
          onFilterChange={handleBnccFilterChange}
          onToggle={toggleDraftBncc}
          onClear={clearBnccDraft}
          onClose={closeBnccPicker}
          onApply={applyBnccPicker}
        />
      )}

      {showWelcome && (
        <div
          className={`fixed inset-0 z-[70] flex items-center justify-center p-4 transition-all duration-300 ease-in-out ${isClosingWelcome ? 'opacity-0' : 'opacity-100'}`}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out" onClick={handleCloseWelcome}></div>

          <canvas
            ref={(node) => {
              confettiCanvasRef.current = node;
              if (node && showWelcome) {
                // Set dimensions
                node.width = window.innerWidth;
                node.height = window.innerHeight;
                // Mark canvas as ready
                setTimeout(() => setCanvasReady(true), 50);
              } else if (!showWelcome) {
                setCanvasReady(false);
              }
            }}
            className={`absolute inset-0 w-full h-full pointer-events-none z-[75] transition-opacity duration-300 ease-in-out ${isClosingWelcome ? 'opacity-0' : 'opacity-100'}`}
            style={{ display: 'block' }}
          />

          <div className={`bg-white rounded-3xl p-8 w-full max-w-sm text-center relative z-[80] shadow-2xl transform transition-all duration-300 ease-in-out ${isClosingWelcome ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
            <div className="mb-6 flex justify-center">
              <img src={brandLogoUrl} alt={brandDisplayName} className="w-40 h-auto" />
            </div>
            <h2 className="text-2xl font-black text-kaboo-primary mb-2">
              Olá, {getFirstName(profile?.full_name || '')}!
            </h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Estamos muito felizes em ter você aqui. Explore nossas coleções e divirta-se ensinando!
            </p>
            <Button fullWidth onClick={handleCloseWelcome}>
              Começar a Explorar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
