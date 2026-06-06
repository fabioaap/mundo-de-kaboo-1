-- Migration: Permite que admins e editores gerenciem coleções via client (anon key)
-- A policy original só concedia escrita ao service_role, quebrando o CRUD da UI admin.
-- Referência: public.profiles.role IN ('admin', 'editor')

DROP POLICY IF EXISTS "Admins e editores gerenciam colecoes" ON public.collections;
CREATE POLICY "Admins e editores gerenciam colecoes"
  ON public.collections FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
    )
  );
