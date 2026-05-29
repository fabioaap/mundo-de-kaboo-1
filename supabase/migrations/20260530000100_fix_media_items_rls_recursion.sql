-- Migration: corrigir recursão infinita nas policies RLS de media_items / media_collection_links
-- 
-- Problema: 
--   1. Policy SELECT de media_items faz subquery em media_collection_links
--   2. Policy SELECT de media_collection_links faz subquery em media_items
--   → Ciclo infinito (código 42P17)
--
-- Solução:
--   Reescrever a policy de media_collection_links para NÃO referenciar media_items.
--   Os links são dados estruturais internos — admin/editor e service_role os gerenciam;
--   usuários autenticados podem ler todos os links (a segurança do item em si fica na policy de media_items).

BEGIN;

-- Corrigir policy SELECT de media_collection_links: remover referência a media_items
DROP POLICY IF EXISTS "Usuarios leem media collection links visiveis" ON public.media_collection_links;
CREATE POLICY "Usuarios leem media collection links visiveis"
  ON public.media_collection_links FOR SELECT
  TO authenticated
  USING (true);

COMMIT;
