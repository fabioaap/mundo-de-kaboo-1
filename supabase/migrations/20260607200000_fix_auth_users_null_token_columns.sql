-- ==============================================================
-- Migration: Backfill NULL GoTrue token columns in auth.users
--
-- WHY
-- ---
-- The admin "Usuários" screen calls the `admin-list-users` edge function,
-- which uses GoTrue's admin listUsers(). GoTrue scans several auth.users
-- text columns expecting non-NULL strings; when any row holds NULL in one
-- of them it fails with:
--   500 unexpected_failure — "Database error finding users"
-- and the whole user list breaks (not just the offending row).
--
-- Root cause: users inserted directly into auth.users (e.g. ad-hoc test/
-- voucher accounts created via SQL or the dashboard, like
-- 'teste-voucher@kaboo.test') leave these token columns NULL instead of the
-- empty string ('') that the normal signup flow writes.
--
-- WHAT
-- ----
-- Backfill every known GoTrue string-token column from NULL to '' across all
-- existing rows. '' is the value the standard signup path uses, so this is a
-- no-behaviour-change repair, not a data edit.
--
-- Safe:        only rewrites NULL -> '' (never touches real token values).
-- Idempotent:  re-running is a no-op once columns are non-NULL.
-- Forward-fix: prevents recurrence for existing rows; future direct inserts
--              should also set '' (or go through the GoTrue admin API).
-- ==============================================================

UPDATE auth.users SET
  confirmation_token          = COALESCE(confirmation_token, ''),
  recovery_token              = COALESCE(recovery_token, ''),
  email_change_token_new      = COALESCE(email_change_token_new, ''),
  email_change                = COALESCE(email_change, ''),
  email_change_token_current  = COALESCE(email_change_token_current, ''),
  phone_change                = COALESCE(phone_change, ''),
  phone_change_token          = COALESCE(phone_change_token, ''),
  reauthentication_token      = COALESCE(reauthentication_token, '')
WHERE confirmation_token IS NULL
   OR recovery_token IS NULL
   OR email_change_token_new IS NULL
   OR email_change IS NULL
   OR email_change_token_current IS NULL
   OR phone_change IS NULL
   OR phone_change_token IS NULL
   OR reauthentication_token IS NULL;
