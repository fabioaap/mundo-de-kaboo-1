-- ============================================================
-- Migration: storage do bucket collections
-- Cria o bucket público e libera leitura pública dos arquivos,
-- com escrita restrita a admins e editores autenticados.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'collections',
  'collections',
  true,
  52428800,
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/pdf',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'video/mp4'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Arquivos de colecoes sao publicos para leitura'
  ) THEN
    CREATE POLICY "Arquivos de colecoes sao publicos para leitura"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'collections');
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins e editores podem inserir arquivos em collections'
  ) THEN
    CREATE POLICY "Admins e editores podem inserir arquivos em collections"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'collections'
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND lower(COALESCE(p.role, 'viewer')) IN ('admin', 'editor')
        )
      );
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins e editores podem atualizar arquivos em collections'
  ) THEN
    CREATE POLICY "Admins e editores podem atualizar arquivos em collections"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'collections'
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND lower(COALESCE(p.role, 'viewer')) IN ('admin', 'editor')
        )
      )
      WITH CHECK (
        bucket_id = 'collections'
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND lower(COALESCE(p.role, 'viewer')) IN ('admin', 'editor')
        )
      );
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins e editores podem remover arquivos de collections'
  ) THEN
    CREATE POLICY "Admins e editores podem remover arquivos de collections"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'collections'
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND lower(COALESCE(p.role, 'viewer')) IN ('admin', 'editor')
        )
      );
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'buckets'
      AND policyname = 'Admins e editores podem listar o bucket collections'
  ) THEN
    CREATE POLICY "Admins e editores podem listar o bucket collections"
      ON storage.buckets FOR SELECT
      TO authenticated
      USING (
        id = 'collections'
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND lower(COALESCE(p.role, 'viewer')) IN ('admin', 'editor')
        )
      );
  END IF;
END
$$;
