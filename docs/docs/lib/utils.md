---
id: utils
title: lib/utils.ts
sidebar_position: 4
---

# Utils (`lib/utils.ts`)

Funções utilitárias genéricas para a aplicação.

## `cn(...inputs)`

Combina classes CSS condicionalmente usando `clsx` e resolve conflitos de classes Tailwind com `tailwind-merge`.

```typescript
import { cn } from '../lib/utils';

// Uso básico
const className = cn('base-class', 'another-class');
// → 'base-class another-class'

// Com condicionais
const className = cn(
  'px-4 py-2',
  isActive && 'bg-blue-500',
  isDisabled && 'opacity-50'
);

// Resolução de conflitos Tailwind
const className = cn('px-4', 'px-6');
// → 'px-6' (tailwind-merge resolve o conflito, mantém o último)
```

## Assinatura

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

## Quando usar

- Componentes com classes CSS condicionais
- Merging de classes passadas como prop com classes base do componente
- Qualquer situação onde classes Tailwind podem conflitar

## Exemplo com prop de className

```tsx
function Button({ className, children, ...props }) {
  return (
    <button
      className={cn(
        'px-4 py-2 rounded font-medium',
        'bg-primary text-white',
        className // Permite override externo
      )}
      {...props}
    >
      {children}
    </button>
  );
}
```
