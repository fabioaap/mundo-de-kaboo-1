---
id: toast
title: Toast
sidebar_position: 7
---

# Toast

**Arquivo:** `components/Toast.tsx`

## Descrição

Componente de notificações temporárias (toast messages). Exibido no canto superior ou inferior da tela por alguns segundos e então desaparece automaticamente.

## Uso com o hook `useToast`

O componente `Toast` é controlado pelo hook [`useToast`](../hooks/use-toast):

```typescript
// No componente pai
const { toast, showToast } = useToast();

// Mostrar uma notificação
showToast('Coleção salva com sucesso!', 'success');
showToast('Erro ao fazer upload', 'error');
showToast('Processando...', 'info');

// Renderizar
return (
  <>
    {/* seu conteúdo */}
    <Toast {...toast} />
  </>
);
```

## Tipos de Toast

| Tipo | Cor | Uso |
|------|-----|-----|
| `success` | 🟢 Verde | Operação concluída com sucesso |
| `error` | 🔴 Vermelho | Erro ou falha |
| `info` | 🔵 Azul | Informação neutra |
| `warning` | 🟡 Amarelo | Aviso |

## Props do componente

```typescript
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  isVisible: boolean;
}
```

## Comportamento

- Aparece com animação de entrada
- Desaparece automaticamente após 3 segundos (configurável)
- Posicionado fixo no topo da tela (mobile) ou canto superior direito (desktop)
