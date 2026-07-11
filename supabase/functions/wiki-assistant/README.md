# wiki-assistant

Assistente de IA da wiki (Docusaurus). RAG lexical (full-text pt-BR) sobre a
documentação → LLM OpenAI-compatible (OpenRouter/OpenAI/Grok…).

## Arquitetura

```
Widget (Docusaurus)  →  Edge Function wiki-assistant  →  LLM (OpenAI-compatible)
                              │
                     search_wiki_chunks (RPC, full-text)
                              │
                        wiki_chunks (tabela)
```

- **Chave do LLM:** secret do Supabase (server-side), **nunca** no navegador.
- **Provider-agnóstico:** troca de modelo/provedor só mexendo nos secrets.
- **Sem os secrets:** a função responde `{ configured: false }` e o widget cai
  no modo demo (mock) sem erro.

## 1. Migration

Aplique `supabase/migrations/20260710000000_wiki_assistant.sql` (cria
`wiki_chunks`, a RPC de busca e o cap diário).

## 2. Secrets da função (LLM)

```bash
# Groq (api OpenAI-compatible):
supabase secrets set \
  WIKI_LLM_BASE_URL=https://api.groq.com/openai/v1 \
  WIKI_LLM_API_KEY=<sua-chave-groq> \
  WIKI_LLM_MODEL=llama-3.3-70b-versatile \
  WIKI_LLM_DAILY_CAP=500
```

> Provedor é intercambiável: para trocar, mude só `WIKI_LLM_BASE_URL` +
> `WIKI_LLM_API_KEY` + `WIKI_LLM_MODEL` (ex.: OpenAI `https://api.openai.com/v1`,
> OpenRouter `https://openrouter.ai/api/v1`). Modelos Groq atuais em
> console.groq.com/docs/models.

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existem no ambiente das funções.

## 3. Deploy da função

```bash
supabase functions deploy wiki-assistant
```

## 4. Indexar a documentação

Popula `wiki_chunks` a partir de `docs/docs/**/*.md`. Re-rode sempre que a
doc mudar.

```bash
SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<service-role> \
  node scripts/index-wiki.mjs
```

## 5. Ligar o widget (build da wiki)

O widget lê a URL do Supabase + a anon key (pública) via env na build do docs:

```bash
WIKI_SUPABASE_URL=<url> WIKI_SUPABASE_ANON_KEY=<anon-key> \
  npm --prefix docs run build
```

Sem essas envs, o widget fica em modo demo. Com elas, chama a função real.

## Segurança / custo

- A função é alcançável pela internet: protegida por **allowlist de origem**
  (CORS), **anon key** (gateway do Supabase) e **cap diário** (`WIKI_LLM_DAILY_CAP`).
- Cada pergunta = 1 chamada paga ao provedor. Ajuste o cap conforme o uso.
- Upgrade futuro: trocar full-text por **pgvector** (embeddings) é aditivo — a
  RPC `search_wiki_chunks` vira busca vetorial sem mudar o widget nem a função.
