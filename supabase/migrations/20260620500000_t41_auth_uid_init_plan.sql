-- T4.1: wrap auth.uid() → (SELECT auth.uid()) em todas as RLS policies
-- Converte avaliação por linha (correlated) em init-plan (avaliada uma vez por query).
-- Semanticamente idêntico; melhora performance em tabelas com muitas linhas.
-- DROP + CREATE em transação → sem janela de exposição.

-- 1. brand_admin_memberships_manage
DROP POLICY IF EXISTS "brand_admin_memberships_manage" ON public.brand_admin_memberships;
CREATE POLICY "brand_admin_memberships_manage" ON public.brand_admin_memberships
  TO authenticated
  USING  (is_white_label_super_admin((SELECT auth.uid())))
  WITH CHECK (is_white_label_super_admin((SELECT auth.uid())));

-- 2. characters
DROP POLICY IF EXISTS "Brand admins gerenciam personagens da sua marca" ON public.characters;
CREATE POLICY "Brand admins gerenciam personagens da sua marca" ON public.characters
  USING  ((auth.role() = 'service_role'::text) OR is_white_label_super_admin((SELECT auth.uid())) OR can_manage_brand(brand_id))
  WITH CHECK ((auth.role() = 'service_role'::text) OR is_white_label_super_admin((SELECT auth.uid())) OR can_manage_brand(brand_id));

-- 3. collections
DROP POLICY IF EXISTS "Brand admins gerenciam coleções da sua marca" ON public.collections;
CREATE POLICY "Brand admins gerenciam coleções da sua marca" ON public.collections
  USING  ((auth.role() = 'service_role'::text) OR is_white_label_super_admin((SELECT auth.uid())) OR can_manage_brand(brand_id))
  WITH CHECK ((auth.role() = 'service_role'::text) OR is_white_label_super_admin((SELECT auth.uid())) OR can_manage_brand(brand_id));

-- 4. feature_flags_manage
DROP POLICY IF EXISTS "feature_flags_manage" ON public.feature_flags;
CREATE POLICY "feature_flags_manage" ON public.feature_flags
  TO authenticated
  USING  (is_white_label_super_admin((SELECT auth.uid())))
  WITH CHECK (is_white_label_super_admin((SELECT auth.uid())));

-- 5. formations
DROP POLICY IF EXISTS "Brand admins gerenciam formações da sua marca" ON public.formations;
CREATE POLICY "Brand admins gerenciam formações da sua marca" ON public.formations
  USING  ((auth.role() = 'service_role'::text) OR is_white_label_super_admin((SELECT auth.uid())) OR can_manage_brand(brand_id))
  WITH CHECK ((auth.role() = 'service_role'::text) OR is_white_label_super_admin((SELECT auth.uid())) OR can_manage_brand(brand_id));

-- 6. materials
DROP POLICY IF EXISTS "Brand admins gerenciam materiais da sua marca" ON public.materials;
CREATE POLICY "Brand admins gerenciam materiais da sua marca" ON public.materials
  USING  ((auth.role() = 'service_role'::text) OR is_white_label_super_admin((SELECT auth.uid())) OR can_manage_brand(brand_id))
  WITH CHECK ((auth.role() = 'service_role'::text) OR is_white_label_super_admin((SELECT auth.uid())) OR can_manage_brand(brand_id));

-- 7. media_collection_links
DROP POLICY IF EXISTS "Admins e editores gerenciam media collection links" ON public.media_collection_links;
CREATE POLICY "Admins e editores gerenciam media collection links" ON public.media_collection_links
  TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM profiles
             WHERE profiles.id = (SELECT auth.uid())
               AND profiles.role = ANY (ARRAY['admin'::text, 'editor'::text])))
    AND (EXISTS (SELECT 1 FROM collections c
                 WHERE c.id = media_collection_links.collection_id
                   AND can_manage_brand(c.brand_id)))
  )
  WITH CHECK (
    (EXISTS (SELECT 1 FROM profiles
             WHERE profiles.id = (SELECT auth.uid())
               AND profiles.role = ANY (ARRAY['admin'::text, 'editor'::text])))
    AND (EXISTS (SELECT 1 FROM collections c
                 WHERE c.id = media_collection_links.collection_id
                   AND can_manage_brand(c.brand_id)))
  );

-- 8. media_items
DROP POLICY IF EXISTS "Admins e editores gerenciam media items" ON public.media_items;
CREATE POLICY "Admins e editores gerenciam media items" ON public.media_items
  TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM profiles
             WHERE profiles.id = (SELECT auth.uid())
               AND profiles.role = ANY (ARRAY['admin'::text, 'editor'::text])))
    AND (
      is_white_label_super_admin((SELECT auth.uid()))
      OR NOT (EXISTS (SELECT 1 FROM media_collection_links l WHERE l.media_item_id = media_items.id))
      OR (EXISTS (SELECT 1 FROM media_collection_links l
                  JOIN collections c ON c.id = l.collection_id
                  WHERE l.media_item_id = media_items.id AND can_manage_brand(c.brand_id)))
    )
  )
  WITH CHECK (
    (EXISTS (SELECT 1 FROM profiles
             WHERE profiles.id = (SELECT auth.uid())
               AND profiles.role = ANY (ARRAY['admin'::text, 'editor'::text])))
    AND (
      is_white_label_super_admin((SELECT auth.uid()))
      OR NOT (EXISTS (SELECT 1 FROM media_collection_links l WHERE l.media_item_id = media_items.id))
      OR (EXISTS (SELECT 1 FROM media_collection_links l
                  JOIN collections c ON c.id = l.collection_id
                  WHERE l.media_item_id = media_items.id AND can_manage_brand(c.brand_id)))
    )
  );

-- 9. media_link_health
DROP POLICY IF EXISTS "Admins e editores gerenciam media link health" ON public.media_link_health;
CREATE POLICY "Admins e editores gerenciam media link health" ON public.media_link_health
  TO authenticated
  USING  (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = ANY (ARRAY['admin'::text, 'editor'::text])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = ANY (ARRAY['admin'::text, 'editor'::text])));

-- 10. media_shelf_items
DROP POLICY IF EXISTS "Admins e editores gerenciam media shelf items" ON public.media_shelf_items;
CREATE POLICY "Admins e editores gerenciam media shelf items" ON public.media_shelf_items
  TO authenticated
  USING  (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = ANY (ARRAY['admin'::text, 'editor'::text])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = ANY (ARRAY['admin'::text, 'editor'::text])));

-- 11. media_shelves
DROP POLICY IF EXISTS "Admins e editores gerenciam media shelves" ON public.media_shelves;
CREATE POLICY "Admins e editores gerenciam media shelves" ON public.media_shelves
  TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = ANY (ARRAY['admin'::text, 'editor'::text])))
    AND can_manage_brand(brand_id)
  )
  WITH CHECK (
    (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = ANY (ARRAY['admin'::text, 'editor'::text])))
    AND can_manage_brand(brand_id)
  );

-- 12. user_media_progress
DROP POLICY IF EXISTS "Usuarios atualizam o proprio progresso de midia" ON public.user_media_progress;
CREATE POLICY "Usuarios atualizam o proprio progresso de midia" ON public.user_media_progress
  FOR UPDATE TO authenticated
  USING  (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 13. user_progress
DROP POLICY IF EXISTS "Usuarios atualizam o proprio progresso" ON public.user_progress;
CREATE POLICY "Usuarios atualizam o proprio progresso" ON public.user_progress
  FOR UPDATE TO authenticated
  USING  ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 14. white_label_super_admins_manage
DROP POLICY IF EXISTS "white_label_super_admins_manage" ON public.white_label_super_admins;
CREATE POLICY "white_label_super_admins_manage" ON public.white_label_super_admins
  TO authenticated
  USING  (is_white_label_super_admin((SELECT auth.uid())))
  WITH CHECK (is_white_label_super_admin((SELECT auth.uid())));
