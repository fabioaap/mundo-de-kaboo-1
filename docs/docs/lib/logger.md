---
id: logger
title: lib/logger.ts
sidebar_position: 6
---

# Logger (`lib/logger.ts`)

Utilitário de logging seguro para produção. Suprime logs em ambiente de produção, mas mantém erros visíveis.

## Objeto `logger`

```typescript
import { logger } from '../lib/logger';

logger.log('Dados carregados:', data);   // Apenas em DEV
logger.warn('Aviso:', message);          // Apenas em DEV
logger.error('Erro crítico:', error);    // Sempre (DEV e Produção)
```

## Métodos

| Método | Ambiente | Equivalente |
|--------|----------|-------------|
| `logger.log(...args)` | Somente DEV | `console.log` |
| `logger.warn(...args)` | Somente DEV | `console.warn` |
| `logger.error(...args)` | Sempre | `console.error` |

## Comportamento por ambiente

```typescript
const isDevelopment = import.meta.env.DEV;

export const logger = {
  log: (...args) => { if (isDevelopment) console.log(...args); },
  warn: (...args) => { if (isDevelopment) console.warn(...args); },
  error: (...args) => { console.error(...args); }, // sempre
};
```

## Motivação

- Evita vazamento de informações internas em produção
- Facilita debug durante desenvolvimento sem poluir o console de produção
- Erros são sempre registrados (podem ser redirecionados para Sentry/Datadog futuramente)

## Substituindo `console.log`

Substitua `console.log` e `console.warn` por `logger.log` e `logger.warn` em módulos de produção para evitar exposição desnecessária de informações.
