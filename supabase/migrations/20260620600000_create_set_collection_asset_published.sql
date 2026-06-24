-- WS-13: Create set_collection_asset_published RPC with explicit brand scope.
-- This function was called by publishAsset()/unpublishAsset() in lib/api.ts but was
-- never tracked in migrations (it may exist in prod from a manual creation;
-- 20260615190000 ran ALTER on it, implying it existed). CREATE OR REPLACE is safe.
--
-- Security model:
--   SECURITY DEFINER + SET search_path = public  (same pattern as other AIOX functions)
--   can_manage_brand() check prevents cross-brand writes
--   Returns false (not an exception) on unauthorized — callers already log the denial

CREATE OR REPLACE FUNCTION public.set_collection_asset_published(
    p_collection_id uuid,
    p_asset_id      text,
    p_is_published  boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_brand_id    uuid;
    v_asset_found boolean := false;
BEGIN
    -- Resolve brand_id; return false if collection doesn't exist
    SELECT brand_id INTO v_brand_id
    FROM public.collections
    WHERE id = p_collection_id;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Brand scope guard: caller must administer this brand
    IF NOT public.can_manage_brand(v_brand_id) THEN
        RETURN false;
    END IF;

    -- Verify the asset exists inside the collection's JSONB array
    SELECT bool_or((asset ->> 'id') = p_asset_id)
    INTO v_asset_found
    FROM jsonb_array_elements(
        (SELECT collection_assets FROM public.collections WHERE id = p_collection_id)
    ) AS asset;

    IF NOT v_asset_found THEN
        RETURN false;
    END IF;

    -- Patch the matching element's is_published flag; leave all other elements unchanged
    UPDATE public.collections
    SET collection_assets = (
        SELECT jsonb_agg(
            CASE
                WHEN (asset ->> 'id') = p_asset_id
                THEN asset || jsonb_build_object('is_published', p_is_published)
                ELSE asset
            END
        )
        FROM jsonb_array_elements(collection_assets) AS asset
    )
    WHERE id = p_collection_id;

    RETURN true;
END;
$$;

-- Grant execution to authenticated users (RPC is callable from the JS client)
GRANT EXECUTE ON FUNCTION public.set_collection_asset_published(uuid, text, boolean)
    TO authenticated;
