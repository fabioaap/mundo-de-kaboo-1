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
--
-- Issue #54 fix (2026-07-04): este arquivo sempre usou RAISE NOTICE/EXCEPTION
-- para reportar PASS/FAIL, o que NUNCA produz TAP válido no stdout (pg_prove
-- só reconhece linhas emitidas via SELECT — NOTICE vai para stderr). Por isso
-- o job rls-tests SEMPRE resultava "No plan found in TAP output" mesmo quando
-- toda a lógica de segurança passava (nunca detectado antes porque o rebuild
-- limpo nunca tinha chegado a rodar este arquivo — ver #61). Convertido pra
-- TAP real: plan(9) + SELECT ok(...) por asserção + finish(). A lógica de
-- cada teste (SET ROLE / UPDATE / RESET ROLE / verificação) é idêntica à
-- original — só a forma de reportar o resultado mudou.
-- ============================================================

BEGIN;

SELECT plan(9);

DO $$
BEGIN
  RAISE NOTICE '=== RLS Profiles Guard Test Suite (DB-01) ===';
  RAISE NOTICE 'Migração alvo: 20260626000000_t50_profiles_privilege_guard.sql';
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

SELECT diag('--- SEÇÃO 1: DB-01 role freeze ---');

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

  PERFORM set_config('pgtap.t1_1', (v_role = 'viewer')::text, false);
  PERFORM set_config('pgtap.t1_1_role', v_role, false);
END $$;
SELECT ok(
  current_setting('pgtap.t1_1')::boolean,
  format('auto-escalation de role bloqueada — role permanece viewer (obtido: %s)', current_setting('pgtap.t1_1_role'))
);

-- ── 1.2 trigger presente no catálogo ────────────────────────
SELECT ok(
  EXISTS(
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_guard_profile_privilege'
      AND tgrelid = 'public.profiles'::regclass
  ),
  'trigger trg_guard_profile_privilege existe em profiles'
);

-- ── 1.3 WITH CHECK presente na política de UPDATE ────────────
SELECT ok(
  EXISTS(
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'profiles'
      AND cmd        = 'UPDATE'
      AND with_check IS NOT NULL
  ),
  'política UPDATE em profiles tem WITH CHECK definido'
);

-- ============================================================
-- SEÇÃO 2: DB-01 guard — brand_id freeze (tenant-hopping)
-- ============================================================

SELECT diag('--- SEÇÃO 2: DB-01 brand_id freeze ---');

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

  PERFORM set_config('pgtap.t2_1', (v_brand_id = '00000000-0000-0000-0000-000000000001'::uuid)::text, false);
END $$;
SELECT ok(
  current_setting('pgtap.t2_1')::boolean,
  'tenant-hopping bloqueado — brand_id permanece kaboo'
);

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

  PERFORM set_config('pgtap.t2_2', (v_brand_id = '00000000-0000-0000-0000-000000000001'::uuid)::text, false);
END $$;
SELECT ok(
  current_setting('pgtap.t2_2')::boolean,
  'limpeza de brand_id bloqueada — brand_id permanece kaboo'
);

-- ============================================================
-- SEÇÃO 3: DB-01 guard — atribuição inicial permitida (NULL→valor)
-- ============================================================

SELECT diag('--- SEÇÃO 3: atribuição inicial brand_id (NULL → valor) ---');

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

  PERFORM set_config('pgtap.t3_1', (v_brand_id = '00000000-0000-0000-0000-000000000001'::uuid)::text, false);
END $$;
SELECT ok(
  current_setting('pgtap.t3_1')::boolean,
  'atribuição inicial (NULL → kaboo) permitida — redeem_voucher não vai quebrar'
);

-- ============================================================
-- SEÇÃO 4: isolamento de leitura — formations e materials
-- ============================================================

SELECT diag('--- SEÇÃO 4: SELECT cross-brand em formations/materials ---');

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

  PERFORM set_config('pgtap.t4_1', (v_count = 0)::text, false);
END $$;
SELECT ok(
  current_setting('pgtap.t4_1')::boolean,
  'viewer_kaboo vê 0 collections da coruja'
);

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

  PERFORM set_config('pgtap.t4_2', (v_count = 0)::text, false);
END $$;
SELECT ok(
  current_setting('pgtap.t4_2')::boolean,
  'viewer_kaboo vê 0 formations da coruja'
);

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

  PERFORM set_config('pgtap.t4_3', (v_count = 0)::text, false);
END $$;
SELECT ok(
  current_setting('pgtap.t4_3')::boolean,
  'viewer_kaboo vê 0 materials da coruja'
);

-- ── 4.4 viewer_kaboo VÊ formations da sua própria marca (diagnóstico, não é gate) ─
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
  PERFORM set_config('pgtap.t4_4_count', v_count::text, false);
END $$;
SELECT diag(format('[4.4] viewer_kaboo vê %s formations da kaboo (0 = verificar política RLS de formations)', current_setting('pgtap.t4_4_count')));

-- ── 4.5 viewer_kaboo VÊ materials da sua própria marca (diagnóstico, não é gate) ──
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
  PERFORM set_config('pgtap.t4_5_count', v_count::text, false);
END $$;
SELECT diag(format('[4.5] viewer_kaboo vê %s materials da kaboo (0 = verificar política RLS de materials)', current_setting('pgtap.t4_5_count')));

-- ============================================================
-- SUMÁRIO FINAL
-- ============================================================

SELECT * FROM finish();

ROLLBACK;

-- ============================================================
-- LEGENDA
-- ============================================================
-- ok    → controle funcionando conforme esperado
-- diag  → linha de diagnóstico (não é um gate de pass/fail)
-- not ok → vulnerabilidade detectada — ação imediata necessária
-- ============================================================
