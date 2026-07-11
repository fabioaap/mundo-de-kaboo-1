---
id: card-3d
title: Card3D
sidebar_position: 9
---

# Card3D

**Local:** `components/Card3D.tsx`

Card de coleção com efeito 3D (tilt por mouse no desktop e por giroscópio no
mobile). É o card usado nas listagens de coleções/mídia do consumidor. É
**tone-aware**: o mesmo layout serve as duas marcas, mudando só as cores.

## Props

```ts
interface Card3DProps {
  collection: Collection & { progress?: number };
  onCollectionClick: (collection: Collection) => void;
  locked?: boolean;
  tone?: 'default' | 'central-coruja';
  subtitleFallback?: string;
}
```

| Prop | Tipo | Descrição |
|------|------|-----------|
| `collection` | `Collection & { progress? }` | Dados da coleção; `progress` (0–100) desenha a barra de progresso |
| `onCollectionClick` | `(collection) => void` | Callback de clique no card |
| `locked` | `boolean` | Exibe overlay de cadeado e esconde o ícone de hover |
| `tone` | `'default' \| 'central-coruja'` | Tom visual do card (default = claro/branco) |
| `subtitleFallback` | `string` | Texto de subtítulo quando a coleção não tem sinopse/tema |

Definição em `components/Card3D.tsx:11-17`.

## Os dois tons

O tom é decidido por `isCentralCorujaTone = tone === 'central-coruja'`
(`components/Card3D.tsx:101`). O layout (capa quadrada + textos abaixo, tudo
dentro do card) é **idêntico** entre marcas; só as cores mudam.

| Aspecto | `default` (Kaboo) | `central-coruja` |
|---------|-------------------|------------------|
| Card externo | Branco, borda `brand-primary/10` (`Card3D.tsx:201`) | Glass escuro `rgba(12,26,52,0.55)` + `backdrop-blur-xl` (`Card3D.tsx:200`) |
| Moldura da capa | Borda `brand-primary/10` (`Card3D.tsx:209`) | **Borda dourada** `#EA9A3B` de 2.5px sobre fundo `#0C1A34` (`Card3D.tsx:208`) |
| Título | `text-brand-primary` (`Card3D.tsx:310`) | Claro `#FFF4E3` (`Card3D.tsx:310`) |
| Subtítulo | `text-gray-500` (`Card3D.tsx:314`) | `#D4DCF0` (`Card3D.tsx:314`) |

A borda dourada da Coruja dá contraste da capa contra o hero escuro sem precisar
de sombra pesada — ver [Marca / Tema](../marca-tema/index.md).

## Capa quadrada

A moldura da imagem usa `aspect-square` (`components/Card3D.tsx:207`). Recebe o
tilt 3D via `transform: perspective(...) rotateX/rotateY` e reflexos de luz
enquanto ativo (`components/Card3D.tsx:296-302`). Se não houver capa, cai num
gradiente de fallback (`components/Card3D.tsx:230-232`).

## Overlay de título / tema

O texto (título + sinopse/tema) fica **dentro** do card, abaixo da capa, num
bloco de altura mínima fixa para alinhar cards em grade
(`components/Card3D.tsx:308-318`). A fonte do subtítulo é resolvida por
`bookSummary`, que tenta sinopse → objetivos → descrição → tema →
`subtitleFallback` (`components/Card3D.tsx:106-110`).

## Ícone de hover e progresso

- **Ícone de hover** (canto inferior direito, sobe no hover) reflete o tipo de
  conteúdo: `Library` para kit, `Headphones` para áudio puro, `Video` para vídeo
  puro, `BookOpen` para livros — a identidade de kit vence sempre
  (`components/Card3D.tsx:115-121`).
- **Barra de progresso** só aparece quando `progress > 0`, colorida com o
  `color_theme` da coleção (`components/Card3D.tsx:247-257`).

## Tilt 3D

- **Desktop:** `handleMouseMove` calcula rotação a partir da posição do mouse
  relativa ao centro (`components/Card3D.tsx:168-178`).
- **Mobile:** usa `deviceorientation` compartilhado entre todos os cards (um
  único listener global) e pede permissão no iOS no primeiro toque
  (`components/Card3D.tsx:25-72`, `components/Card3D.tsx:126-166`).

## Exemplo

```tsx
{/* Card no consumidor da Central Coruja (tom escuro + borda dourada) */}
<Card3D
  collection={collection}
  tone="central-coruja"
  onCollectionClick={openCollection}
  subtitleFallback="Coleção Central Coruja"
/>
```
