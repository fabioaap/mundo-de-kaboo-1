import { Collection } from './types';
import logoImage from './assets/images/logo-kaboo.png';

// ---------------------------------------------------------------------------
// CONFIGURAÇÃO DE IMAGENS E STORAGE
// ---------------------------------------------------------------------------
export const LOGO_URL = logoImage;

// URL para captura de leads (usuários sem voucher)
export const LEAD_CAPTURE_URL = 'https://mundodekaboo.com.br/conhecer';

// URL da política de privacidade
export const PRIVACY_POLICY_URL = 'https://mundodekaboo.com.br/privacidade';

// Base URL for character images from Supabase storage
export const CHAR_IMG_BASE_URL = 'https://yevysgqlnhonhkczkyhu.supabase.co/storage/v1/object/public/collections/characters/';

// Lista oficial de personagens atualizada
export const AVATAR_CHARACTERS = [
  'Baratão',
  'Baratinha',
  'Batatinha',
  'Blado',
  'Dr. Ratazana',
  'Gaio',
  'Kaboo',
  'Papa'
];

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
  const index = AVATAR_CHARACTERS.indexOf(name);
  if (index === -1) return 'bg-gray-100 text-gray-600';
  return CHARACTER_COLORS[index % CHARACTER_COLORS.length];
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

// Helper Function: Gera a URL da imagem baseada no nome
export const getCharacterImageUrl = (name: string) => {
  if (!name) return '';

  // Normalize the character name to match the file naming pattern
  // Remove accents, convert to lowercase, remove punctuation, replace spaces with hyphens
  const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const filename = normalize(name)
    .replace(/[^\w\s]/g, '') // Remove punctuation (ex: the period in Dr.)
    .trim()
    .replace(/\s+/g, '-');   // Replace spaces with hyphens

  return `${CHAR_IMG_BASE_URL}${filename}.png`;
};

export const COLLECTIONS: Collection[] = [];

export const TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'fund1', label: 'Ed. Infantil' },
  { id: 'fund2', label: 'Fund I' },
];