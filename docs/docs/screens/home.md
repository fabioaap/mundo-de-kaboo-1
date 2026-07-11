---
id: home
title: HomeScreen
sidebar_position: 3
---

# HomeScreen

**Arquivo:** `screens/HomeScreen.tsx`  
**ScreenName:** `home`

## Descrição

Tela principal da aplicação e ponto central de descoberta do acervo. Exibe todas as coleções disponíveis para o usuário, incorpora a busca textual diretamente no topo da home, mantém filtros rápidos sempre visíveis e abre um modal com detalhes ao selecionar uma coleção.

![Tela inicial (Home) com o grid de coleções](/screenshots/08-home.png)

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

- **Listagem de coleções** buscadas da API do Supabase
- **Busca textual integrada** por título, nível, tema, BNCC, CASEL, personagem e idade-série
- **Filtros por aba:** Todos / Ed. Infantil / Fund I (usando `TABS` de `constants.ts`)
- **Filtros rápidos visíveis** para Personagem, Idade-Série, BNCC e CASEL
- **Sheet de filtros avançados** aberto a partir do botão embutido na barra de busca
- **Pull to refresh** para atualizar a lista de coleções
- **Abertura do modal** ao clicar em uma coleção (`CollectionModal`)
- **Indicador de progresso** de cada coleção
- **Loading state** com skeleton enquanto carrega
- **Persistência do contexto local** ao abrir uma coleção e voltar para a grade

## Interações

| Ação | Resultado |
|------|-----------|
| Clicar em uma coleção | Abre `CollectionModal` com `collectionId` nos params |
| Digitar na barra de busca | Refina a grade instantaneamente sem sair da home |
| Mudar aba | Filtra coleções por nível escolar |
| Clicar em um chip rápido | Abre o sheet de filtros já contextualizado na categoria |
| Limpar busca e filtros | Restaura a visão padrão da home |
| Pull to refresh | Força atualização via `api.getCollections(true)` |

## Dados carregados

- **Coleções:** via `api.getCollections()`
- **Progresso do usuário:** via `api.getUserProgress()`
- **Permissões de acesso por coleção:** via `api.getUserContentGrants()`
- Ambos são combinados para exibir progresso, estados de bloqueio e a grade refinada por busca/filtros

## Cache

As coleções são armazenadas em `sessionStorage` com a chave `kaboo_collections_cache` para evitar chamadas repetidas à API durante a mesma sessão.
