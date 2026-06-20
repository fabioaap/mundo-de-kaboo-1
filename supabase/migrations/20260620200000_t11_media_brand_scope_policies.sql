-- Brand isolation hardening — write side of the media subsystem (T-11).
-- The "Admins e editores gerenciam …" ALL policies on media_shelves,
-- media_collection_links and media_items checked only role (admin/editor)
-- but had no brand scope, allowing any admin to mutate another brand's media.
-- This migration replaces those three policies to add brand-scope enforcement
-- via can_manage_brand(). SELECT policies and service_role policies are
-- intentionally left unchanged.

-- ─── media_shelves ──────────────────────────────────────────────────────────
-- brand_id is a direct column on this table (added in 20260615170000).
DROP POLICY IF EXISTS "Admins e editores gerenciam media shelves" ON public.media_shelves;
CREATE POLICY "Admins e editores gerenciam media shelves" ON public.media_shelves
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = ANY (ARRAY['admin','editor'])
    )
    AND can_manage_brand(brand_id)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = ANY (ARRAY['admin','editor'])
    )
    AND can_manage_brand(brand_id)
  );

-- ─── media_collection_links ─────────────────────────────────────────────────
-- No brand_id column — brand is resolved via the linked collection.
DROP POLICY IF EXISTS "Admins e editores gerenciam media collection links" ON public.media_collection_links;
CREATE POLICY "Admins e editores gerenciam media collection links" ON public.media_collection_links
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = ANY (ARRAY['admin','editor'])
    )
    AND EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id
        AND can_manage_brand(c.brand_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = ANY (ARRAY['admin','editor'])
    )
    AND EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id
        AND can_manage_brand(c.brand_id)
    )
  );

-- ─── media_items ────────────────────────────────────────────────────────────
-- No brand_id column and no direct link to a collection at INSERT time.
-- Brand is resolved via media_collection_links → collections.
-- A newly created item has no links yet, so the policy is intentionally more
-- permissive for that case:
--   • super_admin: always allowed (cross-brand operations)
--   • no links exist yet: allowed (brand will be established when links are created)
--   • links exist: admin/editor must manage at least one linked collection's brand
DROP POLICY IF EXISTS "Admins e editores gerenciam media items" ON public.media_items;
CREATE POLICY "Admins e editores gerenciam media items" ON public.media_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = ANY (ARRAY['admin','editor'])
    )
    AND (
      is_white_label_super_admin(auth.uid())
      OR NOT EXISTS (
        SELECT 1 FROM public.media_collection_links l
        WHERE l.media_item_id = media_items.id
      )
      OR EXISTS (
        SELECT 1
        FROM public.media_collection_links l
        JOIN public.collections c ON c.id = l.collection_id
        WHERE l.media_item_id = media_items.id
          AND can_manage_brand(c.brand_id)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = ANY (ARRAY['admin','editor'])
    )
    AND (
      is_white_label_super_admin(auth.uid())
      OR NOT EXISTS (
        SELECT 1 FROM public.media_collection_links l
        WHERE l.media_item_id = media_items.id
      )
      OR EXISTS (
        SELECT 1
        FROM public.media_collection_links l
        JOIN public.collections c ON c.id = l.collection_id
        WHERE l.media_item_id = media_items.id
          AND can_manage_brand(c.brand_id)
      )
    )
  );
