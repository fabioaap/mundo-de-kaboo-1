---
id: use-debounce
title: useDebounce
sidebar_position: 5
---

# useDebounce

**Arquivo:** `hooks/useDebounce.ts`

## Descrição

Aplica debounce a um valor, retornando o valor atualizado somente após um período de inatividade. Útil para evitar chamadas excessivas à API durante a digitação.

## Assinatura

```typescript
function useDebounce<T>(value: T, delay: number): T
```

## Parâmetros

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `value` | `T` | Valor a ser "debouncado" |
| `delay` | `number` | Tempo em milissegundos de espera |

## Retorno

O valor debounced — atualiza somente após `delay` ms sem mudanças.

## Uso

```tsx
import { useDebounce } from '../hooks/useDebounce';

function SearchScreen() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery) {
      // Chamada à API ou filtro local
      performSearch(debouncedQuery);
    }
  }, [debouncedQuery]);

  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Buscar coleções..."
    />
  );
}
```

## Implementação

```typescript
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```
