---
id: use-screen-size
title: useScreenSize
sidebar_position: 4
---

# useScreenSize

**Arquivo:** `hooks/useScreenSize.ts`

## Descrição

Retorna as dimensões atuais da janela do navegador e atualiza em tempo real quando a janela é redimensionada.

## Retorno

```typescript
interface ScreenSize {
  width: number;
  height: number;
}

const { width, height } = useScreenSize();
```

## Uso

```tsx
import { useScreenSize } from '../hooks/useScreenSize';

function FlipbookViewer() {
  const { width, height } = useScreenSize();

  const pageWidth = Math.floor(width / 2);
  const pageHeight = height - 100;

  return <PageFlip width={pageWidth} height={pageHeight} />;
}
```

## Implementação interna

Usa um `ResizeObserver` ou listener no evento `resize` da janela para monitorar mudanças de tamanho.

## Casos de uso

- Calcular dimensões exatas para o `FlipbookViewer`
- Posicionar elementos com precisão pixel-perfect
- Layout responsivo dependente de dimensões exatas (não apenas breakpoints)
