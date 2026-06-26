# Plano de Correção — Caminho Crítico (Opção A)

**Data:** 2026-06-26
**Base:** [Auditoria Full-Stack](./AUDITORIA-FULLSTACK-2026-06-25.md) + antítese (plan-eng-review)
**Escopo escolhido:** caminho crítico mínimo + testabilidade. Sweep completo e lacunas de cobertura ficam para fase posterior.

## Reframe da antítese (o que mudou vs a auditoria)

| Achado | Auditoria | Antítese (verificado em código) |
|--------|-----------|--------------------------------|
| BE-01 `?brand=` | CRÍTICO | Para viewer normal → resultado **vazio**, não vazamento (reads filtram por brand do cliente, RLS intersecta com `profile.brand_id`, `api.ts:227`). Rebaixa p/ hardening **exceto** formations/materials |
| FE-01 viewer no admin | CRÍTICO | Sem DB-01, viewer vê shell vazio (RLS bloqueia dados). Rebaixa p/ hardening/UX |
| **DB-01** profiles UPDATE | CRÍTICO | **Continua o ÚNICO breach real** — troca do próprio `brand_id`/`role` faz a RLS devolver linhas da outra marca |
| **DB-02** formations/materials | ALTO (hygiene) | **ELEVADO** — sem `CREATE TABLE` no versionamento mas consultadas em runtime (`api.ts:3372,3435`). Validação ao vivo (2026-06-26): RLS brand-scoped OK em prod → **não é leak vivo**, mas é blocker de rebuild |
| Testabilidade | gap de processo | **Pré-requisito de confiança** — RLS não é testada em runner nenhum; fix de DB-01 regride em silêncio |

## Sequência (pré-requisitos → crítico → verificação → hardening)

```
FASE 0 (desbloqueio)      FASE 1 (testes)         FASE 2 (crítico)      FASE 3 (hardening)
reconciliar prod↔migr  ─► test:rls local      ─► DB-01 fix         ─► BE-01 / FE-01 / FE-02
DB-02 (capturar)          +pgTAP cadeia          (policy+trigger)      DB-10 signed-url plan
DB-08 (sem CONCURRENTLY)   no CI                  verificado por F1
```

### FASE 0 — Reconciliação e rebuild limpo (bloqueia tudo)
- **R0.1** Reconciliar prod ↔ migrations: confirmar schema/RLS real de formations/materials. **FEITO** (introspecção read-only 2026-06-26): tabelas existem, RLS on, brand-scoped.
- **R0.2 DB-02** — `20260620390000_t40_capture_formations_materials.sql` (back-dated, no-op em prod).
- **R0.3 DB-08** — removido `CONCURRENTLY` em `20260409000600_performance_indexes.sql`.

### FASE 1 — Lane de testabilidade (pré-requisito de confiança)
- `test:rls` + `supabase/tests/rls_profiles_guard.sql` cobrindo a cadeia: (a) viewer não muda o próprio role; (b) não troca brand_id já setado; (c) SELECT cross-brand = 0 linhas; (d) atribuição inicial null→valor funciona. Job `rls-tests` no `ci.yml`.

### FASE 2 — DB-01 (o crítico real)
- `20260626000000_t50_profiles_privilege_guard.sql`: política UPDATE com WITH CHECK + trigger que congela role e brand_id já atribuído. Permite `null→valor` (não quebra `redeem_voucher` t22:59). Aplicar em prod só após F1 verde + @data-engineer.

### FASE 3 — Fast-follow hardening
- **BE-01** ignorar `?brand=` single-brand (`useBrandConfig`). **FE-01** role-gate no renderScreen (`App.tsx`). **FE-02** canEdit exige profile real (`BottomNav`). **DB-10** cutover signed-URL do bucket.

## NÃO no escopo (Opção A)
BE-03 (webhook SSRF), BE-05 (data-wipe paleta), BE-06 (voucher dev-fallback), C2 offline, C3 realtime, C4 deps, C5 auth flows, FE-11 a11y → backlog (issue de hardening).

## O que já existe (reuso)
`supabase/tests/rls_brand_isolation.sql`, `is_white_label_super_admin`/`can_manage_brand`, `IS_SINGLE_BRAND_DEPLOYMENT`, `ci.yml` + `scripts/qa/check-staged.mjs`, `.claude/hooks/sql-governance.cjs`.

## Modos de falha (críticos)
| Cenário | Coberto por | Sem cobertura |
|---------|-------------|---------------|
| Fix DB-01 quebra promoção legítima de admin | F2.1 + T1.2 | admin não promove (silencioso) |
| Reconciliação versiona RLS incompleta | T1.2(c) | leak cross-brand silencioso |
| Trigger bloqueia update de coluna segura | T1.2 + revisão policy | usuário não edita perfil |

## Authority / gates
- DB em prod: autorização explícita do Fábio + `@data-engineer`.
- Implementação: `@dev`. Push/PR: `@devops`. QA: advisory.

## Implementation Tasks (issues)
T1=#52 (DB-01), T2=#53 (DB-02/DB-08), T3=#54 (pgTAP), T4=#55 (BE-01), T5=#56 (FE-01), T6=#57 (FE-02), T7=#58 (DB-10), T8=#59 (backlog), +#60 (testes pré-existentes).
