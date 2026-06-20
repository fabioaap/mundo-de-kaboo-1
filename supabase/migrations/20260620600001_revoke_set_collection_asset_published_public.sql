-- QA correction for 20260620600000:
-- Revoke EXECUTE from PUBLIC and anon so the RPC is not browseable via
-- the REST surface for unauthenticated callers. The can_manage_brand() guard
-- already blocks unauthorized writes, but this aligns with the pattern used
-- by every other admin SECURITY DEFINER function in this project.

REVOKE EXECUTE ON FUNCTION public.set_collection_asset_published(uuid, text, boolean)
    FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.set_collection_asset_published(uuid, text, boolean)
    FROM anon;
