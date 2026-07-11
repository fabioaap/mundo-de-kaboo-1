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
