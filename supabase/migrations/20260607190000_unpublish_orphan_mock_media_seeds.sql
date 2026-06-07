-- ==============================================================
-- Migration: Unpublish orphan mock media_items seeds
-- Pairs with / reverses the public effect of:
--   20260607120000_seed_library_hub_content.sql
--
-- WHY
-- ---
-- The seed migration above inserted 26 mock `media_items` rows (videos 5,
-- music 7, formations 7, materials 7) directly into the table, with:
--   * created_by            = NULL  (no admin author)
--   * collection_resource_id = NULL (not linked to any collection)
-- Several rows carry placeholder URLs ('https://kaboo.dev/content/pending').
--
-- The public storefront (api.getMediaHub) treats `media_items` as the
-- AUTHORITATIVE catalog for shared-catalog brands (e.g. "kaboo"): when the
-- table has published rows it ignores the real, admin-managed collection
-- content. Result: the vitrine showed phantom audio/video/formation/material
-- cards even though the admin reported 0 published — because those phantoms
-- were these orphan seeds, not anything an editor could manage.
--
-- The seeds also duplicate stories that already exist as real collections
-- (Gaio, Kaboo, Mensageiro, Blado...), so they are pure mock noise.
--
-- WHAT
-- ----
-- Set every orphan seed (created_by IS NULL AND collection_resource_id IS NULL)
-- to status='draft' so it disappears from the public vitrine. With media_items
-- empty of published rows, getMediaHub correctly falls back to the
-- collection-backed path, which honours each collection asset's is_published
-- flag — i.e. the vitrine now reflects what the admin actually publishes.
--
-- Reversible: re-publishing is a single UPDATE back to 'published', or
-- re-running 20260607120000 re-inserts the seed data. We intentionally
-- UNPUBLISH rather than DELETE to keep the change non-destructive.
--
-- Idempotent: the WHERE clause is a no-op once the rows are already draft.
-- Safe: only touches rows with NO author AND NO collection link, so genuine
-- admin-created media_items are never affected.
-- ==============================================================

UPDATE media_items
SET status = 'draft',
    updated_at = NOW()
WHERE created_by IS NULL
  AND collection_resource_id IS NULL
  AND status <> 'draft';
