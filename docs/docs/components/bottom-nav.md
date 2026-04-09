---
id: bottom-nav
title: BottomNav
sidebar_position: 2
---

# BottomNav

**Arquivo:** `components/BottomNav.tsx`

## Descrição

Componente de navegação principal da aplicação. Em **mobile**, aparece como barra inferior fixa. Em **desktop**, aparece como barra lateral esquerda.

## Props

```typescript
interface BottomNavProps {
  currentScreen: ScreenName;
  onNavigate: (screen: ScreenName) => void;
}
```

## Itens de Navegação

| Ícone | Label | ScreenName | Visível para |
|-------|-------|-----------|-------------|
| 🏠 | Home | `home` | Todos |
| 🔍 | Buscar | `search` | Todos |
| 👤 | Perfil | `profile` | Todos |
| 💬 | Suporte | `support` | Todos |
| ⚙️ | Admin | `admin_collections` | Admin/Editor |

## Comportamento responsivo

```
Mobile (< md):  barra horizontal fixa na parte inferior
Desktop (≥ md): barra vertical fixa à esquerda
```

## Item ativo

O item correspondente à `currentScreen` recebe estilo visual de ativo (cor da marca).

## Visibilidade

O `BottomNav` só é exibido nas telas: `home`, `search`, `support`, `profile`, `my_data`, `admin_collections`.

Em telas de player (`player_book`, `player_audio`, `player_video`, `tools`) ele é ocultado.
