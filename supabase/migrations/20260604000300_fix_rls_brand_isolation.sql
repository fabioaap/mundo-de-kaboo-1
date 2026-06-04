-- ============================================================
-- Migration: Fix RLS brand isolation on collections and characters
--
-- Remove políticas legadas que usavam profiles.role global
-- (sem filtro de brand_id), substituindo por can_manage_brand()
-- e filtro por profiles.brand_id do usuário autenticado.
-- ============================================================

-- ─── COLLECTIONS ──────────────────────────────────────────────

-- Remover políticas legadas
DROP POLICY IF EXISTS "Autenticados lêem coleções" ON public.collections;
DROP POLICY IF EXISTS "Admins e editores gerenciam colecoes" ON public.collections;

-- Leitura: usuário vê coleções publicadas da SUA marca
-- (super admin e brand admins veem tudo da marca deles)
CREATE POLICY "Usuários leem coleções da sua marca"
  ON public.collections
  FOR SELECT
  USING (
    is_white_label_super_admin(auth.uid())
    OR can_manage_brand(brand_id)
    OR (
      is_published = true
      AND brand_id = (
        SELECT p.brand_id FROM public.profiles p WHERE p.id = auth.uid()
      )
    )
  );

-- Escrita: apenas service_role, super admin ou brand admin da marca específica
CREATE POLICY "Brand admins gerenciam coleções da sua marca"
  ON public.collections
  FOR ALL
  USING (
    (auth.role() = 'service_role')
    OR is_white_label_super_admin(auth.uid())
    OR can_manage_brand(brand_id)
  )
  WITH CHECK (
    (auth.role() = 'service_role')
    OR is_white_label_super_admin(auth.uid())
    OR can_manage_brand(brand_id)
  );

-- ─── CHARACTERS ───────────────────────────────────────────────

-- Remover políticas legadas
DROP POLICY IF EXISTS "Autenticados leem personagens" ON public.characters;
DROP POLICY IF EXISTS "Admins e editores gerenciam personagens" ON public.characters;

-- Leitura: personagens ativos da SUA marca
CREATE POLICY "Usuários leem personagens da sua marca"
  ON public.characters
  FOR SELECT
  USING (
    is_white_label_super_admin(auth.uid())
    OR can_manage_brand(brand_id)
    OR (
      status = 'active'
      AND brand_id = (
        SELECT p.brand_id FROM public.profiles p WHERE p.id = auth.uid()
      )
    )
  );

-- Escrita: apenas service_role, super admin ou brand admin
CREATE POLICY "Brand admins gerenciam personagens da sua marca"
  ON public.characters
  FOR ALL
  USING (
    (auth.role() = 'service_role')
    OR is_white_label_super_admin(auth.uid())
    OR can_manage_brand(brand_id)
  )
  WITH CHECK (
    (auth.role() = 'service_role')
    OR is_white_label_super_admin(auth.uid())
    OR can_manage_brand(brand_id)
  );
