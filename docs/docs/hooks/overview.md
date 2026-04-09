---
id: overview
title: Visão Geral dos Hooks
sidebar_position: 1
---

# Custom React Hooks

Todos os hooks estão na pasta `hooks/`. Seguem a convenção de nomenclatura `use*` do React.

## Lista de Hooks

| Hook | Arquivo | Descrição |
|------|---------|-----------|
| [`useOrientation`](./use-orientation) | `useOrientation.ts` | Detecta orientação do dispositivo |
| [`useIsMobile`](./use-is-mobile) | `useIsMobile.ts` | Detecta se o dispositivo é mobile |
| [`useScreenSize`](./use-screen-size) | `useScreenSize.ts` | Obtém dimensões da janela |
| [`useDebounce`](./use-debounce) | `useDebounce.ts` | Debounce de valores |
| [`useToast`](./use-toast) | `useToast.ts` | Sistema de notificações toast |
| [`useRefSize`](./use-ref-size) | `useRefSize.ts` | Obtém tamanho de elemento via ref |
| [`useThemeBackground`](./use-theme-background) | `useThemeBackground.ts` | Aplica cor de tema ao body |

## Padrões

Todos os hooks:
- São funções JavaScript puras que começam com `use`
- Podem usar outros hooks do React (`useState`, `useEffect`, etc.)
- Retornam valores ou objetos tipados com TypeScript
- Limpam efeitos colaterais no retorno do `useEffect` quando necessário
