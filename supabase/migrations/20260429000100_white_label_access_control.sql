-- Placeholder migration to represent remote migration history.
-- Remote schema_migrations contains: 20260429000100 white_label_access_control
-- This repository currently lacks the original SQL body that was applied remotely.
-- DO NOT treat this file as proof of the exact historical DDL executed in production.
--
-- Why this exists:
-- - The remote database already has white-label access-control behavior/effects.
-- - We need the repo to acknowledge the remote version ID before any future repair/alignment.
-- - The canonical white-label baseline in this repo still lives in:
--   20260426000100_white_label_brands.sql
--
-- Follow-up required before any mutable remote action:
-- 1. Recover or reconstruct the exact historical SQL if possible.
-- 2. Confirm which parts of access control were introduced here versus 20260426000100.
-- 3. Only then decide whether to keep this as a documented no-op or replace it with reconstructed SQL.

-- no-op on purpose
SELECT 1;
