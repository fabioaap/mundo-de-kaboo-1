---
id: search
title: SearchScreen
sidebar_position: 4
---

# SearchScreen

**Arquivo:** `screens/SearchScreen.tsx`  
**ScreenName:** `search`

## Descrição

Tela de busca de coleções por texto. Permite pesquisar por título, tema, personagens e outras propriedades das coleções.

## Props

```typescript
interface SearchScreenProps {
  onNavigate: (screen: ScreenName, params?: any) => void;
  params?: any;
}
```

## Funcionalidades

- Campo de busca com **debounce** (evita chamadas excessivas)
- Busca em tempo real enquanto o usuário digita
- Exibe resultados com **highlighting** do termo buscado
- Ao clicar em um resultado, abre o `CollectionModal`
- Estado vazio quando não há resultados

## Hook utilizado

Usa o hook `useDebounce` para aguardar a pausa na digitação antes de executar a busca:

```typescript
const debouncedQuery = useDebounce(query, 300);
```

## Fluxo de busca

```
Usuário digita → useDebounce (300ms) → filtra coleções locais
```

A busca é realizada **localmente** sobre o cache de coleções já carregadas, sem novas chamadas à API.

## Interações

| Ação | Resultado |
|------|-----------|
| Digitar no campo | Filtra coleções após 300ms |
| Clicar em resultado | Abre `CollectionModal` |
| Limpar campo | Mostra todas as coleções |
| Pressionar voltar | Retorna para `home` |
