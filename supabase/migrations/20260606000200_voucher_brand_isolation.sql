-- ============================================================
-- Adiciona brand_id a voucher_models, voucher_batches,
-- vouchers e audit_log, com RLS para admins da brand.
-- ============================================================

-- ── voucher_models ──────────────────────────────────────────
ALTER TABLE public.voucher_models
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_voucher_models_brand_id
  ON public.voucher_models(brand_id);

CREATE POLICY "Brand admins SELECT voucher_models"
  ON public.voucher_models FOR SELECT
  TO authenticated
  USING (brand_id IS NOT NULL AND public.can_manage_brand(brand_id));

CREATE POLICY "Brand admins INSERT voucher_models"
  ON public.voucher_models FOR INSERT
  TO authenticated
  WITH CHECK (brand_id IS NOT NULL AND public.can_manage_brand(brand_id));

CREATE POLICY "Brand admins UPDATE voucher_models"
  ON public.voucher_models FOR UPDATE
  TO authenticated
  USING (brand_id IS NOT NULL AND public.can_manage_brand(brand_id))
  WITH CHECK (brand_id IS NOT NULL AND public.can_manage_brand(brand_id));

-- ── voucher_model_items ─────────────────────────────────────
-- Items inherit access via their parent model's brand check
CREATE POLICY "Brand admins SELECT voucher_model_items"
  ON public.voucher_model_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.voucher_models vm
      WHERE vm.id = voucher_model_items.model_id
        AND vm.brand_id IS NOT NULL
        AND public.can_manage_brand(vm.brand_id)
    )
  );

CREATE POLICY "Brand admins INSERT voucher_model_items"
  ON public.voucher_model_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.voucher_models vm
      WHERE vm.id = voucher_model_items.model_id
        AND vm.brand_id IS NOT NULL
        AND public.can_manage_brand(vm.brand_id)
    )
  );

CREATE POLICY "Brand admins DELETE voucher_model_items"
  ON public.voucher_model_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.voucher_models vm
      WHERE vm.id = voucher_model_items.model_id
        AND vm.brand_id IS NOT NULL
        AND public.can_manage_brand(vm.brand_id)
    )
  );

-- ── voucher_batches ─────────────────────────────────────────
ALTER TABLE public.voucher_batches
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_voucher_batches_brand_id
  ON public.voucher_batches(brand_id);

CREATE POLICY "Brand admins SELECT voucher_batches"
  ON public.voucher_batches FOR SELECT
  TO authenticated
  USING (brand_id IS NOT NULL AND public.can_manage_brand(brand_id));

CREATE POLICY "Brand admins INSERT voucher_batches"
  ON public.voucher_batches FOR INSERT
  TO authenticated
  WITH CHECK (brand_id IS NOT NULL AND public.can_manage_brand(brand_id));

CREATE POLICY "Brand admins UPDATE voucher_batches"
  ON public.voucher_batches FOR UPDATE
  TO authenticated
  USING (brand_id IS NOT NULL AND public.can_manage_brand(brand_id))
  WITH CHECK (brand_id IS NOT NULL AND public.can_manage_brand(brand_id));

-- ── vouchers ────────────────────────────────────────────────
ALTER TABLE public.vouchers
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_vouchers_brand_id
  ON public.vouchers(brand_id);

CREATE POLICY "Brand admins SELECT vouchers"
  ON public.vouchers FOR SELECT
  TO authenticated
  USING (brand_id IS NOT NULL AND public.can_manage_brand(brand_id));

CREATE POLICY "Brand admins UPDATE vouchers"
  ON public.vouchers FOR UPDATE
  TO authenticated
  USING (brand_id IS NOT NULL AND public.can_manage_brand(brand_id))
  WITH CHECK (brand_id IS NOT NULL AND public.can_manage_brand(brand_id));

-- ── audit_log ───────────────────────────────────────────────
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_audit_log_brand_id
  ON public.audit_log(brand_id);

CREATE POLICY "Brand admins SELECT audit_log"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (brand_id IS NOT NULL AND public.can_manage_brand(brand_id));
