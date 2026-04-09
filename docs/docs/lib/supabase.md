---
id: supabase
title: lib/supabase.ts
sidebar_position: 3
---

# Supabase Client (`lib/supabase.ts`)

Inicializa e exporta o cliente Supabase utilizado em toda a aplicação.

## Exports

### `supabase`

Instância do cliente Supabase criada com `createClient`.

```typescript
import { supabase } from '../lib/supabase';

// Exemplo: buscar dados
const { data, error } = await supabase
  .from('collections')
  .select('*');

// Exemplo: autenticação
const { data: { session } } = await supabase.auth.getSession();
```

---

### `isSupabaseConfigured`

Booleano que indica se as variáveis de ambiente estão configuradas.

```typescript
import { isSupabaseConfigured } from '../lib/supabase';

if (!isSupabaseConfigured) {
  console.warn('Supabase não está configurado!');
}
```

**Uso no App.tsx:** Antes de chamar qualquer API, o app verifica `isSupabaseConfigured`. Se for `false`, pula a verificação de sessão.

## Comportamento sem configuração

Quando as variáveis de ambiente não estão definidas:
- `isSupabaseConfigured` é `false`
- O cliente é criado com valores placeholder (`https://placeholder.supabase.co`)
- Isso evita erros de runtime ao instanciar o cliente
- Um aviso é exibido no console em modo de desenvolvimento

## Variáveis de ambiente necessárias

| Variável | Descrição |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima pública |

Veja [Variáveis de Ambiente](../getting-started/environment-variables) para mais detalhes.
