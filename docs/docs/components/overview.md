---
id: overview
title: Visão Geral dos Componentes
sidebar_position: 1
---

# Componentes Reutilizáveis

Todos os componentes estão na pasta `components/`.

## Lista de Componentes

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| [`BottomNav`](./bottom-nav) | `BottomNav.tsx` | Navegação principal (inferior/lateral) |
| [`CollectionModal`](./collection-modal) | `CollectionModal.tsx` | Modal de detalhes da coleção |
| [`PageHeader`](./page-header) | `PageHeader.tsx` | Cabeçalho padrão dos módulos admin (voltar opcional) |
| [Barra de Consumo de Lote](./batch-consumption-bar) | `screens/VouchersModule.tsx` | Barra segmentada de resgatados/disponíveis/desativados |
| [`FileUpload`](./file-upload) | `FileUpload.tsx` | Upload de arquivo único com preview |
| [`FlipbookViewer`](./flipbook-viewer) | `flipbook/` | Visualizador de PDF com efeito flipbook |
| [`Toast`](./toast) | `Toast.tsx` | Notificações temporárias |
| `Button` | `Button.tsx` | Botão padronizado |
| `Card3D` | `Card3D.tsx` | Card com efeito 3D |
| `ColorPicker` | `ColorPicker.tsx` | Seletor de cor |
| `ConfirmationModal` | `ConfirmationModal.tsx` | Modal de confirmação |
| `FilePreviewModal` | `FilePreviewModal.tsx` | Preview de arquivo em modal |
| `GalaxyBackground` | `GalaxyBackground.tsx` | Fundo animado estilo galáxia |
| `Icons` | `Icons.tsx` | Ícones SVG personalizados |
| `ModalSkeleton` | `ModalSkeleton.tsx` | Skeleton loader para modais |
| `MultipleFileUpload` | `MultipleFileUpload.tsx` | Upload de múltiplos arquivos |
| `CollectionCoverSection` | `CollectionCoverSection.tsx` | Seção de capa da coleção no modal |
| `Tabs` | `Tabs.tsx` | Componente de abas |
| `TagInput` | `TagInput.tsx` | Campo de entrada de tags |

## Padrões de Desenvolvimento

### Props tipadas

Todos os componentes usam interfaces TypeScript explícitas para as props.

### Tailwind CSS

A estilização usa classes Tailwind CSS. Para merge de classes condicionais:

```typescript
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Combinar classes condicionalmente
const className = twMerge(clsx('base-class', isActive && 'active-class'));
```

### Componentes funcionais

Todos os componentes são funções React (sem classes):

```typescript
export const MeuComponente: React.FC<Props> = ({ prop1, prop2 }) => {
  return <div>{prop1}</div>;
};
```
