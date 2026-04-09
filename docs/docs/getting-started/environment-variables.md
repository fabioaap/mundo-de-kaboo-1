---
id: environment-variables
title: Variáveis de Ambiente
sidebar_position: 2
---

# Variáveis de Ambiente

O Mundo de Kaboo utiliza variáveis de ambiente para configurar conexões sensíveis, como o backend Supabase.

## Arquivo `.env.local`

Crie o arquivo `.env.local` na raiz do projeto (nunca o comite no Git):

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Variáveis disponíveis

| Variável | Obrigatória | Descrição |
|----------|:-----------:|-----------|
| `VITE_SUPABASE_URL` | ✅ | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Chave anônima pública do Supabase |

## Como obter as credenciais

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings → API**
4. Copie a **Project URL** e a **anon public** key

## Prefixo `VITE_`

O Vite expõe apenas variáveis de ambiente prefixadas com `VITE_` para o código do cliente. Variáveis sem esse prefixo **não são acessíveis** no navegador.

## Verificação de configuração

O arquivo `lib/supabase.ts` verifica automaticamente se as variáveis estão configuradas:

```typescript
export const isSupabaseConfigured =
  !!import.meta.env.VITE_SUPABASE_URL &&
  !!import.meta.env.VITE_SUPABASE_ANON_KEY;
```

Se `isSupabaseConfigured` for `false`, a aplicação funciona em modo offline/demo.

## Segurança

:::caution Atenção
- Nunca commite o arquivo `.env.local` no repositório
- A chave `anon` é segura para uso no cliente pois é pública por design
- Configure as políticas **Row Level Security (RLS)** no Supabase para proteger os dados
:::
