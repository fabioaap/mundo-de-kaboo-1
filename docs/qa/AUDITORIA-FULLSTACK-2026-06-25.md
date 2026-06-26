# Auditoria Full-Stack — Mundo de Kaboo

**Data:** 2026-06-25
**Auditor:** Quinn (QA / Test Architect) + 4 sub-agentes (FE / BE / DB / DevEx)
**Escopo:** Front-end (React 19/Vite), Back-end (data-access + edge functions), Banco (64 migrations + RLS), e infraestrutura de hooks/CI.
**Branch:** `claude/beautiful-hoover-76e83a` (worktree)
**Método:** read-only, evidências citadas por `arquivo:linha`. Achados não substanciados foram descartados.

---

## Gate Decision: **FAIL** 🔴

Motivo: existe uma **cadeia de exploração completa** que quebra o isolamento por marca (a garantia central do produto white-label) e permite escalonamento de privilégio. Não deve ir a produção com `central-coruja` antes de fechar os 3 CRÍTICOS.

---

## 🔴 A cadeia crítica (leia primeiro)

Três achados isolados se combinam em **comprometimento total de tenant**:

```
DB-01  usuário faz UPDATE no próprio profile → vira role='admin' e troca brand_id
   │   (política FOR UPDATE sem WITH CHECK, sem guarda de coluna)
   ▼
BE-01  ?brand=central-coruja na URL re-escopa toda a camada de dados p/ a outra marca
   │   (resolveBrandSlug lê o search param ANTES do VITE_BRAND_SLUG)
   ▼
FE-01  viewer acessa o Admin CMS via #admin (renderScreen não tem gate de role)
   ─►  RLS é a única barreira — e o DB-01 derruba a RLS, porque can_manage_brand
       e as políticas de escrita confiam em profiles.role, que o usuário controla.
```

Resultado: um usuário comum autenticado de qualquer marca pode se promover a admin, apontar o app para a outra marca, e ler/gravar o conteúdo dela pelo CMS. **A RLS não protege porque o próprio critério da RLS (`role`/`brand_id`) é editável pelo usuário.**

---

## CRÍTICOS

| ID | Título | Arquivo:linha | Correção |
|----|--------|---------------|----------|
| **DB-01** | `profiles` UPDATE sem `WITH CHECK` e sem guarda de coluna → self-escalation de `role` e troca de `brand_id`. Nunca corrigido em 64 migrations. Políticas de escrita de mídia (`t41:99,106`) confiam em `profiles.role`. | `20260101000000_initial_schema.sql:29-31` | Recriar política com `WITH CHECK (auth.uid()=id)` **+ trigger BEFORE UPDATE** que reverte `NEW.role:=OLD.role` e `NEW.brand_id:=OLD.brand_id` salvo `service_role`/super_admin. `WITH CHECK` sozinho NÃO basta. |
| **BE-01** | `?brand=` na URL sobrepõe a marca fixa do deploy. `resolveBrandSlug()` lê o search param antes do env. | `hooks/useBrandConfig.ts:147-159` → `App.tsx:509` → `lib/api.ts:104-109` | Em deploy single-brand (`VITE_BRAND_SLUG` setado), ignorar `?brand=` — só honrar no portal multi-brand. Mover o check `fromSearch` para baixo do `fromEnv`. |
| **FE-01** | `viewer` renderiza o Admin CMS via deep-link `#admin`. `renderScreen` roteia `case 'admin'` sem gate de role; `navigationAccess` só checa autenticação, não papel. | `App.tsx:1435-1443`, `screens/AdminScreen.tsx:143-158` | Gate em `renderScreen`: `accessProfile?.role` ∈ {admin,editor} senão 403/redirect; bloquear `viewer` dentro do AdminScreen até o role ser confirmado. |

---

## ALTOS

| ID | Título | Arquivo:linha | Correção |
|----|--------|---------------|----------|
| **FE-02** | Link "Gerenciar" (admin) aparece para visitante não autenticado em modo mock (env Supabase ausente → mock). | `components/BottomNav.tsx:77-85,123-131` | `canEdit` exige profile autenticado real, não fallback de mock. |
| **BE-02** | Setters white-label/voucher confiam no `brandId` do cliente sem authz de app; isolamento depende 100% da RLS. Vários nem filtram `brand_id`. | `whiteLabelAdminApi.ts:423,611,771,956`; `apiVouchers.ts:192,253,261,271` | Rotear escritas sensíveis por edge function com `can_manage_brand` (como o `ai-config-set` já faz). |
| **BE-03** | `dispatchWhiteLabelAlertTest` faz POST do browser para `webhook_url` arbitrário (sem validação/allowlist; `http://` permitido) → relay/exfil. | `whiteLabelAdminApi.ts:1112,962` | Mover dispatch p/ edge function com `can_manage_brand`; validar URL (https, allowlist, bloquear ranges internos). |
| **BE-04** | Edge functions retornam erro com HTTP 200 `{success:false}` → falhas escondidas de monitoramento; invite-user pode deixar auth user órfão sem profile. | `invite-user`, `delete-user`, `admin-list-users`, `ai-config-set`, `ai-suggest` | Retornar 4xx/5xx em falhas reais; manter 500 no catch de exceção. |
| **BE-05** | `setWhiteLabelBrandIdentity` grava cores cruas sem validação/null-guard → save antes da hidratação do form zera a paleta real (data-wipe). | `whiteLabelAdminApi.ts:516-530` | Validar cada cor (hex/CSS, não-vazio) e cair p/ valor atual quando branco, igual ao merge de `menu_config`. |
| **DB-02** | `t41`/`t43` referenciam tabelas inexistentes `public.formations`/`public.materials` (são valores de enum `media_hub`, não tabelas). Migration chain quebra em DB limpo OU schema foi aplicado fora do versionamento. | `20260620500000_t41…:32-42`, `20260620400000_t43…:6-7` | Determinar a verdade: se são tabelas reais, versionar o `CREATE TABLE … ENABLE RLS`; senão, remover as referências mortas. |
| **DB-03** | Política de escrita de `media_items` permite criação cross-brand quando o item ainda não tem links (`NOT EXISTS links → allowed`). | `20260620200000_t11…:69-113` | Adicionar `brand_id NOT NULL` em `media_items` e gatear o manage em `can_manage_brand(media_items.brand_id)`. |
| **DB-08** | `CREATE INDEX CONCURRENTLY` dentro de migration (roda em transação) → falha no apply. | `20260409000600_performance_indexes.sql:7-8` | Remover `CONCURRENTLY` (tabela pequena) ou isolar em migration sem transação. |
| **FE-05** | Loop de recheck de acesso/wrong-brand com potencial de "redirect-fight" (`access_expired ⇄ home`). 4 effects sobrepostos mutam navState. | `App.tsx:769-831,1044-1071` | Consolidar resolução acesso→destino em um único valor derivado + um effect de history-sync. |

---

## MÉDIOS

| ID | Título | Arquivo:linha |
|----|--------|---------------|
| **FE-03** | `role` client-cached é a única barreira de UI privilegiada (sem defesa em profundidade); depende da RLS (que o DB-01 quebra). | `App.tsx:1187-1191`, `lib/access.ts:25-27` |
| **FE-04** | Wrong-brand screen é pulada p/ admin/editor e depende de `brand_id` client-cached. | `App.tsx:1185-1202` |
| **FE-06** | Stale closure / dep faltando no effect de auth; `SIGNED_IN` tem updater no-op (navegação pretendida mas ausente). | `App.tsx:565-753,711-728` |
| **FE-08** | `player_book`/`tools` podem virar spinner permanente se a collection não carregar (deep-link p/ conteúdo deletado estranha o usuário). | `App.tsx:1299-1411,833-860` |
| **FE-09** | `canAccessCollection` fail-open: `grants.length===0 → true`; falha de rede no load de grants desliga o gate de upsell. | `lib/access.ts:118-126` |
| **BE-06** | Fallback de voucher dev concede acesso via `updateProfile` fora do RPC `redeem_voucher` (pula brand_mismatch/double-redeem). Confirmar gate por `import.meta.env.DEV`. | `lib/api.ts:1609-1747` |
| **BE-07** | Busca de voucher usa `ilike` com input não-escapado (`%`,`_`) → enumeração ampliada (escopo da marca). | `apiVouchers.ts:124` |
| **BE-09** | `getVoucherModelById`/`disableVoucherCode`/`getBatchVouchers` sem filtro de `brand_id` (zero defesa em profundidade). | `apiVouchers.ts:43-58,253-269` |
| **DB-04** | Conteúdo legado `brand_id IS NULL` escapa do trigger de integridade; backfill pendente é gap latente. | `content_brand_scope.sql:10-13` |
| **DB-05** | `set/get_brand_llm_secret` não chamam `can_manage_brand` (authz só no edge). | `white_label_ai.sql:14-58` |
| **DB-07** | `GRANT UPDATE ON vouchers TO authenticated` permite admin de marca resetar status de voucher fora dos RPCs (double-issue). | `grant_voucher_tables_to_authenticated.sql:21` |
| **FE-07** | `logger.error` loga em prod incondicionalmente com payloads de erro crus (possível vazamento de dado sensível). | `lib/logger.ts:18-21` |
| **FE-11** | Modais sem focus trap / Escape (a11y). | `VoucherUpsellModal.tsx`, `CollectionModal.tsx:131-151` |

---

## BAIXOS / Informativo

- **FE-13** email de suporte da Kaboo hardcoded em tela white-label (`App.tsx:1426`) — usar `support_contact_url`.
- **FE-12** `kaboo_sidebar_collapsed` não é namespaced por marca (`BottomNav.tsx:35`).
- **FE-14** `hexToRgb` duplicado em `App.tsx:1327-1360`.
- **BE-10** client Supabase placeholder silencioso quando não configurado — garantir `VITE_REQUIRE_SUPABASE=true` em prod.
- **DB-06** `emit_voucher_batch` criado sem `SET search_path` (corrigido por ALTER depois; frágil a `CREATE OR REPLACE`).
- **DB-09** `voucher_model_items` trava p/ admin se `voucher_models.brand_id` NULL.
- **DB-10** bucket `collections` é `public=true` — URLs de objeto são world-readable cross-brand (cutover p/ signed-URL pendente, decisão rastreada).

---

## Positivos confirmados (não são achados)

- `redeem_voucher`: `SELECT … FOR UPDATE` + checagens sob lock → **sem race / sem double-redeem**; `brand_mismatch` aplicado; `search_path` pinado.
- Segredos: sem chaves hardcoded; `service_role` só em edge functions; chaves LLM em Vault, nunca retornadas ao browser; CORS com allowlist.
- Todas as tabelas com `brand_id` têm RLS habilitada e políticas brand-scoped (o furo é o DB-01 no `profiles`, não a ausência de RLS nas demais).
- Portal multi-brand exposto é **by design** (deploys single-brand gateiam via `IS_SINGLE_BRAND_DEPLOYMENT`).

---

## Gaps de processo / automação (base para os hooks)

1. **CLAUDE.md mente p/ os agentes:** manda rodar `npm run lint/typecheck/test` — **nenhum dos 3 scripts existe** em `package.json`.
2. **Sem CI de validação:** só há `deploy-pages.yml` (build + smoke HTML) e `update-docs.yml`. **Testes (vitest/playwright) e tsc nunca rodam em CI.** Deploy de prod sem rodar a suíte de isolamento de marca (`white-label*.spec.ts`).
3. **`.githooks/pre-commit` nunca bloqueia** (`exit 0` fixo); só roda `update-docs` e dá `git add` em 6 docs gerados (polui commits).
4. **README de hooks fantasma:** `.claude/hooks/README.md` documenta 6+ hooks (incl. `sql-governance.py` p/ DROP/ALTER) que **não existem** — só os 2 `.cjs` estão instalados.
5. **Sem guarda de migration destrutiva** e **sem secret-scan** no commit.

→ Plano de hooks determinísticos implementado em `docs/qa/HOOKS-PLAN-2026-06-25.md`.

---

## Prioridade de remediação

1. **DB-01** (imediato — self-escalation derruba toda a RLS) — `@data-engineer`
2. **BE-01** + **FE-01** (fecham a cadeia cross-tenant) — `@dev`
3. **DB-02**, **DB-08** (migration chain quebrada / apply falha) — `@data-engineer`
4. **FE-02**, **BE-02/03/05**, **BE-06** (gate mock, authz de escrita, data-wipe, fallback voucher) — `@dev`
5. Demais MÉDIOS/BAIXOS conforme capacidade.

> Advisory: este relatório não altera código de aplicação nem aplica migrations. Correções de DB em prod exigem autorização explícita do Fábio. Push é exclusivo do `@devops`.
