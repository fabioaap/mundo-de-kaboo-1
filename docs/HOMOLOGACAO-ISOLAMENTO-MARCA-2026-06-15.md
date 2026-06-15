# Homologação — Isolamento por Marca (Kaboo × Central Coruja)

> Gate P0 de go-live. Data: 2026-06-15. Método: auditoria de RLS/GRANT + simulação de acesso cross-brand no banco de produção (read-only).

## Veredito

**CORE: APROVADO ✅** — o conteúdo real (coleções, personagens, formações, materiais, vouchers) está isolado por marca, comprovado por simulação cross-brand de leitura e escrita.

**LEITURA: APROVADO ✅** — os gaps de leitura do subsistema de mídia (mini-YouTube/Spotify, ainda não lançado) foram **fechados** em 2026-06-15 (migration `20260615170000_brand_scope_media_rls.sql`). Resta apenas um follow-up 🟡 não-bloqueante: as policies de **gestão** (admin) de mídia ainda são cross-brand no nível admin — estreitar quando a feature de mídia for construída.

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

## ✅ Gaps de leitura — FECHADOS (2026-06-15)

Migration `20260615170000_brand_scope_media_rls.sql` (aplicada em prod) brand-escopou as políticas de **leitura** (`authenticated`) do subsistema de mídia, via a coleção-pai (espelhando a policy de `collections`):

| # | Tabela | Antes | Depois |
|---|--------|-------|--------|
| 1 | `media_items` | branch `active_subscription` sem filtro de marca | viewer só lê mídia publicada ligada a uma coleção **publicada da sua marca** |
| 2 | `collection_resources` | SELECT `USING(true)` | escopado pela coleção-pai (marca) |
| 3 | `media_collection_links` | SELECT `USING(true)` | escopado pela coleção vinculada (marca) |
| 4 | `media_shelves` / `media_shelf_items` | só `is_published` | adicionada coluna `brand_id` em `media_shelves`; leitura escopada por marca |

**Verificação pós-fix (simulação):** viewer Kaboo continua vendo 9 coleções (sem regressão) e **0** linhas das tabelas de mídia (draft/não-lançado); admin Kaboo mantém acesso aos 26 drafts + 7 links (workflow intacto, policies de gestão não alteradas).

### 🟡 Follow-ups (não-bloqueantes, ligados à épica de mídia)
- As policies de **gestão** (admin/editor `ALL`) de `media_items`/`media_collection_links`/`media_shelves`/`media_shelf_items` ainda usam `EXISTS profiles admin/editor` (qualquer admin) — visibilidade/escrita cross-brand no nível admin. Estreitar para `can_manage_brand` quando a feature de mídia for construída (interage com o fluxo criar-depois-vincular).
- `media_shelves.brand_id` precisa ser preenchido na criação quando a feature lançar.

## Observações (não-bloqueantes)

- **`admin@mundodekaboo.dev` é admin das DUAS marcas** (membership em ambas). É a conta dev/owner — confirmar se intencional. Todos os demais admins/editores são **kaboo-only** (isolados corretamente).
- **1 viewer com `brand_id = NULL`** → não enxerga conteúdo de marca nenhuma. Atribuir marca ou limpar (provável artefato de teste).
- **Central Coruja tem 21 coleções mas ZERO admins/editores/viewers.** Não é problema de isolamento — é o gate P0 "Catálogo/operação real da Central Coruja".

## Recomendação

1. ✅ **FEITO** — gaps de leitura fechados (migration `20260615170000`).
2. 🟡 Estreitar as policies de **gestão** de mídia (admin/editor `ALL`) para `can_manage_brand` quando a feature de mídia for construída.
3. Revisar a conta dual-brand `admin@mundodekaboo.dev` (confirmar se deve administrar as duas marcas).
4. Limpar/atribuir o viewer com `brand_id` nulo.
