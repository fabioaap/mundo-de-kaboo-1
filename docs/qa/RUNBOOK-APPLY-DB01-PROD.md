# Runbook — Apply em prod do DB-01 (+ DB-02 no-op)

**Data:** 2026-06-26
**Autor:** Quinn (QA) — para revisão de @data-engineer + Fábio
**Projeto prod:** Supabase `yevysgqlnhonhkczkyhu` (mundo-de-kaboo, sa-east-1)
**Status do fix:** DB-01 já **validado** contra o schema real de prod via transação revertida (ataque role/brand bloqueado; null→valor permitido).

> ⚠️ **Gate:** este runbook NÃO foi executado. Requer autorização explícita do Fábio + @data-engineer presente. Push remoto / merge é exclusivo do @devops.

---

## 1. Escopo real (o que muda em prod)

| Migration | Efeito em PROD | Observação |
|-----------|----------------|------------|
| `20260626000000_t50_profiles_privilege_guard.sql` (**DB-01**) | **MUDA** — cria política UPDATE com WITH CHECK + trigger guard | É o único change real. Já validado. |
| `20260620390000_t40_capture_formations_materials.sql` (DB-02) | **no-op** — `CREATE TABLE IF NOT EXISTS` (tabelas já existem em prod) | Só importa p/ rebuild limpo |
| `20260409000600_performance_indexes.sql` (DB-08) | sem efeito novo | Edição só remove `CONCURRENTLY` p/ rebuild |

**Conclusão:** o apply em prod é, na prática, **aplicar o trigger/policy do DB-01**. Os demais são para reprodutibilidade de ambiente limpo.

---

## 2. Pré-flight (checklist antes de aplicar)

- [ ] @data-engineer presente + Fábio autorizou explicitamente nominando prod.
- [ ] Janela de baixo tráfego (o apply pega `ACCESS EXCLUSIVE` em `profiles` por <1s; tabela tem ~28 linhas).
- [ ] Ponto de backup/restore do Supabase anotado (Painel → Backups) imediatamente antes.
- [ ] Confirmar que nenhum fluxo legítimo muda `role`/`brand_id` pela sessão anon do usuário (já auditado: invite-user/admin usam service_role; redeem_voucher usa null→valor). 
- [ ] `redeem_voucher` smoke planejado para depois (item 5).

---

## 3. Aplicação

### Opção A — `supabase db push` (recomendado, mantém o histórico de migrations)
Aplica só as migrations ausentes na tabela `supabase_migrations.schema_migrations` de prod (não re-roda as antigas → o rebuild rot do #61 não afeta).

```bash
# @devops, com a CLI linkada ao projeto prod:
supabase link --project-ref yevysgqlnhonhkczkyhu   # se ainda não linkado
supabase db push                                    # aplica 20260620390000 (no-op) + 20260626000000 (DB-01)
```
- `20260620390000` → no-op (IF NOT EXISTS).
- `20260626000000` → cria a policy + trigger guard.

### Opção B — aplicar só o DB-01 via MCP/SQL (fallback)
Se preferir aplicar pontualmente sem `db push`, rodar o conteúdo de `supabase/migrations/20260626000000_t50_profiles_privilege_guard.sql` (policy + função + trigger). Idempotente (`DROP ... IF EXISTS` + `CREATE OR REPLACE`).

---

## 4. Verificação pós-apply (read-only / revertida — seguro)

### 4.1 Catálogo: trigger + WITH CHECK existem
```sql
select
  (select count(*) from pg_trigger where tgname='trg_guard_profile_privilege' and tgrelid='public.profiles'::regclass) as trigger_ok,
  (select count(*) from pg_policies where schemaname='public' and tablename='profiles' and cmd='UPDATE' and with_check is not null) as with_check_ok;
-- esperado: trigger_ok=1, with_check_ok=1
```

### 4.2 Ataque bloqueado (transação revertida — não persiste)
```sql
begin;
  set local role authenticated;
  select set_config('request.jwt.claims','{"sub":"<UM_VIEWER_REAL>","role":"authenticated"}', true);
  update public.profiles set role='admin' where id='<UM_VIEWER_REAL>';
  reset role;
  select set_config('request.jwt.claims','', true);
  select role as deve_continuar_viewer from public.profiles where id='<UM_VIEWER_REAL>';
rollback;
-- esperado: role = 'viewer' (guard reverteu)
```

---

## 5. Smoke pós-apply — garantir que NÃO quebrou o voucher

Resgatar um voucher de teste com uma conta **sem brand** (primeira redenção) e confirmar que `brand_id` é atribuído (null→valor). Se a conta receber o brand e o acesso normalmente, o guard está compatível com `redeem_voucher`. (Já validado em txn revertida, este é o smoke real em fluxo.)

---

## 6. Rollback

Se o guard causar regressão comprovada (ex.: algum fluxo legítimo não previsto bloqueado):
```sql
-- de supabase/migrations/rollback/20260626000000_t50_profiles_privilege_guard.down.sql
drop trigger if exists trg_guard_profile_privilege on public.profiles;
drop function if exists public.guard_profile_privilege_columns();
drop policy if exists "Usuário atualiza o próprio perfil" on public.profiles;
create policy "Usuário atualiza o próprio perfil" on public.profiles for update using (auth.uid() = id);
```
⚠️ Reverter **reabre** o self-escalation do DB-01. Só fazer com causa concreta.

---

## 7. Ordem resumida
1. Pré-flight (seção 2) + backup point.
2. `supabase db push` (ou Opção B).
3. Verificar 4.1 + 4.2 (esperado: trigger_ok=1, with_check_ok=1, role continua viewer).
4. Smoke de voucher (seção 5).
5. Se algo regredir → rollback (seção 6) + investigar.

> Follow-ups que NÃO bloqueiam este apply: #60 (testes unit pré-existentes), #61 (rebuild limpo / lane rls-tests), specs e2e white-label.
