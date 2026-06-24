-- T0.5(b): Remove anonymous listing policy from collections storage bucket
-- This prevents unauthenticated enumeration of all asset URLs.
-- Individual file access for authenticated users via signed URLs is unaffected.
-- Full bucket→private cutover (T1.3) is deferred pending signed-URL frontend work.

-- Drops only the public SELECT (listing) policy on storage.objects for the
-- 'collections' bucket. Created in 20260407000200_storage_collections_bucket.sql
-- as: CREATE POLICY ... FOR SELECT TO public USING (bucket_id = 'collections').
--
-- Left intact (authenticated admin/editor only):
--   - "Admins e editores podem inserir arquivos em collections"   (INSERT)
--   - "Admins e editores podem atualizar arquivos em collections" (UPDATE)
--   - "Admins e editores podem remover arquivos de collections"   (DELETE)
--   - "Admins e editores podem listar o bucket collections"       (buckets SELECT)
--
-- The bucket's public = true flag is intentionally NOT changed here: it governs
-- direct file URL access, not listing, and flipping it would break the app.

DROP POLICY IF EXISTS "Arquivos de colecoes sao publicos para leitura"
  ON storage.objects;
