-- Issue #61/#54 fix (2026-07-04): a lane pgTAP (rls_profiles_guard.sql) revelou
-- que a role `authenticated` nunca teve GRANT explícito em `public.profiles`
-- em nenhuma migration — sempre dependeu do grant automático de default
-- privileges que o Supabase hospedado configura na criação do projeto (não
-- reproduzido por um `supabase db start` local/CI num banco do zero). Erro
-- real do Postgres: "permission denied for table profiles", com a dica
-- "GRANT SELECT, UPDATE ON public.profiles TO authenticated" — aplicado aqui
-- ao pé da letra. Idempotente (GRANT não falha se já concedido); sem efeito
-- em prod, onde authenticated já tem esse acesso via default privileges.

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
