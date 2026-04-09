---
id: page-header
title: PageHeader
sidebar_position: 4
---

# PageHeader

**Arquivo:** `components/PageHeader.tsx`

## Descrição

Cabeçalho padronizado para telas de navegação secundária. Exibe o título da tela e um botão de voltar à esquerda.

## Props

```typescript
interface PageHeaderProps {
  title: string;
  onBack: () => void;
  actions?: ReactNode; // Ações opcionais à direita
}
```

## Uso típico

```tsx
<PageHeader title="Perfil" onBack={() => navigate('home')} />
```

## Com ações extras

```tsx
<PageHeader
  title="Administração"
  onBack={goBack}
  actions={<button onClick={handleSave}>Salvar</button>}
/>
```

## Visual

```
┌─────────────────────────────────────────┐
│  ← (voltar)     Título          [ações] │
└─────────────────────────────────────────┘
```
