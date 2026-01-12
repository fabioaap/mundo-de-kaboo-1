import { Collection } from './types';
import logoImage from './assets/images/logo-kaboo.png';

// ---------------------------------------------------------------------------
// CONFIGURAÇÃO DE IMAGENS E STORAGE
// ---------------------------------------------------------------------------
export const LOGO_URL = logoImage; 
export const CHAR_IMG_BASE_URL = 'https://hgigdiuwxjzdtqodpycn.supabase.co/storage/v1/object/public/kaboo-files/characters/';

// Lista oficial de personagens atualizada
export const AVATAR_CHARACTERS = [
  'Batatinha',
  'Blado',
  'Dr. Ratazana',
  'Gaio',
  'Kaboo',
  'Papa'
];

// Paleta de cores compartilhada
export const CHARACTER_COLORS = [
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

// Helper Function: Gera a URL da imagem baseada no nome
export const getCharacterImageUrl = (name: string) => {
  if (!name) return '';
  const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  
  const filename = normalize(name)
    .replace(/[^\w\s]/g, '') // Remove pontuação (ex: o ponto de Dr.)
    .trim()
    .replace(/\s+/g, '-');   // Substitui espaços por hifens

  return `${CHAR_IMG_BASE_URL}${filename}.png`;
};

export const COLLECTIONS: Collection[] = []; 

export const TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'fund1', label: 'Ens. Infantil' },
  { id: 'fund2', label: 'Fund I' },
];