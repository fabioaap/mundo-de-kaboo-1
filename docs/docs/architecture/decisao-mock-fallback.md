---
id: decisao-mock-fallback
title: Decisão — Mocks (dados & vitrine)
sidebar_position: 8
---

# Decisão — Mocks: fallback de dados & vitrine de mídia

> **Registro de decisão de arquitetura (ADR).** Documenta os **dois** tipos de mock do produto
> — que são coisas diferentes — para tomada de decisão futura.

| Campo | Valor |
|---|---|
| **Status** | 🟡 Proposto — aguardando decisão |
| **Data** | 2026-07-12 |
| **Itens de backlog** | [Vitrine / Remoção de mocks](../roadmap-historico/roadmap) · [Doc-sync / limpeza](../roadmap-historico/roadmap) |

## ⚠️ São dois mocks diferentes — não confundir

| | **Mock A — fallback de dados** | **Mock B — vitrine de mídia** |
|---|---|---|
| **Onde** | `lib/mockData.ts`, `lib/mockVoucherData.ts`, `data/catalog.seed.json`, `devMockSession` em `lib/api.ts` | `data/library-hubs` (`LIBRARY_HUB_MOCKS`), consumido em `screens/LibraryHubScreen.tsx` |
| **Aparece pro usuário em prod?** | ❌ **Não** — gated por `import.meta.env.DEV` (`lib/api.ts:133`) | ⚠️ **Sim, parcialmente** — a estrutura editorial (rails, chips, stat cards) é hardcoded e sem gate de DEV (`LibraryHubScreen.tsx:901`) |
| **Natureza** | Tech-debt interno (dev/testes/resiliência) | **Product debt** — curadoria fake |

---

## Mock A — Fallback de dados (dev / testes / resiliência)

Quando o Supabase não está configurado (ou numa sessão de dev), `lib/api.ts` e
`hooks/useBrandConfig.ts` retornam dados de `lib/mockData.ts` / `data/catalog.seed.json`.

**Não é user-facing:** `devMockSession` é `import.meta.env.DEV && …` (`lib/api.ts:133`) — sempre
falso em build de produção. Em prod, o catálogo é 100% Supabase.

### 3 propósitos vivos
1. **Dev sem backend** — rodar local sem `.env`.
2. **Resiliência em prod** — `buildMockBootstrap` segura o tema se o RPC `get_brand_bootstrap`
   falhar (`useBrandConfig.ts:386`). **Roda em prod.**
3. **Substituto de backend nos testes unitários** — a suíte `*.regression-*.test.ts` liga o mock
   (`sessionStorage['kaboo_dev_mock_session']='1'`) para rodar sem banco. É o que permite
   `npm run test:unit` no CI.

### O que o banco de homologação substitui
| Propósito | Staging resolve? |
|---|---|
| Dev/homologação | ✅ Sim — aponta pro staging |
| Resiliência em prod | ❌ Não — decisão à parte |
| Testes unitários | ❌ Não — bater em banco em teste **unitário** é anti-padrão; o certo é test-double (vitest/MSW) |

### Recomendação (Mock A)
**Tech-debt opcional, sem urgência** — prod nunca usa. Quando o staging ativar: remover os caminhos
de dev/homologação, migrar os testes para test-doubles limpos, e decidir separadamente o fallback de
resiliência. **Não é "deletar 2 arquivos".**

---

## Mock B — Estrutura editorial da vitrine de mídia

`screens/LibraryHubScreen.tsx` (hubs de Áudios/Vídeos/Formações/Materiais) monta os **rails,
chips editoriais** ("Roda", "Acolhimento"), **stat cards** ("03 faixas") e progress bars a partir de
`LIBRARY_HUB_MOCKS` (`data/library-hubs`), **hardcoded e sem gate de DEV** (`LibraryHubScreen.tsx:901`).

**Nuance importante:** a tela também tem adapters de dados reais
(`flattenMediaHubResponseToLibraryItems`, `adaptMediaCardToLibraryItem`). Quando o **backbone de
mídia** (`media_items` + `media_shelves`) tem conteúdo publicado para o hub, os itens/rails vêm do
banco; **quando não tem, cai na estrutura hardcoded** — que então aparece pro usuário em produção.

### Por que existe
A curadoria (quais rails, com que nome, quais itens em destaque) ainda não tem fonte de dados nem UI
de admin. O mock preenche esse vazio visual.

### Recomendação (Mock B)
**Product debt real — manter como item de produto** (não rebaixar). É o que o backlog
[Vitrine / Remoção de mocks](../roadmap-historico/roadmap) descreve, em fases:
1. Stat cards dinâmicos (contagem real).
2. Rails dinâmicos sem estrutura editorial hardcoded.
3. Curadoria configurável no admin (tabela + UI) — depende de decisão de produto (curadoria manual
   vs automática vs híbrida).

## Consequências

- **Mock A:** manter não tem custo de produto; remover exige cuidado (testes + resiliência).
- **Mock B:** enquanto não for feito, hubs de mídia **sem conteúdo publicado** mostram curadoria
  fake em produção. Priorizar conforme a estratégia de conteúdo das marcas.
