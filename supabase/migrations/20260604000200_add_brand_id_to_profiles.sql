-- ============================================================
-- Migration: Add brand_id to profiles (white-label tenant isolation)
--
-- Adiciona brand_id em profiles para isolar usuários por marca.
-- Backfill da equipe interna existente → kaboo.
-- Atualiza handle_new_user() para capturar brand_id do metadata
-- passado em supabase.auth.signUp({ data: { brand_id } }).
-- ============================================================

-- 1. Adicionar coluna brand_id em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id);

-- 2. Backfill: todos os profiles existentes (equipe interna) → kaboo
UPDATE public.profiles
SET brand_id = (SELECT id FROM public.brands WHERE slug = 'kaboo')
WHERE brand_id IS NULL;

-- 3. Atualizar trigger handle_new_user para capturar brand_id do metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    school_name,
    role,
    access_status,
    brand_id,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'school_name',
    'viewer',
    'pending_voucher',
    (NEW.raw_user_meta_data->>'brand_id')::uuid,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email       = EXCLUDED.email,
    full_name   = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    school_name = COALESCE(public.profiles.school_name, EXCLUDED.school_name),
    brand_id    = COALESCE(public.profiles.brand_id, EXCLUDED.brand_id),
    updated_at  = NOW();

  RETURN NEW;
END;
$$;
