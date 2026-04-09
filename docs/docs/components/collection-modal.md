---
id: collection-modal
title: CollectionModal
sidebar_position: 3
---

# CollectionModal

**Arquivo:** `components/CollectionModal.tsx`

## Descrição

Modal exibido ao clicar em uma coleção nas telas `home` ou `search`. Apresenta os detalhes completos da coleção e os botões de acesso ao conteúdo.

## Props

```typescript
interface CollectionModalProps {
  collection: Collection | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: ScreenName, params?: any) => void;
}
```

## Funcionamento

O modal é controlado pelo estado `params.collectionId` do `App.tsx`:

```typescript
// Modal abre quando collectionId está presente nas telas home/search
const isModalOpen =
  !!navState.params?.collectionId &&
  ['home', 'search'].includes(navState.currentScreen);
```

## Conteúdo exibido

- **Capa da coleção** com cor de tema como fundo
- **Título e nível escolar**
- **Tema e objetivos de aprendizagem**
- **Personagens** da história
- **Habilidades BNCC** relacionadas
- **Competências CASEL**
- **Faixa etária / série**
- **Botões de acesso** ao conteúdo disponível

## Botões de acesso

| Botão | Navega para | Condição |
|-------|------------|---------|
| 📖 Ler livro | `player_book` | `pdf_url` definido |
| 🎧 Ouvir áudio | `player_audio` | `audio_url` definido |
| 🎥 Assistir vídeo | `player_video` | `video_url` definido |
| 🔧 Ferramentas | `tools` | `extra_materials` não vazio |

## Loading state

O modal abre imediatamente quando `collectionId` está nos params, mas exibe um skeleton (`ModalSkeleton`) enquanto os dados da coleção ainda estão sendo carregados.

## Subcomponentes

- `CollectionCoverSection` — renderiza a seção de capa
- `ModalSkeleton` — exibe skeleton durante o carregamento
