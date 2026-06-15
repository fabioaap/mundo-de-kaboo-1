-- Brand isolation hardening for the (not-yet-launched) media subsystem.
-- Homologação 2026-06-15 found viewer-facing SELECT policies with no brand scope:
-- collection_resources / media_collection_links used USING(true); media_items'
-- 'active_subscription' branch had no brand filter; media_shelves/shelf_items were
-- scoped only by is_published. No active leak today (tables empty/draft, no Coruja
-- users) but these must be brand-scoped before media/Coruja go-live.
--
-- Scope: brand-scope the authenticated VIEWER read paths via the parent collection
-- (mirrors the collections SELECT policy). The admin/editor "manage" (ALL) policies
-- are intentionally left as-is so the current admin workflow on existing drafts is
-- not disrupted; admin cross-brand visibility is tracked as a separate follow-up.

-- media_shelves has no brand column at all — add one (empty table, no backfill).
ALTER TABLE public.media_shelves ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id);

-- 1) collection_resources: read scoped by the parent collection's brand.
DROP POLICY IF EXISTS "Autenticados lêem recursos" ON public.collection_resources;
CREATE POLICY "Usuarios leem recursos da sua marca" ON public.collection_resources
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_resources.collection_id
        AND ( is_white_label_super_admin(auth.uid())
              OR can_manage_brand(c.brand_id)
              OR (c.is_published AND c.brand_id = (SELECT p.brand_id FROM public.profiles p WHERE p.id = auth.uid())) )
    )
  );

-- 2) media_collection_links: read scoped by the linked collection's brand.
DROP POLICY IF EXISTS "Usuarios leem media collection links visiveis" ON public.media_collection_links;
CREATE POLICY "Usuarios leem media collection links da sua marca" ON public.media_collection_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = media_collection_links.collection_id
        AND ( is_white_label_super_admin(auth.uid())
              OR can_manage_brand(c.brand_id)
              OR (c.is_published AND c.brand_id = (SELECT p.brand_id FROM public.profiles p WHERE p.id = auth.uid())) )
    )
  );

-- 3) media_items: viewer read now requires a PUBLISHED collection of the user's brand
--    (closes the brand-agnostic 'active_subscription' branch). Admins keep access via
--    the separate "Admins e editores gerenciam media items" ALL policy.
DROP POLICY IF EXISTS "Usuarios leem media items publicados" ON public.media_items;
CREATE POLICY "Usuarios leem media items da sua marca" ON public.media_items
  FOR SELECT TO authenticated
  USING (
    status = 'published'::media_status
    AND EXISTS (
      SELECT 1
      FROM public.media_collection_links l
      JOIN public.collections c ON c.id = l.collection_id
      WHERE l.media_item_id = media_items.id
        AND c.is_published
        AND c.brand_id = (SELECT p.brand_id FROM public.profiles p WHERE p.id = auth.uid())
        AND EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND COALESCE(p2.access_status, 'active') = 'active')
        AND (
          media_items.access_mode = 'active_subscription'::media_access_mode
          OR (
            media_items.access_mode = 'linked_collection_grant'::media_access_mode
            AND EXISTS (
              SELECT 1 FROM public.user_content_grants g
              WHERE g.collection_id = l.collection_id AND g.user_id = auth.uid()
                AND (g.expires_at IS NULL OR g.expires_at > now())
            )
          )
        )
    )
  );

-- 4) media_shelves: read scoped by brand (mirrors collections).
DROP POLICY IF EXISTS "Usuarios leem media shelves publicadas" ON public.media_shelves;
CREATE POLICY "Usuarios leem media shelves da sua marca" ON public.media_shelves
  FOR SELECT TO authenticated
  USING (
    is_white_label_super_admin(auth.uid())
    OR can_manage_brand(brand_id)
    OR (is_published AND brand_id = (SELECT p.brand_id FROM public.profiles p WHERE p.id = auth.uid()))
  );

-- 5) media_shelf_items: read scoped via the parent shelf's brand visibility.
DROP POLICY IF EXISTS "Usuarios leem media shelf items de shelves publicadas" ON public.media_shelf_items;
CREATE POLICY "Usuarios leem media shelf items da sua marca" ON public.media_shelf_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.media_shelves s
      WHERE s.id = media_shelf_items.shelf_id
        AND ( is_white_label_super_admin(auth.uid())
              OR can_manage_brand(s.brand_id)
              OR (s.is_published AND s.brand_id = (SELECT p.brand_id FROM public.profiles p WHERE p.id = auth.uid())) )
    )
  );
