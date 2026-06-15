-- Corrective: the previous REVOKE ... FROM anon/authenticated was a no-op because
-- Postgres grants function EXECUTE to PUBLIC by default, which anon/authenticated
-- inherit. Revoke from PUBLIC and re-grant only where intended.
--
-- Trigger firing is unaffected (EXECUTE is checked at trigger creation, not fire time).

-- Pure trigger functions — not callable via RPC by anyone.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_profiles_email() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_media_updated_at() FROM PUBLIC, anon, authenticated;

-- Admin-only RPCs — only authenticated (admins); never anon. Internal
-- can_manage_brand / is_white_label_super_admin checks still gate by brand.
REVOKE EXECUTE ON FUNCTION public.set_brand_feature_flag(uuid, text, boolean, jsonb, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.set_brand_feature_flag(uuid, text, boolean, jsonb, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.emit_voucher_batch(uuid, integer, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.emit_voucher_batch(uuid, integer, text) TO authenticated;
