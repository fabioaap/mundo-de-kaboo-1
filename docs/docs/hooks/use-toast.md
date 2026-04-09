---
id: use-toast
title: useToast
sidebar_position: 6
---

# useToast

**Arquivo:** `hooks/useToast.ts`

## Descrição

Hook para gerenciar o estado de notificações toast (mensagens temporárias).

## Retorno

```typescript
interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  isVisible: boolean;
}

interface UseToastReturn {
  toast: ToastState;
  showToast: (message: string, type?: ToastState['type']) => void;
  hideToast: () => void;
}

const { toast, showToast, hideToast } = useToast();
```

## Uso

```tsx
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/Toast';

function AdminScreen() {
  const { toast, showToast } = useToast();

  const handleSave = async () => {
    try {
      await api.updateCollection(id, data);
      showToast('Coleção salva com sucesso!', 'success');
    } catch {
      showToast('Erro ao salvar a coleção', 'error');
    }
  };

  return (
    <>
      <button onClick={handleSave}>Salvar</button>
      <Toast {...toast} />
    </>
  );
}
```

## Comportamento

- O toast desaparece automaticamente após **3 segundos** (via `setTimeout`)
- Chamar `showToast` enquanto um toast está visível substitui o atual
- O tipo padrão é `'info'` se não especificado

## Componente relacionado

Veja [`Toast`](../components/toast) para a documentação do componente de renderização.
