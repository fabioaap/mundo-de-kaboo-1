-- ============================================================
-- RPC: emit_voucher_batch
-- Cria um lote de vouchers atomicamente para um modelo ativo.
-- Gera N códigos únicos, snapshot do modelo e entrada no audit_log.
-- ============================================================

CREATE OR REPLACE FUNCTION public.emit_voucher_batch(
    p_model_id    UUID,
    p_quantity    INT,
    p_label       TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_model       public.voucher_models%ROWTYPE;
    v_batch_id    UUID;
    v_snapshot    JSONB;
    v_batch_hex   TEXT;
    v_code        TEXT;
    i             INT;
BEGIN
    -- Validate quantity
    IF p_quantity < 1 OR p_quantity > 10000 THEN
        RAISE EXCEPTION 'Quantidade inválida: deve ser entre 1 e 10000';
    END IF;

    -- Fetch model
    SELECT * INTO v_model
    FROM public.voucher_models
    WHERE id = p_model_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Modelo não encontrado';
    END IF;

    IF v_model.status != 'active' THEN
        RAISE EXCEPTION 'Modelo não está ativo (status atual: %)', v_model.status;
    END IF;

    -- Authorize: caller must be brand admin
    IF NOT public.can_manage_brand(v_model.brand_id) THEN
        RAISE EXCEPTION 'Acesso negado: usuário não é admin da brand';
    END IF;

    -- Build model snapshot (frozen copy of model + items at emission time)
    SELECT jsonb_build_object(
        'name', v_model.name,
        'package_type', v_model.package_type,
        'duration_months', v_model.duration_months,
        'redeem_by', v_model.redeem_by,
        'items', COALESCE(
            (
                SELECT jsonb_agg(jsonb_build_object(
                    'collection_id', vmi.collection_id,
                    'title',         COALESCE(c.title, ''),
                    'cover_image',   c.cover_image
                ) ORDER BY vmi.created_at)
                FROM public.voucher_model_items vmi
                LEFT JOIN public.collections c ON c.id = vmi.collection_id
                WHERE vmi.model_id = p_model_id
            ),
            '[]'::jsonb
        )
    ) INTO v_snapshot;

    -- Create batch row
    INSERT INTO public.voucher_batches(
        model_id, brand_id, label, quantity, status, model_snapshot, created_by
    ) VALUES (
        p_model_id,
        v_model.brand_id,
        p_label,
        p_quantity,
        'generated',
        v_snapshot,
        auth.uid()
    )
    RETURNING id INTO v_batch_id;

    -- Build 8-char hex prefix from batch UUID for unique codes
    v_batch_hex := UPPER(SUBSTRING(REPLACE(v_batch_id::TEXT, '-', ''), 1, 8));

    -- Generate N vouchers
    FOR i IN 1..p_quantity LOOP
        v_code := 'KABOO-' || v_batch_hex || '-' || LPAD(i::TEXT, 4, '0');

        INSERT INTO public.vouchers(
            code,
            duration_months,
            status,
            brand_id,
            batch_id,
            model_id
        ) VALUES (
            v_code,
            v_model.duration_months,
            'active',
            v_model.brand_id,
            v_batch_id,
            p_model_id
        );
    END LOOP;

    -- Audit log entry
    INSERT INTO public.audit_log(
        actor_id, action, entity_type, entity_id, brand_id, details
    ) VALUES (
        auth.uid(),
        'batch_emitted',
        'voucher_batch',
        v_batch_id,
        v_model.brand_id,
        jsonb_build_object(
            'quantity',    p_quantity,
            'model_name',  v_model.name,
            'label',       p_label
        )
    );

    RETURN v_batch_id;
END;
$$;
