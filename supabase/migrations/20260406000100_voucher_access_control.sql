-- ============================================================
-- Migration: vouchers e controle temporal de acesso
-- Adiciona tabela de vouchers, campos de acesso em profiles
-- e funcoes RPC para validar/resgatar codigos.
-- ============================================================

-- ------------------------------------------------------------
-- Alinhamento de schema do perfil com o frontend atual
-- ------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS voucher_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS access_starts_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS access_status TEXT DEFAULT 'active';

UPDATE public.profiles
SET
  full_name = COALESCE(full_name, name),
  school_name = COALESCE(school_name, school),
  access_status = COALESCE(
    access_status,
    CASE
      WHEN access_expires_at IS NOT NULL AND access_expires_at < NOW() THEN 'expired'
      ELSE 'active'
    END
  );

ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'viewer';

-- ------------------------------------------------------------
-- Tabela de vouchers
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vouchers (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code                TEXT        NOT NULL UNIQUE,
  duration_months     INT         NOT NULL CHECK (duration_months IN (1, 3, 6, 9, 12)),
  status              TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired', 'disabled')),
  expires_at          TIMESTAMPTZ,
  consumed_by_user_id UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  consumed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vouchers_code_upper ON public.vouchers ((UPPER(code)));
CREATE INDEX IF NOT EXISTS idx_vouchers_consumed_by_user_id ON public.vouchers (consumed_by_user_id);

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_voucher_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_voucher_id_fkey
      FOREIGN KEY (voucher_id) REFERENCES public.vouchers(id) ON DELETE SET NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'vouchers'
      AND policyname = 'Service role gerencia vouchers'
  ) THEN
    CREATE POLICY "Service role gerencia vouchers"
      ON public.vouchers FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

REVOKE ALL ON TABLE public.vouchers FROM anon, authenticated;

-- ------------------------------------------------------------
-- Trigger de novos usuarios com status pendente de voucher
-- ------------------------------------------------------------
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
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    school_name = COALESCE(public.profiles.school_name, EXCLUDED.school_name),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- Funcao RPC: validar voucher sem consumi-lo
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_voucher(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_code TEXT := UPPER(TRIM(COALESCE(p_code, '')));
  voucher_record public.vouchers%ROWTYPE;
BEGIN
  IF normalized_code = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'invalid_code',
      'message', 'Codigo de acesso invalido.'
    );
  END IF;

  SELECT *
  INTO voucher_record
  FROM public.vouchers
  WHERE UPPER(code) = normalized_code
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'invalid_code',
      'message', 'Codigo de acesso invalido.'
    );
  END IF;

  IF voucher_record.status = 'disabled' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'voucher_disabled',
      'message', 'Este codigo de acesso nao esta mais disponivel.'
    );
  END IF;

  IF voucher_record.status = 'redeemed'
    OR voucher_record.consumed_at IS NOT NULL
    OR voucher_record.consumed_by_user_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'already_redeemed',
      'message', 'Este codigo ja foi utilizado.'
    );
  END IF;

  IF voucher_record.status = 'expired'
    OR (voucher_record.expires_at IS NOT NULL AND voucher_record.expires_at < NOW()) THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'voucher_expired',
      'message', 'Este codigo de acesso expirou.'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'voucher', jsonb_build_object(
      'id', voucher_record.id,
      'code', voucher_record.code,
      'duration_months', voucher_record.duration_months,
      'status', voucher_record.status,
      'expires_at', voucher_record.expires_at,
      'consumed_at', voucher_record.consumed_at,
      'consumed_by_user_id', voucher_record.consumed_by_user_id
    )
  );
END;
$$;

-- ------------------------------------------------------------
-- Funcao RPC: resgatar voucher para o usuario autenticado
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_voucher(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_code TEXT := UPPER(TRIM(COALESCE(p_code, '')));
  current_user_id UUID := auth.uid();
  voucher_record public.vouchers%ROWTYPE;
  profile_record public.profiles%ROWTYPE;
  base_expiration TIMESTAMPTZ;
  next_expiration TIMESTAMPTZ;
  current_ts TIMESTAMPTZ := NOW();
BEGIN
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'not_authenticated',
      'message', 'Faça login para ativar um novo codigo de acesso.'
    );
  END IF;

  SELECT *
  INTO voucher_record
  FROM public.vouchers
  WHERE UPPER(code) = normalized_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'invalid_code',
      'message', 'Codigo de acesso invalido.'
    );
  END IF;

  IF voucher_record.status = 'disabled' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'voucher_disabled',
      'message', 'Este codigo de acesso nao esta mais disponivel.'
    );
  END IF;

  IF voucher_record.status = 'redeemed'
    OR voucher_record.consumed_at IS NOT NULL
    OR voucher_record.consumed_by_user_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'already_redeemed',
      'message', 'Este codigo ja foi utilizado.'
    );
  END IF;

  IF voucher_record.status = 'expired'
    OR (voucher_record.expires_at IS NOT NULL AND voucher_record.expires_at < current_ts) THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'voucher_expired',
      'message', 'Este codigo de acesso expirou.'
    );
  END IF;

  SELECT *
  INTO profile_record
  FROM public.profiles
  WHERE id = current_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (
      id,
      email,
      role,
      access_status,
      created_at,
      updated_at
    )
    VALUES (
      current_user_id,
      auth.jwt() ->> 'email',
      'viewer',
      'pending_voucher',
      current_ts,
      current_ts
    )
    RETURNING * INTO profile_record;
  END IF;

  base_expiration := GREATEST(COALESCE(profile_record.access_expires_at, current_ts), current_ts);
  next_expiration := base_expiration + make_interval(months => voucher_record.duration_months);

  UPDATE public.profiles
  SET
    voucher_id = voucher_record.id,
    access_starts_at = COALESCE(profile_record.access_starts_at, current_ts),
    access_expires_at = next_expiration,
    access_status = 'active',
    updated_at = current_ts
  WHERE id = current_user_id;

  UPDATE public.vouchers
  SET
    status = 'redeemed',
    consumed_by_user_id = current_user_id,
    consumed_at = current_ts,
    updated_at = current_ts
  WHERE id = voucher_record.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Acesso ativado com sucesso.',
    'voucher', jsonb_build_object(
      'id', voucher_record.id,
      'code', voucher_record.code,
      'duration_months', voucher_record.duration_months,
      'status', 'redeemed',
      'expires_at', voucher_record.expires_at,
      'consumed_at', current_ts,
      'consumed_by_user_id', current_user_id
    ),
    'access_expires_at', next_expiration
  );
END;
$$;

REVOKE ALL ON FUNCTION public.validate_voucher(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_voucher(TEXT) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.redeem_voucher(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_voucher(TEXT) TO authenticated;