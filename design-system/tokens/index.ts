// Design tokens — fonte única de verdade para o projeto Mundo de Kaboo

export const colors = {
  // Brand
  primary:  '#5D1F58',
  light:    '#883E82',
  bg:       '#F9F5F9',
  accent:   '#4EA8DE',
  green:    '#70E000',

  // Semânticas
  success:  '#10B981',
  error:    '#EF4444',
  warning:  '#F59E0B',
} as const

export const radius = {
  xl:  '1rem',
  '2xl': '1.5rem',
  '3xl': '2rem',
} as const

export const font = {
  sans: ['Nunito', 'ui-rounded', 'system-ui', 'sans-serif'],
} as const

export { spacing } from './spacing'
export type { SpacingSemanticToken } from './spacing'

// Paleta de personagens (para uso em avatares e cards)
export const characterColors = [
  { bg: 'bg-orange-100', text: 'text-orange-700', name: 'Baratão'    },
  { bg: 'bg-pink-100',   text: 'text-pink-700',   name: 'Baratinha'  },
  { bg: 'bg-yellow-100', text: 'text-yellow-700',  name: 'Batatinha'  },
  { bg: 'bg-blue-100',   text: 'text-blue-600',    name: 'Blado'      },
  { bg: 'bg-indigo-100', text: 'text-indigo-600',  name: 'Dr. Ratazana'},
  { bg: 'bg-green-100',  text: 'text-green-600',   name: 'Gaio'       },
  { bg: 'bg-purple-100', text: 'text-purple-600',  name: 'Kaboo'      },
  { bg: 'bg-red-100',    text: 'text-red-600',     name: 'Papa'       },
] as const
