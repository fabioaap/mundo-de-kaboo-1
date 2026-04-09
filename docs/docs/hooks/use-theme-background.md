---
id: use-theme-background
title: useThemeBackground
sidebar_position: 8
---

# useThemeBackground

**Arquivo:** `hooks/useThemeBackground.ts`

## Descrição

Aplica a cor de tema de uma coleção ao fundo do `document.body` e ao meta tag `theme-color` (cor da barra do navegador em mobile). Limpa a cor ao desmontar o componente.

## Assinatura

```typescript
function useThemeBackground(color: string | undefined | null): void
```

## Parâmetros

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `color` | `string \| undefined \| null` | Cor hex do tema (ex: `#5D1F58`) |

## Uso

```tsx
import { useThemeBackground } from '../hooks/useThemeBackground';

function AudioPlayerScreen({ collection }: { collection: Collection }) {
  // Aplica automaticamente a cor do tema ao body
  useThemeBackground(collection.color_theme);

  return (
    <div>
      {/* O fundo do documento já está com a cor do tema */}
    </div>
  );
}
```

## Efeito

1. Ao montar: define `document.documentElement.style.backgroundColor` e `document.body.style.backgroundColor` com a cor
2. Ao montar: injeta/atualiza `<meta name="theme-color">` com a cor
3. Ao desmontar: restaura o fundo para `#ffffff` e remove o meta tag

## Usado em

- `BookReaderScreen`
- `AudioPlayerScreen`
- `VideoPlayerScreen`
- `ExtraToolsScreen`

## Nota do App.tsx

O `App.tsx` também reseta a cor de fundo para `#ffffff` ao navegar para telas que não são players:

```typescript
useEffect(() => {
  if (!isPlayerScreen) {
    document.documentElement.style.backgroundColor = '#ffffff';
    document.body.style.backgroundColor = '#ffffff';
  }
}, [isPlayerScreen]);
```
