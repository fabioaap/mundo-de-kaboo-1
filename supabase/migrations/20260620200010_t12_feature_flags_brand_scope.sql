-- Restringe as policies SELECT abertas em feature_flags e brand_feature_overrides.
-- Contexto: get_brand_bootstrap(p_slug) é SECURITY DEFINER e continua lendo ambas as
-- tabelas sem RLS — o frontend pré-login nunca quebra. Apenas acesso direto é restringido.
--
-- feature_flags (tabela global, sem brand_id):
--   Remove anon — não há razão para anonimous ler flags de configuração diretamente.
--   authenticated continua lendo (admin UI, debug, etc.).
--
-- brand_feature_overrides (tem brand_id):
--   Remove anon — bootstrap usa SECURITY DEFINER.
--   authenticated só vê overrides da própria marca, admin/editor da marca ou super_admin.

-- 1) feature_flags — manter authenticated, remover anon
DROP POLICY IF EXISTS "feature_flags_select" ON public.feature_flags;
CREATE POLICY "feature_flags_select"
  ON public.feature_flags FOR SELECT
  TO authenticated
  USING (true);

-- 2) brand_feature_overrides — scoped por marca do usuário (ou super_admin / admin da marca)
DROP POLICY IF EXISTS "brand_feature_overrides_select" ON public.brand_feature_overrides;
CREATE POLICY "brand_feature_overrides_select"
  ON public.brand_feature_overrides FOR SELECT
  TO authenticated
  USING (
    public.is_white_label_super_admin(auth.uid())
    OR public.can_manage_brand(brand_id)
    OR brand_id = (SELECT p.brand_id FROM public.profiles p WHERE p.id = auth.uid())
  );
