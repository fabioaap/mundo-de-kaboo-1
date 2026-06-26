-- ROLLBACK de 20260626000000_t50_profiles_privilege_guard.sql (DB-01)
-- ⚠️ DOCUMENTAÇÃO — não roda automaticamente. Execute manualmente se precisar reverter.
--
-- Reverte para a política original (sem WITH CHECK) e remove o trigger/função guard.
-- ATENÇÃO: reverter REABRE o self-escalation de role/brand_id. Só faça se o guard
-- estiver causando regressão comprovada (ex.: bloqueando um fluxo legítimo não previsto).

DROP TRIGGER IF EXISTS trg_guard_profile_privilege ON public.profiles;
DROP FUNCTION IF EXISTS public.guard_profile_privilege_columns();

DROP POLICY IF EXISTS "Usuário atualiza o próprio perfil" ON public.profiles;
CREATE POLICY "Usuário atualiza o próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
