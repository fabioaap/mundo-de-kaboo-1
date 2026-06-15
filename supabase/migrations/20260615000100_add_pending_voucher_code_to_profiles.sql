-- G3: persistir o voucher pendente no servidor (não depender de localStorage entre etapas)
-- Aplicada em produção (yevysgqlnhonhkczkyhu) em 2026-06-15.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pending_voucher_code TEXT;

-- handle_new_user: grava o pending_voucher_code vindo do signUp metadata (raw_user_meta_data).
-- Preserva 100% do comportamento anterior; só adiciona o novo campo.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    school_name,
    role,
    access_status,
    brand_id,
    pending_voucher_code,
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
    NULLIF(NEW.raw_user_meta_data->>'pending_voucher_code', ''),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email       = EXCLUDED.email,
    full_name   = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    school_name = COALESCE(public.profiles.school_name, EXCLUDED.school_name),
    brand_id    = COALESCE(public.profiles.brand_id, EXCLUDED.brand_id),
    pending_voucher_code = COALESCE(public.profiles.pending_voucher_code, EXCLUDED.pending_voucher_code),
    updated_at  = NOW();

  RETURN NEW;
END;
$function$;
