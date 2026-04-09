---
id: overview
title: Visão Geral da Arquitetura
sidebar_position: 1
---

# Arquitetura do Projeto

O Mundo de Kaboo é uma **Single Page Application (SPA)** construída com React e TypeScript, com roteamento interno baseado em estado e backend fornecido pelo Supabase.

## Diagrama de Alto Nível

```
┌─────────────────────────────────────────────────┐
│                 Navegador (SPA)                  │
│                                                  │
│  ┌────────────┐   ┌────────────┐  ┌──────────┐  │
│  │  App.tsx   │──▶│  Screens   │  │Components│  │
│  │ (Roteador) │   │ (14 telas) │  │(UI reuse)│  │
│  └─────┬──────┘   └────────────┘  └──────────┘  │
│        │                                         │
│  ┌─────▼──────┐   ┌────────────┐                 │
│  │   Hooks    │   │    Lib     │                 │
│  │ (lógica)   │   │ (api,auth) │                 │
│  └────────────┘   └─────┬──────┘                 │
└────────────────────────┼────────────────────────┘
                         │ HTTPS / REST
              ┌──────────▼──────────┐
              │   Supabase (BaaS)   │
              │  ┌───────┐ ┌──────┐ │
              │  │  Auth │ │  DB  │ │
              │  └───────┘ └──────┘ │
              │  ┌──────────────┐   │
              │  │   Storage    │   │
              │  └──────────────┘   │
              └─────────────────────┘
```

## Roteamento

O roteamento é implementado **sem React Router**. Em vez disso, o `App.tsx` mantém um estado `NavState` que controla qual tela está ativa:

```typescript
interface NavState {
  currentScreen: ScreenName;
  params?: any;
}
```

A função `navigate(screen, params)` atualiza esse estado e persiste no `localStorage` para sobreviver a recarregamentos.

### Telas disponíveis (`ScreenName`)

| Tela | Descrição |
|------|-----------|
| `login` | Tela de login |
| `forgot_password` | Recuperação de senha |
| `email_confirmation` | Confirmação de e-mail |
| `home` | Página inicial com coleções |
| `search` | Busca de coleções |
| `profile` | Perfil do usuário |
| `my_data` | Edição de dados pessoais |
| `player_book` | Visualizador de PDF (flipbook) |
| `player_audio` | Player de áudio |
| `player_video` | Player de vídeo |
| `tools` | Ferramentas extras |
| `support` | Tela de suporte |
| `admin_collections` | Administração de coleções |

## Gerenciamento de Estado

| Mecanismo | Uso |
|-----------|-----|
| `useState` | Estado local dos componentes |
| `localStorage` | Persistência da navegação entre recarregamentos |
| `sessionStorage` | Cache de coleções e perfil (por sessão) |
| Supabase Auth | Estado de autenticação global |

## Fluxo de Autenticação

```
Usuário acessa →  App.tsx verifica sessão Supabase
                  │
         ┌────────┴────────┐
         │                 │
    Autenticado       Não autenticado
         │                 │
    Restaura tela     Redireciona para
    anterior           tela de login
```

## Lazy Loading

O `BookReaderScreen` é carregado de forma assíncrona para evitar que a importação do `pdfjs-dist` bloqueie a inicialização do aplicativo:

```typescript
const BookReaderScreen = React.lazy(() =>
  import('./screens/BookReaderScreen').then(module => ({
    default: module.BookReaderScreen
  }))
);
```

## Persistência de Dados

- **Navegação:** `localStorage` — sobrevive ao fechar e reabrir o navegador
- **Coleções:** `sessionStorage` — cache por sessão do navegador, limpa automaticamente ao fechar
- **Autenticação:** Supabase gerencia tokens via `localStorage` internamente
