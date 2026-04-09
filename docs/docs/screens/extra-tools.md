---
id: extra-tools
title: ExtraToolsScreen
sidebar_position: 9
---

# ExtraToolsScreen

**Arquivo:** `screens/ExtraToolsScreen.tsx`  
**ScreenName:** `tools`

## Descrição

Tela de ferramentas e materiais extras relacionados a uma coleção específica. Oferece acesso a recursos complementares como arquivos ZIP, PDFs adicionais ou outros materiais.

## Props

```typescript
interface ExtraToolsScreenProps {
  collection: Collection;
  onBack: () => void;
}
```

## Funcionalidades

- Lista materiais extras da coleção (`collection.extra_materials`)
- Permite **download** ou **visualização** dos materiais
- Cor de tema da coleção aplicada ao layout

## Hook utilizado

- [`useThemeBackground`](../hooks/use-theme-background) — aplica cor de tema ao body

## Requisitos

- A prop `collection` deve ter `extra_materials` (array de URLs) definido
