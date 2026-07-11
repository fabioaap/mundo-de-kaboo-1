---
id: 2026-07-doc-sync-flow
title: 2026-07-11 — Flow de doc-sync (gate + rascunho de changelog por IA)
sidebar_position: 3
---

# 2026-07-11 — Flow de doc-sync

**Áreas:** CI/CD, documentação, assistente de IA.

## Contexto

A wiki precisa ficar **sempre atualizada** — quando o código muda, a doc (e o
índice do assistente) tem que acompanhar. Antes disso não havia nada forçando a
atualização: dava pra mergear código sem tocar na wiki, e o assistente respondia
com base num índice defasado.

## Mudanças (antes → depois)

### Camada 1 — determinística
- **Gate de frescor no PR** — `scripts/wiki/doc-gate.mjs` compara `main...HEAD`.
  *Antes:* código podia entrar sem doc. *Depois:* se código mudou
  (`screens/`, `components/`, `hooks/`, `lib/`, `supabase/`, `App.tsx`, `types.ts`)
  e nenhum doc em `docs/docs/` mudou, o CI **falha**.
- **Re-index automático** — no merge para `main` com mudança em `docs/docs/**`,
  o workflow roda `scripts/index-wiki.mjs` e atualiza o índice do assistente
  (`wiki_chunks`). *Antes:* re-index manual. *Depois:* automático.
- Orquestrado por `.github/workflows/wiki-sync.yml`.

### Camada 2 — rascunho por IA
- **Função `wiki-draft`** (Edge Function) — recebe o diff do PR e devolve uma
  entrada de changelog rascunhada (contexto + antes→depois + arquivos). A chave
  do LLM (Groq) fica **só no Supabase**; a CI usa apenas a anon key (pública).
- **`scripts/wiki/draft-changelog.mjs`** — a CI calcula o diff, chama a função e,
  quando o gate reprova, **comenta o rascunho no PR** para revisão humana.
  *Antes:* o autor escrevia o changelog do zero. *Depois:* a IA sugere um
  rascunho pronto; o humano revisa e aplica.

## Arquivos

| Arquivo | Papel |
|---------|-------|
| `.github/workflows/wiki-sync.yml` | Orquestra gate + rascunho + re-index |
| `scripts/wiki/doc-gate.mjs` | Gate de frescor (código sem doc → falha) |
| `scripts/wiki/draft-changelog.mjs` | Chama a `wiki-draft` e emite o rascunho |
| `supabase/functions/wiki-draft/index.ts` | Gera o changelog via LLM (server-side) |
| `scripts/index-wiki.mjs` | Indexa/atualiza o RAG do assistente |

## Configuração necessária

- **Secrets no GitHub Actions** (job `reindex`): `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`.
- **Variables no GitHub Actions** (job `gate`, Camada 2 — valores **públicos**):
  `WIKI_SUPABASE_URL`, `WIKI_SUPABASE_ANON_KEY`.
- Secrets no Supabase (já configurados para o assistente): `WIKI_LLM_BASE_URL`,
  `WIKI_LLM_API_KEY`, `WIKI_LLM_MODEL`, `WIKI_LLM_DAILY_CAP`.
