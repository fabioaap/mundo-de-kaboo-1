---
id: admin-videos-musicas
title: Vídeos e Músicas
sidebar_position: 4
---

# Módulos Vídeos e Músicas

## Para que servem

- **Vídeos** — cadastra os vídeos do acervo (hub de vídeos do consumidor).
- **Músicas** — cadastra as faixas de áudio/canções (hub de músicas).

Ambos são **modos** da mesma tela de Coleções, abertos com
`initialLibraryArea='videos'` ou `'music'` (`screens/AdminScreen.tsx:221`). Internamente
o formulário troca os rótulos: "Nome do vídeo"/"Nome do áudio" e
"Descrição do vídeo"/"Descrição do áudio" (`screens/AdminCollectionsScreen.tsx:1631`).

## Diferença entre música e narração

- **Música / canção** → vive no hub de músicas (este módulo).
- **Narração de livro (audiolivro)** → não entra aqui; é anexada dentro do
  [livro](./admin-livros.md). A separação é pela **estrutura**, sem flag de tipo.

## Quem pode usar

Editores e admins.

## Como abrir

Administração → **Vídeos** ou **Músicas**.

## Passo a passo — adicionar um vídeo ou faixa

1. Clique em **Novo**.
2. Preencha **Nome** e **Descrição**.
3. **Fonte da mídia** — cole o link do vídeo (YouTube, Vimeo etc.) ou a URL do áudio
   no bloco de mídia (`screens/AdminCollectionsScreen.tsx:3767`).
4. Ajuste metadados (nível, idade, tags) e **Salvar**.
5. **Publicar** para exibir ao consumidor.

## Status de publicação — "Publicado" no admin ≠ visível na biblioteca

Um item só aparece na biblioteca do consumidor quando **dois** interruptores estão ligados:
o do **próprio asset** E o da **coleção dona**. O admin reflete esse status **efetivo**
(`lib/adminPublishStatus.ts` — `isEffectivelyPublished`):

- Se a **coleção** dona está despublicada, o vídeo/faixa aparece como **"Rascunho"** no admin
  e cai na aba **"Não publicados"** — mesmo que o asset em si tenha o flag publicado. É
  coerente: coleção fora do ar = nada dentro dela está no ar.
- A contagem das abas ("Publicados N / Não publicados M") usa o mesmo status efetivo.

:::note Por que isso existe
Antes, o admin olhava só o flag do asset e mostrava "Publicado" para conteúdo dentro de
coleção despublicada — o operador via "Publicado" e não achava na vitrine. Agora bate.
:::

### Selo "Dentro da obra"

Alguns vídeos/áudios pertencem a uma **obra** (um kit, ou um livro com PDF de leitura). Pela
regra **WS-2** (`isCollectionHubEligible`), o conteúdo dessas obras vive **dentro** da obra e
**nunca** aparece na biblioteca pública — o professor acessa pelo card do livro/kit, não pelo hub.

Quando um item publicado é desse tipo, o card do admin mostra o selo azul **"Dentro da obra"**
ao lado de "Publicado", com o aviso: *"Publicado, mas não aparece na biblioteca — o conteúdo
vive dentro do livro/kit."* Assim ninguém confunde "publicado" com "aparece no hub".

## O que muda no consumidor

- Vídeos publicados aparecem no **hub de vídeos** e abrem no
  `screens/VideoPlayerScreen.tsx`.
- Faixas publicadas aparecem no **hub de músicas** (biblioteca de áudio) e abrem no
  `screens/AudioPlayerScreen.tsx`.
- O acervo é organizado por **três mapas de vídeo/áudio** distintos no consumidor
  (hub de músicas, narração no livro, vídeos), então o mesmo arquivo não se mistura
  entre contextos.

## Kaboo × Central Coruja

Os menus **Vídeos** (`menu.videos`) e **Músicas** (`menu.music`) são ligados por marca em
[Configurações → Menus](./admin-configuracoes.md). Uma marca em piloto pode operar sem o
catálogo de música, por exemplo, desligando `menu.music`.
