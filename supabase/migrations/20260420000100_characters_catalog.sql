-- ============================================================
-- Migration: catálogo remoto de personagens
-- Cria tabela public.characters, adiciona collections.character_ids,
-- faz backfill a partir de collections.characters e habilita SVG
-- no bucket collections.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.characters (
  id          TEXT PRIMARY KEY,
  name        TEXT        NOT NULL,
  description TEXT        NOT NULL DEFAULT '',
  traits      TEXT[]      NOT NULL DEFAULT '{}'::text[],
  aliases     TEXT[]      NOT NULL DEFAULT '{}'::text[],
  image_url   TEXT,
  status      TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT characters_name_not_blank CHECK (btrim(name) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_characters_name_lower
  ON public.characters (lower(name));

ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados leem personagens" ON public.characters;
CREATE POLICY "Autenticados leem personagens"
  ON public.characters FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins e editores gerenciam personagens" ON public.characters;
CREATE POLICY "Admins e editores gerenciam personagens"
  ON public.characters FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND lower(COALESCE(p.role, 'viewer')) IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND lower(COALESCE(p.role, 'viewer')) IN ('admin', 'editor')
    )
  );

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS character_ids TEXT[] NOT NULL DEFAULT '{}'::text[];

INSERT INTO public.characters (id, name, description, traits, aliases, image_url, status)
VALUES
  ('kaboo', 'Kaboo', 'O protagonista curioso que adora aventuras e mistérios.', ARRAY['Curioso', 'Corajoso', 'Amigo'], ARRAY[]::text[], NULL, 'active'),
  ('baratao', 'Baratão', 'O grande aventureiro do grupo, sempre pronto para uma nova empreitada.', ARRAY['Aventureiro', 'Forte', 'Protetor'], ARRAY['Baratao'], NULL, 'active'),
  ('baratinha', 'Baratinha', 'A mais esperta do grupo, resolve problemas com criatividade.', ARRAY['Esperta', 'Criativa', 'Engenhosa'], ARRAY[]::text[], NULL, 'active'),
  ('batatinha', 'Batatinha', 'O mais gentil de todos, sempre ajuda quem precisa.', ARRAY['Gentil', 'Generoso', 'Paciente'], ARRAY[]::text[], NULL, 'active'),
  ('blado', 'Blado', 'O amigo brincalhão que transforma tudo em diversão.', ARRAY['Brincalhão', 'Alegre', 'Divertido'], ARRAY[]::text[], NULL, 'active'),
  ('dr-ratazana', 'Dr. Ratazana', 'O vilão intelectual que desafia os heróis com enigmas.', ARRAY['Inteligente', 'Astuto', 'Misterioso'], ARRAY['Dr Ratazana', 'Ratazana'], NULL, 'active'),
  ('gaio', 'Gaio', 'O artista do grupo, expressivo e cheio de cor.', ARRAY['Artístico', 'Expressivo', 'Sensível'], ARRAY[]::text[], NULL, 'active'),
  ('papa', 'Papa', 'O protetor do grupo, sábio e carinhoso.', ARRAY['Sábio', 'Carinhoso', 'Protetor'], ARRAY[]::text[], NULL, 'active')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  traits = EXCLUDED.traits,
  aliases = EXCLUDED.aliases,
  image_url = EXCLUDED.image_url,
  status = EXCLUDED.status,
  updated_at = NOW();

UPDATE public.collections c
SET character_ids = COALESCE(
  ARRAY(
    SELECT resolved.id
    FROM (
      SELECT DISTINCT ON (matched.id) matched.id, legacy.ord
      FROM unnest(COALESCE(c.characters, '{}'::text[])) WITH ORDINALITY AS legacy(name, ord)
      JOIN public.characters matched
        ON lower(matched.name) = lower(legacy.name)
        OR EXISTS (
          SELECT 1
          FROM unnest(matched.aliases) AS alias(name_alias)
          WHERE lower(name_alias) = lower(legacy.name)
        )
      ORDER BY matched.id, legacy.ord
    ) AS resolved
    ORDER BY resolved.ord
  ),
  '{}'::text[]
)
WHERE COALESCE(array_length(c.character_ids, 1), 0) = 0
  AND COALESCE(array_length(c.characters, 1), 0) > 0;

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'video/mp4'
]
WHERE id = 'collections';