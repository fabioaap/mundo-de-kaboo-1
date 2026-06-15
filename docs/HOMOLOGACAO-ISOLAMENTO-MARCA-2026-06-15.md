# Homologação — Isolamento por Marca (Kaboo × Central Coruja)

> Gate P0 de go-live. Data: 2026-06-15. Método: auditoria de RLS/GRANT + simulação de acesso cross-brand no banco de produção (read-only).

## Veredito

**CORE: APROVADO ✅** — o conteúdo real (coleções, personagens, formações, materiais, vouchers) está isolado por marca, comprovado por simulação cross-brand de leitura e escrita.

**CONDICIONAL ⚠️** — o subsistema de **mídia/recursos** (mini-YouTube/Spotify, ainda não lançado) tem políticas sem escopo de marca. **Sem vazamento ativo hoje** (tabelas vazias/draft, sem usuários Central Coruja), mas precisa ser fechado **antes** de (a) publicar mídia ou (b) criar usuários da Central Coruja.

## Modelo de isolamento

- **Marcas:** `kaboo` (`296eab71`), `central-coruja` (`bb43daa4`).
- **Leitura (viewer):** conteúdo visível quando `is_published = true AND brand_id = (profiles.brand_id do usuário)`.
- **Escrita (admin/editor):** gated por `can_manage_brand(brand_id)` = super admin **ou** linha em `brand_admin_memberships` para aquela marca + `profiles.role IN ('admin','editor')`.

## Evidências (simulação no banco)

| Teste | Resultado |
|-------|-----------|
| Viewer Kaboo lê coleções | **9 Kaboo, 0 Central Coruja** (Coruja tem 21) ✅ |
| Viewer Kaboo: characters/formations/materials | só da marca; voucher_models invisível ✅ |
| Admin **kaboo-only** (`max@educacross`) gerencia Coruja | `manages_kaboo=true`, `manages_coruja=false`, 0 coleções Coruja ✅ |
| `can_manage_brand` em SECURITY DEFINER | bypassa RLS interna corretamente; escopo por membership ✅ |

## Tabelas brand-scoped (APROVADO)

`collections`, `characters`, `formations`, `materials`, `vouchers`, `voucher_models`, `voucher_batches`, `brand_settings`, `brand_routes`, `brand_feature_overrides`, `audit_log`, `profiles` — todas com `brand_id` + RLS que filtra por marca. RLS habilitada em **todas** as tabelas do schema público.

## 🔴 Gaps latentes (fechar antes do go-live de mídia / usuários Coruja)

| # | Tabela | Política atual | Risco | Correção proposta |
|---|--------|----------------|-------|-------------------|
| 1 | `media_items` | SELECT permite `access_mode='active_subscription'` para **qualquer** usuário ativo, sem filtro de marca | Usuário ativo de uma marca leria mídia publicada de outra | Escopar via `media_collection_links → collections.brand_id` (ou adicionar `brand_id` à tabela). Hoje: 26 linhas, **todas `draft`** → inerte. |
| 2 | `collection_resources` | SELECT `USING (true)` (qualquer autenticado lê tudo) | Sem escopo algum | Escopar pela coleção-pai (`collection_resources.collection_id → collections`, que já é RLS por marca). Hoje: **0 linhas**. |
| 3 | `media_collection_links` | SELECT `USING (true)` | Metadados de vínculo mídia↔coleção cross-brand | Escopar via `collection_id → collections`. Usado pelo "collection-backed hub" — exige teste. |
| 4 | `media_shelves` / `media_shelf_items` | SELECT só por `is_published` | Estrutura de prateleiras cross-brand | Sem `brand_id` na tabela → decisão de schema (adicionar `brand_id` ou vincular a coleção). Hoje: **0 linhas**. |

## Observações (não-bloqueantes)

- **`admin@mundodekaboo.dev` é admin das DUAS marcas** (membership em ambas). É a conta dev/owner — confirmar se intencional. Todos os demais admins/editores são **kaboo-only** (isolados corretamente).
- **1 viewer com `brand_id = NULL`** → não enxerga conteúdo de marca nenhuma. Atribuir marca ou limpar (provável artefato de teste).
- **Central Coruja tem 21 coleções mas ZERO admins/editores/viewers.** Não é problema de isolamento — é o gate P0 "Catálogo/operação real da Central Coruja".

## Recomendação

1. Fechar os gaps 1–4 com migration de RLS (escopo por marca via coleção-pai) **antes** de publicar mídia ou onboard de usuários Coruja. Gaps 2 e 4 são baratos (tabelas vazias); 1 e 3 exigem teste por tocarem o hub de mídia.
2. Revisar a conta dual-brand `admin@mundodekaboo.dev`.
3. Limpar/atribuir o viewer com `brand_id` nulo.
