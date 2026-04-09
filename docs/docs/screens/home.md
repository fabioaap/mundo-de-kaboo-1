---
id: home
title: HomeScreen
sidebar_position: 3
---

# HomeScreen

**Arquivo:** `screens/HomeScreen.tsx`  
**ScreenName:** `home`

## Descrição

Tela principal da aplicação, exibindo todas as coleções disponíveis para o usuário. Inclui filtros por nível escolar e abre um modal com detalhes ao selecionar uma coleção.

## Props

```typescript
interface HomeScreenProps {
  onNavigate: (screen: ScreenName, params?: any) => void;
  params?: any;
}
```

## Funcionalidades

- **Listagem de coleções** buscadas da API do Supabase
- **Filtros por aba:** Todos / Ed. Infantil / Fund I (usando `TABS` de `constants.ts`)
- **Pull to refresh** para atualizar a lista de coleções
- **Abertura do modal** ao clicar em uma coleção (`CollectionModal`)
- **Indicador de progresso** de cada coleção
- **Loading state** com skeleton enquanto carrega

## Interações

| Ação | Resultado |
|------|-----------|
| Clicar em uma coleção | Abre `CollectionModal` com `collectionId` nos params |
| Mudar aba | Filtra coleções por nível escolar |
| Pull to refresh | Força atualização via `api.getCollections(true)` |

## Dados carregados

- **Coleções:** via `api.getCollections()`
- **Progresso do usuário:** via `api.getUserProgress()`
- Ambos são combinados para exibir a barra de progresso em cada card

## Cache

As coleções são armazenadas em `sessionStorage` com a chave `kaboo_collections_cache` para evitar chamadas repetidas à API durante a mesma sessão.
