-- Migration: Permite que brand_admins (via brand_admin_memberships) criem e editem
-- coleções da sua própria marca, além dos admin/editor globais.
--
-- Problema: a policy "Admins e editores gerenciam colecoes" só aceita
-- profiles.role IN ('admin', 'editor'), excluindo usuários que são brand_admin
-- da Central Coruja (gerenciados via brand_admin_memberships, não por profiles.role).
--
-- Solução: adicionar cláusula OR que verifica membership via can_manage_brand()
-- e restringe o brand_admin a apenas inserir/editar coleções da sua própria marca.

DROP POLICY IF EXISTS "Admins e editores gerenciam colecoes" ON public.collections;

CREATE POLICY "Admins e editores gerenciam colecoes"
  ON public.collections FOR ALL
  TO authenticated
  USING (
    -- admin/editor global: acesso irrestrito
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
    )
    OR
    -- brand_admin: só vê/edita coleções da sua própria marca
    (
      brand_id IS NOT NULL
      AND public.can_manage_brand(brand_id)
    )
  )
  WITH CHECK (
    -- admin/editor global: pode inserir sem restrição de brand
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
    )
    OR
    -- brand_admin: só insere coleções com brand_id da sua marca
    (
      brand_id IS NOT NULL
      AND public.can_manage_brand(brand_id)
    )
  );
