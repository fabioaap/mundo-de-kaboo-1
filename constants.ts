import { Collection } from './types';
import { CHARACTERS } from './data/characters';
import logoImage from './assets/images/logo-kaboo.png';
import { getCharacterByAnyName, normalizeCharacterLookupKey } from './lib/characters';

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

export const COLLECTIONS: Collection[] = [];

export const TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'fund1', label: 'Ed. Infantil' },
  { id: 'fund2', label: 'Fund I' },
];