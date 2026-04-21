-- Migration: cria a tabela user_progress esperada pelo frontend e pela documentação.
-- O schema atual deste branch já lê progresso na home, então a ausência dessa tabela
-- gera 404 no runtime contra o Supabase remoto.

CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_progress_user_collection_key UNIQUE (user_id, collection_id)
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user_id
  ON public.user_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_user_progress_collection_id
  ON public.user_progress(collection_id);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios leem o proprio progresso" ON public.user_progress;
CREATE POLICY "Usuarios leem o proprio progresso"
  ON public.user_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios inserem o proprio progresso" ON public.user_progress;
CREATE POLICY "Usuarios inserem o proprio progresso"
  ON public.user_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios atualizam o proprio progresso" ON public.user_progress;
CREATE POLICY "Usuarios atualizam o proprio progresso"
  ON public.user_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios removem o proprio progresso" ON public.user_progress;
CREATE POLICY "Usuarios removem o proprio progresso"
  ON public.user_progress FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role gerencia user_progress" ON public.user_progress;
CREATE POLICY "Service role gerencia user_progress"
  ON public.user_progress FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);