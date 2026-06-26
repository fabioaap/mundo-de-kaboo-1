-- DB-02 fix (2026-06-26): captura no versionamento as tabelas formations/materials.
--
-- Contexto: estas tabelas EXISTEM em prod (materials com 15 linhas, formations vazia,
-- ambas com RLS habilitada e FK para brands) mas NUNCA tiveram CREATE TABLE em migration.
-- Eram criadas fora do versionamento, então t43 (índices) e t41 (políticas) que as
-- referenciam falham num rebuild limpo (`relation does not exist`).
--
-- Esta migration é BACK-DATED (20260620390000) para rodar ANTES de t43 (20260620400000)
-- e t41 (20260620500000). Em prod é no-op idempotente (CREATE TABLE IF NOT EXISTS);
-- num env limpo, cria as tabelas para que t43/t41 apliquem com sucesso.
--
-- Schema espelha exatamente a introspecção de prod (2026-06-26, project yevysgqlnhonhkczkyhu).

CREATE TABLE IF NOT EXISTS public.formations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  cover_image text,
  level text,
  tags text[] DEFAULT '{}'::text[],
  steps_count integer DEFAULT 1,
  duration_label text,
  related_collection_ids text[] DEFAULT '{}'::text[],
  assets jsonb DEFAULT '[]'::jsonb,
  is_published boolean DEFAULT false,
  published_at timestamptz,
  brand_id uuid REFERENCES public.brands(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  cover_image text,
  asset_url text,
  asset_type text DEFAULT 'pdf'::text,
  tags text[] DEFAULT '{}'::text[],
  related_collection_ids text[] DEFAULT '{}'::text[],
  is_published boolean DEFAULT false,
  published_at timestamptz,
  brand_id uuid REFERENCES public.brands(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS habilitada já aqui (deny-all até t41 criar as políticas brand-scoped, que roda depois).
ALTER TABLE public.formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials  ENABLE ROW LEVEL SECURITY;
