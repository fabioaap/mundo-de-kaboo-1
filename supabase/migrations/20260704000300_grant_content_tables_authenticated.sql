-- Issue #61/#54 fix (2026-07-04): mesmo padrão do grant de profiles
-- (20260704000200) — nenhuma dessas tabelas de conteúdo teve GRANT explícito
-- em nenhuma migration, sempre dependendo do default privilege automático do
-- Supabase hospedado (não reproduzido por um `supabase db start` local/CI do
-- zero). A lane pgTAP (rls_profiles_guard.sql, SEÇÃO 4) revelou o gap ao
-- tentar ler collections/formations/materials como authenticated: "permission
-- denied for table collections". RLS já restringe o acesso fino por marca —
-- este GRANT só abre a porta de nível de tabela que o RLS então filtra.
-- Idempotente; sem efeito em prod (authenticated já tem esse acesso lá).

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.formations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
GRANT SELECT ON public.brands TO authenticated, anon;
