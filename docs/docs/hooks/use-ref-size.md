---
id: use-ref-size
title: useRefSize
sidebar_position: 7
---

# useRefSize

**Arquivo:** `hooks/useRefSize.ts`

## Descrição

Obtém as dimensões (`width` e `height`) de um elemento DOM via `ref`, atualizando quando o elemento é redimensionado (usando `ResizeObserver`).

## Assinatura

```typescript
function useRefSize<T extends HTMLElement>(
  ref: RefObject<T>
): { width: number; height: number }
```

## Uso

```tsx
import { useRef } from 'react';
import { useRefSize } from '../hooks/useRefSize';

function FlipbookContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useRefSize(containerRef);

  return (
    <div ref={containerRef} className="w-full h-full">
      <FlipbookViewer
        pageWidth={width / 2}
        pageHeight={height}
      />
    </div>
  );
}
```

## Implementação interna

Usa `ResizeObserver` para monitorar mudanças no tamanho do elemento referenciado, retornando as dimensões atualizadas via `useState`.

## Diferença em relação ao `useScreenSize`

| Hook | Mede | Quando usar |
|------|------|-------------|
| `useRefSize` | Elemento DOM específico | Quando precisa do tamanho de um container específico |
| `useScreenSize` | Janela inteira | Quando precisa do tamanho da viewport |
