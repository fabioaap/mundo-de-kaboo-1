-- ============================================================
-- Fix: redeem_voucher audit_log INSERT type mismatch
-- entity_id is UUID but was receiving TEXT (voucher_record.id::TEXT)
-- PostgreSQL does not allow implicit TEXT → UUID assignment cast.
-- Fix: pass voucher_record.id directly (already UUID type).
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
  v_batch_record public.voucher_batches%ROWTYPE;
  v_snapshot JSONB;
  v_item JSONB;
  v_granted_ids TEXT[] := '{}';
BEGIN
  -- Auth check
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'not_authenticated',
      'message', 'Faça login para ativar um novo codigo de acesso.'
    );
  END IF;

  -- Lock voucher row
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

  -- Get or create profile
  SELECT *
  INTO profile_record
  FROM public.profiles
  WHERE id = current_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, email, role, access_status, created_at, updated_at)
    VALUES (current_user_id, auth.jwt() ->> 'email', 'viewer', 'pending_voucher', current_ts, current_ts)
    RETURNING * INTO profile_record;
  END IF;

  -- Calculate new expiration (additive)
  base_expiration := GREATEST(COALESCE(profile_record.access_expires_at, current_ts), current_ts);
  next_expiration := base_expiration + make_interval(months => voucher_record.duration_months);

  -- Update profile
  UPDATE public.profiles
  SET
    voucher_id = voucher_record.id,
    access_starts_at = COALESCE(profile_record.access_starts_at, current_ts),
    access_expires_at = next_expiration,
    access_status = 'active',
    updated_at = current_ts
  WHERE id = current_user_id;

  -- Mark voucher as redeemed
  UPDATE public.vouchers
  SET
    status = 'redeemed',
    consumed_by_user_id = current_user_id,
    consumed_at = current_ts,
    updated_at = current_ts
  WHERE id = voucher_record.id;

  -- ── Content grants: if voucher is linked to a batch, create grants ──
  IF voucher_record.batch_id IS NOT NULL THEN
    SELECT *
    INTO v_batch_record
    FROM public.voucher_batches
    WHERE id = voucher_record.batch_id;

    IF FOUND AND v_batch_record.model_snapshot IS NOT NULL THEN
      v_snapshot := v_batch_record.model_snapshot;

      FOR v_item IN SELECT * FROM jsonb_array_elements(v_snapshot -> 'items')
      LOOP
        INSERT INTO public.user_content_grants (
          user_id, collection_id, voucher_id, granted_at, expires_at
        )
        VALUES (
          current_user_id,
          (v_item ->> 'collection_id')::UUID,
          voucher_record.id,
          current_ts,
          next_expiration
        )
        ON CONFLICT (user_id, collection_id, voucher_id) DO NOTHING;

        v_granted_ids := v_granted_ids || (v_item ->> 'collection_id');
      END LOOP;

      -- Audit log: use voucher_record.id directly (UUID) instead of ::TEXT cast
      INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, details)
      VALUES (
        current_user_id,
        'redeem_grants',
        'voucher',
        voucher_record.id,   -- fixed: was voucher_record.id::TEXT (TEXT → UUID type mismatch)
        jsonb_build_object(
          'granted_collections', array_length(v_granted_ids, 1),
          'model', v_snapshot ->> 'name',
          'batch_id', voucher_record.batch_id
        )
      );
    END IF;
  END IF;

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
    'access_expires_at', next_expiration,
    'granted_collection_ids', to_jsonb(v_granted_ids)
  );
END;
$$;
