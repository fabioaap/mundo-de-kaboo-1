import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';

const toSingular = (label: string) => {
  const map: Record<string, string> = {
    'Coleções': 'Coleção',
    'Livros': 'Livro',
    'Vídeos': 'Vídeo',
    'Áudios': 'Áudio',
    'Materiais': 'Material',
    'Formações': 'Formação',
  };
  return map[label] ?? label.replace(/s$/, '');
};
import { Icons } from '../components/Icons';
import { Card3D } from '../components/Card3D';
import { Character, Collection, CollectionAsset, CollectionAssetCategory, ScreenName, UserAuthStatus, UserProfile, UserRole } from '../types';
import { api } from '../lib/api';
import { canEditCollections, isAdmin } from '../lib/auth';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../design-system';
import { FileUpload } from '../components/FileUpload';
import { SearchableMultiSelect } from '../components/SearchableMultiSelect';
import { Tabs } from '../components/Tabs';
import { MultipleFileUpload } from '../components/MultipleFileUpload';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { ColorPicker } from '../components/ColorPicker';
import { CharacterAvatar } from '../components/CharacterAvatar';
import { formatSegmentLabel, AVAILABLE_SEGMENTS, AGE_GRADE_OPTIONS, SUITABLE_AGES_OPTIONS, BNCC_OPTIONS, CASEL_OPTIONS } from '../constants';
import useIsMobile from '../hooks/useIsMobile';
import { placeholderImageUrl, isPlaceholderImageUrl } from '../lib/appPaths';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { formatAccessDate, getAccessStatusLabel, getProfileAccessStatus } from '../lib/access';
import { normalizeCharacterLookupKey, resolveCharacterNamesFromIds, syncCollectionCharacters } from '../lib/characters';
import { COLLECTION_ASSET_META, inferCollectionAssets, promoteCollectionAssets, syncCollectionWithAssets } from '../lib/collectionAssets';
import { extractSourceCollectionId, getCollectionDisplayCover, getCollectionTypeMeta, getLibraryAssetCoverImage, getYoutubeThumbnail, isStandaloneReadableBook, normalizeSingleKitBookIds } from '../lib/collectionPresentation';
import { VideoFramePicker } from '../components/VideoFramePicker';
import { extractAudioCoverArt } from '../lib/extractAudioCoverArt';
import { uploadFile } from '../lib/storage';
import { renderPdfFirstPageToFile } from '../lib/pdfCover';
import { extractPdfText } from '../lib/pdfText';
import { useBrandConfig } from '../hooks/useBrandConfig';
import { getWhiteLabelAIConfig, aiSuggest } from '../lib/aiIntegrationApi';

interface AdminCollectionsScreenProps {
  onNavigate: (screen: ScreenName, params?: any) => void;
  onBack: () => void;
  initialTab?: 'collections' | 'users';
  initialLibraryArea?: 'books' | 'videos' | 'music' | 'formations' | 'materials';
}

export interface AdminCollectionsHandle {
  hasUnsavedChanges: () => boolean;
}

type CollectionFormData = Partial<Collection> & {
  collection_assets: CollectionAsset[];
};

type FixedMediaSlotCategory = Exclude<CollectionAssetCategory, 'extra_material'>;
type LibraryAreaKey = NonNullable<AdminCollectionsScreenProps['initialLibraryArea']>;

type LibraryAssetListItem = {
  key: string;
  collection: Collection;
  asset: CollectionAsset;
  displayTitle: string;
  previewText: string | null;
  coverImage: string;
  searchText: string;
  levelLabel: string;
  iconName: keyof typeof Icons;
};

type FixedMediaSlot = {
  category: FixedMediaSlotCategory;
  label: string;
  folder: 'pdfs' | 'audio' | 'video';
  accept: string;
  allowMetadata?: boolean;
  titlePlaceholder?: string;
  descriptionPlaceholder?: string;
  urlLabel?: string;
  urlPlaceholder?: string;
};

const DEFAULT_COLLECTION_COLOR_THEME = '#5D1F58';

/** Extrai título e nível a partir do nome de arquivo PDF dos livros Kaboo.
 * Padrões suportados:
 *   EFAI{N}_Livro_{Título com espaços}_app.pdf  → level "Fundamental I"
 *   EI_KabooLivro{N}_{CamelCase}_app.pdf        → level "Educação Infantil"
 */
const parsePdfFilename = (filename: string): {
  title: string | null;
  level: 'Educação Infantil' | 'Fundamental I' | null;
} => {
  const base = filename.replace(/\.[^.]+$/, ''); // remove extensão

  // EFAI: título já vem com espaços (ex.: "Kaboo e a Carta Misteriosa")
  const efai = base.match(/^EFAI\d+_Livro_(.+?)(?:_app|_compressed)?$/i);
  if (efai) return { title: efai[1].trim(), level: 'Fundamental I' };

  // EI: título em CamelCase abreviado — separa em palavras como sugestão
  const ei = base.match(/^EI_KabooLivro\d+_(.+?)(?:_app|_New|_compressed)?$/i);
  if (ei) {
    const words = ei[1].replace(/([A-ZÁÉÍÓÚÃÕÂÊÔÀÜÇ])/g, ' $1').trim();
    return { title: words, level: 'Educação Infantil' };
  }

  return { title: null, level: null };
};

const EMPTY_COLLECTION_FORM_DATA: CollectionFormData = {
  title: '',
  collection_type: 'book',
  kit_cover_image: null,
  kit_book_ids: [],
  level: 'Educação Infantil',
  segments: [],
  primary_segment: '',
  cover_image: placeholderImageUrl,
  pdf_url: '',
  audio_url: '',
  video_url: '',
  color_theme: DEFAULT_COLLECTION_COLOR_THEME,
  synopsis: '',
  theme: '',
  learning_objectives: '',
  characters: [],
  character_ids: [],
  bncc_skills: [],
  casel_competencies: [],
  age_grade: [],
  suitable_ages: [],
  extra_materials: [],
  collection_assets: [],
  offline_available: false,
  is_published: false,
};

const createAssetId = (category: CollectionAssetCategory) => {
  return `${category}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const CATEGORY_COVER_URL: Partial<Record<CollectionAssetCategory, string>> = {
  storytelling: '/mock/covers/asset-storytelling.svg',
  animation: '/mock/covers/asset-animation.svg',
  accessible_video: '/mock/covers/asset-accessible-video.svg',
  how_to_play: '/mock/covers/asset-how-to-play.svg',
  video_lesson: '/mock/covers/asset-video-lesson.svg',
  teacher_guide: '/mock/covers/asset-teacher-guide.svg',
  extra_material: '/mock/covers/asset-extra-material.svg',
  reading: '/mock/covers/asset-reading.svg',
};

const inferAssetMediaTypeFromUrl = (url: string): CollectionAsset['media_type'] => {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.match(/\.(mp3|wav|ogg|m4a|aac)$/)) {
    return 'audio';
  }

  if (lowerUrl.match(/\.(mp4|webm|mov|avi|m4v)$/)) {
    return 'video';
  }

  return 'document';
};

const normalizeThemeColor = (value?: string | null) => value?.trim().toLowerCase() || '';

const normalizeAssetTitle = (url: string, fallback: string) => {
  const fileName = url.split('/').pop() || fallback;

  return fileName
    .replace(/^\d+-[a-z0-9]+-/i, '')
    .replace(/\.[a-z0-9]{1,6}$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || fallback;
};

const normalizeKitBookIds = (value?: string[] | null): string[] => {
  return normalizeSingleKitBookIds(value);
};

const normalizeSearchableText = (...values: Array<string | null | undefined>) => {
  return values
    .map((value) => (value ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

const cleanVideoSupportingCopy = (value?: string | null) => {
  return (value ?? '').replace(/^(vídeo|video)\s*•\s*/i, '').trim();
};

const getDistinctVideoPreviewText = (item: LibraryAssetListItem) => {
  const cleanedValue = cleanVideoSupportingCopy(item.previewText);
  const normalizedValue = normalizeSearchableText(cleanedValue);

  if (!normalizedValue || normalizedValue === 'video') {
    return '';
  }

  const normalizedTitle = normalizeSearchableText(item.displayTitle);
  const normalizedCollection = normalizeSearchableText(item.collection.title);

  // Only suppress when the description IS the title or collection name verbatim.
  // Suppress-by-contains was too aggressive: descriptions that merely mention the
  // collection name (e.g. "Conheça as regras do jogo Descobertas que mudaram o mundo...")
  // were being wiped out, making those cards appear blank.
  if (
    (normalizedTitle && normalizedTitle === normalizedValue)
    || (normalizedCollection && normalizedCollection === normalizedValue)
  ) {
    return '';
  }

  return cleanedValue;
};

const getCollectionLevelChipLabel = (level?: Collection['level']) => {
  return level === 'Fundamental I' ? 'E.F. Anos Iniciais' : 'Ed. Infantil';
};

const getLibraryAssetIcon = (asset: CollectionAsset): keyof typeof Icons => {
  switch (asset.category) {
    case 'storytelling':
      return 'Headphones';
    case 'animation':
    case 'accessible_video':
    case 'how_to_play':
    case 'video_lesson':
    case 'formation':
    case 'story_video':
      return 'Video';
    case 'reading':
      return 'BookOpen';
    case 'teacher_guide':
    case 'extra_material':
    default:
      return 'FileText';
  }
};

// Generic labels that come from the media_type or category and are never a real
// content title. If asset.title equals one of these, fall back to collection.title.
const GENERIC_ASSET_TITLE_LABELS = new Set([
  'Áudio', 'Audio', 'Vídeo', 'Video', 'Música', 'Musica', 'Material',
  'Documento', 'Formação', 'Formacao', 'Leitura',
]);

const getLibraryAssetDisplayTitle = (collection: Collection, asset: CollectionAsset) => {
  const normalizedTitle = (asset.title || '').trim();
  const defaultLabel = COLLECTION_ASSET_META[asset.category].label;
  const isGenericPlaceholder = GENERIC_ASSET_TITLE_LABELS.has(normalizedTitle);
  const shouldUseCollectionTitle = !normalizedTitle
    || isGenericPlaceholder
    || (normalizedTitle === defaultLabel && ['reading', 'storytelling', 'animation', 'accessible_video'].includes(asset.category));

  if (shouldUseCollectionTitle && collection.title?.trim()) {
    return collection.title.trim();
  }

  return normalizedTitle || defaultLabel;
};

const buildCollectionFormData = (collection?: Partial<Collection>): CollectionFormData => {
  const normalizedCollection = syncCollectionCharacters(syncCollectionWithAssets({
    ...EMPTY_COLLECTION_FORM_DATA,
    ...collection,
    collection_assets: inferCollectionAssets(collection ?? {}),
  }));

  return {
    ...normalizedCollection,
    collection_type: normalizedCollection.collection_type || 'book',
    kit_cover_image: normalizedCollection.kit_cover_image || null,
    kit_book_ids: normalizeKitBookIds(normalizedCollection.kit_book_ids),
    segments: [...(normalizedCollection.segments || [])],
    characters: [...(normalizedCollection.characters || [])],
    character_ids: [...(normalizedCollection.character_ids || [])],
    bncc_skills: [...(normalizedCollection.bncc_skills || [])],
    casel_competencies: [...(normalizedCollection.casel_competencies || [])],
    age_grade: [...(normalizedCollection.age_grade || [])],
    suitable_ages: [...(normalizedCollection.suitable_ages || [])],
    extra_materials: [...(normalizedCollection.extra_materials || [])],
    collection_assets: [...(normalizedCollection.collection_assets || [])],
    offline_available: normalizedCollection.offline_available ?? false,
  };
};

const FIXED_MEDIA_SLOTS: FixedMediaSlot[] = [
  {
    category: 'reading',
    label: COLLECTION_ASSET_META.reading.label,
    folder: 'pdfs',
    accept: 'application/pdf',
  },
  {
    category: 'storytelling',
    label: COLLECTION_ASSET_META.storytelling.label,
    folder: 'audio',
    accept: 'audio/*',
    allowMetadata: true,
    titlePlaceholder: 'Ex.: A Cor do Sentir',
    descriptionPlaceholder: 'Descrição opcional desta música ou contação.',
  },
  {
    category: 'animation',
    label: COLLECTION_ASSET_META.animation.label,
    folder: 'video',
    accept: 'video/*',
    allowMetadata: true,
    titlePlaceholder: 'Ex.: A Floresta Encantada',
    descriptionPlaceholder: 'Descrição opcional do vídeo animado.',
  },
  {
    category: 'accessible_video',
    label: COLLECTION_ASSET_META.accessible_video.label,
    folder: 'video',
    accept: 'video/*',
    allowMetadata: true,
    titlePlaceholder: 'Ex.: Vídeo com Libras',
    descriptionPlaceholder: 'Descrição opcional para orientar o uso deste material.',
  },
  {
    category: 'how_to_play',
    label: COLLECTION_ASSET_META.how_to_play.label,
    folder: 'video',
    accept: 'video/*',
    allowMetadata: true,
    titlePlaceholder: 'Ex.: Tutorial rápido',
    descriptionPlaceholder: 'Descreva o foco do vídeo de como jogar.',
  },
  {
    category: 'video_lesson',
    label: COLLECTION_ASSET_META.video_lesson.label,
    folder: 'video',
    accept: 'video/*',
    allowMetadata: true,
    titlePlaceholder: 'Ex.: Videoaula introdutória',
    descriptionPlaceholder: 'Descreva o conteúdo pedagógico desta videoaula.',
  },
  {
    category: 'formation',
    label: COLLECTION_ASSET_META.formation.label,
    folder: 'video',
    accept: 'video/*',
    allowMetadata: true,
    titlePlaceholder: 'Ex.: Formação para educadores',
    descriptionPlaceholder: 'Descreva o conteúdo formativo deste vídeo.',
  },
  {
    category: 'story_video',
    label: COLLECTION_ASSET_META.story_video.label,
    folder: 'video',
    accept: 'video/*',
    allowMetadata: true,
    titlePlaceholder: 'Ex.: A história do Kaboo',
    descriptionPlaceholder: 'Descreva a história contada neste vídeo.',
  },
  {
    category: 'teacher_guide',
    label: COLLECTION_ASSET_META.teacher_guide.label,
    folder: 'pdfs',
    accept: 'application/pdf',
    allowMetadata: true,
    titlePlaceholder: 'Ex.: Guia do Professor',
    descriptionPlaceholder: 'Descreva brevemente o conteúdo do guia.',
  },
];

const LIBRARY_AREA_LABEL: Record<LibraryAreaKey, string> = {
  books: 'Livros',
  videos: 'Vídeos',
  music: 'Áudios',
  formations: 'Formações',
  materials: 'Materiais',
};

const LIBRARY_AREA_PRIMARY_SLOTS: Record<LibraryAreaKey, CollectionAssetCategory[]> = {
  books: ['reading'],
  // Vídeos: animação + contação + acessível + uso guiado + videoaula + formação.
  videos: ['animation', 'story_video', 'accessible_video', 'how_to_play', 'video_lesson', 'formation'],
  music: ['storytelling'],
  formations: ['teacher_guide', 'video_lesson'],
  // Materiais = extra_material apenas; reading pertence exclusivamente a Livros.
  materials: ['extra_material'],
};

// Maps each asset category to a semantic media type label and color for the slot header badge.
const SLOT_MEDIA_TYPE: Record<CollectionAssetCategory, { label: string; color: string }> = {
  reading:        { label: 'Livro',     color: 'bg-blue-50 text-blue-600 border-blue-200' },
  storytelling:   { label: 'Áudio Livro', color: 'bg-violet-50 text-violet-600 border-violet-200' },
  animation:      { label: 'Vídeo',    color: 'bg-rose-50 text-rose-600 border-rose-200' },
  accessible_video: { label: 'Vídeo', color: 'bg-rose-50 text-rose-600 border-rose-200' },
  how_to_play:    { label: 'Vídeo',    color: 'bg-rose-50 text-rose-600 border-rose-200' },
  video_lesson:   { label: 'Vídeo',    color: 'bg-rose-50 text-rose-600 border-rose-200' },
  teacher_guide:  { label: 'Material', color: 'bg-amber-50 text-amber-600 border-amber-200' },
  extra_material: { label: 'Material', color: 'bg-amber-50 text-amber-600 border-amber-200' },
  formation:      { label: 'Formação', color: 'bg-amber-50 text-amber-600 border-amber-200' },
  story_video:    { label: 'Vídeo',    color: 'bg-rose-50 text-rose-600 border-rose-200' },
};

// Maps each asset category to a human-readable hint for the empty-state in the media picker.
const CATEGORY_REGISTER_HINT: Partial<Record<CollectionAssetCategory, string>> = {
  animation: 'na área de Vídeos',
  storytelling: 'na área de Áudios',
  reading: 'na área de Livros',
  accessible_video: 'na área de Vídeos (variante Libras)',
  how_to_play: 'na área de Vídeos (Como Jogar)',
  video_lesson: 'na área de Formações',
  teacher_guide: 'na área de Formações',
  extra_material: 'na área de Materiais',
};

const LIBRARY_AREA_LISTING_CATEGORIES: Record<LibraryAreaKey, CollectionAssetCategory[]> = {
  books: ['reading'],
  // Deve espelhar LIBRARY_AREA_PRIMARY_SLOTS.videos — senão vídeos criados em
  // categorias ausentes aqui salvam no banco mas somem da lista do hub.
  videos: ['animation', 'story_video', 'accessible_video', 'how_to_play', 'video_lesson', 'formation'],
  music: ['storytelling'],
  formations: ['teacher_guide', 'video_lesson'],
  // reading pertence exclusivamente a Livros; Materiais exibe apenas extra_material.
  materials: ['extra_material'],
};

const LIBRARY_AREA_UI_META: Record<LibraryAreaKey, {
  icon: keyof typeof Icons;
  searchPlaceholder: string;
  emptyMessage: string;
  createLabel: string;
}> = {
  books: {
    icon: 'BookOpen',
    searchPlaceholder: 'Buscar por livro, BNCC ou tema...',
    emptyMessage: 'Nenhum livro corresponde aos filtros.',
    createLabel: 'Novo livro',
  },
  music: {
    icon: 'Headphones',
    searchPlaceholder: 'Buscar por áudio, coleção ou tema...',
    emptyMessage: 'Nenhum áudio corresponde aos filtros.',
    createLabel: 'Novo áudio',
  },
  videos: {
    icon: 'Video',
    searchPlaceholder: 'Buscar por vídeo, coleção ou tema...',
    emptyMessage: 'Nenhum vídeo corresponde aos filtros.',
    createLabel: 'Novo vídeo',
  },
  formations: {
    icon: 'FileText',
    searchPlaceholder: 'Buscar por formação, guia ou coleção...',
    emptyMessage: 'Nenhuma formação corresponde aos filtros.',
    createLabel: 'Nova formação',
  },
  materials: {
    icon: 'BookOpen',
    searchPlaceholder: 'Buscar por material, PDF ou coleção...',
    emptyMessage: 'Nenhum material corresponde aos filtros.',
    createLabel: 'Novo material',
  },
};

// Componente interno para card com efeito 3D
const Card3DCover: React.FC<{
  imageUrl: string;
  alt: string;
  level?: string;
  collectionTypeLabel?: string;
  collectionTypeBadgeClassName?: string;
  actionsButton?: React.ReactNode;
}> = ({ imageUrl, alt, level, collectionTypeLabel, collectionTypeBadgeClassName, actionsButton }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    const rotateX = (mouseY / (rect.height / 2)) * -8;
    const rotateY = (mouseX / (rect.width / 2)) * 8;

    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setTilt({ x: 0, y: 0 });
    }
  };

  return (
    <div className="aspect-square mb-3 relative">
      <div
        ref={cardRef}
        className="w-full h-full rounded-lg overflow-hidden relative group shadow-md shadow-gray-100"
        style={{
          WebkitMaskImage: '-webkit-radial-gradient(white, black)',
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1, 1, 1)`,
          transformStyle: 'preserve-3d',
          transition: isMobile
            ? 'transform 0.1s ease-out'
            : (tilt.x === 0 && tilt.y === 0 ? 'transform 0.5s ease-out' : 'transform 0.1s ease-out'),
          touchAction: 'manipulation',
        }}
        onMouseMove={!isMobile ? handleMouseMove : undefined}
        onMouseLeave={!isMobile ? handleMouseLeave : undefined}
      >
        <img
          src={imageUrl}
          alt={alt}
          className="w-full h-full object-cover bg-gray-200"
          style={{
            transform: 'translateZ(20px)',
          }}
        />
        {/* Light reflection effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(${135 + (tilt.y * 2)
              }deg, 
              transparent 0%, 
              rgba(255, 255, 255, 0.3) ${50 + (tilt.x * 0.5) + (tilt.y * 0.5)}%, 
              transparent 100%
            )`,
            transform: `translateZ(25px) translateX(${tilt.y * 2}px) translateY(${tilt.x * 2}px)`,
            transition: 'background 0.1s ease-out, transform 0.1s ease-out',
            mixBlendMode: 'overlay',
          }}
        />
        {/* Secondary light reflection */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at ${50 + (tilt.y * 1.5)}% ${50 + (tilt.x * 1.5)}%, 
              rgba(255, 255, 255, 0.4) 0%, 
              transparent 60%
            )`,
            transform: 'translateZ(30px)',
            transition: 'background 0.1s ease-out',
            mixBlendMode: 'soft-light',
          }}
        />
        {collectionTypeLabel && collectionTypeBadgeClassName && (
          <div
            className={`absolute top-2 left-2 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.14em] border backdrop-blur-sm ${collectionTypeBadgeClassName}`}
            style={{
              transform: 'translateZ(30px)',
            }}
          >
            {collectionTypeLabel}
          </div>
        )}
        {level && (
          <div
            className="absolute bottom-2 right-2 px-2 py-1 bg-white/95 backdrop-blur-sm rounded-lg text-[10px] font-bold text-brand-primary shadow-sm border border-white/50"
            style={{
              transform: 'translateZ(30px)',
            }}
          >
            {formatSegmentLabel(level)}
          </div>
        )}
      </div>
      {actionsButton && (
        <div
          className="absolute top-2 right-2 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {actionsButton}
        </div>
      )}
    </div>
  );
};

export const AdminCollectionsScreen = forwardRef<AdminCollectionsHandle, AdminCollectionsScreenProps>(({ onNavigate, onBack, initialTab, initialLibraryArea }, ref) => {
  // Main tab — driven by initialTab prop (key remount in AdminScreen)
  const mainTab = initialTab || 'collections';
  const isBooksCatalogMode = initialLibraryArea === 'books';
  const isAssetLibraryAreaMode = Boolean(initialLibraryArea && initialLibraryArea !== 'books');
  const isLibraryAreaMode = isAssetLibraryAreaMode;
  const isCollectionsCatalogMode = !initialLibraryArea;
  const defaultCollectionTab: 'identification' | 'media' = isAssetLibraryAreaMode ? 'media' : 'identification';
  const createCollectionFormDataForCurrentFlow = (collection?: Partial<Collection>): CollectionFormData => {
    const nextFormData = buildCollectionFormData(collection);

    if (isCollectionsCatalogMode) {
      return {
        ...nextFormData,
        collection_type: 'kit',
        kit_cover_image: null,
      };
    }

    if (isBooksCatalogMode) {
      return {
        ...nextFormData,
        collection_type: 'book',
        kit_cover_image: null,
        kit_book_ids: [],
      };
    }

    return nextFormData;
  };

  // Collections state
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'identification' | 'media'>(defaultCollectionTab);
  // In library-area registration mode, track which slot type the user selected
  const [selectedLibrarySlot, setSelectedLibrarySlot] = useState<FixedMediaSlotCategory | null>(null);
  const [showMediaTypeDropdown, setShowMediaTypeDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingYoutubeData, setIsFetchingYoutubeData] = useState(false);
  const [availableCharacters, setAvailableCharacters] = useState<Character[]>([]);
  // Começa true: evita mostrar "Nenhum personagem cadastrado" (e permitir salvar
  // uma seleção vazia) antes do catálogo terminar de carregar.
  const [charactersLoading, setCharactersLoading] = useState(true);

  // Users state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userFormData, setUserFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'viewer' as UserRole,
  });
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [userErrorMsg, setUserErrorMsg] = useState<string | null>(null);
  const [userSuccessMsg, setUserSuccessMsg] = useState<string | null>(null);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  // Edit user state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserFormData, setEditUserFormData] = useState<{ full_name: string; role: UserRole }>({ full_name: '', role: 'viewer' });
  const [editUserRoleDropdownOpen, setEditUserRoleDropdownOpen] = useState(false);
  const [loadingUserEdit, setLoadingUserEdit] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [editUserErrorMsg, setEditUserErrorMsg] = useState<string | null>(null);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const editUserRoleRef = useRef<HTMLDivElement>(null);
  const [originalFormData, setOriginalFormData] = useState<CollectionFormData | null>(null);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [cascadeUnpublishConfirm, setCascadeUnpublishConfirm] = useState<{
    affectedCollections: Collection[];
    onConfirm: () => void;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const { toast, showToast, hideToast } = useToast();

  // --- Sugestão de sinopse por IA (White Label) ---
  const { bootstrap: brandBootstrap } = useBrandConfig();
  const activeBrandId = brandBootstrap?.brand?.id ?? '';
  const [aiSynopsisEnabled, setAiSynopsisEnabled] = useState(false);
  const [suggestingSynopsis, setSuggestingSynopsis] = useState(false);
  // Guideline de capa (coleção): prompt copiável para gerar a capa em LLM de imagem.
  const [coverPromptCopied, setCoverPromptCopied] = useState(false);
  const [showCoverPromptGuide, setShowCoverPromptGuide] = useState(false);
  // Guarda o último PDF selecionado no upload, para extrair texto sem rebaixar do storage.
  const lastPdfFileRef = useRef<File | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!activeBrandId) {
      setAiSynopsisEnabled(false);
      return;
    }
    getWhiteLabelAIConfig(activeBrandId)
      .then((cfg) => { if (!cancelled) setAiSynopsisEnabled(cfg.enabled && cfg.key_configured); })
      .catch(() => { if (!cancelled) setAiSynopsisEnabled(false); });
    return () => { cancelled = true; };
  }, [activeBrandId]);
  const [searchFilter, setSearchFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'Educação Infantil' | 'Fundamental I'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  // Aba de status de publicação: separa conteúdos publicados de rascunhos (não publicados).
  const [publishStatusFilter, setPublishStatusFilter] = useState<'published' | 'draft'>('published');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openActionsDropdown, setOpenActionsDropdown] = useState<string | null>(null);
  const openActionsDropdownRef = useRef<string | null>(null);
  // Wrapper that keeps ref and state in sync synchronously (ref is readable by native event handlers immediately)
  const setOpenDropdown = useCallback((id: string | null) => {
    openActionsDropdownRef.current = id;
    setOpenActionsDropdown(id);
  }, []);

  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const levelDropdownRef = useRef<HTMLDivElement>(null);
  const mediaTypeDropdownRef = useRef<HTMLDivElement>(null);

  const actionsDropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const mediaSectionRefs = useRef<Partial<Record<CollectionAssetCategory, HTMLDivElement | null>>>({});
  const extraMaterialsSectionRef = useRef<HTMLDivElement | null>(null);
  const drawerBodyRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<CollectionFormData>(() => createCollectionFormDataForCurrentFlow());
  const [previewVideoItem, setPreviewVideoItem] = useState<LibraryAssetListItem | null>(null);
  const [previewLibraryItem, setPreviewLibraryItem] = useState<LibraryAssetListItem | null>(null);
  const [highlightedAssetId, setHighlightedAssetId] = useState<string | null>(null);
  const [highlightedAssetCategory, setHighlightedAssetCategory] = useState<CollectionAssetCategory | null>(null);
  const [slotSearchTerms, setSlotSearchTerms] = useState<Record<string, string>>({});

  const handleSuggestSynopsis = useCallback(async () => {
    if (suggestingSynopsis || !activeBrandId) return;
    setSuggestingSynopsis(true);
    try {
      // Texto do PDF: do arquivo recém-selecionado ou do PDF já vinculado.
      let pdfText = '';
      if (lastPdfFileRef.current) {
        pdfText = await extractPdfText(lastPdfFileRef.current);
      } else {
        const readingUrl =
          formData.collection_assets.find((a) => a.category === 'reading')?.url || formData.pdf_url || '';
        if (readingUrl) pdfText = await extractPdfText(readingUrl);
      }

      const { text } = await aiSuggest({
        brandId: activeBrandId,
        action: 'suggest_synopsis',
        input: {
          title: formData.title,
          theme: formData.theme,
          level: formData.level,
          pdfText: pdfText || undefined,
          currentSynopsis: formData.synopsis || undefined,
        },
      });

      const suggestion = (text || '').trim().slice(0, 500);
      if (!suggestion) {
        showToast('A IA não retornou uma sugestão.', 'error');
        return;
      }
      setFormData((prev) => ({ ...prev, synopsis: suggestion }));
      showToast('Sinopse sugerida pela IA. Revise antes de salvar.', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Falha ao sugerir sinopse.', 'error');
    } finally {
      setSuggestingSynopsis(false);
    }
  }, [suggestingSynopsis, activeBrandId, formData.collection_assets, formData.pdf_url, formData.title, formData.theme, formData.level, formData.synopsis, showToast]);

  const activeLibraryAreaLabel = initialLibraryArea ? LIBRARY_AREA_LABEL[initialLibraryArea] : null;
  const activeLibraryAreaUi = initialLibraryArea ? LIBRARY_AREA_UI_META[initialLibraryArea] : null;
  const contentEntityLabel = isBooksCatalogMode ? 'Livro' : 'Coleção';
  const contentEntityLabelLower = contentEntityLabel.toLowerCase();
  const createContentLabel = activeLibraryAreaUi?.createLabel || 'Nova Coleção';
  const titleFieldPlaceholder = isCollectionsCatalogMode ? 'Título da coleção' : 'Título do livro';
  const coverFieldLabel = isCollectionsCatalogMode ? 'Capa da coleção' : 'Capa do livro';
  const coverFieldHelpText = isCollectionsCatalogMode
    ? 'Essa imagem vira a thumbnail principal do card da coleção na vitrine. Se você não definir outra thumbnail, a própria capa do livro ou da coleção será usada automaticamente no card.'
    : 'Essa imagem vira a thumbnail principal do card do livro na vitrine de Livros. Se você não definir outra thumbnail, a própria capa do livro será usada automaticamente no card.';
  const colorFieldHelpText = isCollectionsCatalogMode
    ? 'Essa cor organiza o fundo do card. Ao vincular um livro, usamos a paleta dele como ponto de partida e você ajusta só se precisar.'
    : 'Essa cor organiza o fundo do card do livro e ajuda a dar unidade à vitrine editorial.';
  const showcaseBadgeLabel = isCollectionsCatalogMode ? 'Coleção' : 'Livro';
  const showcaseDescription = isCollectionsCatalogMode
    ? 'A tag Coleção é automática. Os chips de Leitura, Áudio, Vídeo e Materiais aparecem conforme as mídias vinculadas nesta coleção.'
    : 'A tag Livro é automática. Os chips de Leitura, Áudio, Vídeo e Materiais aparecem conforme as mídias vinculadas neste livro.';

  // Monta o prompt que o usuário copia e cola em uma LLM de geração de imagem
  // (anexando a foto da caixa física da coleção) para gerar a capa do card.
  const buildCollectionCoverPrompt = useCallback((): string => {
    const collectionName = (formData.title || '').trim() || '[NOME DA COLEÇÃO]';
    const themeLine = (formData.theme || '').trim();
    return [
      `Você é um especialista em OUTPAINTING (expansão/uncrop) de fotos de produtos.`,
      ``,
      `Em anexo está a foto da CAIXA FÍSICA da coleção "${collectionName}".`,
      themeLine ? `Tema da coleção: ${themeLine}.` : ``,
      ``,
      `TAREFA: NÃO redesenhe, NÃO recrie e NÃO transforme isso em uma capa/ilustração chapada. Sua única tarefa é EXPANDIR a tela (outpainting) ao redor da foto anexada, mantendo a CAIXA exatamente como ela está e preenchendo apenas o espaço vazio em volta dela.`,
      ``,
      `REGRAS OBRIGATÓRIAS:`,
      `1. FORMATO: resultado perfeitamente QUADRADO (1:1), alta resolução, sem bordas brancas.`,
      `2. CAIXA INTACTA NO CENTRO: reaproveite a foto da caixa do anexo SEM ALTERAR — mesma caixa tridimensional, mesma arte, mesmo lettering, mesmas cores, mesma perspectiva e mesma sombra. Ela deve permanecer no CENTRO, em destaque, claramente reconhecível como a caixa do produto (um objeto 3D fotografado, não um desenho plano).`,
      `3. TAMANHO DA CAIXA (CRÍTICO): a caixa deve ocupar no MÁXIMO cerca de 65% do quadro e ficar centralizada, deixando margem visível em TODOS os lados (cima, baixo, esquerda e direita). MESMO que a foto da caixa seja quadrada, REDUZA a caixa para que sobre espaço ao redor — esse espaço é onde o fundo expandido vai aparecer. A caixa NUNCA pode preencher o quadro inteiro nem encostar nas bordas.`,
      `4. APENAS O FUNDO É NOVO: gere somente a área AO REDOR da caixa, dando continuidade à arte que já aparece NA PRÓPRIA caixa (mesmos personagens, mesma paleta, mesmo cenário e estilo de ilustração). O fundo deve parecer que a cena ilustrada da caixa "vazou" para fora dela e preencheu o quadro.`,
      `5. O ESTILO VEM DA CAIXA: cada caixa tem identidade própria — extraia cores, personagens e cenário DESTA caixa específica. NÃO use estilo genérico nem de outra coleção.`,
      `6. INTEGRAÇÃO: transição suave entre a caixa e o fundo expandido, iluminação coerente, como um mockup de produto profissional.`,
      `7. SEM ELEMENTOS EXTRAS: não adicione textos, logotipos, código de barras, selos ou marcas d'água novos.`,
      ``,
      `RESULTADO ESPERADO: imagem quadrada com a CAIXA fotografada no centro (intacta) + o fundo ao redor expandido com a identidade visual da própria caixa. Se você redesenhar a caixa como uma capa plana, a tarefa está ERRADA.`,
    ].filter(Boolean).join('\n');
  }, [formData.title, formData.theme]);

  const handleCopyCoverPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildCollectionCoverPrompt());
      setCoverPromptCopied(true);
      showToast('Prompt copiado! Cole na sua IA de imagem junto com a foto da caixa.', 'success');
      window.setTimeout(() => setCoverPromptCopied(false), 2500);
    } catch {
      showToast('Não foi possível copiar. Selecione o texto manualmente.', 'error');
    }
  }, [buildCollectionCoverPrompt, showToast]);

  // Validação leve do wizard de coleção: exige título antes de ir para "Mídias vinculadas".
  const canAdvanceToMediaStep = !isCollectionsCatalogMode || formData.title.trim().length > 0;
  const goToMediaStep = useCallback(() => {
    if (isCollectionsCatalogMode && !formData.title.trim()) {
      showToast('Informe o título da coleção antes de vincular as mídias.', 'warning');
      return;
    }
    setActiveTab('media');
  }, [isCollectionsCatalogMode, formData.title, showToast]);
  const synopsisPlaceholder = isCollectionsCatalogMode
    ? 'Descrição editorial da coleção (opcional)'
    : 'Descrição editorial do livro (opcional)';
  const themePlaceholder = isCollectionsCatalogMode ? 'Tema da coleção' : 'Tema do livro';
  const emptyCatalogMessage = isBooksCatalogMode
    ? 'Nenhum livro cadastrado ainda.'
    : initialLibraryArea
      ? `Nenhum asset publicado em ${activeLibraryAreaLabel?.toLowerCase() || 'esta área'}.`
      : 'Nenhuma coleção encontrada.';
  const emptyFilteredCollectionMessage = isBooksCatalogMode
    ? 'Nenhum livro corresponde aos filtros.'
    : 'Nenhuma coleção corresponde aos filtros.';

  // The book (standalone readable) currently linked to this kit collection, if any.
  const linkedReadingBook = React.useMemo<Collection | null>(() => {
    if (!isCollectionsCatalogMode) return null;
    const bookId = normalizeKitBookIds(formData.kit_book_ids)[0];
    if (!bookId) return null;
    return collections.find((c) => c.id === bookId) ?? null;
  }, [isCollectionsCatalogMode, formData.kit_book_ids, collections]);

  const scopedCollections = React.useMemo(() => {
    if (isCollectionsCatalogMode) {
      return collections.filter((collection) => getCollectionTypeMeta(collection).type === 'kit');
    }

    if (isBooksCatalogMode) {
      // All categories that belong exclusively to the video/audio/formations/materials
      // library areas — derived from LIBRARY_AREA_PRIMARY_SLOTS excluding 'books'.
      const NON_BOOK_PRIMARY: CollectionAssetCategory[] = [
        'animation', 'story_video', 'accessible_video', 'how_to_play', 'video_lesson', 'formation',
        'storytelling',
        'teacher_guide',
        'extra_material',
      ];
      return collections.filter((collection) => {
        if (collection.collection_type !== 'book') return false;
        const assets = collection.collection_assets ?? [];
        // A book that already has a reading (PDF) asset — always show.
        if (assets.some(a => a.category === 'reading' && a.url?.trim())) return true;
        // A collection created via another area (has only video/audio/etc. assets, no PDF) — exclude.
        if (assets.some(a => NON_BOOK_PRIMARY.includes(a.category) && a.url?.trim())) return false;
        // A cover auto-filled from a YouTube URL signals the collection was created via the
        // video library area (setAssetDirectUrl auto-thumbnail), not as a book.
        if ((collection.cover_image || '').includes('img.youtube.com')) return false;
        // No assets yet or only metadata without URLs — show as empty book (new/draft).
        return true;
      });
    }

    return collections;
  }, [collections, isBooksCatalogMode, isCollectionsCatalogMode]);

  useEffect(() => {
    if (mainTab !== 'collections') {
      return;
    }

    setActiveTab(defaultCollectionTab);
  }, [defaultCollectionTab, mainTab]);

  useEffect(() => {
    if (activeTab !== 'media' || !editingId || !highlightedAssetCategory) {
      return;
    }

    const target = highlightedAssetCategory === 'extra_material'
      ? extraMaterialsSectionRef.current
      : mediaSectionRefs.current[highlightedAssetCategory];

    if (!target) {
      return;
    }

    const timer = window.setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [activeTab, editingId, highlightedAssetCategory, highlightedAssetId]);

  // Scroll drawer back to top whenever a different item is opened for editing
  // (or a new-item form is opened). Without this, the drawer keeps the scroll
  // position of the previous item and opens mid-page / at the bottom.
  useEffect(() => {
    if (!editingId && !showCreateForm) return;
    const timer = window.setTimeout(() => {
      drawerBodyRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [editingId, showCreateForm]);

  // NOTE: When initialLibraryArea is set (e.g. "Vídeos" sidebar item), we now show a
  // direct asset list first. Clicking any card opens the owning collection on the
  // 'media' tab and highlights the selected asset for editing.

  const libraryAssetItems = React.useMemo<LibraryAssetListItem[]>(() => {
    if (!initialLibraryArea || isBooksCatalogMode) {
      return [];
    }

    const relevantCategories = LIBRARY_AREA_LISTING_CATEGORIES[initialLibraryArea];

    // Categorias primárias (reading, storytelling, animation) existem em TODA
    // coleção por inferência dos campos legados (pdf_url, audio_url, video_url).
    // Para que a listagem seja útil, só mostramos assets primários quando a
    // coleção os declarou explicitamente via collection_assets.
    const PRIMARY_LEGACY_CATEGORIES: CollectionAssetCategory[] = ['reading', 'storytelling', 'animation'];

    // Owner-collection lookup so a media linked into a kit can show the cover of
    // the collection that owns the file (id in the storage URL) instead of the
    // kit's cover. See getLibraryAssetCoverImage.
    const collectionsById = new Map(collections.map((item) => [item.id, item]));

    // Dono canônico de um arquivo: a coleção cujo ID aparece no caminho de storage
    // (.../collections/<pasta>/<COLLECTION_ID>/<arquivo>). Usado para deduplicar:
    // quando um kit copia a mídia de um livro (mesma URL), a entrada do LIVRO (dono)
    // prevalece e a cópia do kit não aparece duplicada na biblioteca.
    const ownerIdFromUrl = (url: string): string | null => {
      const match = url.match(/\/collections\/[^/]+\/([0-9a-fA-F-]{36})\//);
      return match ? match[1] : null;
    };

    const flatItems = collections.flatMap((collection) => {
      const explicitCategories = new Set(
        (collection.collection_assets ?? [])
          .filter((a) => a.url?.trim())
          .map((a) => a.category),
      );

      return inferCollectionAssets(collection)
        .filter((asset) => {
          if (!relevantCategories.includes(asset.category)) return false;
          // Assets primários inferidos de legado aparecem em todo livro — só
          // incluir se a coleção os declarou explicitamente.
          if (PRIMARY_LEGACY_CATEGORIES.includes(asset.category) && !explicitCategories.has(asset.category)) {
            return false;
          }
          return true;
        })
        .map((asset) => {
          // In library-area mode the user-facing title is always collection.title
          // (set via the "Título" field). asset.title may be stale/different due to
          // legacy data or a YouTube oEmbed auto-fill that was never corrected.
          const displayTitle = (isAssetLibraryAreaMode && collection.title?.trim())
            ? collection.title.trim()
            : getLibraryAssetDisplayTitle(collection, asset);
          const resolvedCover = getLibraryAssetCoverImage(asset, collection, collectionsById)
            || CATEGORY_COVER_URL[asset.category]
            || placeholderImageUrl;

          return {
            key: `${collection.id}:${asset.id}`,
            collection,
            asset,
            displayTitle,
            previewText: (asset.description || '').trim() || (collection.description || '').trim() || (collection.theme || '').trim() || null,
            coverImage: resolvedCover,
            searchText: normalizeSearchableText(
              displayTitle,
              asset.title,
              COLLECTION_ASSET_META[asset.category].label,
              collection.title,
              collection.theme,
              asset.description,
            ),
            levelLabel: getCollectionLevelChipLabel(collection.level),
            iconName: getLibraryAssetIcon(asset),
          };
        });
    });

    // Deduplica por arquivo (URL): o mesmo áudio/PDF/vídeo só aparece UMA vez na
    // biblioteca, mesmo que esteja copiado em vários kits/coleções. Quando há
    // empate, a entrada da coleção DONA do arquivo (ID no caminho de storage)
    // prevalece sobre cópias linkadas em kits.
    const byUrl = new Map<string, LibraryAssetListItem>();
    for (const item of flatItems) {
      const url = item.asset.url.trim();
      const existing = byUrl.get(url);
      if (!existing) {
        byUrl.set(url, item);
        continue;
      }
      const owner = ownerIdFromUrl(url);
      if (owner && item.collection.id === owner && existing.collection.id !== owner) {
        byUrl.set(url, item);
      }
    }
    return Array.from(byUrl.values());
  }, [collections, initialLibraryArea, isBooksCatalogMode]);

  const filteredLibraryAssets = React.useMemo(() => {
    let filtered = [...libraryAssetItems];

    if (searchFilter.trim()) {
      const searchLower = normalizeSearchableText(searchFilter);
      filtered = filtered.filter((item) => item.searchText.includes(searchLower));
    }

    if (levelFilter !== 'all') {
      filtered = filtered.filter((item) => item.collection.level === levelFilter);
    }

    if (sortOrder) {
      filtered.sort((a, b) => {
        const titleA = (a.displayTitle || '').toLowerCase();
        const titleB = (b.displayTitle || '').toLowerCase();
        const comparison = titleA.localeCompare(titleB, 'pt-BR');
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [libraryAssetItems, searchFilter, levelFilter, sortOrder]);

  // Library-area listing after applying the publish-status tab (Publicados vs. Não publicados).
  // In library-area mode, filter by the individual asset's is_published flag
  // (undefined/null counts as published for backward-compat).
  const visibleLibraryAssets = React.useMemo(
    () =>
      filteredLibraryAssets.filter((item) =>
        publishStatusFilter === 'published'
          ? item.asset.is_published !== false
          : item.asset.is_published === false
      ),
    [filteredLibraryAssets, publishStatusFilter]
  );

  const accessSummary = users.reduce((summary, user) => {
    const status = getProfileAccessStatus(user);
    summary.total += 1;
    summary[status] += 1;
    return summary;
  }, {
    total: 0,
    active: 0,
    expired: 0,
    pending_voucher: 0,
  });

  const getAccessBadgeClasses = (user: UserProfile) => {
    const status = getProfileAccessStatus(user);

    if (status === 'active') {
      return 'bg-emerald-100 text-emerald-700';
    }

    if (status === 'expired') {
      return 'bg-orange-100 text-orange-700';
    }

    return 'bg-amber-100 text-amber-700';
  };

  const getUserAuthStatus = (user: UserProfile): UserAuthStatus => {
    if (user.auth_status) {
      return user.auth_status;
    }

    if (user.last_sign_in_at) {
      return 'authenticated';
    }

    if (user.confirmed_at) {
      return 'confirmed';
    }

    if (user.invited_at) {
      return 'invite_pending';
    }

    return 'created';
  };

  const getAuthBadgeMeta = (user: UserProfile) => {
    const status = getUserAuthStatus(user);

    switch (status) {
      case 'authenticated':
        return {
          label: 'Já acessou',
          classes: 'bg-emerald-100 text-emerald-700',
        };
      case 'confirmed':
        return {
          label: 'Convite confirmado',
          classes: 'bg-sky-100 text-sky-700',
        };
      case 'invite_pending':
        return {
          label: 'Esperando autenticação',
          classes: 'bg-amber-100 text-amber-700',
        };
      default:
        return {
          label: 'Conta criada',
          classes: 'bg-slate-100 text-slate-700',
        };
    }
  };

  const formatAdminDateTime = (value?: string | null) => {
    if (!value) {
      return 'Nunca acessou';
    }

    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value));
    } catch {
      return 'Data indisponível';
    }
  };

  const pendingInviteCount = users.filter((user) => getUserAuthStatus(user) === 'invite_pending').length;
  const editingUser = editingUserId ? users.find((user) => user.id === editingUserId) ?? null : null;

  const syncLinkedBookSelection = (currentFormData: CollectionFormData, linkedBook: Collection | null): CollectionFormData => {
    if (!isCollectionsCatalogMode) {
      return currentFormData;
    }

    const currentKitBookIds = normalizeKitBookIds(currentFormData.kit_book_ids);
    const currentSelectedBook = collections.find((collection) => collection.id === currentKitBookIds[0]);
    const nextKitBookIds = linkedBook ? [linkedBook.id] : [];
    const normalizedCurrentColorTheme = normalizeThemeColor(currentFormData.color_theme);
    const normalizedCurrentSelectedBookTheme = normalizeThemeColor(currentSelectedBook?.color_theme);
    const normalizedNextSelectedBookTheme = normalizeThemeColor(linkedBook?.color_theme);
    const shouldSyncThemeFromBook = Boolean(normalizedNextSelectedBookTheme)
      && (
        !normalizedCurrentColorTheme
        || normalizedCurrentColorTheme === normalizeThemeColor(DEFAULT_COLLECTION_COLOR_THEME)
        || normalizedCurrentColorTheme === normalizedCurrentSelectedBookTheme
      );

    // Helper: inherit field from book if currently empty OR if it matched the old book's value
    const inheritField = <T,>(current: T, fromOldBook: T | undefined, fromNewBook: T | undefined, empty: T): T => {
      if (!fromNewBook || (Array.isArray(fromNewBook) && (fromNewBook as unknown[]).length === 0)) return current;
      const currentIsEmpty = !current || (Array.isArray(current) && (current as unknown[]).length === 0) || current === empty;
      const currentMatchedOldBook = fromOldBook !== undefined && JSON.stringify(current) === JSON.stringify(fromOldBook);
      if (currentIsEmpty || currentMatchedOldBook) return fromNewBook;
      return current;
    };

    return {
      ...currentFormData,
      kit_book_ids: nextKitBookIds,
      color_theme: shouldSyncThemeFromBook
        ? linkedBook?.color_theme || currentFormData.color_theme
        : currentFormData.color_theme,
      kit_cover_image: null,
      // Inherit pedagogical fields from the linked book
      segments: inheritField(currentFormData.segments, currentSelectedBook?.segments, linkedBook?.segments, [] as string[]),
      primary_segment: inheritField(currentFormData.primary_segment, currentSelectedBook?.primary_segment, linkedBook?.primary_segment, ''),
      level: linkedBook?.level || currentFormData.level,
      age_grade: inheritField(currentFormData.age_grade, currentSelectedBook?.age_grade, linkedBook?.age_grade, [] as string[]),
      suitable_ages: inheritField(currentFormData.suitable_ages, currentSelectedBook?.suitable_ages, linkedBook?.suitable_ages, [] as string[]),
      synopsis: inheritField(currentFormData.synopsis, currentSelectedBook?.synopsis ?? undefined, linkedBook?.synopsis ?? undefined, ''),
      theme: inheritField(currentFormData.theme, currentSelectedBook?.theme, linkedBook?.theme, ''),
      learning_objectives: inheritField(currentFormData.learning_objectives, currentSelectedBook?.learning_objectives, linkedBook?.learning_objectives, ''),
      bncc_skills: inheritField(currentFormData.bncc_skills, currentSelectedBook?.bncc_skills, linkedBook?.bncc_skills, [] as string[]),
      casel_competencies: inheritField(currentFormData.casel_competencies, currentSelectedBook?.casel_competencies, linkedBook?.casel_competencies, [] as string[]),
      // Personagens também são herdados do livro vinculado. Os nomes (characters)
      // são re-derivados a partir dos IDs em buildCollectionFormData → syncCollectionCharacters.
      character_ids: inheritField(currentFormData.character_ids, currentSelectedBook?.character_ids, linkedBook?.character_ids, [] as string[]),
      characters: inheritField(currentFormData.characters, currentSelectedBook?.characters, linkedBook?.characters, [] as string[]),
    };
  };

  const buildNextFormFromAssets = (
    currentFormData: CollectionFormData,
    assets: CollectionAsset[],
    options?: { linkedBook?: Collection | null }
  ) => {
    // Derive legacy URL fields directly from the explicit assets list so that
    // inferCollectionAssets (called inside buildCollectionFormData) does not
    // re-add assets that were intentionally removed by the caller.
    const VIDEO_PRIORITY = ['animation', 'accessible_video', 'how_to_play', 'video_lesson'] as const;
    const withAssets: CollectionFormData = {
      ...currentFormData,
      collection_assets: assets,
      pdf_url: assets.find(a => a.category === 'reading')?.url ?? '',
      audio_url: assets.find(a => a.category === 'storytelling')?.url ?? '',
      video_url: VIDEO_PRIORITY.map(cat => assets.find(a => a.category === cat)?.url).find(Boolean) ?? '',
      extra_materials: Array.from(new Set(
        assets
          .filter(a => COLLECTION_ASSET_META[a.category].scope === 'library')
          .map(a => a.url)
      )),
      offline_available: assets.some((asset) => asset.offline_available === true),
    };
    const withLinkedBook = options && 'linkedBook' in options
      ? syncLinkedBookSelection(withAssets, options.linkedBook ?? null)
      : withAssets;
    return buildCollectionFormData(withLinkedBook);
  };

  const updateFormWithAssets = (assets: CollectionAsset[]) => {
    setFormData((currentFormData) => buildNextFormFromAssets(currentFormData, assets));
  };

  const getAssetByCategory = (category: CollectionAssetCategory) => {
    return formData.collection_assets.find((asset) => asset.category === category);
  };

  const linkAssetFromLibrary = (category: FixedMediaSlotCategory, libraryItem: LibraryAssetListItem) => {
    setFormData((currentFormData) => {
      const currentAsset = currentFormData.collection_assets.find((asset) => asset.category === category);
      const nextAssets = currentFormData.collection_assets.filter((asset) => asset.category !== category);

      nextAssets.push({
        id: currentAsset?.id || createAssetId(category),
        category,
        media_type: libraryItem.asset.media_type,
        title: libraryItem.displayTitle,
        url: libraryItem.asset.url.trim(),
        description: libraryItem.asset.description?.trim() || null,
        scope: COLLECTION_ASSET_META[category].scope,
        lyrics_url: libraryItem.asset.lyrics_url ?? null,
        offline_available: libraryItem.asset.offline_available ?? libraryItem.collection.offline_available ?? null,
      });

      return buildNextFormFromAssets(currentFormData, nextAssets, category === 'reading'
        ? { linkedBook: libraryItem.collection }
        : undefined);
    });
  };

  const toggleReadingFromLibrary = (libraryItem: LibraryAssetListItem) => {
    setFormData((currentFormData) => {
      const readingAssets = currentFormData.collection_assets.filter((asset) => asset.category === 'reading');
      const otherAssets = currentFormData.collection_assets.filter((asset) => asset.category !== 'reading');
      const isAlreadyLinked = readingAssets.some((asset) => asset.url === libraryItem.asset.url);

      const nextReadingAssets = isAlreadyLinked
        ? readingAssets.filter((asset) => asset.url !== libraryItem.asset.url)
        : [
          ...readingAssets,
          {
            id: createAssetId('reading'),
            category: 'reading' as const,
            media_type: libraryItem.asset.media_type,
            title: libraryItem.displayTitle,
            url: libraryItem.asset.url.trim(),
            description: libraryItem.asset.description?.trim() || null,
            scope: COLLECTION_ASSET_META.reading.scope,
            lyrics_url: libraryItem.asset.lyrics_url ?? null,
            offline_available: libraryItem.asset.offline_available ?? libraryItem.collection.offline_available ?? null,
          },
        ];

      return buildNextFormFromAssets(currentFormData, [...otherAssets, ...nextReadingAssets]);
    });
  };

  const toggleStorytellingFromLibrary = (libraryItem: LibraryAssetListItem) => {
    setFormData((currentFormData) => {
      const storytellingAssets = currentFormData.collection_assets.filter((asset) => asset.category === 'storytelling');
      const otherAssets = currentFormData.collection_assets.filter((asset) => asset.category !== 'storytelling');
      const isAlreadyLinked = storytellingAssets.some((asset) => asset.url === libraryItem.asset.url);

      const nextStorytellingAssets = isAlreadyLinked
        ? storytellingAssets.filter((asset) => asset.url !== libraryItem.asset.url)
        : [
          ...storytellingAssets,
          {
            id: createAssetId('storytelling'),
            category: 'storytelling' as const,
            media_type: libraryItem.asset.media_type,
            title: libraryItem.displayTitle,
            url: libraryItem.asset.url.trim(),
            description: libraryItem.asset.description?.trim() || null,
            scope: COLLECTION_ASSET_META.storytelling.scope,
            lyrics_url: libraryItem.asset.lyrics_url ?? null,
            offline_available: libraryItem.asset.offline_available ?? libraryItem.collection.offline_available ?? null,
          },
        ];

      return buildNextFormFromAssets(currentFormData, [...otherAssets, ...nextStorytellingAssets]);
    });
  };

  const toggleAnimationFromLibrary = (libraryItem: LibraryAssetListItem) => {
    setFormData((currentFormData) => {
      const animationAssets = currentFormData.collection_assets.filter((asset) => asset.category === 'animation');
      const otherAssets = currentFormData.collection_assets.filter((asset) => asset.category !== 'animation');
      const isAlreadyLinked = animationAssets.some((asset) => asset.url === libraryItem.asset.url);

      const nextAnimationAssets = isAlreadyLinked
        ? animationAssets.filter((asset) => asset.url !== libraryItem.asset.url)
        : [
          ...animationAssets,
          {
            id: createAssetId('animation'),
            category: 'animation' as const,
            media_type: libraryItem.asset.media_type,
            title: libraryItem.displayTitle,
            url: libraryItem.asset.url.trim(),
            description: libraryItem.asset.description?.trim() || null,
            scope: COLLECTION_ASSET_META.animation.scope,
            lyrics_url: libraryItem.asset.lyrics_url ?? null,
            offline_available: libraryItem.asset.offline_available ?? libraryItem.collection.offline_available ?? null,
          },
        ];

      return buildNextFormFromAssets(currentFormData, [...otherAssets, ...nextAnimationAssets]);
    });
  };

  const toggleCategoryAssetFromLibrary = (category: FixedMediaSlotCategory, libraryItem: LibraryAssetListItem) => {
    setFormData((currentFormData) => {
      const categoryAssets = currentFormData.collection_assets.filter((a) => a.category === category);
      const otherAssets = currentFormData.collection_assets.filter((a) => a.category !== category);
      const isAlreadyLinked = categoryAssets.some((a) => a.url === libraryItem.asset.url);
      const nextCategoryAssets = isAlreadyLinked
        ? categoryAssets.filter((a) => a.url !== libraryItem.asset.url)
        : [
            ...categoryAssets,
            {
              id: createAssetId(category),
              category,
              media_type: libraryItem.asset.media_type,
              title: libraryItem.displayTitle,
              url: libraryItem.asset.url.trim(),
              description: libraryItem.asset.description?.trim() || null,
              scope: COLLECTION_ASSET_META[category].scope,
              lyrics_url: libraryItem.asset.lyrics_url ?? null,
              offline_available: libraryItem.asset.offline_available ?? libraryItem.collection.offline_available ?? null,
            },
          ];
      return buildNextFormFromAssets(
        currentFormData,
        [...otherAssets, ...nextCategoryAssets],
        category === 'reading' && !isAlreadyLinked ? { linkedBook: libraryItem.collection } : undefined
      );
    });
  };

  const setAssetDirectUrl = (category: FixedMediaSlotCategory, url: string) => {
    setFormData((currentFormData) => {
      const currentAsset = currentFormData.collection_assets.find((asset) => asset.category === category);
      const nextAssets = currentFormData.collection_assets.filter((asset) => asset.category !== category);

      if (url.trim()) {
        const slot = FIXED_MEDIA_SLOTS.find((s) => s.category === category);
        nextAssets.push({
          id: currentAsset?.id || createAssetId(category),
          category,
          media_type: COLLECTION_ASSET_META[category].mediaType,
          title: currentFormData.title || slot?.label || '',
          url: url.trim(),
          description: null,
          scope: COLLECTION_ASSET_META[category].scope,
          lyrics_url: null,
          offline_available: false,
          // Preserve existing flag when editing; default to false (draft) for new assets
          is_published: currentAsset !== undefined ? currentAsset.is_published : false,
        });
      }

      const nextForm = buildNextFormFromAssets(currentFormData, nextAssets);

      // Auto-preencher capa com thumbnail do YouTube quando ainda é placeholder
      if (url.trim() && isPlaceholderImageUrl(nextForm.cover_image || '')) {
        const youtubeId =
          url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/i)?.[1] ??
          url.match(/[?&]v=([A-Za-z0-9_-]{6,})/i)?.[1];
        if (youtubeId) {
          return { ...nextForm, cover_image: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` };
        }
      }

      return nextForm;
    });
  };

  // In library-area mode the public card title comes from the primary library asset's
  // `title` (see buildCollectionBackedLibraryItem → title: asset.title), not the
  // collection title. So editing the title field must update BOTH the collection title
  // and the title of every library-area primary asset, otherwise the edit never reflects
  // on the storefront/admin cards.
  const setLibraryAreaTitle = (title: string) => {
    setFormData((currentFormData) => {
      const primaryCategories = initialLibraryArea
        ? LIBRARY_AREA_PRIMARY_SLOTS[initialLibraryArea]
        : [];
      const nextAssets = currentFormData.collection_assets.map((asset) =>
        primaryCategories.includes(asset.category) ? { ...asset, title } : asset
      );
      return { ...buildNextFormFromAssets(currentFormData, nextAssets), title };
    });
  };

  // Paste a YouTube URL → set asset URL (and auto-thumbnail via setAssetDirectUrl),
  // then fetch oEmbed to auto-fill title. oEmbed returns title + thumbnail_url only
  // (no description — that requires the paid YouTube Data API v3).
  const handleYoutubeUrlChange = async (url: string, category: FixedMediaSlotCategory) => {
    setAssetDirectUrl(category, url);

    if (!url.trim()) return;

    const youtubeId =
      url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/i)?.[1] ??
      url.match(/[?&]v=([A-Za-z0-9_-]{6,})/i)?.[1];
    if (!youtubeId) return;

    setIsFetchingYoutubeData(true);
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      if (res.ok) {
        const data = await res.json();
        if (data.title) {
          setLibraryAreaTitle(data.title);
        }
      }
    } catch {
      // oEmbed failed — URL is still set, user fills title manually
    } finally {
      setIsFetchingYoutubeData(false);
    }
  };

  const setAssetOfflineAvailable = (category: FixedMediaSlotCategory, value: boolean) => {
    const currentAsset = getAssetByCategory(category);
    if (!currentAsset) {
      return;
    }
    const updatedAssets = formData.collection_assets.map((asset) =>
      asset.category === category ? { ...asset, offline_available: value } : asset
    );
    updateFormWithAssets(updatedAssets);
  };

  const setAssetPublished = (category: FixedMediaSlotCategory, value: boolean) => {
    setFormData((currentFormData) => {
      const nextAssets = currentFormData.collection_assets.map((asset) =>
        asset.category === category ? { ...asset, is_published: value } : asset
      );
      const nextForm = buildNextFormFromAssets(currentFormData, nextAssets);
      return isLibraryAreaMode ? { ...nextForm, is_published: value } : nextForm;
    });
  };

  /**
   * Canonical setter for the collection-level publish flag.
   *
   * In library-area mode (videos, music, materials…) `is_published` lives on
   * each primary asset inside `collection_assets`, NOT only on formData.
   * Always use THIS function — never write `setFormData(prev => ({ ...prev, is_published: … }))`
   * directly, or the asset flags will drift out of sync and the change won't persist.
   */
  const setCollectionPublished = (value: boolean) => {
    setFormData((prev) => {
      if (initialLibraryArea && initialLibraryArea !== 'books') {
        const primaryCats = LIBRARY_AREA_PRIMARY_SLOTS[initialLibraryArea];
        const nextAssets = prev.collection_assets.map(a =>
          primaryCats.includes(a.category) ? { ...a, is_published: value } : a
        );
        return { ...buildNextFormFromAssets(prev, nextAssets), is_published: value };
      }
      return { ...prev, is_published: value };
    });
  };

  /**
   * Canonical setter for the per-material "available for download" flag.
   *
   * HARD RULE: videos are never downloadable, so this only ever writes the flag on
   * NON-video primary assets. Mirrors setCollectionPublished's dual-storage handling.
   */
  const setCollectionDownloadAvailable = (value: boolean) => {
    setFormData((prev) => {
      if (initialLibraryArea && initialLibraryArea !== 'books') {
        const primaryCats = LIBRARY_AREA_PRIMARY_SLOTS[initialLibraryArea];
        const nextAssets = prev.collection_assets.map((a) =>
          primaryCats.includes(a.category) && a.media_type !== 'video'
            ? { ...a, download_available: value }
            : a
        );
        return buildNextFormFromAssets(prev, nextAssets);
      }
      return prev;
    });
  };

  const removeAsset = (category: FixedMediaSlotCategory) => {
    setFormData((currentFormData) => {
      const nextAssets = currentFormData.collection_assets.filter((asset) => asset.category !== category);
      return buildNextFormFromAssets(currentFormData, nextAssets, category === 'reading' ? { linkedBook: null } : undefined);
    });
  };

  // Non-video primary materials in the current library area (download toggle applies to these).
  const downloadablePrimaryAssets = (initialLibraryArea && initialLibraryArea !== 'books')
    ? formData.collection_assets.filter((a) =>
        LIBRARY_AREA_PRIMARY_SLOTS[initialLibraryArea].includes(a.category)
        && a.media_type !== 'video'
        && (a.url || '').trim())
    : [];
  const hasDownloadableMaterial = downloadablePrimaryAssets.length > 0;
  const collectionDownloadAvailable = downloadablePrimaryAssets.every((a) => a.download_available !== false);

  const extraMaterialAssets = formData.collection_assets.filter((asset) => asset.category === 'extra_material');
  const isExtraMaterialsHighlighted = highlightedAssetCategory === 'extra_material'
    || (highlightedAssetId ? extraMaterialAssets.some((asset) => asset.id === highlightedAssetId) : false);
  const highlightedAsset = highlightedAssetId
    ? formData.collection_assets.find((asset) => asset.id === highlightedAssetId) ?? null
    : null;

  // Media library: all assets (by category) from every collection except the one being edited.
  // Used by the linked-media picker to let the user associate existing assets.
  const mediaLibraryByCategory = React.useMemo(() => {
    const byCategory: Partial<Record<CollectionAssetCategory, LibraryAssetListItem[]>> = {};
    const collectionsById = new Map(collections.map((item) => [item.id, item]));
    for (const collection of collections) {
      if (collection.id === editingId) continue;
      for (const asset of (collection.collection_assets ?? [])) {
        if (!asset.url?.trim()) continue;
        if (asset.is_published === false) continue;
        // Livros vinculáveis num kit devem ser SEMPRE livros reais (collection_type='book').
        // Sem este filtro, um kit que copiou um PDF aparecia como "livro" selecionável e
        // acabava gravado em kit_book_ids — vinculando uma coleção como se fosse livro.
        if (asset.category === 'reading' && collection.collection_type !== 'book') continue;
        const displayTitle = getLibraryAssetDisplayTitle(collection, asset);
        const coverImage = getLibraryAssetCoverImage(asset, collection, collectionsById)
          || CATEGORY_COVER_URL[asset.category]
          || placeholderImageUrl;

        if (!byCategory[asset.category]) byCategory[asset.category] = [];
        byCategory[asset.category]!.push({
          key: `${collection.id}:${asset.id}`,
          collection,
          asset,
          displayTitle,
          previewText: (asset.description || '').trim() || (collection.description || '').trim() || (collection.theme || '').trim() || null,
          coverImage,
          searchText: normalizeSearchableText(
            displayTitle,
            asset.title,
            COLLECTION_ASSET_META[asset.category].label,
            collection.title,
            collection.theme,
            asset.description,
          ),
          levelLabel: getCollectionLevelChipLabel(collection.level),
          iconName: getLibraryAssetIcon(asset),
        });
      }
    }
    Object.values(byCategory).forEach((items) => {
      items?.sort((firstItem, secondItem) => firstItem.displayTitle.localeCompare(secondItem.displayTitle, 'pt-BR'));
    });
    // Deduplicate by URL within each category — the same media file may be
    // linked in multiple collections. Keep only the first occurrence so the
    // radio group shows exactly one option per unique media file.
    for (const category of Object.keys(byCategory) as CollectionAssetCategory[]) {
      const seen = new Set<string>();
      byCategory[category] = byCategory[category]!.filter((item) => {
        const url = item.asset.url.trim();
        if (seen.has(url)) return false;
        seen.add(url);
        return true;
      });
    }
    return byCategory;
  }, [collections, editingId]);
  const selectedCharacterIds = Array.from(new Set(formData.character_ids || []));
  const selectedCharacterNames = resolveCharacterNamesFromIds(selectedCharacterIds);
  const unmappedLegacyCharacters = (formData.characters || []).filter(
    (characterName) => !selectedCharacterNames.some(
      (selectedCharacterName) => normalizeCharacterLookupKey(selectedCharacterName) === normalizeCharacterLookupKey(characterName)
    )
  );
  const selectableCharacters = [...availableCharacters].sort((firstCharacter, secondCharacter) => {
    const firstSelected = selectedCharacterIds.includes(firstCharacter.id) ? 1 : 0;
    const secondSelected = selectedCharacterIds.includes(secondCharacter.id) ? 1 : 0;

    if (firstSelected !== secondSelected) {
      return secondSelected - firstSelected;
    }

    return firstCharacter.name.localeCompare(secondCharacter.name, 'pt-BR');
  });

  const toggleCharacterSelection = (characterId: string) => {
    setFormData((currentFormData) => {
      const currentIds = Array.from(new Set(currentFormData.character_ids || []));
      const currentSelectedNames = resolveCharacterNamesFromIds(currentIds);
      const nextIds = currentIds.includes(characterId)
        ? currentIds.filter((id) => id !== characterId)
        : [...currentIds, characterId];

      const preservedLegacyCharacters = (currentFormData.characters || []).filter(
        (characterName) => !currentSelectedNames.some(
          (selectedCharacterName) => normalizeCharacterLookupKey(selectedCharacterName) === normalizeCharacterLookupKey(characterName)
        )
      );

      return {
        ...currentFormData,
        character_ids: nextIds,
        characters: [...resolveCharacterNamesFromIds(nextIds), ...preservedLegacyCharacters],
      };
    });
  };

  const setLegacyCharacterNames = (legacyCharacters: string[]) => {
    const normalizedLegacyCharacters = Array.from(new Set(legacyCharacters.map((character) => character.trim()).filter(Boolean)));

    setFormData((currentFormData) => ({
      ...currentFormData,
      characters: [...resolveCharacterNamesFromIds(currentFormData.character_ids || []), ...normalizedLegacyCharacters],
    }));
  };

  const setExtraMaterialUrls = (urls: string[]) => {
    setFormData((currentFormData) => {
      const currentExtraMaterialAssets = currentFormData.collection_assets.filter((asset) => asset.category === 'extra_material');
      const assetsWithoutExtras = currentFormData.collection_assets.filter((asset) => asset.category !== 'extra_material');

      const nextExtraAssets = urls.reduce<CollectionAsset[]>((assets, url, index) => {
        const trimmedUrl = url.trim();
        if (!trimmedUrl) {
          return assets;
        }

        const currentAsset = currentExtraMaterialAssets.find((asset) => asset.url === trimmedUrl);

        assets.push({
          id: currentAsset?.id || createAssetId('extra_material'),
          category: 'extra_material' as const,
          media_type: currentAsset?.media_type || inferAssetMediaTypeFromUrl(trimmedUrl),
          title: currentAsset?.title?.trim() || normalizeAssetTitle(trimmedUrl, `Material Extra ${index + 1}`),
          url: trimmedUrl,
          description: currentAsset?.description?.trim() || null,
          scope: 'library' as const,
          offline_available: currentAsset?.offline_available ?? null,
        });

        return assets;
      }, []);

      return buildNextFormFromAssets(currentFormData, [...assetsWithoutExtras, ...nextExtraAssets]);
    });
  };

  const toggleExtraMaterialFromLibrary = (libraryItem: LibraryAssetListItem) => {
    setFormData((currentFormData) => {
      const currentExtraMaterialAssets = currentFormData.collection_assets.filter((asset) => asset.category === 'extra_material');
      const assetsWithoutExtras = currentFormData.collection_assets.filter((asset) => asset.category !== 'extra_material');
      const existingAsset = currentExtraMaterialAssets.find((asset) => asset.url === libraryItem.asset.url);
      const nextExtraAssets = existingAsset
        ? currentExtraMaterialAssets.filter((asset) => asset.url !== libraryItem.asset.url)
        : [
          ...currentExtraMaterialAssets,
          {
            id: createAssetId('extra_material'),
            category: 'extra_material' as const,
            media_type: libraryItem.asset.media_type,
            title: libraryItem.displayTitle,
            url: libraryItem.asset.url.trim(),
            description: libraryItem.asset.description?.trim() || null,
            scope: 'library' as const,
            offline_available: libraryItem.asset.offline_available ?? libraryItem.collection.offline_available ?? null,
          },
        ];

      return buildNextFormFromAssets(currentFormData, [...assetsWithoutExtras, ...nextExtraAssets]);
    });
  };

  useEffect(() => {
    checkPermission();
    loadCharacters();
    if (mainTab === 'collections') {
      loadCollections();
    } else if (mainTab === 'users') {
      loadUsers();
    }
  }, []);

  // Double fetch guard: mainTab useEffect already handles initial load

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
      if (levelDropdownRef.current && !levelDropdownRef.current.contains(event.target as Node)) {
        setShowLevelDropdown(false);
      }
      if (mediaTypeDropdownRef.current && !mediaTypeDropdownRef.current.contains(event.target as Node)) {
        setShowMediaTypeDropdown(false);
      }
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setShowRoleDropdown(false);
      }
      if (editUserRoleRef.current && !editUserRoleRef.current.contains(event.target as Node)) {
        setEditUserRoleDropdownOpen(false);
      }

      // Use ref (not state) to avoid stale closure — always reflects the latest open dropdown
      const currentOpenId = openActionsDropdownRef.current;
      if (currentOpenId) {
        const openRef = actionsDropdownRefs.current[currentOpenId];
        if (openRef && !openRef.contains(event.target as Node)) {
          openActionsDropdownRef.current = null;
          setOpenDropdown(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const checkPermission = async () => {
    setCheckingPermission(true);
    try {
      const canEdit = await canEditCollections();
      const admin = await isAdmin();
      setHasPermission(canEdit);
      setIsAdminUser(admin);
      if (!canEdit) {
        onBack();
      }
    } catch (error) {
      console.error('Error checking permission:', error);
      showToast('Erro ao verificar permissões.', 'error');
    } finally {
      setCheckingPermission(false);
    }
  };

  const loadCollections = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const data = await api.getCollections(forceRefresh, true);
      setCollections(data);
    } catch (error) {
      console.error('Error loading collections:', error);
      showToast('Erro ao carregar coleções.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCharacters = async () => {
    setCharactersLoading(true);
    try {
      const data = await api.getCharacters();
      setAvailableCharacters(data);
    } catch (error) {
      console.error('Error loading characters:', error);
      showToast('Erro ao carregar personagens.', 'error');
    } finally {
      setCharactersLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await api.getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      showToast('Erro ao carregar usuários.', 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateUser = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!isAdminUser) {
      setUserErrorMsg('Apenas administradores podem criar usuários.');
      return;
    }

    if (!acceptedTerms) {
      setUserErrorMsg('Você precisa aceitar a política de privacidade para continuar.');
      return;
    }

    if (!userFormData.email || !userFormData.full_name) {
      setUserErrorMsg('Preencha todos os campos obrigatórios.');
      return;
    }

    setIsCreatingUser(true);
    setUserErrorMsg(null);
    setUserSuccessMsg(null);

    try {
      const result = await api.createUser({
        email: userFormData.email,
        full_name: userFormData.full_name,
        role: userFormData.role,
        ...(userFormData.password ? { password: userFormData.password } : {}),
      });

      if (result.success) {
        showToast(userFormData.password ? `Usuário ${userFormData.email} criado com sucesso!` : `Convite enviado para ${userFormData.email}!`, 'success');
        setShowUserForm(false);
        setUserFormData({ email: '', full_name: '', password: '', role: 'viewer' });
        setAcceptedTerms(false);
        setUserSuccessMsg(null);
        loadUsers();
      } else {
        let msg = result.error || 'Erro ao criar usuário.';
        if (msg === 'User already registered') msg = 'Este e-mail já está cadastrado.';
        setUserErrorMsg(msg);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      showToast('Erro ao criar usuário. Tente novamente.', 'error');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const clearUserError = () => {
    if (userErrorMsg) setUserErrorMsg(null);
  };

  const handleOpenUserForm = () => {
    setUserErrorMsg(null);
    setUserSuccessMsg(null);
    setShowUserForm(true);
  };

  const handleEditUserOpen = (user: UserProfile) => {
    setEditingUserId(user.id);
    setEditUserFormData({
      full_name: user.full_name || '',
      role: (user.role as UserRole) || 'viewer',
    });
    setEditUserErrorMsg(null);
  };

  const handleEditUserSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    if (!editUserFormData.full_name.trim()) {
      setEditUserErrorMsg('Nome completo é obrigatório.');
      return;
    }
    setLoadingUserEdit(true);
    setEditUserErrorMsg(null);
    try {
      const result = await api.updateUser(editingUserId, {
        full_name: editUserFormData.full_name.trim(),
        role: editUserFormData.role,
      });
      if (result.success) {
        showToast('Usuário atualizado com sucesso!', 'success');
        setEditingUserId(null);
        loadUsers();
      } else {
        setEditUserErrorMsg(result.error || 'Erro ao atualizar usuário.');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      showToast('Erro ao atualizar usuário. Tente novamente.', 'error');
    } finally {
      setLoadingUserEdit(false);
    }
  };

  const handleDeleteUserClick = (user: UserProfile) => {
    if (!isAdminUser) {
      showToast('Apenas administradores podem excluir usuários.', 'error');
      return;
    }

    setUserToDelete(user);
    setShowDeleteUserModal(true);
    setEditUserErrorMsg(null);
  };

  const handleDeleteUserConfirm = async () => {
    if (!userToDelete || deletingUser) return;

    setDeletingUser(true);

    try {
      const result = await api.deleteUser(userToDelete.id);

      if (result.success) {
        showToast(`Usuário ${userToDelete.email ?? userToDelete.full_name ?? ''} excluído com sucesso!`, 'success');
        setShowDeleteUserModal(false);
        setUserToDelete(null);
        setEditingUserId((current) => (current === userToDelete.id ? null : current));
        loadUsers();
      } else {
        const message = result.error || 'Erro ao excluir usuário.';
        setEditUserErrorMsg(message);
        showToast(message, 'error');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast('Erro ao excluir usuário. Tente novamente.', 'error');
    } finally {
      setDeletingUser(false);
    }
  };

  const openCollectionEditor = (
    collection: Collection,
    options?: { focusCategory?: CollectionAssetCategory; focusAssetId?: string | null }
  ) => {
    let initialData = createCollectionFormDataForCurrentFlow({
      ...collection,
      collection_assets: inferCollectionAssets(collection),
    });

    // Data-sync guard: in library-area mode, old DB records may have asset.title set
    // to a generic media-type label (e.g. "Áudio") instead of the real content title.
    // Silently promote asset.title to collection.title on load so that the next save
    // writes the correct value — and so the title field in the form shows correctly.
    if (isAssetLibraryAreaMode && initialLibraryArea && initialLibraryArea !== 'books' && initialData.title) {
      const primaryCats = LIBRARY_AREA_PRIMARY_SLOTS[initialLibraryArea];
      const fixedAssets = initialData.collection_assets.map((a) => {
        if (!primaryCats.includes(a.category)) return a;
        const assetTitle = (a.title || '').trim();
        if (!assetTitle || GENERIC_ASSET_TITLE_LABELS.has(assetTitle)) {
          return { ...a, title: initialData.title };
        }
        return a;
      });
      if (fixedAssets.some((a, i) => a !== initialData.collection_assets[i])) {
        initialData = { ...initialData, collection_assets: fixedAssets };
      }
    }

    setShowCreateForm(false);
    setEditingId(collection.id);
    setActiveTab(defaultCollectionTab);
    setFormData(initialData);
    setOriginalFormData(initialData);
    // In library-area mode the drawer is short and always starts at the top.
    // Highlight-scrolling would override the scroll-to-top effect and send the
    // user to the bottom of the form. Skip it — the ring glow is enough feedback.
    setHighlightedAssetCategory(isAssetLibraryAreaMode ? null : (options?.focusCategory ?? null));
    setHighlightedAssetId(isAssetLibraryAreaMode ? null : (options?.focusAssetId ?? null));
  };

  const handleEdit = (collection: Collection) => {
    openCollectionEditor(collection);
  };

  const handleLibraryAssetEdit = (item: LibraryAssetListItem) => {
    const openAssetEditor = () => {
      openCollectionEditor(item.collection, {
        focusCategory: item.asset.category,
        focusAssetId: item.asset.id,
      });
    };

    if (hasUnsavedChanges()) {
      setPendingAction(() => openAssetEditor);
      setShowUnsavedChangesModal(true);
      return;
    }

    openAssetEditor();
  };

  const handleDeleteClick = (id: string) => {
    if (!isAdminUser) {
      showToast('Apenas administradores podem excluir coleções.', 'error');
      return;
    }
    const target = collections.find(c => c.id === id);
    if (target?.is_published) {
      showToast(`Despublique ${isBooksCatalogMode ? 'o livro' : 'a coleção'} antes de excluir.`, 'error');
      setOpenDropdown(null);
      return;
    }
    setCollectionToDelete(id);
    setShowDeleteModal(true);
    setOpenDropdown(null);
  };

  const handleDeleteConfirm = async () => {
    if (!collectionToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      const success = await api.deleteCollection(collectionToDelete);
      if (success) {
        if (editingId === collectionToDelete) {
          setEditingId(null);
          setShowCreateForm(false);
          setActiveTab(defaultCollectionTab);
          resetForm();
        }
        showToast('Coleção excluída com sucesso!', 'success');
        loadCollections();
      } else {
        showToast('Erro ao excluir coleção.', 'error');
      }
    } catch (error) {
      console.error('Error deleting collection:', error);
      showToast('Erro ao excluir coleção. Tente novamente.', 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setCollectionToDelete(null);
    }
  };

  const buildCollectionPayload = (data: Partial<Collection>): Partial<Collection> => {
    const payload: Partial<Collection> = { ...data };

    if (payload.primary_segment) {
      if (payload.primary_segment === 'Educação Infantil') {
        payload.level = 'Educação Infantil';
      } else {
        payload.level = 'Fundamental I';
      }
    }

    payload.collection_type = isCollectionsCatalogMode ? 'kit' : payload.collection_type || 'book';
    payload.color_theme = payload.color_theme?.trim() || DEFAULT_COLLECTION_COLOR_THEME;
    payload.kit_cover_image = isCollectionsCatalogMode
      ? null
      : payload.collection_type === 'kit'
        ? payload.kit_cover_image?.trim() || null
        : null;
    payload.kit_book_ids = payload.collection_type === 'kit'
      ? normalizeKitBookIds(payload.kit_book_ids)
      : [];

    return syncCollectionWithAssets(payload);
  };

  const findCollectionsAffectedByUnpublish = (bookId: string, bookPdfUrl: string): Collection[] => {
    return collections.filter(c => {
      if (!c.is_published || c.id === bookId) return false;
      const usesThisBook =
        c.kit_book_ids?.includes(bookId) ||
        c.collection_assets?.some(a => a.category === 'reading' && a.url === bookPdfUrl);
      return usesThisBook;
    });
  };

  const handleSave = async () => {
    if (!formData.title) {
      showToast('Título é obrigatório.', 'error');
      return;
    }

    const readingAssetUrl = formData.collection_assets.find((asset) => asset.category === 'reading')?.url?.trim() || '';
    const linkedReadingSource = readingAssetUrl
      ? (mediaLibraryByCategory.reading ?? []).find((item) => item.asset.url === readingAssetUrl)?.collection ?? null
      : null;
    // Only re-sync the linked book (and inherit its fields) when the kit actually
    // has a reading asset to derive from. Passing the option with a null linkedBook
    // would WIPE kit_book_ids — including books linked directly on seed/legacy kits
    // that have no reading asset — leaving them empty and unpublishable. Adding or
    // removing a book already keeps kit_book_ids in sync interactively, so when
    // there is no derived book we preserve the existing selection here.
    const effectiveFormData = buildNextFormFromAssets(
      formData,
      formData.collection_assets,
      isCollectionsCatalogMode && linkedReadingSource ? { linkedBook: linkedReadingSource } : undefined
    );

    const normalizedDataToSave = buildCollectionPayload(effectiveFormData);

    // Rule: book being unpublished → warn about affected published collections
    if (isBooksCatalogMode && editingId && normalizedDataToSave.is_published === false && originalFormData?.is_published !== false) {
      const bookPdfUrl = normalizedDataToSave.collection_assets?.find(a => a.category === 'reading')?.url?.trim() ?? '';
      const affected = findCollectionsAffectedByUnpublish(editingId, bookPdfUrl);
      if (affected.length > 0) {
        setCascadeUnpublishConfirm({
          affectedCollections: affected,
          onConfirm: () => {
            setCascadeUnpublishConfirm(null);
            void executeSave(normalizedDataToSave, affected);
          },
        });
        return;
      }
    }

    // Rule: collection with no linked content → auto-unpublish.
    // Content = linked media assets, OR (for kits) aggregated books via
    // kit_book_ids, OR a legacy media url. Previously only collection_assets
    // were counted, so a kit whose content is a book (kit_book_ids) was treated
    // as "empty" and could never be published.
    if (isCollectionsCatalogMode && normalizedDataToSave.is_published === true) {
      const hasLinkedAsset = normalizedDataToSave.collection_assets?.some(a => a.url?.trim());
      const hasKitBooks = (normalizedDataToSave.kit_book_ids?.length ?? 0) > 0;
      const hasLegacyMedia = [normalizedDataToSave.audio_url, normalizedDataToSave.pdf_url, normalizedDataToSave.video_url]
        .some((u) => u?.trim());
      if (!hasLinkedAsset && !hasKitBooks && !hasLegacyMedia) {
        normalizedDataToSave.is_published = false;
        showToast('Para publicar, vincule um livro ou mídia na aba "Mídias vinculadas". Salvo como rascunho por enquanto.', 'warning');
      }
    }

    await executeSave(normalizedDataToSave);
  };

  /**
   * Promotes any /temp/ assets to permanent collectionId-scoped paths and
   * re-derives the legacy URL fields (audio_url/pdf_url/video_url/extra_materials)
   * EXCLUSIVELY from the promoted assets.
   *
   * Clearing the legacy fields before syncCollectionWithAssets is critical: otherwise
   * inferCollectionAssets would see two different URLs for the same primary category
   * (the old temp-path URL still in the legacy field + the new permanent URL in the
   * asset) and emit TWO assets → the duplication bug. Used by BOTH the create and the
   * edit branches so the two paths can never drift apart.
   */
  const promoteAndSync = async (
    collectionId: string,
    data: Partial<Collection>,
  ): Promise<Partial<Collection>> => {
    const incoming = data.collection_assets ?? [];
    const promoted = await promoteCollectionAssets(collectionId, incoming);
    const changed = promoted.some((asset, index) => asset.url !== incoming[index]?.url);
    if (!changed) {
      return data;
    }
    return syncCollectionWithAssets({
      ...data,
      collection_assets: promoted,
      audio_url: '',
      pdf_url: '',
      video_url: '',
      extra_materials: [],
    });
  };

  const executeSave = async (normalizedDataToSave: Partial<Collection>, cascadeCollections: Collection[] = []) => {
    setIsSaving(true);
    let success = false;
    let errorMessage = '';

    if (editingId) {
      // Promote any newly-uploaded /temp/ files to permanent paths and re-derive
      // legacy URL fields BEFORE persisting, mirroring the create branch. Without
      // this, replacing a file on edit would leave a /temp/ URL that can later
      // re-materialize as a duplicate asset.
      const toSave = await promoteAndSync(editingId, normalizedDataToSave);
      const updated = await api.updateCollection(editingId, toSave);
      success = !!updated;
      if (!success) {
        errorMessage = `Erro ao atualizar ${contentEntityLabelLower}. Verifique suas permissões e tente novamente.`;
      }
    } else {
      try {
        const created = await api.createCollection(normalizedDataToSave);
        success = !!created;
        if (!success) {
          errorMessage = `Erro ao criar ${contentEntityLabelLower}. Verifique suas permissões e tente novamente.`;
        } else if (created) {
          // Promote any temp/ assets to permanent collectionId-scoped paths and
          // re-derive legacy fields (shared with the edit branch via promoteAndSync).
          const synced = await promoteAndSync(created.id, created);
          if (synced !== created) {
            await api.updateCollection(created.id, {
              collection_assets: synced.collection_assets,
              audio_url: synced.audio_url,
              pdf_url: synced.pdf_url,
              video_url: synced.video_url,
              cover_image: synced.cover_image,
            });
          }
        }
      } catch (err: unknown) {
        success = false;
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.startsWith('brand_not_resolved')) {
          errorMessage = `Erro ao criar ${contentEntityLabelLower}: marca (brand) não encontrada. Verifique a configuração do ambiente.`;
        } else {
          errorMessage = `Erro ao criar ${contentEntityLabelLower}. Verifique suas permissões e tente novamente.`;
        }
      }
    }

    if (success) {
      // Cascade-unpublish affected collections
      if (cascadeCollections.length > 0) {
        await Promise.all(cascadeCollections.map(c => api.updateCollection(c.id, { is_published: false })));
        showToast(`${contentEntityLabel} despublicado. ${cascadeCollections.length} coleção(ões) despublicada(s) automaticamente.`, 'warning');
      } else {
        setOriginalFormData(createCollectionFormDataForCurrentFlow(normalizedDataToSave));
        const hasNoMedia = !editingId && formData.collection_assets.filter(a => a.url?.trim()).length === 0;
        const successMsg = hasNoMedia
          ? `${contentEntityLabel} criado com sucesso! Adicione mídias na aba Mídias vinculadas.`
          : (editingId ? `${contentEntityLabel} atualizado com sucesso!` : `${contentEntityLabel} criado com sucesso!`);
        showToast(successMsg, 'success');
      }
      setEditingId(null);
      setShowCreateForm(false);
      setActiveTab(defaultCollectionTab);
      resetForm();
      loadCollections(true);
    } else {
      showToast(errorMessage || 'Erro ao salvar coleção. Tente novamente.', 'error');
    }
    setIsSaving(false);
  };

  const hasUnsavedChanges = (): boolean => {
    if (!originalFormData) return false;

    return JSON.stringify(formData) !== JSON.stringify(originalFormData);
  };

  useImperativeHandle(ref, () => ({
    hasUnsavedChanges,
  }));

  const clearLibraryAssetFocus = () => {
    setHighlightedAssetId(null);
    setHighlightedAssetCategory(null);
  };

  const openCreateForm = () => {
    const emptyFormData = createCollectionFormDataForCurrentFlow();
    clearLibraryAssetFocus();
    setShowCreateForm(true);
    setActiveTab(defaultCollectionTab);
    setFormData(emptyFormData);
    setOriginalFormData(emptyFormData);
  };

  const handleCreateContent = () => {
    if (hasUnsavedChanges()) {
      setPendingAction(() => openCreateForm);
      setShowUnsavedChangesModal(true);
      return;
    }

    openCreateForm();
  };

  const resetForm = () => {
    setFormData(createCollectionFormDataForCurrentFlow());
    setOriginalFormData(null);
    clearLibraryAssetFocus();
    setSelectedLibrarySlot(null);
    setShowMediaTypeDropdown(false);
  };

  const handleCancel = () => {
    if (hasUnsavedChanges()) {
      setPendingAction(() => () => {
        setEditingId(null);
        setShowCreateForm(false);
        setActiveTab(defaultCollectionTab);
        resetForm();
      });
      setShowUnsavedChangesModal(true);
    } else {
      setEditingId(null);
      setShowCreateForm(false);
      setActiveTab(defaultCollectionTab);
      resetForm();
    }
  };

  const handleConfirmLeave = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setShowUnsavedChangesModal(false);
  };

  const handleBackClick = () => {
    // If we're in edit/create mode, go back to the list view
    if (editingId || showCreateForm) {
      if (hasUnsavedChanges()) {
        setPendingAction(() => () => {
          setEditingId(null);
          setShowCreateForm(false);
          setActiveTab(defaultCollectionTab);
          resetForm();
        });
        setShowUnsavedChangesModal(true);
      } else {
        setEditingId(null);
        setShowCreateForm(false);
        setActiveTab(defaultCollectionTab);
        resetForm();
      }
    } else {
      // If we're already on the list view, go back to previous screen
      onBack();
    }
  };

  const getFilteredAndSortedCollections = (): Collection[] => {
    let filtered = [...scopedCollections];

    // When in library area mode (Vídeos, Áudios, etc.), show only collections
    // that have at least one asset whose category belongs to that area's slots.
    if (isAssetLibraryAreaMode) {
      const relevantSlots = LIBRARY_AREA_PRIMARY_SLOTS[initialLibraryArea];
      filtered = filtered.filter(collection =>
        collection.collection_assets?.some(asset => relevantSlots.includes(asset.category as CollectionAssetCategory))
      );
    }

    // Apply search filter
    if (searchFilter.trim()) {
      const searchLower = normalizeSearchableText(searchFilter);
      filtered = filtered.filter(collection =>
        normalizeSearchableText(collection.title).includes(searchLower) ||
        normalizeSearchableText(collection.theme).includes(searchLower)
      );
    }

    // Apply level filter
    if (levelFilter !== 'all') {
      filtered = filtered.filter(collection => collection.level === levelFilter);
    }

    // Apply alphabetical sorting
    if (sortOrder) {
      filtered.sort((a, b) => {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        const comparison = titleA.localeCompare(titleB, 'pt-BR');
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    // Apply publish-status tab filter (Publicados vs. Não publicados)
    filtered = filtered.filter((collection) =>
      publishStatusFilter === 'published' ? collection.is_published : !collection.is_published
    );

    return filtered;
  };

  // Counts for the publish-status tabs, reflecting the active search/level filters
  // (but NOT the publish filter itself, so both tab totals are always visible).
  const publishStatusCounts = React.useMemo(() => {
    let published = 0;
    let draft = 0;
    if (isAssetLibraryAreaMode) {
      // In library-area mode, count by the individual asset's is_published flag.
      for (const item of filteredLibraryAssets) {
        if (item.asset.is_published !== false) published += 1;
        else draft += 1;
      }
      return { published, draft };
    }
    let base = [...scopedCollections];
    if (searchFilter.trim()) {
      const searchLower = normalizeSearchableText(searchFilter);
      base = base.filter((collection) =>
        normalizeSearchableText(collection.title).includes(searchLower) ||
        normalizeSearchableText(collection.theme).includes(searchLower)
      );
    }
    if (levelFilter !== 'all') {
      base = base.filter((collection) => collection.level === levelFilter);
    }
    for (const collection of base) {
      if (collection.is_published) published += 1;
      else draft += 1;
    }
    return { published, draft };
  }, [isAssetLibraryAreaMode, initialLibraryArea, filteredLibraryAssets, scopedCollections, searchFilter, levelFilter]);

  // Only show permission error if we've finished checking and user doesn't have permission
  if (!checkingPermission && !hasPermission) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8">
          <Icons.AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
          <p className="text-gray-600 font-bold">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white pb-24 md:pb-0">
      <PageHeader
        title={activeLibraryAreaLabel ?? 'Coleções'}
        onBack={handleBackClick}
      />

      {/* Collections Tab Content */}
      {mainTab === 'collections' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-6 pt-0">
              {collections.length === 0 ? (
                <div className="text-center py-12">
                  {(() => {
                    const EmptyIcon = initialLibraryArea ? Icons[activeLibraryAreaUi?.icon || 'BookOpen'] as React.ElementType : Icons.BookOpen;
                    return <EmptyIcon size={48} className="mx-auto mb-4 text-gray-300" />;
                  })()}
                  <p className="text-gray-500 font-bold">
                    {emptyCatalogMessage}
                  </p>
                  {!editingId && !showCreateForm && (
                    <button
                      type="button"
                      onClick={handleCreateContent}
                      className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-brand-primary px-6 text-sm font-bold text-white shadow-sm transition-all hover:bg-opacity-90 active:scale-95"
                    >
                      <Icons.Plus size={18} />
                      <span>{createContentLabel}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Filtros e Ordenação */}
                  <div className="flex flex-col md:flex-row gap-3">
                    {/* Campo de Busca */}
                    <div className="flex-1">
                      <div className="relative">
                        <Icons.Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={searchFilter}
                          onChange={(e) => setSearchFilter(e.target.value)}
                          placeholder={activeLibraryAreaUi?.searchPlaceholder || 'Buscar por título ou tema...'}
                          className="w-full bg-gray-100 border-none rounded-2xl pl-12 pr-4 py-3 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-brand-primary outline-none transition-all font-medium"
                        />
                      </div>
                    </div>

                    {/* Filtro de Nível com Dropdown */}
                    <div className="md:w-48 relative" ref={levelDropdownRef}>
                      <button
                        onClick={() => setShowLevelDropdown(!showLevelDropdown)}
                        className={`h-11 px-4 rounded-2xl flex items-center gap-2 border transition-all active:scale-95 shadow-sm font-bold text-sm w-full justify-between ${levelFilter !== 'all'
                          ? 'bg-brand-primary text-white border-brand-primary shadow-brand-primary/20'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                      >
                        <span className="truncate">
                          {levelFilter === 'all' ? 'Todos os níveis' : formatSegmentLabel(levelFilter)}
                        </span>
                        <Icons.ChevronDown size={16} className={`transition-transform flex-shrink-0 ${showLevelDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showLevelDropdown && (
                        <div className="absolute top-full right-0 mt-2 w-full bg-white rounded-2xl shadow-xl border border-gray-100 z-50 animate-fade-in-up origin-top-right">
                          <button
                            onClick={() => {
                              setLevelFilter('all');
                              setShowLevelDropdown(false);
                            }}
                            className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors first:rounded-t-2xl ${levelFilter === 'all'
                              ? 'bg-brand-primary/10 text-brand-primary font-bold'
                              : 'text-gray-700 hover:bg-gray-50 font-medium'
                              }`}
                          >
                            <span>Todos os níveis</span>
                            {levelFilter === 'all' && <Icons.Check size={18} className="ml-auto" />}
                          </button>
                          <button
                            onClick={() => {
                              setLevelFilter('Educação Infantil');
                              setShowLevelDropdown(false);
                            }}
                            className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${levelFilter === 'Educação Infantil'
                              ? 'bg-brand-primary/10 text-brand-primary font-bold'
                              : 'text-gray-700 hover:bg-gray-50 font-medium'
                              }`}
                          >
                            <span>Educação Infantil</span>
                            {levelFilter === 'Educação Infantil' && <Icons.Check size={18} className="ml-auto" />}
                          </button>
                          <button
                            onClick={() => {
                              setLevelFilter('Fundamental I');
                              setShowLevelDropdown(false);
                            }}
                            className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors last:rounded-b-2xl ${levelFilter === 'Fundamental I'
                              ? 'bg-brand-primary/10 text-brand-primary font-bold'
                              : 'text-gray-700 hover:bg-gray-50 font-medium'
                              }`}
                          >
                            <span>E.F. Anos Iniciais</span>
                            {levelFilter === 'Fundamental I' && <Icons.Check size={18} className="ml-auto" />}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Botão de Ordenação com Dropdown */}
                    <div className="relative" ref={sortDropdownRef}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowSortDropdown(!showSortDropdown)}
                          className={`h-11 px-4 rounded-2xl flex items-center gap-2 border transition-all active:scale-95 shadow-sm font-bold text-sm ${sortOrder
                            ? 'bg-brand-primary text-white border-brand-primary shadow-brand-primary/20'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                          {sortOrder === 'asc' ? (
                            <>
                              <span className="hidden md:inline-block">A - Z</span>
                            </>
                          ) : sortOrder === 'desc' ? (
                            <>
                              <span className="hidden md:inline-block">Z - A</span>
                            </>
                          ) : (
                            <>
                              <Icons.ArrowUpDown size={18} />
                              <span>Ordenar</span>
                            </>
                          )}
                          <Icons.ChevronDown size={16} className={`transition-transform flex-shrink-0 ${showSortDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {sortOrder && (
                          <button
                            onClick={() => setSortOrder(null)}
                            className="h-11 w-11 rounded-2xl flex items-center justify-center border border-brand-primary bg-brand-primary text-white hover:bg-opacity-90 transition-all active:scale-95 shadow-sm shadow-brand-primary/20"
                            title="Remover ordenação"
                          >
                            <Icons.X size={18} />
                          </button>
                        )}
                      </div>

                      {showSortDropdown && (
                        <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 animate-fade-in-up origin-top-right">
                          <button
                            onClick={() => {
                              setSortOrder('asc');
                              setShowSortDropdown(false);
                            }}
                            className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors first:rounded-t-2xl ${sortOrder === 'asc'
                              ? 'bg-brand-primary/10 text-brand-primary font-bold'
                              : 'text-gray-700 hover:bg-gray-50 font-medium'
                              }`}
                          >
                            <Icons.ArrowDown size={18} />
                            <span>Crescente (A - Z)</span>
                            {sortOrder === 'asc' && <Icons.Check size={18} className="ml-auto" />}
                          </button>
                          <button
                            onClick={() => {
                              setSortOrder('desc');
                              setShowSortDropdown(false);
                            }}
                            className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors last:rounded-b-2xl ${sortOrder === 'desc'
                              ? 'bg-brand-primary/10 text-brand-primary font-bold'
                              : 'text-gray-700 hover:bg-gray-50 font-medium'
                              }`}
                          >
                            <Icons.ArrowUp size={18} />
                            <span>Decrescente (Z - A)</span>
                            {sortOrder === 'desc' && <Icons.Check size={18} className="ml-auto" />}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Botão Nova Coleção */}
                    {!editingId && !showCreateForm && (
                      <button
                        onClick={handleCreateContent}
                        className="h-11 px-6 rounded-2xl bg-brand-primary text-white flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all active:scale-95 shadow-sm font-bold text-sm whitespace-nowrap"
                      >
                        <Icons.Plus size={18} />
                        <span>{createContentLabel}</span>
                      </button>
                    )}
                  </div>

                  {/* Abas de status: separa conteúdos publicados de rascunhos (não publicados) */}
                  <div className="flex items-center gap-1 border-b border-gray-200">
                    {([
                      { key: 'published' as const, label: 'Publicados', count: publishStatusCounts.published },
                      { key: 'draft' as const, label: 'Não publicados', count: publishStatusCounts.draft },
                    ]).map((tab) => {
                      const isActive = publishStatusFilter === tab.key;
                      return (
                        <button
                          key={tab.key}
                          onClick={() => setPublishStatusFilter(tab.key)}
                          className={`relative px-4 py-2.5 -mb-px text-sm font-bold transition-colors ${isActive
                            ? 'text-brand-primary'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                          <span className="flex items-center gap-2">
                            {tab.label}
                            <span className={`text-xs px-2 py-0.5 rounded-full ${isActive
                              ? 'bg-brand-primary/10 text-brand-primary'
                              : 'bg-gray-100 text-gray-500'
                              }`}>
                              {tab.count}
                            </span>
                          </span>
                          {isActive && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-full" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Lista de conteúdo */}
                  {isAssetLibraryAreaMode ? (
                    visibleLibraryAssets.length === 0 ? (
                      <div className="text-center py-12">
                        {(() => {
                          const EmptyIcon = Icons[activeLibraryAreaUi?.icon || 'BookOpen'] as React.ElementType;
                          return <EmptyIcon size={48} className="mx-auto mb-4 text-gray-300" />;
                        })()}
                        <p className="text-gray-500 font-bold">
                          {libraryAssetItems.length === 0
                            ? `Nenhum conteúdo em ${activeLibraryAreaLabel?.toLowerCase() || 'esta área'}.`
                            : publishStatusFilter === 'draft'
                              ? 'Nenhum conteúdo não publicado nesta aba.'
                              : 'Nenhum conteúdo publicado nesta aba.'}
                        </p>
                        {libraryAssetItems.length > 0 && (searchFilter || levelFilter !== 'all' || sortOrder) && (
                          <button
                            onClick={() => { setSearchFilter(''); setLevelFilter('all'); setSortOrder(null); }}
                            className="mt-3 text-sm font-bold text-brand-primary hover:underline"
                          >
                            Limpar filtros
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className={`grid gap-4 md:gap-5 ${initialLibraryArea === 'music' || initialLibraryArea === 'videos' ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
                        {visibleLibraryAssets.map((item) => {
                          const CardIcon = Icons[item.iconName] as React.ElementType;
                          const isVideoAssetCard = item.asset.media_type === 'video';
                          const isAudioAssetCard = item.asset.media_type === 'audio';
                          const videoPreviewText = isVideoAssetCard ? getDistinctVideoPreviewText(item) : item.previewText;

                          return (
                            <div key={item.key} className="relative">
                              {/* Publish status badge — reflects the individual asset's status */}
                              <span className={`absolute top-2 left-2 z-20 pointer-events-none text-xs font-semibold px-2 py-0.5 rounded-full ${
                                item.asset.is_published !== false
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {item.asset.is_published !== false ? 'Publicado' : 'Rascunho'}
                              </span>

                              {/* Actions moved to preview modal */}

                            <button
                              type="button"
                              className={`group w-full border bg-white text-left transition-all active:scale-[0.99] ${isVideoAssetCard ? 'rounded-[18px] border-gray-200 p-4 shadow-sm hover:border-brand-primary/20 hover:shadow-md' : isAudioAssetCard ? 'rounded-[16px] border-brand-primary/10 p-3.5 shadow-[0_10px_24px_rgba(93,31,88,0.05)] hover:border-brand-primary/20 hover:shadow-[0_14px_24px_rgba(93,31,88,0.10)]' : 'rounded-2xl border-gray-200 p-5 shadow-sm hover:border-brand-primary/20 hover:shadow-md'}`}
                              onClick={isVideoAssetCard ? undefined : () => setPreviewLibraryItem(item)}
                            >
                              <div className={isVideoAssetCard || isAudioAssetCard ? 'space-y-3' : 'flex items-start gap-4'}>
                                <div
                                  className={`relative overflow-hidden border shadow-sm ${isVideoAssetCard ? 'aspect-video w-full rounded-[12px] border-gray-100 bg-gray-100 cursor-pointer' : isAudioAssetCard ? 'aspect-square w-full rounded-[10px] border-brand-primary/10 bg-[linear-gradient(180deg,#fdf9fe,#f6eff8)]' : 'h-[88px] w-[88px] shrink-0 rounded-xl border-gray-100 bg-gray-100'}`}
                                  onClick={isVideoAssetCard ? () => setPreviewVideoItem(item) : undefined}
                                >
                                  {item.coverImage ? (
                                    <img
                                      src={item.coverImage}
                                      alt={item.collection.title || item.displayTitle}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className={`flex h-full w-full items-center justify-center ${isAudioAssetCard ? 'bg-[radial-gradient(circle_at_top_left,rgba(93,31,88,0.22),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(78,168,222,0.12),transparent_50%),linear-gradient(180deg,#fcf8fd,#f2ebf6)] text-brand-primary/60' : 'text-brand-primary/50'}`}>
                                      <CardIcon size={24} />
                                    </div>
                                  )}

                                  {isVideoAssetCard && (
                                    <>
                                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                                      <div className="absolute inset-0 bg-brand-primary/0 transition-colors duration-200 group-hover:bg-brand-primary/16" />
                                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-brand-primary text-white opacity-0 scale-95 shadow-[0_16px_30px_rgba(93,31,88,0.32)] backdrop-blur-[2px] transition-all duration-200 group-hover:opacity-100 group-hover:scale-100">
                                          <Icons.Play size={18} className="fill-current stroke-none" />
                                        </span>
                                      </span>
                                      <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center rounded-[4px] bg-black/80 px-1.5 py-1 text-[10px] font-black leading-none text-white shadow-sm">
                                        Vídeo
                                      </span>
                                    </>
                                  )}

                                  {isAudioAssetCard && (
                                    <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center justify-center">
                                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary text-white opacity-0 translate-y-2 shadow-[0_14px_26px_rgba(93,31,88,0.28)] transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                                        <Icons.Headphones size={18} className="stroke-[2.2px]" />
                                      </span>
                                    </span>
                                  )}

                                  {!isVideoAssetCard && !isAudioAssetCard && (
                                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary text-white opacity-0 scale-95 shadow-[0_14px_26px_rgba(93,31,88,0.28)] transition-all duration-200 group-hover:opacity-100 group-hover:scale-100">
                                        <Icons.Eye size={18} />
                                      </span>
                                    </span>
                                  )}
                                </div>

                                <div className={`min-w-0 ${isVideoAssetCard ? 'flex min-h-[68px] flex-col' : isAudioAssetCard ? 'flex min-h-[56px] flex-col px-1 pb-1' : 'flex-1'}`}>
                                  <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center rounded-full bg-brand-primary/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-brand-primary">
                                      {COLLECTION_ASSET_META[item.asset.category].label}
                                    </span>
                                    {item.asset.lyrics_url && (
                                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-500">
                                        Com letra
                                      </span>
                                    )}
                                  </div>

                                  <h3 className={`text-gray-900 line-clamp-2 ${isVideoAssetCard ? 'text-[14px] font-bold leading-[1.35]' : isAudioAssetCard ? 'text-[13px] font-bold leading-[1.35]' : 'text-base font-black leading-tight'}`}>
                                    {item.displayTitle}
                                  </h3>

                                  {item.displayTitle.trim() !== item.collection.title.trim() && (
                                    <p className={`font-medium text-gray-500 line-clamp-1 ${isVideoAssetCard ? 'mt-1 text-[13px] leading-4' : isAudioAssetCard ? 'mt-1 text-[12px] leading-4' : 'mt-1 text-sm'}`}>
                                      {item.collection.title.trim()}
                                    </p>
                                  )}

                                  {(isVideoAssetCard ? videoPreviewText : item.previewText) && (
                                    <p className={isVideoAssetCard ? 'mt-0.5 text-[12px] font-medium leading-4 text-gray-500 line-clamp-1' : isAudioAssetCard ? 'mt-0.5 text-[11px] leading-4 text-gray-500 line-clamp-2' : 'mt-1.5 text-sm text-gray-500 line-clamp-2'}>
                                      {isVideoAssetCard ? videoPreviewText : item.previewText}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                                    {item.levelLabel}
                                  </span>
                                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                                    {item.asset.media_type === 'audio' ? 'Áudio' : item.asset.media_type === 'video' ? 'Vídeo' : 'Documento'}
                                  </span>
                                </div>
                                {hasPermission && (
                                  <span
                                    onClick={(e) => { e.stopPropagation(); handleLibraryAssetEdit(item); }}
                                    className="inline-flex items-center gap-1 text-sm font-bold text-brand-primary cursor-pointer transition-transform group-hover:translate-x-0.5 shrink-0"
                                  >
                                    Editar
                                    <Icons.ChevronRight size={16} />
                                  </span>
                                )}
                              </div>
                            </button>
                            </div>
                          );
                        })}
                      </div>
                    )
                  ) : getFilteredAndSortedCollections().length === 0 ? (
                    <div className="text-center py-12">
                      <Icons.BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500 font-bold">
                        {scopedCollections.length === 0
                          ? emptyCatalogMessage
                          : publishStatusCounts[publishStatusFilter] === 0
                            ? (publishStatusFilter === 'draft'
                              ? 'Nenhum conteúdo não publicado nesta aba.'
                              : 'Nenhum conteúdo publicado nesta aba.')
                            : emptyFilteredCollectionMessage}
                      </p>
                      {scopedCollections.length > 0 && (searchFilter || levelFilter !== 'all' || sortOrder) && (
                        <button
                          onClick={() => { setSearchFilter(''); setLevelFilter('all'); setSortOrder(null); }}
                          className="mt-3 text-sm font-bold text-brand-primary hover:underline"
                        >
                          Limpar filtros
                        </button>
                      )}
                    </div>
                  ) : (
                    <div
                      className="grid auto-rows-fr gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                    >
                      {getFilteredAndSortedCollections().map((collection) => {
                        const actionsButton = (
                          <div
                            className="actions-button"
                            ref={(el) => {
                              actionsDropdownRefs.current[collection.id] = el;
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setOpenDropdown(openActionsDropdown === collection.id ? null : collection.id);
                              }}
                              className="w-8 h-8 rounded-full bg-white/90 hover:bg-white border border-gray-200 flex items-center justify-center transition-all shadow-sm hover:shadow-md"
                              aria-label="Ações da coleção"
                            >
                              <Icons.MoreHorizontal size={18} className="text-gray-600" />
                            </button>

                            {openActionsDropdown === collection.id && (
                              <div
                                className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 z-[100] animate-fade-in-up origin-top-right actions-dropdown"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                {isAdminUser && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      if (hasUnsavedChanges()) {
                                        setPendingAction(() => () => handleEdit(collection));
                                        setShowUnsavedChangesModal(true);
                                      } else {
                                        handleEdit(collection);
                                      }
                                      setOpenDropdown(null);
                                    }}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                    }}
                                    className="w-full px-4 py-3 text-left flex items-center gap-3 transition-colors first:rounded-t-2xl text-gray-700 hover:bg-gray-50 font-medium"
                                  >
                                    <Icons.Edit size={18} />
                                    <span>Editar</span>
                                  </button>
                                )}
                                {isAdminUser && (
                                  <button
                                    type="button"
                                    disabled={collection.is_published}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      if (collection.is_published) return;
                                      handleDeleteClick(collection.id);
                                      setOpenDropdown(null);
                                    }}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                    }}
                                    className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors font-medium ${
                                      collection.is_published
                                        ? 'text-gray-300 cursor-not-allowed'
                                        : 'text-red-500 hover:bg-red-50'
                                    }`}
                                    title={collection.is_published ? 'Despublique para excluir' : undefined}
                                  >
                                    <Icons.Trash2 size={18} />
                                    <span>{collection.is_published ? 'Despublique para excluir' : 'Excluir'}</span>
                                  </button>
                                )}
                                {isAdminUser && (
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      const willUnpublish = collection.is_published;
                                      setOpenDropdown(null);

                                      if (willUnpublish && isBooksCatalogMode) {
                                        const bookPdfUrl = collection.collection_assets?.find(a => a.category === 'reading')?.url?.trim() ?? '';
                                        const affected = findCollectionsAffectedByUnpublish(collection.id, bookPdfUrl);
                                        if (affected.length > 0) {
                                          setCascadeUnpublishConfirm({
                                            affectedCollections: affected,
                                            onConfirm: async () => {
                                              setCascadeUnpublishConfirm(null);
                                              try {
                                                // @ts-ignore
                                                const ok = await api.unpublishCollection(collection.id);
                                                if (ok) {
                                                  await Promise.all(affected.map(c => api.updateCollection(c.id, { is_published: false })));
                                                  showToast(`Livro despublicado. ${affected.length} coleção(ões) despublicada(s) automaticamente.`, 'warning');
                                                  await loadCollections(true);
                                                }
                                              } catch {
                                                showToast('Erro ao despublicar.', 'error');
                                              }
                                            },
                                          });
                                          return;
                                        }
                                      }

                                      try {
                                        // @ts-ignore
                                        const ok = willUnpublish
                                          ? await api.unpublishCollection(collection.id)
                                          : await api.publishCollection(collection.id);
                                        if (ok) {
                                          showToast(willUnpublish ? 'Coleção despublicada.' : 'Coleção publicada!', 'success');
                                          await loadCollections(true);
                                        } else {
                                          showToast('Erro ao alterar status de publicação.', 'error');
                                        }
                                      } catch {
                                        showToast('Erro ao alterar status de publicação.', 'error');
                                      }
                                    }}
                                    onMouseDown={(e) => { e.stopPropagation(); }}
                                    className="w-full px-4 py-3 text-left flex items-center gap-3 transition-colors last:rounded-b-2xl text-gray-700 hover:bg-gray-50 font-medium"
                                  >
                                    {collection.is_published
                                      ? <><Icons.EyeOff size={16} /><span>Despublicar</span></>
                                      : <><Icons.Eye size={16} /><span>Publicar</span></>}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );

                        return (
                          <div key={collection.id} className="relative h-full w-full flex flex-col">
                            {/* Badge de status no card */}
                            <span className={`absolute top-2 left-2 z-20 text-xs font-semibold px-2 py-0.5 rounded-full ${
                              collection.is_published
                                ? 'bg-green-100 text-green-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {collection.is_published ? 'Publicado' : 'Rascunho'}
                            </span>

                            <div className="relative">
                              <Card3D
                              collection={isCollectionsCatalogMode ? { ...collection, kit_cover_image: null } : collection}
                              tone="default"
                              onCollectionClick={() => {
                                if (hasUnsavedChanges()) {
                                  setPendingAction(() => () => handleEdit(collection));
                                  setShowUnsavedChangesModal(true);
                                } else {
                                  handleEdit(collection);
                                }
                              }}
                            />
                            </div>

                            {/* Footer com botão Editar */}
                            {hasPermission && (
                              <div className="mt-2 flex items-center justify-end px-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (hasUnsavedChanges()) {
                                      setPendingAction(() => () => handleEdit(collection));
                                      setShowUnsavedChangesModal(true);
                                    } else {
                                      handleEdit(collection);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 text-sm font-bold text-brand-primary hover:underline transition-all"
                                >
                                  Editar
                                  <Icons.ChevronRight size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* === FORM DRAWER (always in DOM for CSS slide animation) === */}
          {/* Backdrop */}
          <div
            onClick={handleCancel}
            className={`fixed inset-0 z-40 transition-all duration-300 ${(editingId || showCreateForm)
              ? 'bg-black/40 pointer-events-auto'
              : 'bg-transparent pointer-events-none'
              }`}
          />

          {/* Drawer Panel */}
          <div
            className="fixed inset-y-0 right-0 z-50 flex flex-col bg-white shadow-2xl w-full sm:w-[600px] max-w-full transition-[transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
            style={{ transform: (editingId || showCreateForm) ? 'translateX(0)' : 'translateX(100%)' }}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="min-w-0 flex-1">
                {activeLibraryAreaLabel && (
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-primary/60 mb-0.5">
                    {activeLibraryAreaLabel}
                  </p>
                )}
                  <h2 className="text-base font-bold text-gray-800 line-clamp-1">
                    {editingId
                      ? (formData.title || 'Sem título')
                    : createContentLabel}
                  </h2>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                {isAdminUser && editingId && (
                  <button
                    type="button"
                    onClick={() => { if (!formData.is_published) handleDeleteClick(editingId); }}
                    disabled={formData.is_published}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      formData.is_published
                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        : 'bg-red-50 hover:bg-red-100 text-red-500'
                    }`}
                    title={
                      formData.is_published
                        ? 'Despublique para excluir'
                        : (isBooksCatalogMode ? 'Excluir livro' : 'Excluir coleção')
                    }
                  >
                    <Icons.Trash2 size={16} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all text-gray-600"
                  aria-label="Fechar"
                >
                  <Icons.X size={18} />
                </button>
              </div>
            </div>

            {/* Navegação do drawer.
                Coleções: wizard de 2 passos (Dados → Mídias). Demais: abas simples. */}
            {!isLibraryAreaMode && isCollectionsCatalogMode && (
              <div className="px-6 pt-4 pb-0 flex-shrink-0">
                <div className="flex items-center gap-3">
                  {(() => {
                    const linkedMediaCount = formData.collection_assets.filter(a => a.url?.trim()).length;
                    const steps = [
                      { id: 'identification' as const, n: 1, label: 'Dados da coleção' },
                      { id: 'media' as const, n: 2, label: 'Mídias vinculadas' },
                    ];
                    return steps.map((step, idx) => {
                      const isActive = activeTab === step.id;
                      const isDone = step.id === 'identification' && activeTab === 'media';
                      return (
                        <React.Fragment key={step.id}>
                          <button
                            type="button"
                            onClick={() => step.id === 'media' ? goToMediaStep() : setActiveTab('identification')}
                            className="flex items-center gap-2 group"
                          >
                            <span
                              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                                isActive
                                  ? 'bg-brand-primary text-white'
                                  : isDone
                                    ? 'bg-brand-primary/15 text-brand-primary'
                                    : 'bg-gray-200 text-gray-500'
                              }`}
                            >
                              {isDone ? <Icons.Check size={14} /> : step.n}
                            </span>
                            <span
                              className={`text-sm font-semibold transition-colors ${
                                isActive ? 'text-gray-800' : 'text-gray-400 group-hover:text-gray-600'
                              }`}
                            >
                              {step.label}
                            </span>
                            {step.id === 'media' && (
                              <span className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                linkedMediaCount === 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {linkedMediaCount}
                              </span>
                            )}
                          </button>
                          {idx === 0 && <div className="h-px flex-1 bg-gray-200" />}
                        </React.Fragment>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* Abas simples para livro (passo único) e outros fluxos não-biblioteca. */}
            {!isLibraryAreaMode && !isCollectionsCatalogMode && (
              <div className="px-6 pt-4 pb-0 flex-shrink-0">
                <Tabs
                  tabs={[
                    { id: 'identification', label: isBooksCatalogMode ? 'Dados do Livro' : 'Dados da Coleção' },
                  ]}
                  activeTab={activeTab}
                  onChange={(tabId) => setActiveTab(tabId as any)}
                />
              </div>
            )}

            {/* Scrollable form body */}
            <div ref={drawerBodyRef} className="flex-1 overflow-y-auto px-6 pb-4 pt-4">
              <div className="flex flex-col gap-6">
                {/* Tab: Dados da Coleção */}
                {!isLibraryAreaMode && activeTab === 'identification' && (
                  <>
                    {/* Grupo "Dados" (identificação + pedagógicas) — order-2: aparece depois do conteúdo. */}
                    <div className="space-y-6 order-2">
                    {/* Informações de Identificação Title */}
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 mb-4">Informações de Identificação</h3>
                    </div>

                    {/* Section heading: Identificação (books only) */}
                    {isBooksCatalogMode && (
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mt-6 mb-3">Identificação</h3>
                    )}

                    {/* 1.3. Título */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Título <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-brand-primary outline-none"
                        placeholder={titleFieldPlaceholder}
                      />
                    </div>

                    {/* Toggle de publicação */}
                    {(() => {
                      const hasContent = !isCollectionsCatalogMode
                        || formData.collection_assets?.some((a) => a.url?.trim())
                        || (formData.kit_book_ids?.length ?? 0) > 0
                        || [formData.audio_url, formData.pdf_url, formData.video_url].some((u) => u?.trim());
                      const publishBlocked = isCollectionsCatalogMode && !hasContent;
                      return (
                        <div className="flex items-center justify-between mt-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
                          <div>
                            <p className="text-sm font-medium text-gray-900">Status de publicação</p>
                            <p className={`text-xs ${publishBlocked ? 'text-amber-600' : 'text-gray-500'}`}>
                              {publishBlocked
                                ? 'Vincule um livro ou mídia para poder publicar'
                                : formData.is_published ? 'Visível na vitrine pública' : 'Rascunho — apenas no admin'}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={publishBlocked}
                            onClick={() => !publishBlocked && setCollectionPublished(!formData.is_published)}
                            title={publishBlocked ? 'Vincule um livro ou mídia na aba "Mídias vinculadas" para poder publicar' : undefined}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              publishBlocked
                                ? 'bg-gray-200 cursor-not-allowed opacity-60'
                                : formData.is_published ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              formData.is_published && !publishBlocked ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                      );
                    })()}

                    {/* CONTEÚDO: PDF do Livro, Audiolivro e Vídeo do Livro */}
                    {isBooksCatalogMode && (
                    <div className="space-y-6">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mt-2 mb-3">Conteúdo</h3>

                    {/* PDF do Livro */}
                    {(() => {
                      const asset = getAssetByCategory('reading');
                      return (
                        <div className="space-y-2">
                          <FileUpload
                            label="PDF do Livro"
                            value={asset?.url || ''}
                            onChange={(url) => {
                              if (url) {
                                setFormData((currentFormData) => {
                                  const currentAsset = currentFormData.collection_assets.find((a) => a.category === 'reading');
                                  const nextAssets = currentFormData.collection_assets.filter((a) => a.category !== 'reading');
                                  nextAssets.push({
                                    id: currentAsset?.id || createAssetId('reading'),
                                    category: 'reading',
                                    media_type: 'document',
                                    title: currentFormData.title || 'Leitura',
                                    url: url.trim(),
                                    description: null,
                                    scope: COLLECTION_ASSET_META.reading.scope,
                                    lyrics_url: null,
                                    offline_available: true,
                                  });
                                  return buildNextFormFromAssets(currentFormData, nextAssets);
                                });
                              } else {
                                removeAsset('reading');
                              }
                            }}
                            folder="pdfs"
                            accept="application/pdf"
                            collectionId={editingId || undefined}
                            onFile={(file) => {
                              // Guarda o arquivo para extração de texto (sugestão de sinopse por IA).
                              lastPdfFileRef.current = file;
                              // 1) Auto-preenche título/nível a partir do nome do arquivo.
                              const parsed = parsePdfFilename(file.name);
                              if (parsed.title || parsed.level) {
                                setFormData((prev) => {
                                  const willFillTitle = !!parsed.title && !prev.title;
                                  if (willFillTitle || parsed.level) {
                                    const isApprox = parsed.level === 'Educação Infantil' && !!parsed.title;
                                    showToast(
                                      isApprox
                                        ? 'Nível preenchido automaticamente. Verifique o título.'
                                        : 'Título e nível preenchidos automaticamente.',
                                      'success'
                                    );
                                  }
                                  return {
                                    ...prev,
                                    ...(willFillTitle ? { title: parsed.title! } : {}),
                                    ...(parsed.level ? { level: parsed.level } : {}),
                                  };
                                });
                              }

                              // 2) Gera a capa a partir da 1ª página — só se ainda for placeholder
                              // (nunca sobrescreve uma capa que o usuário já escolheu).
                              if (isPlaceholderImageUrl(formData.cover_image)) {
                                void (async () => {
                                  const coverFile = await renderPdfFirstPageToFile(file);
                                  if (!coverFile) return;
                                  const result = await uploadFile(coverFile, 'covers', editingId || undefined);
                                  if (result?.url) {
                                    setFormData((prev) =>
                                      isPlaceholderImageUrl(prev.cover_image)
                                        ? { ...prev, cover_image: result.url! }
                                        : prev
                                    );
                                    showToast('Capa gerada a partir da 1ª página do PDF.', 'success');
                                  }
                                })();
                              }
                            }}
                          />
                        </div>
                      );
                    })()}

                    {/* Audiolivro */}
                    {(() => {
                      const asset = getAssetByCategory('storytelling');
                      const assetIsPublished = asset ? asset.is_published !== false : false;
                      return (
                        <div className="space-y-2">
                          <p className="text-sm font-bold text-gray-800">Audiolivro</p>
                          <p className="text-xs text-gray-500">Narração completa da obra. Não obrigatório.</p>
                          <FileUpload
                            label="Arquivo de Áudio ou Link"
                            value={asset?.url || ''}
                            onChange={(url) => {
                              if (url) {
                                setFormData((currentFormData) => {
                                  const currentAsset = currentFormData.collection_assets.find((a) => a.category === 'storytelling');
                                  const nextAssets = currentFormData.collection_assets.filter((a) => a.category !== 'storytelling');
                                  nextAssets.push({
                                    id: currentAsset?.id || createAssetId('storytelling'),
                                    category: 'storytelling',
                                    media_type: 'audio',
                                    title: currentFormData.title || 'Audiolivro',
                                    url: url.trim(),
                                    description: null,
                                    scope: COLLECTION_ASSET_META.storytelling.scope,
                                    lyrics_url: null,
                                    offline_available: false,
                                    is_published: currentAsset?.is_published ?? true,
                                  });
                                  return buildNextFormFromAssets(currentFormData, nextAssets);
                                });
                              } else {
                                removeAsset('storytelling');
                              }
                            }}
                            folder="audio"
                            accept="audio/*"
                            collectionId={editingId || undefined}
                          />
                          {asset && (
                            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-2xl">
                              <div>
                                <p className="text-sm font-bold text-gray-800">Publicar audiolivro</p>
                                <p className="text-xs text-gray-500">
                                  {assetIsPublished ? 'Visível na vitrine pública' : 'Rascunho — apenas no admin'}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setAssetPublished('storytelling', !assetIsPublished)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${assetIsPublished ? 'bg-green-500' : 'bg-gray-300'}`}
                              >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${assetIsPublished ? 'translate-x-6' : 'translate-x-1'}`} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Vídeo do Livro */}
                    {(() => {
                      const asset = getAssetByCategory('animation');
                      const assetIsPublished = asset ? asset.is_published !== false : false;
                      return (
                        <div className="space-y-2">
                          <p className="text-sm font-bold text-gray-800">Vídeo do Livro</p>
                          <p className="text-xs text-gray-500">Animação ou vídeocanção específica deste livro (opcional).</p>
                          <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-3">
                            <Icons.Link size={16} className="shrink-0 text-gray-400" />
                            <input
                              type="url"
                              value={asset?.url || ''}
                              onChange={(e) => {
                                const url = e.target.value;
                                if (url.trim()) {
                                  setFormData((currentFormData) => {
                                    const currentAsset = currentFormData.collection_assets.find((a) => a.category === 'animation');
                                    const nextAssets = currentFormData.collection_assets.filter((a) => a.category !== 'animation');
                                    nextAssets.push({
                                      id: currentAsset?.id || createAssetId('animation'),
                                      category: 'animation',
                                      media_type: 'video',
                                      title: currentFormData.title || 'Vídeo',
                                      url: url.trim(),
                                      description: null,
                                      scope: COLLECTION_ASSET_META.animation.scope,
                                      lyrics_url: null,
                                      offline_available: false,
                                      is_published: currentAsset?.is_published ?? true,
                                    });
                                    return buildNextFormFromAssets(currentFormData, nextAssets);
                                  });
                                } else {
                                  removeAsset('animation');
                                }
                              }}
                              placeholder="https://www.youtube.com/watch?v=..."
                              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
                            />
                            {asset?.url && (
                              <button
                                type="button"
                                onClick={() => removeAsset('animation')}
                                className="shrink-0 text-gray-400 hover:text-gray-600"
                              >
                                <Icons.X size={14} />
                              </button>
                            )}
                          </div>
                          {asset && (
                            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-2xl">
                              <div>
                                <p className="text-sm font-bold text-gray-800">Publicar vídeo</p>
                                <p className="text-xs text-gray-500">
                                  {assetIsPublished ? 'Visível na vitrine pública' : 'Rascunho — apenas no admin'}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setAssetPublished('animation', !assetIsPublished)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${assetIsPublished ? 'bg-green-500' : 'bg-gray-300'}`}
                              >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${assetIsPublished ? 'translate-x-6' : 'translate-x-1'}`} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    </div>
                    )}

                    {/* Capa principal e cor base do card */}
                    <div className="rounded-2xl border border-brand-primary/10 bg-brand-primary/[0.04] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-gray-800">Formato na vitrine</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {showcaseDescription}
                          </p>
                        </div>
                        <span className="inline-flex items-center rounded-full border border-brand-primary/15 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-brand-primary shadow-sm">
                          {showcaseBadgeLabel}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FileUpload
                          label={coverFieldLabel}
                          value={formData.cover_image || placeholderImageUrl}
                          onChange={(url) => setFormData({ ...formData, cover_image: url })}
                          folder="covers"
                          accept="image/*"
                          collectionId={editingId || undefined}
                          hideUrlInput={true}
                          inputId={isBooksCatalogMode ? 'catalog-book-cover-upload' : 'catalog-collection-cover-upload'}
                          previewSize="sm"
                        />
                        <p className="mt-2 text-xs text-gray-500">
                          {coverFieldHelpText}
                        </p>
                        {isPlaceholderImageUrl(formData.cover_image || placeholderImageUrl) && (
                          <p className="text-xs text-amber-600 mt-1">Usando imagem padrão. Recomendamos adicionar uma capa personalizada.</p>
                        )}
                      </div>

                      <div>
                        <ColorPicker
                          label="Cor do card"
                          value={formData.color_theme || DEFAULT_COLLECTION_COLOR_THEME}
                          onChange={(color) => setFormData({ ...formData, color_theme: color })}
                        />
                        <p className="mt-2 text-xs text-gray-500">
                          {colorFieldHelpText}
                        </p>
                      </div>
                    </div>

                    {isCollectionsCatalogMode && (
                      <div className="rounded-2xl border border-brand-primary/20 bg-brand-primary/[0.04] p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                            <Icons.Sparkles size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-800">Gerar capa com IA a partir da caixa</p>
                            <p className="mt-1 text-xs text-gray-500">
                              Não tem uma capa? Copie o prompt abaixo, abra sua IA de imagem (ChatGPT, Gemini, etc.),
                              <span className="font-semibold text-gray-700"> anexe a foto da caixa física desta coleção</span> e cole o prompt.
                              A IA gera a capa quadrada seguindo a identidade visual da caixa.
                            </p>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={handleCopyCoverPrompt}
                                className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-primary/90"
                              >
                                {coverPromptCopied ? <Icons.Check size={15} /> : <Icons.Copy size={15} />}
                                {coverPromptCopied ? 'Copiado!' : 'Copiar prompt'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowCoverPromptGuide((prev) => !prev)}
                                className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                              >
                                {showCoverPromptGuide ? 'Ocultar prompt' : 'Ver prompt'}
                                <Icons.ChevronDown
                                  size={15}
                                  className={`transition-transform ${showCoverPromptGuide ? 'rotate-180' : ''}`}
                                />
                              </button>
                            </div>

                            {showCoverPromptGuide && (
                              <textarea
                                readOnly
                                value={buildCollectionCoverPrompt()}
                                onFocus={(e) => e.currentTarget.select()}
                                className="mt-3 w-full resize-y rounded-2xl border border-gray-200 bg-white p-4 font-mono text-xs leading-5 text-gray-700 outline-none focus:ring-2 focus:ring-brand-primary min-h-[200px]"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {isCollectionsCatalogMode && (
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 flex items-start gap-2">
                        <Icons.CheckCircle size={16} className="shrink-0 text-gray-400 mt-0.5" />
                        <span>
                          O livro da coleção e a disponibilidade offline agora são definidos na etapa <span className="font-bold text-gray-800">Mídias vinculadas</span>, só escolhendo os conteúdos já cadastrados.
                        </span>
                      </div>
                    )}

                    {/* Personagens + Contexto Pedagógico: apenas no cadastro de LIVRO.
                        Na coleção esses dados são herdados do livro vinculado (single source of truth). */}
                    {!isCollectionsCatalogMode && (
                    <>
                    {/* 1.10. Personagens */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Personagens</label>
                        <p className="text-xs text-gray-500 mb-3">
                          {isBooksCatalogMode
                            ? 'Selecione os personagens cadastrados para manter o livro sincronizado com a vitrine pública.'
                            : 'Selecione os personagens cadastrados para manter a coleção sincronizada com a vitrine pública.'}
                        </p>

                        {charactersLoading ? (
                          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500 flex items-center gap-2">
                            <Icons.RotateCw size={16} className="shrink-0 animate-spin text-gray-400" />
                            Carregando personagens…
                          </div>
                        ) : selectableCharacters.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                            Nenhum personagem cadastrado ainda. Use o módulo Personagens para criar o catálogo.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {selectableCharacters.map((character) => {
                              const isSelected = selectedCharacterIds.includes(character.id);
                              return (
                                <button
                                  key={character.id}
                                  type="button"
                                  onClick={() => toggleCharacterSelection(character.id)}
                                  className={`rounded-2xl border p-3 text-left transition-all active:scale-[0.99] ${isSelected
                                    ? 'border-brand-primary bg-brand-primary/5 shadow-sm'
                                    : 'border-gray-200 bg-white hover:bg-gray-50'
                                    } ${(character.status || 'active') === 'inactive' ? 'opacity-70' : ''}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <CharacterAvatar
                                      name={character.name}
                                      className="h-12 w-12 shrink-0 rounded-2xl"
                                      imageClassName="absolute inset-0 h-full w-full object-cover"
                                      initialClassName="absolute inset-0 flex items-center justify-center text-sm font-black text-white/80"
                                    />

                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="truncate text-sm font-bold text-gray-800">{character.name}</span>
                                        {(character.status || 'active') === 'inactive' && (
                                          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-600">
                                            Inativo
                                          </span>
                                        )}
                                      </div>
                                      <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                                        {character.description || 'Sem descrição cadastrada.'}
                                      </p>
                                    </div>

                                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-brand-primary bg-brand-primary text-white' : 'border-gray-300 text-transparent'}`}>
                                      <Icons.Check size={14} />
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>


                    </div>

                    {/* Separation line */}
                    <div className="border-t border-gray-200 my-6"></div>

                    {/* Section heading: Contexto Pedagógico (books only) */}
                    {isBooksCatalogMode && (
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mt-6 mb-3">Contexto Pedagógico</h3>
                    )}

                    {/* Informações Pedagógicas */}
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 mb-1">Informações Pedagógicas</h3>
                      {isCollectionsCatalogMode && linkedReadingBook && (
                        <p className="text-xs text-gray-500 mb-4">
                          Pré-preenchidas do livro vinculado — você pode editar diretamente aqui.
                        </p>
                      )}
                    </div>

                    <>
                      {/* Editable pedagogical fields */}
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Nível</label>
                          <div className="space-y-2">
                            {AVAILABLE_SEGMENTS.map((seg) => {
                              const checked = formData.segments?.includes(seg) ?? false;
                              const isPrimary = formData.primary_segment === seg;
                              return (
                                <div key={seg} className="flex items-center gap-3">
                                  <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => {
                                        const prev = formData.segments || [];
                                        let next: string[];
                                        if (checked) {
                                          next = prev.filter(s => s !== seg);
                                          if (isPrimary) {
                                            const newPrimary = next[0] || '';
                                            setFormData({
                                              ...formData,
                                              segments: next,
                                              primary_segment: newPrimary,
                                              level: newPrimary === 'Educação Infantil' ? 'Educação Infantil' : (newPrimary ? 'Fundamental I' : formData.level),
                                            });
                                            return;
                                          }
                                        } else {
                                          next = [...prev, seg];
                                          if (next.length === 1) {
                                            setFormData({
                                              ...formData,
                                              segments: next,
                                              primary_segment: seg,
                                              level: seg === 'Educação Infantil' ? 'Educação Infantil' : 'Fundamental I',
                                            });
                                            return;
                                          }
                                        }
                                        setFormData({ ...formData, segments: next });
                                      }}
                                      className="w-4 h-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                                    />
                                    <span className="text-sm text-gray-800">{seg}</span>
                                  </label>
                                  {checked && (
                                    <label className="flex items-center gap-1 cursor-pointer text-xs text-gray-500 shrink-0">
                                      <input
                                        type="radio"
                                        name="primary_segment"
                                        checked={isPrimary}
                                        onChange={() => setFormData({
                                          ...formData,
                                          primary_segment: seg,
                                          level: seg === 'Educação Infantil' ? 'Educação Infantil' : 'Fundamental I',
                                        })}
                                        className="w-3 h-3 text-brand-primary focus:ring-brand-primary"
                                      />
                                      <span className={isPrimary ? 'font-bold text-brand-primary' : ''}>Principal</span>
                                    </label>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <SearchableMultiSelect
                            label="Ano Escolar"
                            options={AGE_GRADE_OPTIONS}
                            value={formData.age_grade || []}
                            onChange={(vals) => setFormData({ ...formData, age_grade: vals })}
                            placeholder="Selecionar ano(s) escolar(es)"
                            searchPlaceholder="Pesquisar ano escolar..."
                          />
                        </div>

                        <div>
                          <SearchableMultiSelect
                            label="Idade Adequada"
                            options={SUITABLE_AGES_OPTIONS}
                            value={formData.suitable_ages || []}
                            onChange={(vals) => setFormData({ ...formData, suitable_ages: vals })}
                            placeholder="Selecionar idade(s)"
                            searchPlaceholder="Pesquisar idade..."
                          />
                        </div>

                        {!isBooksCatalogMode && (
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <label className="block text-sm font-bold text-gray-700">Descrição</label>
                            <div className="flex items-center gap-3">
                              {aiSynopsisEnabled && (
                                <button
                                  type="button"
                                  onClick={handleSuggestSynopsis}
                                  disabled={suggestingSynopsis}
                                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-primary hover:text-brand-primary/80 disabled:opacity-50"
                                  title="Gerar sugestão de sinopse com IA"
                                >
                                  <Icons.Feather size={14} />
                                  {suggestingSynopsis ? 'Gerando...' : 'Sugerir com IA'}
                                </button>
                              )}
                              <span className="text-xs text-gray-400">{(formData.synopsis || '').length}/500</span>
                            </div>
                          </div>
                          <textarea
                            value={formData.synopsis || ''}
                            onChange={(e) => setFormData({ ...formData, synopsis: e.target.value.slice(0, 500) })}
                            className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-brand-primary outline-none min-h-[80px]"
                            placeholder={synopsisPlaceholder}
                            maxLength={500}
                          />
                        </div>
                        )}

                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Tema</label>
                          <input
                            type="text"
                            value={formData.theme}
                            onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                            className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-brand-primary outline-none"
                            placeholder={themePlaceholder}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Objetivos de Aprendizado</label>
                          <textarea
                            value={formData.learning_objectives}
                            onChange={(e) => setFormData({ ...formData, learning_objectives: e.target.value })}
                            className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-brand-primary outline-none min-h-[100px]"
                            placeholder="Objetivos de aprendizado..."
                          />
                        </div>

                        <div>
                          <SearchableMultiSelect
                            label="Habilidades BNCC"
                            options={BNCC_OPTIONS}
                            value={formData.bncc_skills || []}
                            onChange={(vals) => setFormData({ ...formData, bncc_skills: vals })}
                            placeholder="Selecionar habilidades BNCC"
                            searchPlaceholder="Pesquisar por código ou descrição..."
                          />
                        </div>

                        <div>
                          <SearchableMultiSelect
                            label="Competências Casel"
                            options={CASEL_OPTIONS}
                            value={formData.casel_competencies || []}
                            onChange={(vals) => setFormData({ ...formData, casel_competencies: vals })}
                            placeholder="Selecionar competências Casel"
                            searchPlaceholder="Pesquisar competência..."
                          />
                        </div>
                    </>
                    </>
                    )}
                    </div>

                    {!isBooksCatalogMode && (
                      <div className="flex justify-end pt-2 order-3">
                        <button
                          type="button"
                          onClick={goToMediaStep}
                          disabled={!canAdvanceToMediaStep}
                          title={!canAdvanceToMediaStep ? 'Informe o título da coleção para avançar' : undefined}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-primary text-white text-sm font-semibold hover:bg-brand-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-primary"
                        >
                          Próximo
                          <Icons.ChevronRight size={16} />
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Tab: Mídias vinculadas */}
                {activeTab === 'media' && (
                  <>
                    {isCollectionsCatalogMode && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('identification')}
                        className="inline-flex items-center gap-1 self-start text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        <Icons.ChevronLeft size={16} />
                        Voltar para Dados da coleção
                      </button>
                    )}
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 mb-4">
                        {activeLibraryAreaLabel ? activeLibraryAreaLabel : 'Mídias vinculadas'}
                      </h3>
                      {!activeLibraryAreaLabel && !editingId && (
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 mb-4 flex items-start gap-2">
                          <Icons.AlertCircle size={16} className="shrink-0 text-gray-400 mt-0.5" />
                          <span>
                            {isBooksCatalogMode
                              ? 'Faça upload ou cole o link do arquivo PDF do livro. O arquivo pode ser adicionado agora ou depois.'
                              : 'Toque nos cards abaixo para vincular as mídias já cadastradas em Livros, Vídeos, Áudios, Formações e Materiais antes de salvar.'
                            }
                          </span>
                        </div>
                      )}
                      {highlightedAssetCategory && (
                        <div className="rounded-2xl border border-brand-primary/15 bg-white px-4 py-3 text-sm text-gray-700 mb-4 shadow-sm">
                          <span className="font-bold text-brand-primary">Asset selecionado:</span>{' '}
                          {highlightedAsset?.title || COLLECTION_ASSET_META[highlightedAssetCategory].label}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Mini-identificação: campos básicos visíveis no modo de área de biblioteca */}
                      {isLibraryAreaMode && (
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-4">
                          {/* YouTube URL first — auto-fills title + cover via oEmbed */}
                          {initialLibraryArea === 'videos' && (() => {
                            const videoSlots = FIXED_MEDIA_SLOTS.filter(s => (LIBRARY_AREA_PRIMARY_SLOTS['videos'] as readonly string[]).includes(s.category));
                            const existingCat = videoSlots.find(s => !!getAssetByCategory(s.category as FixedMediaSlotCategory)?.url)?.category as FixedMediaSlotCategory | undefined;
                            const activeCat: FixedMediaSlotCategory = selectedLibrarySlot ?? existingCat ?? videoSlots[0].category as FixedMediaSlotCategory;
                            const currentVideoUrl = getAssetByCategory(activeCat)?.url || '';
                            return (
                              <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                  Link do YouTube <span className="text-red-500">*</span>
                                </label>
                                <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-brand-primary">
                                  <Icons.Link size={16} className="shrink-0 text-gray-400" />
                                  <input
                                    type="url"
                                    value={currentVideoUrl}
                                    onChange={(e) => handleYoutubeUrlChange(e.target.value, activeCat)}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
                                  />
                                  {isFetchingYoutubeData && (
                                    <span className="text-xs text-brand-primary font-medium animate-pulse shrink-0">Buscando...</span>
                                  )}
                                  {currentVideoUrl && !isFetchingYoutubeData && (
                                    <button type="button" onClick={() => handleYoutubeUrlChange('', activeCat)} className="shrink-0 text-gray-400 hover:text-gray-600">
                                      <Icons.X size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Título <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              value={formData.title}
                              onChange={(e) => setLibraryAreaTitle(e.target.value)}
                              className="w-full bg-white border-none rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-brand-primary outline-none shadow-sm"
                              placeholder={
                                initialLibraryArea === 'music' ? 'Título da música'
                                  : initialLibraryArea === 'videos' ? 'Nome do vídeo que os alunos verão'
                                    : initialLibraryArea === 'formations' ? 'Título da formação'
                                      : 'Título do material'
                              }
                            />
                          </div>

                          {/* Status de publicação */}
                          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                            <div>
                              <p className="text-sm font-medium text-gray-900">Status de publicação</p>
                              <p className="text-xs text-gray-500">
                                {formData.is_published ? 'Visível na vitrine pública' : 'Rascunho — apenas no admin'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setCollectionPublished(!formData.is_published)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.is_published ? 'bg-green-500' : 'bg-gray-300'}`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${formData.is_published ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                          </div>

                          {/* Disponível para download — só para materiais que NÃO são vídeo
                              (vídeo nunca pode ser baixado, então o toggle nem aparece). */}
                          {hasDownloadableMaterial && (
                            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                              <div>
                                <p className="text-sm font-medium text-gray-900">Disponível para download</p>
                                <p className="text-xs text-gray-500">
                                  {collectionDownloadAvailable
                                    ? 'O usuário pode baixar este material'
                                    : 'Somente visualização — sem botão de download'}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setCollectionDownloadAvailable(!collectionDownloadAvailable)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${collectionDownloadAvailable ? 'bg-green-500' : 'bg-gray-300'}`}
                              >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${collectionDownloadAvailable ? 'translate-x-6' : 'translate-x-1'}`} />
                              </button>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4 items-start">
                            <div>
                              {(() => {
                                // Na área de biblioteca, "Imagem de Capa" grava em
                                // collection.cover_image — ou seja, é a capa da coleção/kit DONO,
                                // não da mídia (capa de mídia e de coleção são o mesmo campo).
                                // Quando a mídia tem capa própria derivável, mostramos ela
                                // (display only) e escondemos o upload, para não exibir nem
                                // sobrescrever a capa da coleção. Fix estrutural (capa por-mídia)
                                // está no backlog "Capa por Mídia".
                                const area = initialLibraryArea;
                                const primarySlots = area ? LIBRARY_AREA_PRIMARY_SLOTS[area] : [];
                                const mediaAsset = area && area !== 'books'
                                  ? formData.collection_assets.find((a) => a.url && primarySlots.includes(a.category))
                                  : undefined;

                                // 1) Vídeo do YouTube → miniatura do próprio vídeo.
                                const youtubeThumb = mediaAsset && mediaAsset.media_type === 'video'
                                  ? getYoutubeThumbnail(mediaAsset.url)
                                  : '';
                                if (youtubeThumb) {
                                  return (
                                    <div>
                                      <label className="block text-sm font-bold text-gray-700 mb-2">Imagem de Capa</label>
                                      <img
                                        src={youtubeThumb}
                                        alt=""
                                        aria-hidden="true"
                                        className="w-full aspect-video rounded-xl border border-gray-200 bg-gray-100 object-cover"
                                      />
                                      <p className="text-xs text-gray-500 mt-1">
                                        Capa automática do YouTube — vídeos do YouTube sempre usam a miniatura do próprio vídeo.
                                      </p>
                                    </div>
                                  );
                                }

                                // 2) Mídia REUSADA (o arquivo pertence a outra coleção): mostra a
                                //    capa da coleção de origem e esconde o upload, para não
                                //    sobrescrever a capa da coleção/kit que está sendo editada.
                                const sourceId = mediaAsset ? extractSourceCollectionId(mediaAsset.url) : '';
                                if (sourceId && editingId && sourceId !== editingId) {
                                  const sourceCollection = collections.find((c) => c.id === sourceId);
                                  const sourceCover = sourceCollection
                                    ? (getCollectionDisplayCover(sourceCollection) || sourceCollection.cover_image || '')
                                    : '';
                                  if (sourceCover && !isPlaceholderImageUrl(sourceCover)) {
                                    return (
                                      <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Imagem de Capa</label>
                                        <img
                                          src={sourceCover}
                                          alt=""
                                          aria-hidden="true"
                                          className="w-full aspect-square rounded-xl border border-gray-200 bg-gray-100 object-cover"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                          Capa herdada da mídia de origem{sourceCollection?.title ? ` (“${sourceCollection.title}”)` : ''}. Para trocá-la, edite a capa na coleção de origem.
                                        </p>
                                      </div>
                                    );
                                  }
                                }

                                return (
                                  <>
                                    <FileUpload
                                      label="Imagem de Capa"
                                      value={formData.cover_image || placeholderImageUrl}
                                      onChange={(url) => setFormData({ ...formData, cover_image: url })}
                                      folder="covers"
                                      accept="image/*"
                                      collectionId={editingId || undefined}
                                      hideUrlInput={true}
                                      inputId={`library-cover-upload-${initialLibraryArea ?? 'default'}`}
                                    />
                                    {/* Aviso de imagem padrão para não-vídeos */}
                                    {initialLibraryArea !== 'videos' && isPlaceholderImageUrl(formData.cover_image || placeholderImageUrl) && (
                                      <p className="text-xs text-amber-600 mt-1">Usando imagem padrão. Recomendamos adicionar uma capa personalizada.</p>
                                    )}
                                    {/* Frame picker: only for videos when cover is still placeholder */}
                                    {initialLibraryArea === 'videos' &&
                                      isPlaceholderImageUrl(formData.cover_image || placeholderImageUrl) &&
                                      (() => {
                                        const videoAsset = formData.collection_assets.find(
                                          (a) => a.category === 'animation' && a.url
                                        );
                                        return videoAsset ? (
                                          <VideoFramePicker
                                            videoUrl={videoAsset.url}
                                            collectionId={editingId || undefined}
                                            onFrameSelected={(url) =>
                                              setFormData({ ...formData, cover_image: url })
                                            }
                                          />
                                        ) : null;
                                      })()
                                    }
                                  </>
                                );
                              })()}
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">Nível</label>
                              <div className="space-y-2">
                                {AVAILABLE_SEGMENTS.map((seg) => {
                                  const checked = formData.segments?.includes(seg) ?? false;
                                  const isPrimary = formData.primary_segment === seg;
                                  return (
                                    <div key={seg} className="flex items-center gap-3">
                                      <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => {
                                            const prev = formData.segments || [];
                                            let next: string[];
                                            if (checked) {
                                              next = prev.filter(s => s !== seg);
                                              if (isPrimary) {
                                                const newPrimary = next[0] || '';
                                                setFormData({
                                                  ...formData,
                                                  segments: next,
                                                  primary_segment: newPrimary,
                                                  level: newPrimary === 'Educação Infantil' ? 'Educação Infantil' : (newPrimary ? 'Fundamental I' : formData.level),
                                                });
                                                return;
                                              }
                                            } else {
                                              next = [...prev, seg];
                                              if (next.length === 1) {
                                                setFormData({
                                                  ...formData,
                                                  segments: next,
                                                  primary_segment: seg,
                                                  level: seg === 'Educação Infantil' ? 'Educação Infantil' : 'Fundamental I',
                                                });
                                                return;
                                              }
                                            }
                                            setFormData({ ...formData, segments: next });
                                          }}
                                          className="w-4 h-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                                        />
                                        <span className="text-sm text-gray-800">{seg}</span>
                                      </label>
                                      {checked && (
                                        <label className="flex items-center gap-1 cursor-pointer text-xs text-gray-500 shrink-0">
                                          <input
                                            type="radio"
                                            name="primary_segment_library"
                                            checked={isPrimary}
                                            onChange={() => setFormData({
                                              ...formData,
                                              primary_segment: seg,
                                              level: seg === 'Educação Infantil' ? 'Educação Infantil' : 'Fundamental I',
                                            })}
                                            className="w-3 h-3 text-brand-primary focus:ring-brand-primary"
                                          />
                                          <span className={isPrimary ? 'font-bold text-brand-primary' : ''}>Principal</span>
                                        </label>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Descrição</label>
                            <textarea
                              value={formData.description || ''}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value || null })}
                              rows={3}
                              className="w-full bg-white border-none rounded-2xl p-4 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-brand-primary outline-none shadow-sm resize-none"
                              placeholder={
                                initialLibraryArea === 'music' ? 'Descrição da música ou contação...'
                                  : initialLibraryArea === 'videos' ? 'Descrição do vídeo...'
                                    : initialLibraryArea === 'formations' ? 'Descrição da formação...'
                                      : 'Descrição do material...'
                              }
                            />
                          </div>
                        </div>
                      )}

                      {/* In library-area registration mode with multiple slot types: URL first, then type selector */}
                      {isLibraryAreaMode && (() => {
                        const librarySlots = FIXED_MEDIA_SLOTS.filter((s) => LIBRARY_AREA_PRIMARY_SLOTS[initialLibraryArea!].includes(s.category));
                        if (librarySlots.length <= 1) return null;
                        // When editing an existing item, detect the category from the existing asset;
                        // when creating new or after an explicit user choice, use selectedLibrarySlot.
                        const existingCategory = librarySlots.find((s) => !!getAssetByCategory(s.category)?.url)?.category;
                        const activeCategory: FixedMediaSlotCategory = selectedLibrarySlot ?? existingCategory ?? librarySlots[0].category;
                        const currentUrl = getAssetByCategory(activeCategory)?.url || '';
                        return (
                          <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-4">
                            {/* Tipo de mídia */}
                            <div className="relative" ref={mediaTypeDropdownRef}>
                              <label className="block text-sm font-bold text-gray-800 mb-2">
                                Tipo de mídia <span className="text-red-500">*</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => setShowMediaTypeDropdown((v) => !v)}
                                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 flex items-center justify-between gap-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-colors cursor-pointer"
                              >
                                <span>{librarySlots.find((s) => s.category === activeCategory)?.label ?? ''}</span>
                                <Icons.ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${showMediaTypeDropdown ? 'rotate-180' : ''}`} />
                              </button>
                              {showMediaTypeDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                                  {librarySlots.map((s, idx) => (
                                    <button
                                      key={s.category}
                                      type="button"
                                      onClick={() => {
                                        if (s.category !== activeCategory) {
                                          const urlToMove = getAssetByCategory(activeCategory)?.url || '';
                                          if (urlToMove) {
                                            setAssetDirectUrl(activeCategory, '');
                                            setAssetDirectUrl(s.category as FixedMediaSlotCategory, urlToMove);
                                          }
                                          setSelectedLibrarySlot(s.category as FixedMediaSlotCategory);
                                        }
                                        setShowMediaTypeDropdown(false);
                                      }}
                                      className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors
                                        ${idx === 0 ? 'rounded-t-2xl' : ''}
                                        ${idx === librarySlots.length - 1 ? 'rounded-b-2xl' : ''}
                                        ${s.category === activeCategory
                                          ? 'bg-brand-primary/10 text-brand-primary font-bold'
                                          : 'text-gray-700 hover:bg-gray-50 font-medium'
                                        }`}
                                    >
                                      <span>{s.label}</span>
                                      {s.category === activeCategory && <Icons.Check size={16} className="ml-auto" />}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                          </div>
                        );
                      })()}

                      {(isLibraryAreaMode
                        ? FIXED_MEDIA_SLOTS.filter((s) => {
                            const slots = LIBRARY_AREA_PRIMARY_SLOTS[initialLibraryArea!];
                            // Hide individual slots when a type-selector is shown (multiple slots in library area)
                            if (slots.length > 1) return false;
                            return slots.includes(s.category);
                          })
                        : isBooksCatalogMode
                          ? FIXED_MEDIA_SLOTS.filter((s) => s.category === 'reading')
                          : FIXED_MEDIA_SLOTS
                      ).map((slot) => {
                        const asset = getAssetByCategory(slot.category);
                        const libraryItems = mediaLibraryByCategory[slot.category] ?? [];
                        const selectedLibraryItem = asset?.url
                          ? libraryItems.find((item) => item.asset.url === asset.url) ?? null
                          : null;
                        const hasUnavailableSelection = Boolean(!isLibraryAreaMode && asset?.url && !selectedLibraryItem);
                        const slotHelperText = isCollectionsCatalogMode
                          ? slot.category === 'reading'
                            ? 'Escolha quantos livros quiser. O vínculo da coleção é sincronizado automaticamente.'
                            : 'Escolha quantas mídias quiser.'
                          : isLibraryAreaMode
                            ? 'Cole o link do YouTube ou do arquivo.'
                            : 'Escolha 1 opção já cadastrada.';
                        const isHighlightedSlot = highlightedAssetCategory === slot.category
                          || (highlightedAssetId ? asset?.id === highlightedAssetId : false);

                        return (
                          <div
                            key={slot.category}
                            ref={(element) => { mediaSectionRefs.current[slot.category] = element; }}
                            className={`rounded-2xl border p-4 space-y-3 bg-white transition-all border-gray-200 ${isHighlightedSlot ? 'ring-2 ring-brand-primary ring-offset-2 shadow-[0_0_0_6px_var(--color-brand-light)]' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              {!(isBooksCatalogMode && slot.category === 'reading') && (
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-gray-800">{slot.label}</p>
                                    {SLOT_MEDIA_TYPE[slot.category] && (
                                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${SLOT_MEDIA_TYPE[slot.category].color}`}>
                                        {SLOT_MEDIA_TYPE[slot.category].label}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">{slotHelperText}</p>
                                </div>
                              )}
                              {(isCollectionsCatalogMode
                                ? formData.collection_assets.some((a) => a.category === slot.category && a.url?.trim())
                                : asset?.url) && (
                                <button
                                  type="button"
                                  onClick={() => removeAsset(slot.category)}
                                  className="shrink-0 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-red-600 transition-colors hover:bg-red-100"
                                >
                                  Limpar
                                </button>
                              )}
                            </div>



                            {hasUnavailableSelection && asset && !(isBooksCatalogMode && slot.category === 'reading') && (
                              <div className="flex items-start gap-3 rounded-2xl border border-brand-primary/20 bg-brand-primary/5 px-4 py-3">
                                <img
                                  src={CATEGORY_COVER_URL[slot.category] || placeholderImageUrl}
                                  alt=""
                                  aria-hidden="true"
                                  className="h-16 w-12 shrink-0 rounded-xl border border-gray-200 bg-gray-100 object-cover"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-bold text-brand-primary truncate">{asset.title || slot.label}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Esta mídia foi despublicada ou removida. Selecione outra ou republique o original para restaurar a coleção.
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Library picker OR direct upload (books) */}
                            {isBooksCatalogMode && slot.category === 'reading' ? (
                              <FileUpload
                                label="Arquivo PDF do Livro"
                                value={asset?.url || ''}
                                onChange={(url) => {
                                  if (url) {
                                    setFormData((currentFormData) => {
                                      const currentAsset = currentFormData.collection_assets.find((a) => a.category === 'reading');
                                      const nextAssets = currentFormData.collection_assets.filter((a) => a.category !== 'reading');
                                      nextAssets.push({
                                        id: currentAsset?.id || createAssetId('reading'),
                                        category: 'reading',
                                        media_type: 'document',
                                        title: currentFormData.title || 'Leitura',
                                        url: url.trim(),
                                        description: null,
                                        scope: COLLECTION_ASSET_META.reading.scope,
                                        lyrics_url: null,
                                        offline_available: true,
                                      });
                                      return buildNextFormFromAssets(currentFormData, nextAssets);
                                    });
                                  } else {
                                    removeAsset('reading');
                                  }
                                }}
                                folder="pdfs"
                                accept="application/pdf"
                                collectionId={editingId || undefined}
                              />
                            ) : isLibraryAreaMode ? (
                              slot.category === 'storytelling' ? (
                                /* Áudio: FileUpload (suporta upload de arquivo + URL) */
                                <div className="space-y-2">
                                  <FileUpload
                                    label="Arquivo de Áudio ou Link"
                                    value={asset?.url || ''}
                                    onChange={(url) => setAssetDirectUrl(slot.category, url)}
                                    folder="audio"
                                    accept="audio/*"
                                    collectionId={editingId || undefined}
                                  />
                                </div>
                              ) : (
                                /* Registration mode: URL input field for non-audio slots */
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-brand-primary focus-within:border-transparent">
                                    <Icons.Link size={16} className="shrink-0 text-gray-400" />
                                    <input
                                      type="url"
                                      value={asset?.url || ''}
                                      onChange={(e) => setAssetDirectUrl(slot.category, e.target.value)}
                                      placeholder={
                                        slot.category === 'teacher_guide'
                                          ? 'Cole o link do guia do professor...'
                                          : slot.category === 'video_lesson'
                                            ? 'Cole o link da videoaula (YouTube)...'
                                            : 'Cole o link do vídeo (YouTube)...'
                                      }
                                      className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
                                    />
                                    {asset?.url && (
                                      <button
                                        type="button"
                                        onClick={() => setAssetDirectUrl(slot.category, '')}
                                        className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                                        aria-label="Limpar URL"
                                      >
                                        <Icons.X size={14} />
                                      </button>
                                    )}
                                  </div>
                                  {asset?.url && (
                                    <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                                      <Icons.Check size={12} />
                                      URL vinculada
                                    </p>
                                  )}
                                </div>
                              )
                            ) : libraryItems.length === 0 ? (
                              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-center space-y-1">
                                <p className="text-sm text-gray-400 font-medium">Nenhuma mídia publicada</p>
                                <p className="text-xs text-gray-400">
                                  {CATEGORY_REGISTER_HINT[slot.category]
                                    ? `Cadastre e publique mídias ${CATEGORY_REGISTER_HINT[slot.category]} para que apareçam aqui.`
                                    : 'Nenhuma mídia publicada disponível para vincular.'}
                                </p>
                              </div>
                            ) : (() => {
                              const isMultiSelect = isCollectionsCatalogMode;
                              const slotAssets = formData.collection_assets.filter((a) => a.category === slot.category);
                              const slotSearch = slotSearchTerms[slot.category] ?? '';
                              const filteredLibraryItems = slotSearch.trim()
                                ? (() => {
                                    const slotSearchNorm = normalizeSearchableText(slotSearch);
                                    return libraryItems.filter(item =>
                                      normalizeSearchableText(item.displayTitle).includes(slotSearchNorm) ||
                                      normalizeSearchableText(item.collection.title).includes(slotSearchNorm) ||
                                      item.searchText.includes(slotSearchNorm)
                                    );
                                  })()
                                : libraryItems;
                              return (
                                <div className="space-y-2">
                                  <div className="relative">
                                    <Icons.Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                      type="text"
                                      value={slotSearch}
                                      onChange={e => setSlotSearchTerms(prev => ({ ...prev, [slot.category]: e.target.value }))}
                                      placeholder={`Buscar ${slot.label.toLowerCase()}...`}
                                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-8 pr-8 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                                    />
                                    {slotSearch && (
                                      <button
                                        type="button"
                                        onClick={() => setSlotSearchTerms(prev => ({ ...prev, [slot.category]: '' }))}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:text-gray-600"
                                      >
                                        <Icons.X size={14} />
                                      </button>
                                    )}
                                  </div>
                                  <div role={isMultiSelect ? "group" : "radiogroup"} aria-label={slot.label} className="flex flex-col gap-2 max-h-[32rem] overflow-y-auto pr-1">
                                  {filteredLibraryItems.length === 0 && slotSearch.trim() ? (
                                    <p className="py-4 text-center text-sm text-gray-400">Nenhum resultado para "{slotSearch}"</p>
                                  ) : filteredLibraryItems.map((libraryItem) => {
                                    const isSelected = isMultiSelect
                                      ? slotAssets.some((a) => a.url === libraryItem.asset.url)
                                      : asset?.url === libraryItem.asset.url;
                                    return (
                                      <button
                                        key={libraryItem.key}
                                        type="button"
                                        role={isMultiSelect ? "checkbox" : "radio"}
                                        aria-checked={isSelected}
                                        onClick={() => isMultiSelect ? toggleCategoryAssetFromLibrary(slot.category, libraryItem) : linkAssetFromLibrary(slot.category, libraryItem)}
                                        className={`w-full rounded-lg border text-left transition-all active:scale-[0.98] ${
                                          isSelected
                                            ? 'border-brand-primary bg-brand-primary/5 shadow-sm'
                                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                                         }`}
                                       >
                                        <div className="flex items-stretch gap-3">
                                          <div className="w-12 shrink-0 overflow-hidden rounded-l-lg bg-gray-100">
                                            <img
                                              src={libraryItem.coverImage}
                                              alt=""
                                              aria-hidden="true"
                                              className="h-full w-full object-cover"
                                              style={{ minHeight: '64px' }}
                                            />
                                          </div>

                                          <div className="min-w-0 flex-1 flex items-center justify-between gap-2 py-3 pr-3">
                                            <div className="min-w-0">
                                              <p className={`text-sm font-semibold truncate ${isSelected ? 'text-brand-primary' : 'text-gray-800'}`}>
                                                {libraryItem.displayTitle}
                                              </p>
                                              <p className="text-xs text-gray-500 truncate">{libraryItem.collection.title}</p>
                                            </div>
                                            {isMultiSelect ? (
                                              <span className={`flex-none flex h-4 w-4 items-center justify-center rounded border ${isSelected ? 'border-brand-primary bg-brand-primary text-white' : 'border-gray-300 bg-white text-transparent'}`}>
                                                <Icons.Check size={10} />
                                              </span>
                                            ) : (
                                              <span className={`flex-none flex h-4 w-4 items-center justify-center rounded-full border ${isSelected ? 'border-brand-primary bg-brand-primary' : 'border-gray-300 bg-white'}`}>
                                                <span className={`h-2 w-2 rounded-full ${isSelected ? 'bg-white' : 'bg-transparent'}`} />
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })}
                                  </div>
                                </div>
                              );
                            })()}



                          </div>
                        );
                      })}

                      {/* Extra materials section */}
                      {!isBooksCatalogMode && (!isLibraryAreaMode || initialLibraryArea === 'materials') && (() => {
                        const extraLibItems = mediaLibraryByCategory['extra_material'] ?? [];
                        const linkedUrls = new Set(extraMaterialAssets.map((a) => a.url));
                        const unavailableExtraAssets = extraMaterialAssets.filter(
                          (asset) => !extraLibItems.some((item) => item.asset.url === asset.url)
                        );
                        return (
                          <div
                            ref={extraMaterialsSectionRef}
                            className={`rounded-2xl border p-4 bg-white space-y-3 transition-all ${isExtraMaterialsHighlighted ? 'border-brand-primary/35 ring-2 ring-brand-primary ring-offset-2 shadow-[0_0_0_6px_var(--color-brand-light)]' : 'border-gray-200'}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-gray-800">Materiais da Coleção</p>
                                <p className="text-xs text-gray-500 mt-1">Selecione quantos materiais quiser para compor a coleção.</p>
                              </div>
                              {linkedUrls.size > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setExtraMaterialUrls([])}
                                  className="shrink-0 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-red-600 transition-colors hover:bg-red-100"
                                >
                                  Limpar
                                </button>
                              )}
                            </div>

                            {unavailableExtraAssets.length > 0 && (
                              <div className="space-y-2">
                                {unavailableExtraAssets.map((asset) => (
                                  <div key={asset.id} className="flex items-start gap-3 rounded-2xl border border-brand-primary/20 bg-brand-primary/5 px-4 py-3">
                                    <img
                                      src={CATEGORY_COVER_URL.extra_material || placeholderImageUrl}
                                      alt=""
                                      aria-hidden="true"
                                      className="h-16 w-12 shrink-0 rounded-xl border border-gray-200 bg-gray-100 object-cover"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-bold text-brand-primary truncate">{asset.title || 'Material extra'}</p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        Este material já estava vinculado, mas não está disponível na biblioteca para nova seleção.
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Extra materials picker */}
                            {extraLibItems.length === 0 ? (
                              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-center space-y-1">
                                <p className="text-sm text-gray-400 font-medium">Nenhum material cadastrado</p>
                                <p className="text-xs text-gray-400">
                                  Registre materiais na área de Materiais antes de vincular.
                                </p>
                              </div>
                            ) : (() => {
                              const extraSearch = slotSearchTerms['extra_material'] ?? '';
                              const filteredExtraItems = extraSearch.trim()
                                ? (() => {
                                    const extraSearchNorm = normalizeSearchableText(extraSearch);
                                    return extraLibItems.filter(item =>
                                      normalizeSearchableText(item.displayTitle).includes(extraSearchNorm) ||
                                      normalizeSearchableText(item.collection.title).includes(extraSearchNorm) ||
                                      item.searchText.includes(extraSearchNorm)
                                    );
                                  })()
                                : extraLibItems;
                              return (
                              <div className="space-y-2">
                                <div className="relative">
                                  <Icons.Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                  <input
                                    type="text"
                                    value={extraSearch}
                                    onChange={e => setSlotSearchTerms(prev => ({ ...prev, 'extra_material': e.target.value }))}
                                    placeholder="Buscar materiais..."
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-8 pr-8 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                                  />
                                  {extraSearch && (
                                    <button
                                      type="button"
                                      onClick={() => setSlotSearchTerms(prev => ({ ...prev, 'extra_material': '' }))}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:text-gray-600"
                                    >
                                      <Icons.X size={14} />
                                    </button>
                                  )}
                                </div>
                              <div className="flex flex-col gap-2 max-h-[32rem] overflow-y-auto pr-1">
                                {filteredExtraItems.length === 0 && extraSearch.trim() ? (
                                  <p className="py-4 text-center text-sm text-gray-400">Nenhum resultado para "{extraSearch}"</p>
                                ) : filteredExtraItems.map((libraryItem) => {
                                  const isLinked = linkedUrls.has(libraryItem.asset.url);
                                  return (
                                    <button
                                      key={libraryItem.key}
                                      type="button"
                                      role="checkbox"
                                      aria-checked={isLinked}
                                      onClick={() => toggleExtraMaterialFromLibrary(libraryItem)}
                                      className={`w-full rounded-lg border text-left transition-all active:scale-[0.98] ${
                                        isLinked
                                          ? 'border-brand-primary bg-brand-primary/5 shadow-sm'
                                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                                       }`}
                                     >
                                      <div className="flex items-stretch gap-3">
                                        <div className="w-12 shrink-0 overflow-hidden rounded-l-lg bg-gray-100">
                                          <img
                                            src={libraryItem.coverImage}
                                            alt=""
                                            aria-hidden="true"
                                            className="h-full w-full object-cover"
                                            style={{ minHeight: '64px' }}
                                          />
                                        </div>

                                        <div className="min-w-0 flex-1 flex items-center justify-between gap-2 py-3 pr-3">
                                          <div className="min-w-0">
                                            <p className={`text-sm font-semibold truncate ${isLinked ? 'text-brand-primary' : 'text-gray-800'}`}>
                                              {libraryItem.displayTitle}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">{libraryItem.collection.title}</p>
                                          </div>
                                          <span className={`flex-none flex h-4 w-4 items-center justify-center rounded border ${isLinked ? 'border-brand-primary bg-brand-primary text-white' : 'border-gray-300 bg-white text-transparent'}`}>
                                            <Icons.Check size={10} />
                                          </span>
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                              </div>
                            );
                            })()}
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}

              </div>
            </div>

            {/* Drawer Footer */}
            <div className="flex gap-4 px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <Button variant="secondary" fullWidth onClick={handleCancel} disabled={isSaving}>
                Cancelar
              </Button>
              <Button variant="primary" fullWidth onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Salvando...
                  </span>
                ) : (editingId ? 'Salvar Alterações' : (isBooksCatalogMode ? 'Criar livro' : isLibraryAreaMode ? `Criar ${activeLibraryAreaLabel ? toSingular(activeLibraryAreaLabel).toLowerCase() : 'item'}` : 'Criar Coleção'))}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Users Tab Content */}
      {mainTab === 'users' && (
        <>
          {editingUserId ? (
            <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-6 pt-0">
              <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setEditingUserId(null)}
                    className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
                  >
                    <Icons.ChevronLeft size={20} />
                  </button>
                  <h2 className="text-xl font-black text-gray-800">Editar Usuário</h2>
                </div>

                <form onSubmit={handleEditUserSave} className="space-y-5">
                  {/* Nome */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600 ml-2">Nome completo</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editUserFormData.full_name}
                        onChange={(e) => { setEditUserFormData({ ...editUserFormData, full_name: e.target.value }); setEditUserErrorMsg(null); }}
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                        placeholder="Nome completo do usuário"
                        required
                      />
                      <Icons.User className="absolute left-4 top-4 text-gray-400" size={20} />
                    </div>
                  </div>

                  {/* Papel */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600 ml-2">Papel</label>
                    <div className="relative" ref={editUserRoleRef}>
                      <button
                        type="button"
                        onClick={() => setEditUserRoleDropdownOpen(!editUserRoleDropdownOpen)}
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 pr-4 flex items-center justify-between text-gray-800 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                      >
                        <span className="text-left">
                          {editUserFormData.role === 'admin' ? 'Administrador' : editUserFormData.role === 'editor' ? 'Editor' : 'Visualizador'}
                        </span>
                        <Icons.ChevronDown size={16} className={`transition-transform flex-shrink-0 ${editUserRoleDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <Icons.User className="absolute left-4 top-4 text-gray-400 pointer-events-none" size={20} />
                      {editUserRoleDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50">
                          {(['viewer', 'editor', 'admin'] as UserRole[]).map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => { setEditUserFormData({ ...editUserFormData, role: r }); setEditUserRoleDropdownOpen(false); }}
                              className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors first:rounded-t-2xl last:rounded-b-2xl ${editUserFormData.role === r ? 'bg-brand-primary/10 text-brand-primary font-bold' : 'text-gray-700 hover:bg-gray-50 font-medium'
                                }`}
                            >
                              <span>{r === 'admin' ? 'Administrador' : r === 'editor' ? 'Editor' : 'Visualizador'}</span>
                              {editUserFormData.role === r && <Icons.Check size={16} className="ml-auto" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {editUserErrorMsg && (
                    <div role="alert" className="bg-red-50 text-red-500 text-sm p-3 rounded-xl font-medium text-center">
                      {editUserErrorMsg}
                    </div>
                  )}

                  <div className="pt-2 flex gap-3">
                    {editingUser && (
                      <Button
                        type="button"
                        variant="danger"
                        fullWidth
                        onClick={() => handleDeleteUserClick(editingUser)}
                        disabled={loadingUserEdit || deletingUser}
                      >
                        {deletingUser && userToDelete?.id === editingUser.id ? 'Excluindo...' : 'Excluir usuário'}
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditingUserId(null)}
                      className="flex-1 h-12 rounded-2xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all"
                    >
                      Cancelar
                    </button>
                    <Button type="submit" fullWidth disabled={loadingUserEdit}>
                      {loadingUserEdit ? 'Salvando...' : 'Salvar alterações'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : showUserForm ? (
            <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-6 pt-0">
              <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserForm(false);
                      setUserFormData({
                        email: '',
                        full_name: '',
                        password: '',
                        role: 'viewer',
                      });
                      setAcceptedTerms(false);
                      setUserErrorMsg(null);
                      setUserSuccessMsg(null);
                    }}
                    className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-700"
                  >
                    <Icons.ChevronLeft size={24} />
                  </button>
                  <h1 className="text-xl font-bold text-gray-800 flex-1">Convidar colaborador</h1>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-4">
                  {/* Registration Fields */}
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Name */}
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-600 ml-2">Nome Completo</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={userFormData.full_name}
                          onChange={(e) => { setUserFormData({ ...userFormData, full_name: e.target.value }); clearUserError(); }}
                          className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                          placeholder="Seu nome"
                          required
                        />
                        <Icons.User className="absolute left-4 top-4 text-gray-400" size={20} />
                      </div>
                    </div>

                  </div>

                  {/* Email Field */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600 ml-2">E-mail</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={userFormData.email}
                        onChange={(e) => { setUserFormData({ ...userFormData, email: e.target.value }); clearUserError(); }}
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                        placeholder="email@exemplo.com.br"
                        required
                      />
                      <Icons.Mail className="absolute left-4 top-4 text-gray-400" size={20} />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600 ml-2">Senha inicial <span className="font-normal text-gray-400">(opcional)</span></label>
                    <div className="relative">
                      <input
                        type="password"
                        value={userFormData.password}
                        onChange={(e) => { setUserFormData({ ...userFormData, password: e.target.value }); clearUserError(); }}
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                        placeholder="Senha forte (mín. 8 caracteres)"
                        minLength={8}
                      />
                      <Icons.Lock className="absolute left-4 top-4 text-gray-400" size={20} />
                    </div>
                  </div>

                  {/* Role Field */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600 ml-2">Função</label>
                    <div className="relative" ref={roleDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 pr-4 flex items-center justify-between text-gray-800 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                      >
                        <span className="text-left">
                          {userFormData.role === 'admin' ? 'Administrador' :
                            userFormData.role === 'editor' ? 'Editor' : 'Visualizador'}
                        </span>
                        <Icons.ChevronDown size={16} className={`transition-transform flex-shrink-0 ${showRoleDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showRoleDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 animate-fade-in-up origin-top">
                          <button
                            type="button"
                            onClick={() => {
                              setUserFormData({ ...userFormData, role: 'viewer' });
                              setShowRoleDropdown(false);
                            }}
                            className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors first:rounded-t-2xl ${userFormData.role === 'viewer'
                              ? 'bg-brand-primary/10 text-brand-primary font-bold'
                              : 'text-gray-700 hover:bg-gray-50 font-medium'
                              }`}
                          >
                            <span>Visualizador</span>
                            {userFormData.role === 'viewer' && <Icons.Check size={18} className="ml-auto" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setUserFormData({ ...userFormData, role: 'editor' });
                              setShowRoleDropdown(false);
                            }}
                            className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${userFormData.role === 'editor'
                              ? 'bg-brand-primary/10 text-brand-primary font-bold'
                              : 'text-gray-700 hover:bg-gray-50 font-medium'
                              }`}
                          >
                            <span>Editor</span>
                            {userFormData.role === 'editor' && <Icons.Check size={18} className="ml-auto" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setUserFormData({ ...userFormData, role: 'admin' });
                              setShowRoleDropdown(false);
                            }}
                            className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors last:rounded-b-2xl ${userFormData.role === 'admin'
                              ? 'bg-brand-primary/10 text-brand-primary font-bold'
                              : 'text-gray-700 hover:bg-gray-50 font-medium'
                              }`}
                          >
                            <span>Administrador</span>
                            {userFormData.role === 'admin' && <Icons.Check size={18} className="ml-auto" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {isSupabaseConfigured ? (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 leading-relaxed flex items-start gap-2">
                      <Icons.Mail size={14} className="mt-0.5 shrink-0" />
                      <span>{userFormData.password ? 'O usuário já pode acessar com a senha definida. Ele pode trocá-la a qualquer momento nas configurações.' : 'Um e-mail de convite será enviado automaticamente para que o colaborador defina a própria senha no primeiro acesso.'}</span>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs text-sky-800 leading-relaxed">
                      {userFormData.role === 'viewer'
                        ? 'No modo demonstração, o e-mail de convite não é enviado. O colaborador pode usar "Esqueci minha senha" na tela de login para definir a senha.'
                        : 'No modo demonstração, editores e administradores criados por aqui entram com acesso ativo para fins operacionais.'}
                    </div>
                  )}

                  {/* Privacy Policy Checkbox */}
                  <div className="flex items-center gap-3 px-2 py-2 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="relative flex items-center justify-center shrink-0">
                      <input
                        type="checkbox"
                        id="terms"
                        checked={acceptedTerms}
                        onChange={(e) => {
                          setAcceptedTerms(e.target.checked);
                          clearUserError();
                        }}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-gray-300 transition-all checked:border-brand-primary checked:bg-brand-primary focus:ring-2 focus:ring-brand-primary/30 outline-none"
                      />
                      <Icons.Check
                        size={14}
                        strokeWidth={4}
                        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                      />
                    </div>
                    <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer select-none leading-tight">
                      Li e concordo com a <button type="button" className="text-brand-primary font-bold hover:underline">política de privacidade</button> do Mundo de Kaboo.
                    </label>
                  </div>

                  {/* Error Message */}
                  {userErrorMsg && (
                    <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl font-medium text-center animate-in fade-in" role="alert">
                      {userErrorMsg}
                    </div>
                  )}

                  <div className="pt-2">
                    <Button type="submit" fullWidth disabled={isCreatingUser}>
                      {isCreatingUser ? (userFormData.password ? 'Criando usuário...' : 'Enviando convite...') : (userFormData.password ? 'Criar usuário com senha' : 'Enviar convite por e-mail')}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-6 pt-0">
              {isAdminUser && users.length > 0 && (
                <div className="mb-6">
                  <button
                    onClick={handleOpenUserForm}
                    className="h-11 px-6 rounded-2xl bg-brand-primary text-white flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all active:scale-95 shadow-sm font-bold text-sm"
                  >
                    <Icons.Plus size={18} />
                    <span>Novo Usuário</span>
                  </button>
                </div>
              )}
              {loadingUsers ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12">
                  <Icons.User size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 font-bold">Nenhum usuário encontrado.</p>
                  {isAdminUser && (
                    <button
                      type="button"
                      onClick={handleOpenUserForm}
                      className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-brand-primary px-6 text-sm font-bold text-white shadow-sm transition-all hover:bg-opacity-90 active:scale-95"
                    >
                      <Icons.Plus size={18} />
                      <span>Novo Usuário</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                    {[
                      { label: 'Total', value: accessSummary.total, tone: 'bg-gray-100 text-gray-700' },
                      { label: 'Ativos', value: accessSummary.active, tone: 'bg-emerald-100 text-emerald-700' },
                      { label: 'Aguardando acesso', value: pendingInviteCount, tone: 'bg-amber-100 text-amber-700' },
                      { label: 'Aguardando voucher', value: accessSummary.pending_voucher, tone: 'bg-yellow-100 text-yellow-700' },
                      { label: 'Expirados', value: accessSummary.expired, tone: 'bg-orange-100 text-orange-700' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-500 mb-2">{item.label}</p>
                        <span className={`inline-flex rounded-full px-3 py-1 text-sm font-black ${item.tone}`}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {users.map((user) => (
                    (() => {
                      const authBadge = getAuthBadgeMeta(user);
                      const isWaitingFirstAccess = !user.last_sign_in_at && Boolean(user.invited_at);

                      return (
                        <div
                          key={user.id}
                          className={`rounded-2xl p-4 border transition-all ${isWaitingFirstAccess
                            ? 'bg-gray-50/80 border-gray-300 border-dashed opacity-80'
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-bold text-gray-800 text-base mb-1">
                                {user.full_name || 'Sem nome'}
                              </h3>
                              <p className="text-sm text-gray-600 mb-1">{user.email}</p>
                              <p className="text-xs text-gray-500">
                                Último acesso: {formatAdminDateTime(user.last_sign_in_at)}
                              </p>
                              {user.invited_at && !user.last_sign_in_at && (
                                <p className="text-xs text-gray-400 mt-1">
                                  Convite enviado em {formatAdminDateTime(user.invited_at)}
                                </p>
                              )}
                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${getAccessBadgeClasses(user)}`}>
                                  {getAccessStatusLabel(getProfileAccessStatus(user))}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${authBadge.classes}`}>
                                  {authBadge.label}
                                </span>
                                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                                  Vigencia: {formatAccessDate(user.access_expires_at)}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4 flex flex-col items-end gap-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.role === 'admin'
                                ? 'bg-purple-100 text-purple-700'
                                : user.role === 'editor'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                                }`}>
                                {user.role === 'admin' ? 'Admin' :
                                  user.role === 'editor' ? 'Editor' : 'Visualizador'}
                              </span>
                              {isAdminUser && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleEditUserOpen(user)}
                                    className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-brand-primary transition-colors"
                                    title="Editar usuário"
                                  >
                                    <Icons.Edit size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUserClick(user)}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                                    title="Excluir usuário"
                                  >
                                    <Icons.Trash2 size={16} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Excluir Coleção"
        message="Tem certeza que deseja excluir esta coleção? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          if (isDeleting) return;
          setShowDeleteModal(false);
          setCollectionToDelete(null);
        }}
        danger={true}
        loading={isDeleting}
      />

      <ConfirmationModal
        isOpen={showDeleteUserModal}
        title="Excluir Usuário"
        message={`Tem certeza que deseja excluir ${userToDelete?.email ?? userToDelete?.full_name ?? 'este usuário'}? Esta ação remove o acesso e apaga o usuário do banco.`}
        confirmText="Excluir usuário"
        cancelText="Cancelar"
        onConfirm={handleDeleteUserConfirm}
        onCancel={() => {
          if (deletingUser) return;
          setShowDeleteUserModal(false);
          setUserToDelete(null);
        }}
        danger={true}
        loading={deletingUser}
      />

      {/* Unsaved Changes Modal */}
      <ConfirmationModal
        isOpen={showUnsavedChangesModal}
        title="Alterações não salvas"
        message="Deseja salvar suas alterações antes de sair?"
        confirmText="Salvar e Sair"
        cancelText="Descartar Alterações"
        onConfirm={async () => {
          // Save first, then execute pending action
          if (!formData.title) {
            showToast('Título é obrigatório para salvar.', 'error');
            setShowUnsavedChangesModal(false);
            setPendingAction(null);
            return;
          }

          let success = false;
          const payload = buildCollectionPayload(formData);

          if (editingId) {
            const updated = await api.updateCollection(editingId, payload);
            success = !!updated;
          } else {
            const created = await api.createCollection(payload);
            success = !!created;
          }

          if (success) {
            setShowUnsavedChangesModal(false);
            showToast(editingId ? 'Coleção atualizada com sucesso!' : 'Coleção criada com sucesso!', 'success');
            // Update original to reflect saved state
            setOriginalFormData(buildCollectionFormData(payload));
            // Execute pending action (navigate away, etc.)
            if (pendingAction) {
              pendingAction();
              setPendingAction(null);
            }
            // Reset form and reload
            resetForm();
            loadCollections();
          } else {
            showToast('Erro ao salvar. As alterações não foram salvas.', 'error');
            setShowUnsavedChangesModal(false);
            setPendingAction(null);
          }
        }}
        onCancel={() => {
          setShowUnsavedChangesModal(false);
          // Execute pending action without saving
          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
          }
        }}
      />

      {/* Cascade unpublish confirmation */}
      {cascadeUnpublishConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCascadeUnpublishConfirm(null)} />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <Icons.AlertTriangle size={20} className="text-amber-600" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900">Despublicar livro</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Este livro está vinculado a {cascadeUnpublishConfirm.affectedCollections.length === 1 ? '1 coleção publicada' : `${cascadeUnpublishConfirm.affectedCollections.length} coleções publicadas`}. Ao despublicá-lo, as coleções abaixo serão despublicadas automaticamente:
                </p>
              </div>
            </div>
            <ul className="max-h-40 overflow-y-auto rounded-2xl bg-gray-50 px-4 py-3 space-y-1">
              {cascadeUnpublishConfirm.affectedCollections.map(c => (
                <li key={c.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  {c.title}
                </li>
              ))}
            </ul>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setCascadeUnpublishConfirm(null)}
                className="flex-1 rounded-2xl border border-gray-200 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={cascadeUnpublishConfirm.onConfirm}
                className="flex-1 rounded-2xl bg-amber-500 py-2.5 text-sm font-bold text-white hover:bg-amber-600 transition-colors"
              >
                Confirmar e despublicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content preview modal — PDF, Áudio, Documento */}
      {previewLibraryItem && (() => {
        const { asset, collection, displayTitle } = previewLibraryItem;
        const isAudio = asset.media_type === 'audio';
        const assetIsPublished = asset.is_published !== false;

        const handlePublishToggle = async () => {
          try {
            // @ts-ignore
            const ok = assetIsPublished
              ? await api.unpublishAsset(collection.id, asset.id)
              : await api.publishAsset(collection.id, asset.id);
            if (ok) {
              showToast(assetIsPublished ? 'Conteúdo despublicado.' : 'Conteúdo publicado!', 'success');
              setPreviewLibraryItem((prev) =>
                prev ? { ...prev, asset: { ...prev.asset, is_published: !assetIsPublished } } : null
              );
              loadCollections(true);
            } else {
              showToast('Erro ao alterar status de publicação.', 'error');
            }
          } catch {
            showToast('Erro ao alterar status de publicação.', 'error');
          }
        };

        return (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setPreviewLibraryItem(null)}
          >
            <div
              className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-brand-primary">
                    {COLLECTION_ASSET_META[asset.category].label}
                  </span>
                  <h2 className="text-base font-bold text-gray-900 line-clamp-1">{displayTitle}</h2>
                  {displayTitle !== collection.title && (
                    <p className="text-xs text-gray-500 line-clamp-1">{collection.title}</p>
                  )}
                </div>
                <div className="ml-4 shrink-0 flex items-center gap-2">
                  {!isAudio && asset.url && (
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 items-center gap-1.5 rounded-full bg-gray-100 px-3 text-xs font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                      title="Abrir em nova aba"
                    >
                      <Icons.ExternalLink size={13} />
                      <span className="hidden sm:inline">Abrir</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setPreviewLibraryItem(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                    aria-label="Fechar"
                  >
                    <Icons.X size={16} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                {isAudio && asset.url ? (
                  <div className="flex items-center justify-center py-10 bg-[radial-gradient(circle_at_top_left,rgba(93,31,88,0.1),transparent_50%),linear-gradient(180deg,#fdf9fe,#f2ebf6)] rounded-2xl">
                    <audio controls className="w-full max-w-lg" src={asset.url} />
                  </div>
                ) : asset.url ? (
                  (() => {
                    // Normaliza URLs do Google Drive: /view → /preview (embeddable)
                    const embedUrl = asset.url
                      .replace(/drive\.google\.com\/file\/d\/([^/?#]+)\/view(\?[^#]*)?/,
                        'drive.google.com/file/d/$1/preview')
                      .replace(/drive\.google\.com\/open\?id=([^&]+)/,
                        'drive.google.com/file/d/$1/preview');
                    return (
                      <iframe
                        src={embedUrl}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50"
                        style={{ height: '62vh' }}
                        title={displayTitle}
                        allow="fullscreen"
                      />
                    );
                  })()
                ) : (
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <Icons.FileText size={40} className="text-gray-300 mb-3" />
                    <p className="text-sm text-gray-400">Nenhum arquivo vinculado.</p>
                  </div>
                )}
              </div>

              {/* Sem footer de ações — modal é somente visualização */}
            </div>
          </div>
        );
      })()}

      {/* Video preview modal */}
      {previewVideoItem && (() => {
        const previewUrl = previewVideoItem.asset.url;
        const ytMatch = previewUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?/\s]+)/);
        const ytId = ytMatch ? ytMatch[1] : null;
        return (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewVideoItem(null)}
          >
            <div
              className="relative w-full max-w-3xl mx-4 rounded-2xl overflow-hidden bg-black shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setPreviewVideoItem(null)}
                className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                aria-label="Fechar"
              >
                <Icons.X size={18} />
              </button>

              <div className="aspect-video w-full bg-black">
                {ytId ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${ytId}?autoplay=1&playsinline=1&rel=0`}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                    title={previewVideoItem.displayTitle}
                  />
                ) : (
                  <video
                    src={previewUrl}
                    controls
                    autoPlay
                    className="h-full w-full"
                  />
                )}
              </div>

              <div className="flex items-center justify-between gap-4 bg-gray-900 px-4 py-3">
                <div className="min-w-0">
                  <div className="mb-1">
                    <span className="inline-flex items-center rounded-full bg-brand-primary/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-brand-primary/90">
                      {COLLECTION_ASSET_META[previewVideoItem.asset.category].label}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white line-clamp-1">{previewVideoItem.displayTitle}</p>
                  {previewVideoItem.displayTitle !== previewVideoItem.collection.title && (
                    <p className="text-xs text-gray-400 line-clamp-1">{previewVideoItem.collection.title}</p>
                  )}
                </div>
                {/* Sem botões de ação — modal é somente visualização */}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
});
