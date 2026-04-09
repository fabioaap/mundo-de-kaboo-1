---
id: use-orientation
title: useOrientation
sidebar_position: 2
---

# useOrientation

**Arquivo:** `hooks/useOrientation.ts`

## Descrição

Detecta a orientação atual do dispositivo (retrato ou paisagem) e atualiza em tempo real quando a orientação muda.

## Retorno

```typescript
type Orientation = 'portrait' | 'landscape';

const orientation: Orientation = useOrientation();
```

## Uso

```tsx
import { useOrientation } from '../hooks/useOrientation';

function BookReader() {
  const orientation = useOrientation();

  return (
    <div>
      {orientation === 'landscape'
        ? <DualPageView />
        : <SinglePageView />
      }
    </div>
  );
}
```

## Implementação interna

Usa `window.screen.orientation` ou `window.matchMedia('(orientation: landscape)')` como fallback, e escuta o evento `orientationchange` para atualizar o estado.

## Casos de uso

- `BookReaderScreen` — Alterna entre modo 1 página (portrait) e 2 páginas (landscape)
- Layouts responsivos que dependem da orientação física do dispositivo
