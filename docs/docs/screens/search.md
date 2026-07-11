---
id: search
title: Search Alias
sidebar_position: 4
---

# Search Alias

**Arquivo principal:** `screens/HomeScreen.tsx`  
**ScreenName:** `search`

## Descrição

A rota `search` continua existindo por compatibilidade de navegação e histórico, mas agora renderiza a mesma experiência de descoberta da home. O objetivo é abrir a home em modo de busca, com foco no campo principal e os mesmos filtros disponíveis no topo da tela.

| Busca (campo em foco) | Busca com resultados |
|:---:|:---:|
| ![Tela de busca com o campo em foco](/screenshots/13-search.png) | ![Resultados da busca em grid](/screenshots/14-search-results.png) |

## Props

```typescript
interface HomeScreenProps {
  onNavigate: (screen: ScreenName, params?: any) => void;
  params?: any;
  accessProfile?: UserProfile | null;
  screenName?: 'home' | 'search';
  searchMode?: boolean;
}
```

## Funcionalidades

- Reaproveita a **mesma home** com a barra de busca integrada
- Entra com **foco no campo de busca** quando acionada pela navegação
- Mantém **tabs, filtros rápidos e sheet avançado** disponíveis no mesmo contexto
- Abre `CollectionModal` sem sair da rota `search`, preservando o estado local da busca
- Serve como **alias transitório** enquanto a descoberta fica consolidada em uma única experiência

## Fluxo de navegação

```text
BottomNav → search → HomeScreen(searchMode)
```

Ao recarregar a rota `#search`, o usuário continua vendo a mesma interface da home, já orientada para busca.

## Interações

| Ação | Resultado |
|------|-----------|
| Tocar em `Buscar` na navegação | Abre a home em modo focado na busca |
| Digitar no campo | Refina a grade instantaneamente |
| Abrir filtros pela barra | Mantém busca e filtros no mesmo contexto |
| Pressionar voltar | Retorna para `home` padrão |

## Observação

O arquivo `screens/SearchScreen.tsx` permanece no repositório apenas como legado temporário. A implementação ativa da rota `search` já foi absorvida por `screens/HomeScreen.tsx`.
