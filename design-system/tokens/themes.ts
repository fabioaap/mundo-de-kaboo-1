// Temas white-label — cada tema sobrescreve as variáveis CSS brand-*
// Para aplicar um tema, chame applyTheme(theme) ou use o atributo data-brand="id" no HTML

export interface BrandTheme {
  id: string
  name: string
  colors: {
    primary: string  // cor principal (botões, links, destaque)
    light: string    // variante clara da primária (hovers, fundos)
    bg: string       // fundo suave da aplicação
    accent: string   // cor de acento / destaque secundário
    green: string    // cor de sucesso / progresso
  }
  font?: string      // família tipográfica (opcional, padrão: Nunito)
}

// ─── Temas de exemplo ──────────────────────────────────────
export const themes: Record<string, BrandTheme> = {
  kaboo: {
    id: 'kaboo',
    name: 'Mundo de Kaboo',
    colors: {
      primary: '#5D1F58',
      light: '#883E82',
      bg: '#F9F5F9',
      accent: '#4EA8DE',
      green: '#70E000',
    },
  },

  oceano: {
    id: 'oceano',
    name: 'Oceano Educação',
    colors: {
      primary: '#0C4A6E',
      light: '#0369A1',
      bg: '#F0F9FF',
      accent: '#06B6D4',
      green: '#10B981',
    },
  },

  floresta: {
    id: 'floresta',
    name: 'Floresta Kids',
    colors: {
      primary: '#14532D',
      light: '#16A34A',
      bg: '#F0FDF4',
      accent: '#84CC16',
      green: '#22C55E',
    },
  },

  sol: {
    id: 'sol',
    name: 'Sol Educação',
    colors: {
      primary: '#92400E',
      light: '#D97706',
      bg: '#FFFBEB',
      accent: '#F59E0B',
      green: '#65A30D',
    },
  },
}

// ─── Aplicador de tema ─────────────────────────────────────
export function applyTheme(theme: BrandTheme, root: HTMLElement = document.documentElement): void {
  const { colors, font } = theme
  root.style.setProperty('--color-kaboo-primary', colors.primary)
  root.style.setProperty('--color-kaboo-light', colors.light)
  root.style.setProperty('--color-kaboo-bg', colors.bg)
  root.style.setProperty('--color-kaboo-accent', colors.accent)
  root.style.setProperty('--color-kaboo-green', colors.green)
  root.style.setProperty('--color-brand-primary', colors.primary)
  root.style.setProperty('--color-brand-light', colors.light)
  root.style.setProperty('--color-brand-bg', colors.bg)
  root.style.setProperty('--color-brand-accent', colors.accent)
  root.style.setProperty('--color-brand-green', colors.green)
  if (font) root.style.setProperty('--font-family-sans', font)
  root.setAttribute('data-brand', theme.id)
}
