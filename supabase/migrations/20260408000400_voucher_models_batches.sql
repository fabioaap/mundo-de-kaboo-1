-- ============================================================
-- Migration: voucher_models, voucher_model_items, voucher_batches
-- e user_content_grants para gestao de vouchers por conteudo.
-- Evolui a tabela vouchers existente para vincular a modelo e lote.
-- ============================================================

-- ------------------------------------------------------------
-- Tabela: voucher_models (template configuravel)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.voucher_models (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL,
  description       TEXT,
  package_type      TEXT        NOT NULL CHECK (package_type IN ('book', 'collection', 'kit', 'curated_set')),
  duration_months   INT         NOT NULL CHECK (duration_months IN (1, 3, 6, 9, 12)),
  redeem_by         TIMESTAMPTZ,
  status            TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_by        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.voucher_models ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'voucher_models'
      AND policyname = 'Service role gerencia voucher_models'
  ) THEN
    CREATE POLICY "Service role gerencia voucher_models"
      ON public.voucher_models FOR ALL
      TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

REVOKE ALL ON TABLE public.voucher_models FROM anon, authenticated;

-- ------------------------------------------------------------
-- Tabela: voucher_model_items (itens do catalogo no modelo)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.voucher_model_items (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id          UUID        NOT NULL REFERENCES public.voucher_models(id) ON DELETE CASCADE,
  collection_id     UUID        NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (model_id, collection_id)
);

ALTER TABLE public.voucher_model_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'voucher_model_items'
      AND policyname = 'Service role gerencia voucher_model_items'
  ) THEN
    CREATE POLICY "Service role gerencia voucher_model_items"
      ON public.voucher_model_items FOR ALL
      TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

REVOKE ALL ON TABLE public.voucher_model_items FROM anon, authenticated;

-- ------------------------------------------------------------
-- Tabela: voucher_batches (lote de emissao)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.voucher_batches (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id          UUID        NOT NULL REFERENCES public.voucher_models(id) ON DELETE RESTRICT,
  label             TEXT,
  quantity          INT         NOT NULL CHECK (quantity > 0),
  status            TEXT        NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'exported', 'sent', 'confirmed', 'cancelled')),
  model_snapshot    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  exported_at       TIMESTAMPTZ,
  exported_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at           TIMESTAMPTZ,
  sent_by           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_to           TEXT,
  confirmed_at      TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  cancelled_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  cancel_reason     TEXT,
  created_by        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voucher_batches_model_id ON public.voucher_batches (model_id);

ALTER TABLE public.voucher_batches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'voucher_batches'
      AND policyname = 'Service role gerencia voucher_batches'
  ) THEN
    CREATE POLICY "Service role gerencia voucher_batches"
      ON public.voucher_batches FOR ALL
      TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

REVOKE ALL ON TABLE public.voucher_batches FROM anon, authenticated;

-- ------------------------------------------------------------
-- Evolução da tabela vouchers: vincular a modelo e lote
-- ------------------------------------------------------------
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES public.voucher_models(id) ON DELETE SET NULL;
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.voucher_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vouchers_model_id ON public.vouchers (model_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_batch_id ON public.vouchers (batch_id);

-- ------------------------------------------------------------
-- Tabela: user_content_grants (permissão de conteúdo por usuario)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_content_grants (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_id     UUID        NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  voucher_id        UUID        REFERENCES public.vouchers(id) ON DELETE SET NULL,
  granted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ,
  UNIQUE (user_id, collection_id, voucher_id)
);

CREATE INDEX IF NOT EXISTS idx_user_content_grants_user_id ON public.user_content_grants (user_id);
CREATE INDEX IF NOT EXISTS idx_user_content_grants_collection_id ON public.user_content_grants (collection_id);

ALTER TABLE public.user_content_grants ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_content_grants'
      AND policyname = 'Usuarios leem seus proprios grants'
  ) THEN
    CREATE POLICY "Usuarios leem seus proprios grants"
      ON public.user_content_grants FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_content_grants'
      AND policyname = 'Service role gerencia user_content_grants'
  ) THEN
    CREATE POLICY "Service role gerencia user_content_grants"
      ON public.user_content_grants FOR ALL
      TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ------------------------------------------------------------
-- Tabela: audit_log (trilha de auditoria operacional)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  action            TEXT        NOT NULL,
  entity_type       TEXT        NOT NULL,
  entity_id         UUID,
  details           JSONB       DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log (actor_id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_log'
      AND policyname = 'Service role gerencia audit_log'
  ) THEN
    CREATE POLICY "Service role gerencia audit_log"
      ON public.audit_log FOR ALL
      TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

REVOKE ALL ON TABLE public.audit_log FROM anon, authenticated;
