import { Collection } from './types';
import { CHARACTERS } from './data/characters';
import logoImage from './assets/images/logo-kaboo.png';
import { getCharacterByAnyName, normalizeCharacterLookupKey } from './lib/characters';
import { getBnccOptions } from './lib/bnccLookup';

// ---------------------------------------------------------------------------
// HELPERS DE LABEL — renomeia valores internos para exibição ao usuário
// ---------------------------------------------------------------------------
export const formatSegmentLabel = (level: string): string => {
  if (level === 'Fundamental I') return 'E.F. Anos Iniciais';
  if (level === 'Educação Infantil') return 'Ed. Infantil';
  return level;
};

// ---------------------------------------------------------------------------
// CONFIGURAÇÃO DE IMAGENS E STORAGE
// ---------------------------------------------------------------------------
export const LOGO_URL = logoImage;

// CTA para usuários sem voucher.
// Enquanto a rota dedicada com explicação e compra não existe, o link aponta para a loja externa.
export const LEAD_CAPTURE_URL = 'https://loja.empatiaeditora.com.br/';

// CTA de suporte para usuários que já receberam um código e precisam de ajuda.
export const SUPPORT_CONTACT_URL = 'mailto:suporte@mundodekaboo.com';

// Chave compartilhada para persistir o voucher pendente entre cadastro, login e renovação.
export const PENDING_SIGNUP_VOUCHER_STORAGE_KEY = 'kaboo_pending_signup_voucher';

// Loja para upsell quando o usuário tenta acessar um material fora do voucher (degustação).
// PLACEHOLDER — confirmar a URL definitiva da loja Educacross.
export const VOUCHER_UPSELL_STORE_URL = 'https://loja.educacross.com.br';

// URL da política de privacidade
export const PRIVACY_POLICY_URL = 'https://mundodekaboo.com.br/privacidade';

// Base URL for character images from Supabase storage
// Uses VITE_SUPABASE_URL env var to avoid hardcoded project ID in source
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
export const CHAR_IMG_BASE_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/storage/v1/object/public/collections/characters/`
  : '';

const LOCAL_CHARACTER_IMAGES = import.meta.glob('./assets/images/characters/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

// Lista oficial de personagens atualizada
export const AVATAR_CHARACTERS = CHARACTERS.map((character) => character.name);

// Paleta de cores compartilhada
export const CHARACTER_COLORS = [
  'bg-orange-100 text-orange-700', // Baratão
  'bg-pink-100 text-pink-700',     // Baratinha
  'bg-yellow-100 text-yellow-700', // Batatinha
  'bg-blue-100 text-blue-600',     // Blado
  'bg-indigo-100 text-indigo-600', // Dr. Ratazana
  'bg-green-100 text-green-600',   // Gaio
  'bg-purple-100 text-purple-600', // Kaboo
  'bg-red-100 text-red-600',       // Papa
];

// Helper Function: Retorna a cor consistente para um personagem
export const getCharacterColor = (name: string | null) => {
  if (!name) return 'bg-gray-100 text-gray-600';

  const registryCharacter = getCharacterByAnyName(name);
  const resolvedName = registryCharacter?.name ?? name;
  const seedIndex = AVATAR_CHARACTERS.indexOf(resolvedName);

  if (seedIndex !== -1) {
    return CHARACTER_COLORS[seedIndex % CHARACTER_COLORS.length];
  }

  const normalizedName = normalizeCharacterLookupKey(resolvedName);
  if (!normalizedName) return 'bg-gray-100 text-gray-600';

  let hash = 0;
  for (let index = 0; index < normalizedName.length; index += 1) {
    hash = (hash << 5) - hash + normalizedName.charCodeAt(index);
    hash |= 0;
  }

  return CHARACTER_COLORS[Math.abs(hash) % CHARACTER_COLORS.length];
};

// Helper Function: Retorna apenas a classe de background (sem text color)
// Usado para overlays que não devem herdar o background do parent
export const getCharacterBgColor = (name: string | null) => {
  if (!name) return 'bg-gray-100';
  const index = AVATAR_CHARACTERS.indexOf(name);
  if (index === -1) return 'bg-gray-100';
  const fullColor = CHARACTER_COLORS[index % CHARACTER_COLORS.length];
  // Extract just the bg-* class, removing text-* class
  return fullColor.split(' ').find(cls => cls.startsWith('bg-')) || 'bg-gray-100';
};

const normalizeCharacterAssetName = (name: string) => {
  const registryCharacter = getCharacterByAnyName(name);
  const baseName = registryCharacter?.name ?? name;

  return baseName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
};

// Helper Function: Gera a URL da imagem baseada no nome
export const getCharacterImageUrl = (name: string) => {
  if (!name) return '';

  const registryCharacter = getCharacterByAnyName(name);
  const customImageUrl = registryCharacter?.image_url?.trim();

  if (customImageUrl) {
    return customImageUrl;
  }

  const filename = normalizeCharacterAssetName(registryCharacter?.name ?? name);
  const localImage = LOCAL_CHARACTER_IMAGES[`./assets/images/characters/${filename}.png`];

  if (localImage) {
    return localImage;
  }

  return '';
};

export const AVAILABLE_SEGMENTS = [
  'Educação Infantil',
  'E.F. Anos Iniciais',
  'E.F. Anos Finais',
  'Ensino Médio',
] as const;

// ---------------------------------------------------------------------------
// OPÇÕES DE IDADE ADEQUADA
// ---------------------------------------------------------------------------
export const SUITABLE_AGES_OPTIONS = [
  { value: '0 anos',  label: '0 anos',  group: 'Bebês' },
  { value: '1 ano',   label: '1 ano',   group: 'Bebês' },
  { value: '2 anos',  label: '2 anos',  group: 'Bebês' },
  { value: '3 anos',  label: '3 anos',  group: 'Primeira Infância' },
  { value: '4 anos',  label: '4 anos',  group: 'Primeira Infância' },
  { value: '5 anos',  label: '5 anos',  group: 'Primeira Infância' },
  { value: '6 anos',  label: '6 anos',  group: 'Infância' },
  { value: '7 anos',  label: '7 anos',  group: 'Infância' },
  { value: '8 anos',  label: '8 anos',  group: 'Infância' },
  { value: '9 anos',  label: '9 anos',  group: 'Infância' },
  { value: '10 anos', label: '10 anos', group: 'Infância' },
  { value: '11 anos', label: '11 anos', group: 'Pré-adolescência' },
  { value: '12 anos', label: '12 anos', group: 'Pré-adolescência' },
];

// ---------------------------------------------------------------------------
// OPÇÕES DE ANO ESCOLAR
// ---------------------------------------------------------------------------
export const AGE_GRADE_OPTIONS = [
  // Educação Infantil (G3 = 3 anos, G4 = 4 anos, G5 = 5 anos)
  { value: 'G3', label: 'G3', group: 'Educação Infantil' },
  { value: 'G4', label: 'G4', group: 'Educação Infantil' },
  { value: 'G5', label: 'G5', group: 'Educação Infantil' },
  // Ensino Fundamental – Anos Iniciais
  { value: '1º ano', label: '1º ano', group: 'Ensino Fundamental' },
  { value: '2º ano', label: '2º ano', group: 'Ensino Fundamental' },
  { value: '3º ano', label: '3º ano', group: 'Ensino Fundamental' },
  { value: '4º ano', label: '4º ano', group: 'Ensino Fundamental' },
  { value: '5º ano', label: '5º ano', group: 'Ensino Fundamental' },
];

// ---------------------------------------------------------------------------
// OPÇÕES DE HABILIDADES BNCC
// Derivadas de data/bncc-lookup.json (fonte única), filtradas pela FAIXA ETÁRIA
// do cadastro (G3-G5 + EF Anos Iniciais 1º-5º), em todas as áreas de
// conhecimento / campos de experiência. Agrupadas por componente.
// ---------------------------------------------------------------------------
export const BNCC_OPTIONS = getBnccOptions();

// ---------------------------------------------------------------------------
// OPÇÕES DE COMPETÊNCIAS CASEL
// ---------------------------------------------------------------------------
export const CASEL_OPTIONS = [
  {
    value: 'Autoconsciência',
    label: 'Autoconsciência',
    description: 'Identificar emoções, valores, pontos fortes e limitações pessoais.',
    group: 'Competências Centrais',
  },
  {
    value: 'Autorregulação',
    label: 'Autorregulação',
    description: 'Gerenciar emoções, pensamentos e comportamentos em diferentes situações.',
    group: 'Competências Centrais',
  },
  {
    value: 'Consciência Social',
    label: 'Consciência Social',
    description: 'Ter empatia e compreender perspectivas diversas.',
    group: 'Competências Centrais',
  },
  {
    value: 'Habilidades de Relacionamento',
    label: 'Habilidades de Relacionamento',
    description: 'Estabelecer e manter relacionamentos saudáveis e cooperativos.',
    group: 'Competências Centrais',
  },
  {
    value: 'Tomada de Decisão Responsável',
    label: 'Tomada de Decisão Responsável',
    description: 'Fazer escolhas construtivas sobre comportamento pessoal e interações sociais.',
    group: 'Competências Centrais',
  },
  // Sub-competências
  { value: 'Identificação de emoções',     label: 'Identificação de emoções',     description: 'Nomear e compreender as próprias emoções.',         group: 'Sub-competências' },
  { value: 'Empatia',                      label: 'Empatia',                      description: 'Reconhecer e compreender sentimentos alheios.',      group: 'Sub-competências' },
  { value: 'Resolução de conflitos',       label: 'Resolução de conflitos',       description: 'Lidar com desacordos de forma respeitosa.',          group: 'Sub-competências' },
  { value: 'Persistência e resiliência',   label: 'Persistência e resiliência',   description: 'Superar dificuldades com equilíbrio emocional.',     group: 'Sub-competências' },
  { value: 'Comunicação efetiva',          label: 'Comunicação efetiva',          description: 'Expressar ideias com clareza e ouvir ativamente.',   group: 'Sub-competências' },
  { value: 'Autoconfiança',               label: 'Autoconfiança',               description: 'Acreditar nas próprias capacidades e habilidades.',  group: 'Sub-competências' },
  { value: 'Responsabilidade social',     label: 'Responsabilidade social',     description: 'Contribuir com o bem-estar da comunidade.',          group: 'Sub-competências' },
  { value: 'Cooperação',                  label: 'Cooperação',                  description: 'Trabalhar em grupo para atingir objetivos comuns.', group: 'Sub-competências' },
];

export const COLLECTIONS: Collection[] = [];

export const TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'fund1', label: 'Ed. Infantil' },
  { id: 'fund2', label: 'Fund I' },
];