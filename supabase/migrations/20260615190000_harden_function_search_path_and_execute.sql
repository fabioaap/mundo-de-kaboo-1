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

-- 1) search_path
ALTER FUNCTION public.set_collection_asset_published(uuid, text, boolean) SET search_path = public;
ALTER FUNCTION public.handle_media_updated_at() SET search_path = public;
ALTER FUNCTION public.get_brand_bootstrap(text) SET search_path = public;
ALTER FUNCTION public.set_brand_feature_flag(uuid, text, boolean, jsonb, text) SET search_path = public;
ALTER FUNCTION public.is_white_label_super_admin(uuid) SET search_path = public;
ALTER FUNCTION public.can_manage_brand(uuid) SET search_path = public;
ALTER FUNCTION public.list_white_label_manageable_brands() SET search_path = public;
ALTER FUNCTION public.emit_voucher_batch(uuid, integer, text) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 2) revoke EXECUTE
-- Pure trigger functions — never meant to be callable via RPC.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_profiles_email() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_media_updated_at() FROM anon, authenticated;
-- Admin-only RPCs — keep authenticated (admins call them), drop anon.
REVOKE EXECUTE ON FUNCTION public.set_brand_feature_flag(uuid, text, boolean, jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.emit_voucher_batch(uuid, integer, text) FROM anon;
