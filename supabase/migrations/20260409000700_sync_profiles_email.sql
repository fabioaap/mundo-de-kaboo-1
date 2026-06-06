-- Migration: 20260409000700_sync_profiles_email.sql
-- US-DB1: Sincronizar profiles.email com auth.users automaticamente
--
-- Problema: quando o usuário troca o e-mail via supabase.auth.updateUser(),
-- o auth.users.email é atualizado mas public.profiles.email permanece
-- desatualizado, gerando inconsistência visível no AdminScreen.
--
-- Solução: trigger AFTER UPDATE ON auth.users que propaga a mudança.

-- ─── Função do trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_profiles_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só age quando o e-mail realmente mudou
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles
    SET
      email      = NEW.email,
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;
-- ─── Trigger em auth.users ──────────────────────────────────────────────────
-- O schema auth requer SECURITY DEFINER e search_path explícito para ser
-- seguro contra privilege escalation (ver aviso do Supabase Linter).
DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profiles_email();
-- ─── Back-fill: corrige registros já existentes com email desatualizado ─────
UPDATE public.profiles p
SET
  email      = u.email,
  updated_at = NOW()
FROM auth.users u
WHERE p.id = u.id
  AND p.email IS DISTINCT FROM u.email;
