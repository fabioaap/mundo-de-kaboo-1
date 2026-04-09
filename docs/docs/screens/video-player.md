---
id: video-player
title: VideoPlayerScreen
sidebar_position: 7
---

# VideoPlayerScreen

**Arquivo:** `screens/VideoPlayerScreen.tsx`  
**ScreenName:** `player_video`

## Descrição

Player de vídeos educacionais com suporte a controles de reprodução nativos do navegador.

## Props

```typescript
interface VideoPlayerScreenProps {
  collection: Collection;
  onBack: () => void;
}
```

## Funcionalidades

- **Reprodução de vídeo** usando o elemento `<video>` nativo
- **Controles nativos** do navegador (play/pause, volume, fullscreen, etc.)
- **Modo tela cheia** suportado
- **Cor de tema** da coleção aplicada ao fundo

## Hook utilizado

- [`useThemeBackground`](../hooks/use-theme-background) — aplica cor de tema ao body

## Requisitos

- A prop `collection` deve ter `video_url` definido
