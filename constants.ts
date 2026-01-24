import { Collection } from './types';
import logoImage from './assets/images/logo-kaboo.png';

// Import character images
import barataoImage from './assets/images/characters/baratao.png';
import baratinhaImage from './assets/images/characters/baratinha.png';
import batatinhaImage from './assets/images/characters/batatinha.png';
import bladoImage from './assets/images/characters/blado.png';
import drRatazanaImage from './assets/images/characters/dr-ratazana.png';
import gaioImage from './assets/images/characters/gaio.png';
import kabooImage from './assets/images/characters/kaboo.png';
import mensageiroImage from './assets/images/characters/mensageiro.png';
import papaImage from './assets/images/characters/papa.png';

// ---------------------------------------------------------------------------
// CONFIGURAÇÃO DE IMAGENS E STORAGE
// ---------------------------------------------------------------------------
export const LOGO_URL = logoImage; 

// Mapping of character names to their image imports
const CHARACTER_IMAGE_MAP: Record<string, string> = {
  'Baratão': barataoImage,
  'Baratinha': baratinhaImage,
  'Batatinha': batatinhaImage,
  'Blado': bladoImage,
  'Dr. Ratazana': drRatazanaImage,
  'Dr Ratazana': drRatazanaImage, // Alternative without period
  'Gaio': gaioImage,
  'Kaboo': kabooImage,
  'Mensageiro': mensageiroImage,
  'Papa': papaImage,
};

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

// Helper Function: Gera a URL da imagem baseada no nome
export const getCharacterImageUrl = (name: string) => {
  if (!name) return '';
  
  // First, try exact match
  if (CHARACTER_IMAGE_MAP[name]) {
    return CHARACTER_IMAGE_MAP[name];
  }
  
  // Try alternative format (without period for Dr.)
  const altName = name.replace(/\./g, '');
  if (CHARACTER_IMAGE_MAP[altName]) {
    return CHARACTER_IMAGE_MAP[altName];
  }
  
  // Fallback: try normalized name matching
  const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const normalizedName = normalize(name).replace(/[^\w\s]/g, '').trim();
  
  // Try to find a match by comparing normalized names
  for (const [charName, imageUrl] of Object.entries(CHARACTER_IMAGE_MAP)) {
    const normalizedCharName = normalize(charName).replace(/[^\w\s]/g, '').trim();
    if (normalizedCharName === normalizedName) {
      return imageUrl;
    }
  }
  
  // If no match found, return empty string (fallback will show initials)
  return '';
};

export const COLLECTIONS: Collection[] = []; 

export const TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'fund1', label: 'Ed. Infantil' },
  { id: 'fund2', label: 'Fund I' },
];