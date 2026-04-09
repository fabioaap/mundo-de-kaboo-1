---
id: overview
title: Visão Geral das Telas
sidebar_position: 1
---

# Telas da Aplicação

O Mundo de Kaboo é composto por **14 telas** organizadas por finalidade. A navegação entre elas é controlada pelo estado `NavState` no `App.tsx`.

## Mapa de Navegação

```
                    ┌─────────┐
                    │  Login  │
                    └────┬────┘
                         │ (autenticado)
              ┌──────────▼──────────┐
              │        Home         │◀────────────────────┐
              │   (lista coleções)  │                     │
              └──┬───────────────┬──┘                     │
                 │               │                        │
         ┌───────▼──┐    ┌───────▼──────┐                 │
         │  Search  │    │  CollectionModal │              │
         └───────┬──┘    └───────┬──────┘                 │
                 │               │                        │
                 └───────────────┼────────────────────────┤
                                 │                        │
              ┌──────────────────┼────────────────┐       │
              │                  │                │       │
     ┌────────▼──┐    ┌──────────▼──┐   ┌─────────▼─┐    │
     │PlayerBook │    │PlayerAudio  │   │PlayerVideo│    │
     └────────┬──┘    └──────────┬──┘   └─────────┬─┘    │
              │                  │                │       │
              └──────────────────┴────────────────┘       │
                                 │ goBack()               │
                                 └────────────────────────┘

  Profile ──▶ MyData
  AdminCollections
  Support
  EmailConfirmation
  ForgotPassword
```

## Tabela de Telas

| Tela (`ScreenName`) | Arquivo | Descrição |
|---------------------|---------|-----------|
| `login` | `LoginScreen.tsx` | Tela de autenticação |
| `forgot_password` | `ForgotPasswordScreen.tsx` | Recuperação de senha |
| `email_confirmation` | `EmailConfirmationScreen.tsx` | Confirmação de e-mail |
| `home` | `HomeScreen.tsx` | Página inicial com coleções |
| `search` | `SearchScreen.tsx` | Busca de coleções |
| `profile` | `ProfileScreen.tsx` | Perfil do usuário |
| `my_data` | `MyDataScreen.tsx` | Edição de dados pessoais |
| `player_book` | `BookReaderScreen.tsx` | Visualizador de PDF (flipbook) |
| `player_audio` | `AudioPlayerScreen.tsx` | Player de áudio |
| `player_video` | `VideoPlayerScreen.tsx` | Player de vídeo |
| `tools` | `ExtraToolsScreen.tsx` | Ferramentas extras |
| `support` | `App.tsx` (inline) | Suporte por e-mail |
| `admin_collections` | `AdminCollectionsScreen.tsx` | Gerenciamento de coleções |
| `details` | `DetailsScreen.tsx` | (Substituída por modal) |

## Navegação com `goBack()`

A função `goBack()` tem comportamento diferente por contexto:

| Tela atual | Destino do goBack |
|-----------|-------------------|
| Player (book/audio/video/tools) | Tela anterior + restaura modal |
| `my_data` | `profile` |
| `search`, `support`, `profile` | `home` |
| Outros | `home` |
