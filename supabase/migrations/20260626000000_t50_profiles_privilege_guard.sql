-- DB-01 fix (2026-06-26): fecha self-escalation de role e troca de brand_id em profiles.
--
-- Problema: a política original `FOR UPDATE USING (auth.uid()=id)` (initial_schema:29-31)
-- não tinha WITH CHECK nem guarda de coluna. Um usuário autenticado podia
--   UPDATE profiles SET role='admin'  -- escalonamento de privilégio
--   UPDATE profiles SET brand_id=<outra marca>  -- tenant hopping
-- e como can_manage_brand / políticas de escrita confiam em profiles.role, isso
-- derrubava TODA a RLS de isolamento por marca. Era o único breach cross-tenant real.
--
-- Correção: WITH CHECK na política + trigger BEFORE UPDATE que congela role/brand_id
-- para escritas não privilegiadas.
--
-- ⚠️ COMPATIBILIDADE COM redeem_voucher: o RPC redeem_voucher (SECURITY DEFINER,
-- owner=postgres) faz `UPDATE profiles SET brand_id = voucher.brand_id` (t22:59) na
-- atribuição inicial. O guard permite isso pela salvaguarda NULL -> valor (sempre
-- permitida): redeem_voucher só seta brand_id na 1ª redenção; nas seguintes o valor
-- é igual, então não há mudança. Bloqueia apenas o ataque real: troca/limpeza de
-- brand_id JÁ existente por sessão de usuário autenticado.

-- 1. Política UPDATE com WITH CHECK (a linha continua pertencendo ao próprio usuário)
DROP POLICY IF EXISTS "Usuário atualiza o próprio perfil" ON public.profiles;
CREATE POLICY "Usuário atualiza o próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. Trigger guard de colunas de privilégio/tenant
CREATE OR REPLACE FUNCTION public.guard_profile_privilege_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_privileged boolean;
BEGIN
  -- Privilegiado = contexto backend (migration/service direto, sem JWT de usuário),
  -- service_role (edge functions), ou super admin white-label.
  -- ATENÇÃO: NÃO usar current_user aqui — esta função é SECURITY DEFINER, então
  -- current_user é o DONO (postgres), não o chamador, tornando o guard inócuo.
  -- auth.uid()/auth.role() leem o JWT e funcionam corretamente sob SECURITY DEFINER.
  -- (Bug pego na validação txn-rollback contra prod em 2026-06-26.)
  is_privileged :=
       auth.uid() IS NULL
    OR coalesce(auth.role(), '') = 'service_role'
    OR public.is_white_label_super_admin(auth.uid());

  -- role: nenhum fluxo legítimo permite auto-mudança pela sessão do usuário.
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT is_privileged THEN
    NEW.role := OLD.role;
  END IF;

  -- brand_id: permite atribuição inicial (NULL -> valor, ex.: 1ª redenção de voucher),
  -- bloqueia troca/limpeza de uma marca já atribuída.
  IF NEW.brand_id IS DISTINCT FROM OLD.brand_id
     AND NOT is_privileged
     AND OLD.brand_id IS NOT NULL THEN
    NEW.brand_id := OLD.brand_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_privilege ON public.profiles;
CREATE TRIGGER trg_guard_profile_privilege
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privilege_columns();
