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
| **Data** | 2026-07-13 (revisado após auditoria de código) |
| **Itens de backlog** | [Vitrine / Remoção de mocks](../roadmap-historico/roadmap) · [Doc-sync / limpeza](../roadmap-historico/roadmap) |

## ⚠️ São dois mocks diferentes — não confundir

| | **Mock A — fallback de dados** | **Mock B — vitrine de mídia** |
|---|---|---|
| **Onde** | `lib/mockData.ts`, `lib/mockVoucherData.ts`, `data/catalog.seed.json`, `devMockSession` em `lib/api.ts` | `data/library-hubs` (`LIBRARY_HUB_MOCKS`), importado em `screens/LibraryHubScreen.tsx` |
| **Aparece pro usuário em prod?** | ❌ **Não** — gated por `import.meta.env.DEV` (`lib/api.ts:133`) | ❌ **Não como conteúdo** — a vitrine é data-driven: `shouldUseMediaApi = true` fixo (`LibraryHubScreen.tsx:912`), itens vêm de `api.getMediaHub`. Sobra só título/filtros de config estática + código morto |
| **Natureza** | Tech-debt interno (dev/testes/resiliência) | **Faxina de código morto** (o `mockFlattenedItems` nunca roda) |

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

## Mock B — Resíduo do `LIBRARY_HUB_MOCKS` na vitrine

> **⚠️ Correção (2026-07-13):** versões anteriores deste ADR diziam que a estrutura editorial
> hardcoded aparecia pro usuário em produção. **O código desmente isso.** A vitrine passou a ser
> data-driven; o mock virou majoritariamente código morto. Registrado aqui para não se re-investigar.

`screens/LibraryHubScreen.tsx` (hubs de Áudios/Vídeos/Formações/Materiais) importa `LIBRARY_HUB_MOCKS`
(`data/library-hubs`), mas a fonte de dados é **fixada em real**:

```ts
const shouldUseMediaApi = true; // LibraryHubScreen.tsx:912
```

Com isso os **itens, rails e cards** vêm sempre de `api.getMediaHub` (backbone `media_items` +
`media_shelves`). Os arrays só cairiam em `mockFlattenedItems` no ramo `!shouldUseMediaApi`
(`:994`, `:997`) — que **nunca executa**.

### O que o mock ainda alimenta (resíduo, não conteúdo)
- `config.title` — texto do **título do hub** no header (`:1687`)
- `config.quickFilters` — rótulos de filtro de **fallback** (`:1060`)
- `mockFlattenedItems` — computado mas **morto** (`:928`)

### Fallback de resiliência (legítimo, não é curadoria fake)
Se a API não responde, `mediaSourceStatus === 'fallback'` exibe o aviso
*"Exibindo catálogo de apoio enquanto os dados remotos não respondem"* (`:1848-1851`).
É rede de segurança de dados — não a "curadoria editorial fake" que o ADR temia.

### Recomendação (Mock B) — rebaixado para faxina
**Não é mais product-debt.** Vira **limpeza de código morto**, sem risco de produto:
1. Remover o import/uso de `LIBRARY_HUB_MOCKS` e o `mockFlattenedItems`.
2. Migrar `config.title` / `config.quickFilters` para constante local (ou vir do backbone).
3. Deletar `data/library-hubs` quando nada mais o referenciar.

A **curadoria configurável no admin** (quais rails, ordem, destaques) segue como item de **produto**
legítimo no [roadmap](../roadmap-historico/roadmap) — mas é evolução, não correção de mock.

## Consequências

- **Mock A:** manter não tem custo de produto; remover exige cuidado (testes + resiliência).
- **Mock B:** a vitrine já é data-driven — **nenhuma curadoria fake em prod**. O que resta é código
  morto de baixo risco; limpar quando conveniente.
