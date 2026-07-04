-- Operational hardening (from Supabase security advisors, 2026-06-15).
--
-- 1) Pin search_path on flagged functions (closes function_search_path_mutable —
--    a privilege-escalation class for SECURITY DEFINER functions). Same as the
--    pattern redeem_voucher already uses (SET search_path = public).
-- 2) Revoke EXECUTE where anon (and, for pure triggers, authenticated) should not
--    call the function over the REST RPC surface. Trigger firing is unaffected —
--    Postgres checks EXECUTE at trigger creation, not at fire time.
--
-- Intentionally NOT touched: get_brand_bootstrap / can_manage_brand /
-- is_white_label_super_admin / validate_voucher / redeem_voucher keep anon EXECUTE
-- (used pre-login and/or inside RLS policies that anon evaluates).
--
-- Issue #61 rebuild-limpo fix (2026-07-04): esta migration roda ANTES (timestamp
-- 20260615) de algumas das funcoes que ela altera serem de fato CRIADAS por
-- outra migration com timestamp POSTERIOR (ex.: set_collection_asset_published
-- so e criada em 20260620600000 — drift documentado no proprio cabecalho
-- daquele arquivo: a funcao ja existia em prod por criacao manual antes de
-- qualquer uma das duas migrations existir). Cada ALTER/REVOKE abaixo agora e
-- guardado por to_regprocedure(...) IS NOT NULL: roda normalmente quando a
-- funcao ja existe (caso de prod, e caso de um rebuild limpo apos a migration
-- que a cria), e pula sem erro quando ainda nao existe nesse ponto da cadeia.
-- Nao muda nada em prod (todas essas funcoes ja existem la).

DO $$
BEGIN
  -- 1) search_path
  IF to_regprocedure('public.set_collection_asset_published(uuid, text, boolean)') IS NOT NULL THEN
    ALTER FUNCTION public.set_collection_asset_published(uuid, text, boolean) SET search_path = public;
  END IF;

  IF to_regprocedure('public.handle_media_updated_at()') IS NOT NULL THEN
    ALTER FUNCTION public.handle_media_updated_at() SET search_path = public;
  END IF;

  IF to_regprocedure('public.get_brand_bootstrap(text)') IS NOT NULL THEN
    ALTER FUNCTION public.get_brand_bootstrap(text) SET search_path = public;
  END IF;

  IF to_regprocedure('public.set_brand_feature_flag(uuid, text, boolean, jsonb, text)') IS NOT NULL THEN
    ALTER FUNCTION public.set_brand_feature_flag(uuid, text, boolean, jsonb, text) SET search_path = public;
  END IF;

  IF to_regprocedure('public.is_white_label_super_admin(uuid)') IS NOT NULL THEN
    ALTER FUNCTION public.is_white_label_super_admin(uuid) SET search_path = public;
  END IF;

  IF to_regprocedure('public.can_manage_brand(uuid)') IS NOT NULL THEN
    ALTER FUNCTION public.can_manage_brand(uuid) SET search_path = public;
  END IF;

  IF to_regprocedure('public.list_white_label_manageable_brands()') IS NOT NULL THEN
    ALTER FUNCTION public.list_white_label_manageable_brands() SET search_path = public;
  END IF;

  IF to_regprocedure('public.emit_voucher_batch(uuid, integer, text)') IS NOT NULL THEN
    ALTER FUNCTION public.emit_voucher_batch(uuid, integer, text) SET search_path = public;
  END IF;

  IF to_regprocedure('public.handle_new_user()') IS NOT NULL THEN
    ALTER FUNCTION public.handle_new_user() SET search_path = public;
  END IF;

  -- 2) revoke EXECUTE
  -- Pure trigger functions — never meant to be callable via RPC.
  IF to_regprocedure('public.handle_new_user()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
  END IF;

  IF to_regprocedure('public.sync_profiles_email()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.sync_profiles_email() FROM anon, authenticated;
  END IF;

  IF to_regprocedure('public.handle_media_updated_at()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.handle_media_updated_at() FROM anon, authenticated;
  END IF;

  -- Admin-only RPCs — keep authenticated (admins call them), drop anon.
  IF to_regprocedure('public.set_brand_feature_flag(uuid, text, boolean, jsonb, text)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.set_brand_feature_flag(uuid, text, boolean, jsonb, text) FROM anon;
  END IF;

  IF to_regprocedure('public.emit_voucher_batch(uuid, integer, text)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.emit_voucher_batch(uuid, integer, text) FROM anon;
  END IF;
END
$$;
