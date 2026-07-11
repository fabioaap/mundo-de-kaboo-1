---
id: consumidor
title: Como o consumidor navega
sidebar_position: 11
---

# Uso pelo consumidor

O **consumidor** é o usuário final — professor, escola ou família. Esta página descreve
o caminho real dele dentro do app, do login ao consumo de conteúdo.

## Entrada: Portal e Login

- Em `#portal` (`screens/PortalScreen.tsx`) o usuário escolhe **Kaboo**, **Central Coruja**
  ou **Wiki**. Cada cartão leva ao login da marca (`routeToBrandLogin`,
  `screens/PortalScreen.tsx:27`). Em produção o hostname já resolve a marca.
- No **Login** (`screens/LoginScreen.tsx`) ele entra com e-mail e senha. Há também
  cadastro/primeiro acesso e recuperação de senha
  (`screens/ForgotPasswordScreen.tsx`, `screens/SetPasswordScreen.tsx`).

## Home / Acervo

A Home (`screens/HomeScreen.tsx`) é a vitrine do acervo da marca:

- Conteúdos aparecem agrupados em **Kits** e **Livros**
  (`matchesCollectionGroup`, `screens/HomeScreen.tsx:74`).
- **Abas de nível** no topo: Todos, Ed. Infantil, Fund I (`TABS`, `constants.ts:242`).
- **Filtros** por personagem, habilidade BNCC, competência CASEL e idade
  (`CollectionFiltersModal`). É possível chegar já filtrado por um personagem
  (`params.filterCharacter`).
- Um **banner de acesso** avisa quando o acesso está próximo do fim ou expirado
  (`ACCESS_BANNER_DISMISS_STORAGE_KEY`, `screens/HomeScreen.tsx:108`).

| Home do consumidor | Acervo (grid de coleções) |
|:---:|:---:|
| ![Home do consumidor com o acervo da marca](/screenshots/voucher-user-01-home.png) | ![Tela inicial com grid de coleções](/screenshots/08-home.png) |

## Bibliotecas (hubs)

Além da Home, há hubs dedicados por tipo de mídia (`screens/LibraryHubScreen.tsx`):

| Hub | O que traz | Rótulo no card |
|-----|------------|----------------|
| Vídeos | vídeos do acervo | Vídeo |
| Músicas | faixas/canções | Faixa |
| Formações | percursos de formação | Percurso |
| Materiais | PDFs e recursos | Material |

Cada hub tem busca e filtros próprios (`COMPACT_FILTER_LABELS`,
`screens/LibraryHubScreen.tsx:63`). Quais hubs aparecem depende das
[flags de menu da marca](./admin-configuracoes.md#aba-3--menus).

## Players

Ao abrir um conteúdo, o app leva ao player adequado:

![Modal de detalhe de uma coleção com os botões de acesso ao conteúdo](/screenshots/12-collection-modal.png)

- **Leitor de livro** — `screens/BookReaderScreen.tsx` (PDF/leitura).
- **Player de áudio** — `screens/AudioPlayerScreen.tsx` (música e narração de livro).
- **Player de vídeo** — `screens/VideoPlayerScreen.tsx`.
- **Player de formação** — `screens/FormationPlayerScreen.tsx` (aulas em sequência).

Se o **Download Offline** estiver ligado para a marca, o usuário pode baixar conteúdo
para uso sem internet (`useOfflineDownload`, flag `content.offline`).

## Busca

A busca (`screens/SearchScreen.tsx`, também `screenName='search'` na Home) indexa título,
nível, tema, objetivos, personagens, BNCC, CASEL e idade
(`collectionMatchesQuery`, `screens/HomeScreen.tsx:89`).

| Busca (campo em foco) | Busca com resultados |
|:---:|:---:|
| ![Tela de busca com o campo em foco](/screenshots/13-search.png) | ![Resultados da busca em grid](/screenshots/14-search-results.png) |

## Perfil e Meus Dados

- **Perfil** (`screens/ProfileScreen.tsx`) mostra o status de acesso e as coleções já
  liberadas (grants). É onde um voucher pendente de cadastro pode ser aplicado
  (`PENDING_SIGNUP_VOUCHER_STORAGE_KEY`, `screens/ProfileScreen.tsx:5`).
- **Meus Dados** (`screens/MyDataScreen.tsx`) permite ver/editar dados da conta.

![Tela de perfil do consumidor com status de acesso e coleções liberadas](/screenshots/15-profile.png)

## Resgate de voucher

O usuário informa um **código de voucher** para liberar conteúdo:

1. No cadastro/primeiro acesso, o código pode ficar **pendente** e ser aplicado
   automaticamente ao entrar (`api.redeemVoucher`, `screens/AccessExpiredScreen.tsx:90`).
2. Manualmente, ele digita o código no campo de resgate (ex.:
   `KABOO-6MESES-2026` ou `CORUJA-6MESES-2026`, placeholder por marca em
   `screens/AccessExpiredScreen.tsx:40`).
3. Em caso de sucesso: "Acesso liberado com sucesso. Redirecionando..." e volta à Home
   (`:108`). O acesso vale pelos meses definidos no modelo do voucher.

Importante: um voucher só resgata na **sua própria marca**. Código de outra marca é
recusado (`brand_mismatch`).

## Acesso expirado

Quando o acesso termina, o usuário cai na tela **Acesso Expirado**
(`screens/AccessExpiredScreen.tsx`):

- Explica que o acesso expirou e oferece o **campo de resgate** de um novo voucher.
- Traz **CTA de compra/loja** (link configurado em
  [Configurações → Links da marca](./admin-configuracoes.md#aba-1--identidade-visual)).
- Após resgatar um código válido, o acesso é recuperado e ele volta ao acervo.

| Acesso expirado | Upsell (conteúdo fora do acesso) |
|:---:|:---:|
| ![Tela de acesso expirado com campo de resgate](/screenshots/20-access-expired.png) | ![Upsell exibido para conteúdo fora do acesso do usuário](/screenshots/voucher-user-02-upsell.png) |

## Marca errada

Se o usuário tenta acessar com uma marca que não corresponde ao seu perfil, o app mostra
a tela `screens/WrongBrandScreen.tsx`, orientando a entrar pela marca correta.

## Kaboo × Central Coruja

A navegação é a mesma; mudam tema, imagens, textos de CTA e quais hubs/menus aparecem.
O acervo e os vouchers são isolados por marca.
