-- Adiciona coluna de aulas ordenadas na tabela formations
ALTER TABLE public.formations
  ADD COLUMN IF NOT EXISTS lessons jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Tabela de progresso de formações (não reutilizar user_media_progress — FK incompatível)
CREATE TABLE IF NOT EXISTS public.user_formation_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  formation_id UUID NOT NULL REFERENCES public.formations(id) ON DELETE CASCADE,
  completed_lesson_ids TEXT[] NOT NULL DEFAULT '{}',
  last_lesson_id TEXT,
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, formation_id)
);

-- RLS
ALTER TABLE public.user_formation_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own formation progress"
  ON public.user_formation_progress FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own formation progress"
  ON public.user_formation_progress FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own formation progress"
  ON public.user_formation_progress FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Service role manages formation progress"
  ON public.user_formation_progress FOR ALL
  TO service_role USING (true);

-- Trigger updated_at (reusar função existente public.handle_media_updated_at)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_user_formation_progress_updated_at'
  ) THEN
    CREATE TRIGGER update_user_formation_progress_updated_at
      BEFORE UPDATE ON public.user_formation_progress
      FOR EACH ROW EXECUTE FUNCTION public.handle_media_updated_at();
  END IF;
END $$;
