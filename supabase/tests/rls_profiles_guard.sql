-- ============================================================
-- RLS Profiles Guard Test Suite — DB-01
-- Mundo de Kaboo — white-label: kaboo + central-coruja
--
-- PROPÓSITO
--   Verifica que a migração 20260626000000_t50_profiles_privilege_guard.sql
--   fecha os dois ataques do DB-01:
--     • self-escalation de role (viewer → admin)
--     • tenant-hopping de brand_id (kaboo → coruja)
--   E que a atribuição inicial (NULL → brand_id) ainda funciona.
--
-- COMO USAR
--   Cole no Supabase SQL editor (como service_role) ou rode via:
--     supabase test db
--   Toda mutação está dentro de BEGIN...ROLLBACK — nada é persistido.
--
-- SUBSTITUIÇÕES NECESSÁRIAS (mesmas do rls_brand_isolation.sql)
-- ┌─────────────────────────────────────────────────────────────────┐
-- │ Placeholder                         │ O que substituir          │
-- ├─────────────────────────────────────┼───────────────────────────┤
-- │ 00000000-0000-0000-0000-000000000001│ brand_id da marca kaboo   │
-- │ 00000000-0000-0000-0000-000000000002│ brand_id da central-coruja│
-- │ 00000000-0000-0000-0000-000000000010│ user_id do viewer_kaboo   │
-- └─────────────────────────────────────────────────────────────────┘
-- ============================================================

BEGIN;

DO $$
BEGIN
  RAISE NOTICE '=== RLS Profiles Guard Test Suite (DB-01) ===';
  RAISE NOTICE 'Migração alvo: 20260626000000_t50_profiles_privilege_guard.sql';
  RAISE NOTICE '';
END $$;

-- ============================================================
-- SETUP: fixtures injetados para os testes
-- (a transação faz ROLLBACK no final — nada persiste)
-- ============================================================

-- Marcas (profiles.brand_id e collections/formations/materials.brand_id têm FK p/ brands).
INSERT INTO public.brands (id, slug, name)
VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'test-kaboo',  '[TEST] Kaboo'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'test-coruja', '[TEST] Coruja')
ON CONFLICT (id) DO NOTHING;

-- Usuários de auth (profiles.id tem FK p/ auth.users; o trigger handle_new_user
-- cria a linha em public.profiles automaticamente no INSERT abaixo).
INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000010'::uuid, '00000000-0000-0000-0000-000000000000'::uuid,
   'authenticated', 'authenticated', 'viewer-kaboo@test.local',  NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000030'::uuid, '00000000-0000-0000-0000-000000000000'::uuid,
   'authenticated', 'authenticated', 'viewer-nobrand@test.local', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- viewer_kaboo — brand_id já atribuído, role viewer
INSERT INTO public.profiles (id, brand_id, role)
VALUES (
  '00000000-0000-0000-0000-000000000010'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'viewer'
)
ON CONFLICT (id) DO UPDATE
  SET brand_id = EXCLUDED.brand_id,
      role     = EXCLUDED.role;

-- viewer_nobrand — brand_id IS NULL (ainda não resgatou voucher)
INSERT INTO public.profiles (id, brand_id, role)
VALUES (
  '00000000-0000-0000-0000-000000000030'::uuid,
  NULL,
  'viewer'
)
ON CONFLICT (id) DO UPDATE
  SET brand_id = NULL,
      role     = EXCLUDED.role;

-- fixtures de collections/characters/formations/materials por marca
-- (usadas na seção de SELECT cross-brand)
INSERT INTO public.collections (id, brand_id, title, is_published)
VALUES
  ('cccccccc-0000-0000-0000-000000000001'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid,
   '[TEST-GUARD] Collection Kaboo', true),
  ('cccccccc-0000-0000-0000-000000000002'::uuid,
   '00000000-0000-0000-0000-000000000002'::uuid,
   '[TEST-GUARD] Collection Coruja', true);

INSERT INTO public.formations (id, brand_id, title, is_published)
VALUES
  ('dddddddd-0000-0000-0000-000000000001'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid,
   '[TEST-GUARD] Formation Kaboo', true),
  ('dddddddd-0000-0000-0000-000000000002'::uuid,
   '00000000-0000-0000-0000-000000000002'::uuid,
   '[TEST-GUARD] Formation Coruja', true);

INSERT INTO public.materials (id, brand_id, title, is_published)
VALUES
  ('eeeeeeee-0000-0000-0000-000000000001'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid,
   '[TEST-GUARD] Material Kaboo', true),
  ('eeeeeeee-0000-0000-0000-000000000002'::uuid,
   '00000000-0000-0000-0000-000000000002'::uuid,
   '[TEST-GUARD] Material Coruja', true);

-- ============================================================
-- SEÇÃO 1: DB-01 guard — role freeze
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '--- SEÇÃO 1: DB-01 role freeze ---';
END $$;

-- ── 1.1 viewer tenta auto-promover para admin ────────────────
-- O trigger guard_profile_privilege_columns deve silenciosamente
-- reverter NEW.role para 'viewer'. O UPDATE não falha — mas role
-- permanece inalterado.
DO $$
DECLARE
  v_role text;
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',  '00000000-0000-0000-0000-000000000010',
      'role', 'authenticated'
    )::text,
    true
  );
  SET LOCAL ROLE authenticated;

  UPDATE public.profiles
  SET role = 'admin'
  WHERE id = '00000000-0000-0000-0000-000000000010'::uuid;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);

  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = '00000000-0000-0000-0000-000000000010'::uuid;

  IF v_role = 'viewer' THEN
    RAISE NOTICE 'PASS [1.1]: auto-escalation de role bloqueada — role permanece viewer';
  ELSE
    RAISE EXCEPTION 'FAIL [1.1]: role foi alterado para % (esperado: viewer) — guard não está ativo!', v_role;
  END IF;
END $$;

-- ── 1.2 trigger presente no catálogo ────────────────────────
DO $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_guard_profile_privilege'
      AND tgrelid = 'public.profiles'::regclass
  ) INTO v_exists;

  IF v_exists THEN
    RAISE NOTICE 'PASS [1.2]: trigger trg_guard_profile_privilege existe em profiles';
  ELSE
    RAISE EXCEPTION 'FAIL [1.2]: trigger trg_guard_profile_privilege NÃO encontrado — migração DB-01 não foi aplicada!';
  END IF;
END $$;

-- ── 1.3 WITH CHECK presente na política de UPDATE ────────────
DO $$
DECLARE
  v_has_check boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'profiles'
      AND cmd        = 'UPDATE'
      AND with_check IS NOT NULL
  ) INTO v_has_check;

  IF v_has_check THEN
    RAISE NOTICE 'PASS [1.3]: política UPDATE em profiles tem WITH CHECK definido';
  ELSE
    RAISE EXCEPTION 'FAIL [1.3]: política UPDATE em profiles sem WITH CHECK — migração DB-01 não foi aplicada!';
  END IF;
END $$;

-- ============================================================
-- SEÇÃO 2: DB-01 guard — brand_id freeze (tenant-hopping)
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- SEÇÃO 2: DB-01 brand_id freeze ---';
END $$;

-- ── 2.1 viewer_kaboo tenta trocar brand_id para coruja ───────
-- Deve ser silenciosamente revertido pelo trigger.
DO $$
DECLARE
  v_brand_id uuid;
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',  '00000000-0000-0000-0000-000000000010',
      'role', 'authenticated'
    )::text,
    true
  );
  SET LOCAL ROLE authenticated;

  UPDATE public.profiles
  SET brand_id = '00000000-0000-0000-0000-000000000002'::uuid
  WHERE id = '00000000-0000-0000-0000-000000000010'::uuid;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);

  SELECT brand_id INTO v_brand_id
  FROM public.profiles
  WHERE id = '00000000-0000-0000-0000-000000000010'::uuid;

  IF v_brand_id = '00000000-0000-0000-0000-000000000001'::uuid THEN
    RAISE NOTICE 'PASS [2.1]: tenant-hopping bloqueado — brand_id permanece kaboo';
  ELSE
    RAISE EXCEPTION 'FAIL [2.1]: brand_id foi alterado para % (esperado: kaboo) — guard não está ativo!', v_brand_id;
  END IF;
END $$;

-- ── 2.2 viewer_kaboo tenta zerar brand_id (NULL) ─────────────
-- Limpar brand_id depois de atribuído também deve ser bloqueado.
DO $$
DECLARE
  v_brand_id uuid;
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',  '00000000-0000-0000-0000-000000000010',
      'role', 'authenticated'
    )::text,
    true
  );
  SET LOCAL ROLE authenticated;

  UPDATE public.profiles
  SET brand_id = NULL
  WHERE id = '00000000-0000-0000-0000-000000000010'::uuid;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);

  SELECT brand_id INTO v_brand_id
  FROM public.profiles
  WHERE id = '00000000-0000-0000-0000-000000000010'::uuid;

  IF v_brand_id = '00000000-0000-0000-0000-000000000001'::uuid THEN
    RAISE NOTICE 'PASS [2.2]: limpeza de brand_id bloqueada — brand_id permanece kaboo';
  ELSE
    RAISE EXCEPTION 'FAIL [2.2]: brand_id foi zerado/alterado para % — guard deve preservar brand_id já atribuído', v_brand_id;
  END IF;
END $$;

-- ============================================================
-- SEÇÃO 3: DB-01 guard — atribuição inicial permitida (NULL→valor)
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- SEÇÃO 3: atribuição inicial brand_id (NULL → valor) ---';
END $$;

-- ── 3.1 primeiro voucher: viewer sem brand_id recebe kaboo ───
-- O guard permite NULL→valor. Simula o que redeem_voucher faz via
-- SECURITY DEFINER, mas também valida que um UPDATE de sessão
-- autenticada com brand_id IS NULL ainda recebe o valor.
-- (Na prática redeem_voucher usa service_role/postgres, mas o guard
--  explicitamente permite NULL→valor para qualquer caller.)
DO $$
DECLARE
  v_brand_id uuid;
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',  '00000000-0000-0000-0000-000000000030',
      'role', 'authenticated'
    )::text,
    true
  );
  SET LOCAL ROLE authenticated;

  UPDATE public.profiles
  SET brand_id = '00000000-0000-0000-0000-000000000001'::uuid
  WHERE id = '00000000-0000-0000-0000-000000000030'::uuid;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);

  SELECT brand_id INTO v_brand_id
  FROM public.profiles
  WHERE id = '00000000-0000-0000-0000-000000000030'::uuid;

  IF v_brand_id = '00000000-0000-0000-0000-000000000001'::uuid THEN
    RAISE NOTICE 'PASS [3.1]: atribuição inicial (NULL → kaboo) permitida — redeem_voucher não vai quebrar';
  ELSE
    RAISE EXCEPTION 'FAIL [3.1]: atribuição inicial bloqueada — brand_id permanece % (esperado: kaboo) — guard demasiado restritivo!', v_brand_id;
  END IF;
END $$;

-- ============================================================
-- SEÇÃO 4: isolamento de leitura — formations e materials
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- SEÇÃO 4: SELECT cross-brand em formations/materials ---';
END $$;

-- ── 4.1 viewer_kaboo não vê collections da coruja ───────────
DO $$
DECLARE
  v_count int;
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',  '00000000-0000-0000-0000-000000000010',
      'role', 'authenticated'
    )::text,
    true
  );
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO v_count
  FROM public.collections
  WHERE brand_id = '00000000-0000-0000-0000-000000000002'::uuid;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);

  IF v_count = 0 THEN
    RAISE NOTICE 'PASS [4.1]: viewer_kaboo vê 0 collections da coruja';
  ELSE
    RAISE EXCEPTION 'FAIL [4.1]: viewer_kaboo viu % collections da coruja (vazamento cross-brand!)', v_count;
  END IF;
END $$;

-- ── 4.2 viewer_kaboo não vê formations da coruja ────────────
DO $$
DECLARE
  v_count int;
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',  '00000000-0000-0000-0000-000000000010',
      'role', 'authenticated'
    )::text,
    true
  );
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO v_count
  FROM public.formations
  WHERE brand_id = '00000000-0000-0000-0000-000000000002'::uuid;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);

  IF v_count = 0 THEN
    RAISE NOTICE 'PASS [4.2]: viewer_kaboo vê 0 formations da coruja';
  ELSE
    RAISE EXCEPTION 'FAIL [4.2]: viewer_kaboo viu % formations da coruja (vazamento cross-brand!)', v_count;
  END IF;
END $$;

-- ── 4.3 viewer_kaboo não vê materials da coruja ─────────────
DO $$
DECLARE
  v_count int;
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',  '00000000-0000-0000-0000-000000000010',
      'role', 'authenticated'
    )::text,
    true
  );
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO v_count
  FROM public.materials
  WHERE brand_id = '00000000-0000-0000-0000-000000000002'::uuid;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);

  IF v_count = 0 THEN
    RAISE NOTICE 'PASS [4.3]: viewer_kaboo vê 0 materials da coruja';
  ELSE
    RAISE EXCEPTION 'FAIL [4.3]: viewer_kaboo viu % materials da coruja (vazamento cross-brand!)', v_count;
  END IF;
END $$;

-- ── 4.4 viewer_kaboo VÊ formations da sua própria marca ─────
-- Garante que o isolamento não bloqueou o acesso legítimo.
DO $$
DECLARE
  v_count int;
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',  '00000000-0000-0000-0000-000000000010',
      'role', 'authenticated'
    )::text,
    true
  );
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO v_count
  FROM public.formations
  WHERE brand_id = '00000000-0000-0000-0000-000000000001'::uuid;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);

  IF v_count > 0 THEN
    RAISE NOTICE 'PASS [4.4]: viewer_kaboo vê % formations da kaboo (acesso legítimo OK)', v_count;
  ELSE
    RAISE NOTICE 'WARN [4.4]: viewer_kaboo vê 0 formations da kaboo — verificar política RLS de formations';
  END IF;
END $$;

-- ── 4.5 viewer_kaboo VÊ materials da sua própria marca ──────
DO $$
DECLARE
  v_count int;
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',  '00000000-0000-0000-0000-000000000010',
      'role', 'authenticated'
    )::text,
    true
  );
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO v_count
  FROM public.materials
  WHERE brand_id = '00000000-0000-0000-0000-000000000001'::uuid;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);

  IF v_count > 0 THEN
    RAISE NOTICE 'PASS [4.5]: viewer_kaboo vê % materials da kaboo (acesso legítimo OK)', v_count;
  ELSE
    RAISE NOTICE 'WARN [4.5]: viewer_kaboo vê 0 materials da kaboo — verificar política RLS de materials';
  END IF;
END $$;

-- ============================================================
-- SUMÁRIO FINAL
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== FIM DOS TESTES (DB-01 guard) ===';
  RAISE NOTICE 'Se chegou aqui sem EXCEPTION, todos os testes críticos passaram.';
  RAISE NOTICE 'WARN não são falhas — requerem atenção manual.';
  RAISE NOTICE 'Executando ROLLBACK — nenhum dado foi persistido.';
END $$;

ROLLBACK;

-- ============================================================
-- LEGENDA
-- ============================================================
-- PASS  → controle funcionando conforme esperado
-- WARN  → situação ambígua — inspecionar manualmente
-- FAIL  → vulnerabilidade detectada — ação imediata necessária
-- ============================================================
