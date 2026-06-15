-- Fix: voucher admin tables had RLS policies for `authenticated` but were missing
-- the underlying table-level GRANTs. Postgres enforces SQL privileges BEFORE RLS,
-- so every authenticated (brand admin) read/write hit "permission denied for table"
-- (HTTP 403) before the policy was ever evaluated. Symptoms: admins could not
-- create or list voucher models, batches, codes, or read the audit log; only the
-- service_role worked.
--
-- The grants below mirror exactly the existing `authenticated` RLS policies
-- (least privilege). RLS continues to scope rows via can_manage_brand(brand_id).

-- voucher_models: policies = SELECT, INSERT, UPDATE
GRANT SELECT, INSERT, UPDATE ON public.voucher_models TO authenticated;

-- voucher_model_items: policies = SELECT, INSERT, DELETE
GRANT SELECT, INSERT, DELETE ON public.voucher_model_items TO authenticated;

-- voucher_batches: policies = SELECT, INSERT, UPDATE
GRANT SELECT, INSERT, UPDATE ON public.voucher_batches TO authenticated;

-- vouchers: policies = SELECT, UPDATE
GRANT SELECT, UPDATE ON public.vouchers TO authenticated;

-- audit_log: policies = SELECT
GRANT SELECT ON public.audit_log TO authenticated;
