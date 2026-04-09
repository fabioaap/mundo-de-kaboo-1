---
id: use-is-mobile
title: useIsMobile
sidebar_position: 3
---

# useIsMobile

**Arquivo:** `hooks/useIsMobile.ts`

## Descrição

Detecta se o dispositivo está em modo mobile (largura menor que o breakpoint `md` do Tailwind = 768px).

## Retorno

```typescript
const isMobile: boolean = useIsMobile();
```

## Uso

```tsx
import { useIsMobile } from '../hooks/useIsMobile';

function Navigation() {
  const isMobile = useIsMobile();

  return isMobile
    ? <BottomNavBar />
    : <SideNavBar />;
}
```

## Implementação interna

Usa `window.matchMedia('(max-width: 767px)')` e adiciona um listener para atualizar quando a janela é redimensionada.

## Breakpoint

O breakpoint padrão é **768px** (equivalente ao `md:` do Tailwind CSS).
