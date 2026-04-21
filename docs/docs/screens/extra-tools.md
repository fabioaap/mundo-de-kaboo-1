---
id: extra-tools
title: ExtraToolsScreen
sidebar_position: 9
---

# ExtraToolsScreen

**Arquivo:** `screens/ExtraToolsScreen.tsx`  
**ScreenName:** `tools`

## Descrição

Tela de materiais da coleção relacionados a um item específico. Oferece acesso a recursos complementares, guias e documentos de apoio sem misturar esse escopo com materiais gerais da Central.

## Props

```typescript
interface ExtraToolsScreenProps {
  collection: Collection;
  onBack: () => void;
}
```

## Funcionalidades

- Lista materiais da coleção (`collection.extra_materials`)
- Permite **download** ou **visualização** dos materiais
- Cor de tema da coleção aplicada ao layout

## Hook utilizado

- [`useThemeBackground`](../hooks/use-theme-background) — aplica cor de tema ao body

## Requisitos

- A prop `collection` deve ter `extra_materials` (array de URLs) definido
