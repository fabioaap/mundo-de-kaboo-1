---
id: page-header
title: PageHeader
sidebar_position: 4
---

# PageHeader

**Arquivo:** `components/PageHeader.tsx`

## Descrição

Cabeçalho padronizado para telas de navegação secundária. Exibe o título da tela, um botão de voltar opcional à esquerda e conteúdo opcional à direita.

O título é renderizado como `<h1>` com `text-3xl font-black text-brand-primary tracking-tight`, formando a **identidade visual de cabeçalho dos módulos administrativos**.

## Props

```typescript
interface PageHeaderProps {
  title: string;
  onBack?: () => void;       // Botão de voltar opcional (omitido = sem botão)
  rightContent?: ReactNode;  // Conteúdo opcional à direita
  className?: string;
}
```

## Uso típico

```tsx
<PageHeader title="Perfil" onBack={() => navigate('home')} />
```

## Com conteúdo à direita

```tsx
<PageHeader
  title="Administração"
  onBack={goBack}
  rightContent={<button onClick={handleSave}>Salvar</button>}
/>
```

## Padrão de cabeçalho dos módulos admin

`PageHeader` é o padrão de cabeçalho de todos os módulos administrativos. O módulo de **Vouchers** usa-o sem botão de voltar — o título `"Vouchers"` aparece acima das abas internas (Modelos / Lotes / Códigos / Auditoria):

```tsx
<PageHeader title="Vouchers" />
```

## Visual

```
┌─────────────────────────────────────────┐
│  ← (voltar)     Título          [ações] │
└─────────────────────────────────────────┘
```
