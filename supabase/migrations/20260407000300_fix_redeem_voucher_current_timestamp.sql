-- ============================================================
-- Migration: corrige comparação temporal da RPC redeem_voucher
-- Evita conflito com a keyword SQL CURRENT_TIME.
-- ============================================================

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
REVOKE ALL ON FUNCTION public.redeem_voucher(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_voucher(TEXT) TO authenticated;
