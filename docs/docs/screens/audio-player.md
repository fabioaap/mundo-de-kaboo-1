---
id: audio-player
title: AudioPlayerScreen
sidebar_position: 6
---

# AudioPlayerScreen

**Arquivo:** `screens/AudioPlayerScreen.tsx`  
**ScreenName:** `player_audio`

## Descrição

Player de audiobooks com controles de reprodução, barra de progresso e visualização da capa da coleção.

## Props

```typescript
interface AudioPlayerScreenProps {
  collection: Collection;
  onBack: () => void;
}
```

## Funcionalidades

- **Reprodução de áudio** usando o elemento `<audio>` nativo do navegador
- **Controles:** play/pause, avançar 15s, retroceder 15s
- **Barra de progresso** interativa com seek
- **Exibição do tempo** atual e total
- **Capa da coleção** como artwork do player
- **Cor de tema** da coleção aplicada ao fundo
- **Persistência da posição** (retorna ao ponto onde parou)

## Hook utilizado

- [`useThemeBackground`](../hooks/use-theme-background) — aplica cor de tema ao body

## Fluxo de dados

```
collection.audio_url → elemento <audio> → controles de UI
```

## Requisitos

- A prop `collection` deve ter `audio_url` definido
