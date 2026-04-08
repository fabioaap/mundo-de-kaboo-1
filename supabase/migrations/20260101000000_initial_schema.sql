-- ============================================================
-- Migration: schema inicial do Mundo de Kaboo
-- Cria tabelas: profiles, collections, collection_resources
-- Habilita Row Level Security (RLS) em todas as tabelas
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
-- gen_random_uuid() é nativo do Postgres 14+, não precisa de extensão.

-- ============================================================
-- TABLE: profiles
-- Espelha auth.users com dados de perfil do professor
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT,
  name          TEXT,
  school        TEXT,
  role          TEXT        DEFAULT 'teacher',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário lê o próprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuário atualiza o próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Usuário cria o próprio perfil"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger para criar perfil automático no cadastro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TABLE: collections
-- Catálogo de livros/coleções do Kaboo
-- ============================================================
CREATE TABLE IF NOT EXISTS public.collections (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT        NOT NULL,
  cover_image         TEXT,
  level               TEXT,                          -- 'Educação Infantil' | 'Fundamental I'
  color_theme         TEXT,                          -- hex color, ex: '#B9373B'
  theme               TEXT,
  learning_objectives TEXT,
  characters          TEXT[]      DEFAULT '{}',
  bncc_skills         TEXT[]      DEFAULT '{}',
  casel_competencies  TEXT[]      DEFAULT '{}',
  age_grade           TEXT[]      DEFAULT '{}',
  pdf_url             TEXT,
  audio_url           TEXT,
  video_url           TEXT,
  extra_materials     TEXT[]      DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ler o catálogo
CREATE POLICY "Autenticados lêem coleções"
  ON public.collections FOR SELECT
  TO authenticated
  USING (true);

-- Somente service_role pode escrever (seed / admin)
CREATE POLICY "Service role gerencia coleções"
  ON public.collections FOR ALL
  TO service_role
  USING (true);

-- ============================================================
-- TABLE: collection_resources
-- Materiais extras vinculados a uma coleção (guias, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.collection_resources (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID        NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL,
  type          TEXT        NOT NULL DEFAULT 'pdf',  -- 'pdf' | 'audio' | 'video'
  url           TEXT        NOT NULL,
  size          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collection_resources_collection_id
  ON public.collection_resources(collection_id);

ALTER TABLE public.collection_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados lêem recursos"
  ON public.collection_resources FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role gerencia recursos"
  ON public.collection_resources FOR ALL
  TO service_role
  USING (true);
