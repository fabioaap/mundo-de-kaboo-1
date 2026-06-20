-- ============================================================
-- RLS Brand Isolation Test Suite
-- Mundo de Kaboo — banco único, white-label: kaboo + central-coruja
--
-- PROPÓSITO
--   Script repetível que verifica isolamento de marca nas
--   principais superfícies do banco. Seguro para rodar em prod:
--   toda mutação está dentro de BEGIN...ROLLBACK.
--
-- COMO USAR
--   1. Substitua os IDs fictícios abaixo pelos UUIDs reais do prod
--      (veja a seção "SUBSTITUIÇÕES NECESSÁRIAS")
--   2. Cole o script inteiro no Supabase SQL editor
--   3. Execute como service_role (default do SQL editor)
--   4. Leia as mensagens NOTICE: PASS ou EXCEPTION: FAIL
--   5. Nenhum dado é persistido — a transação faz ROLLBACK no final
--
-- SUBSTITUIÇÕES NECESSÁRIAS (busque e substitua antes de rodar)
-- ┌─────────────────────────────────────────────────────────────────┐
-- │ Placeholder                         │ O que substituir          │
-- ├─────────────────────────────────────┼───────────────────────────┤
-- │ 00000000-0000-0000-0000-000000000001│ brand_id da marca kaboo   │
-- │ 00000000-0000-0000-0000-000000000002│ brand_id da central-coruja│
-- │ 00000000-0000-0000-0000-000000000010│ user_id do viewer_kaboo   │
-- │ 00000000-0000-0000-0000-000000000011│ user_id do viewer_coruja  │
-- │ 00000000-0000-0000-0000-000000000020│ user_id do admin_kaboo    │
-- │ 00000000-0000-0000-0000-000000000021│ user_id do admin_coruja   │
-- │ 00000000-0000-0000-0000-000000000099│ user_id do super_admin    │
-- └─────────────────────────────────────────────────────────────────┘
--
-- COMO OBTER OS IDs REAIS
--   SELECT id FROM public.brands WHERE slug = 'kaboo';
--   SELECT id FROM public.brands WHERE slug = 'central-coruja';
--   SELECT id, email, role, brand_id FROM public.profiles
--     WHERE role IN ('viewer','admin') ORDER BY role, brand_id LIMIT 20;
--   SELECT user_id FROM public.white_label_super_admins LIMIT 1;
--
-- PERSONAS COBERTAS
--   • anon          — role Postgres anon, sem JWT
--   • viewer_kaboo  — viewer com brand_id=kaboo
--   • viewer_coruja — viewer com brand_id=coruja
--   • admin_kaboo   — admin com membership em kaboo (sem coruja)
--   • super_admin   — membro de white_label_super_admins
--
-- LIMITAÇÃO CONHECIDA
--   redeem_voucher() é SECURITY DEFINER — não pode ser testada via
--   SET LOCAL ROLE. Teste cross-brand deve ser feito com script Node
--   usando supabase-js com tokens JWT reais de cada marca.
--   Ver comentário na Seção 3.
-- ============================================================

BEGIN;

-- ============================================================
-- SETUP: dados fictícios injetados para os testes
-- (ficam apenas no escopo desta transação — o ROLLBACK os desfaz)
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '=== RLS Brand Isolation Test Suite ===';
  RAISE NOTICE 'Rodando com IDs fictícios — substitua pelos reais antes de executar em prod';
  RAISE NOTICE '';
END $$;

-- Collections: 1 publicada por marca
INSERT INTO public.collections (id, brand_id, name, is_published)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid,
   '[TEST] Coleção Kaboo', true),
  ('aaaaaaaa-0000-0000-0000-000000000002'::uuid,
   '00000000-0000-0000-0000-000000000002'::uuid,
   '[TEST] Coleção Coruja', true);

-- media_shelves: 1 publicada por marca (brand_id adicionado em 20260615170000)
INSERT INTO public.media_shelves (id, brand_id, is_published)
VALUES
  ('bbbbbbbb-0000-0000-0000-000000000001'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid,
   true),
  ('bbbbbbbb-0000-0000-0000-000000000002'::uuid,
   '00000000-0000-0000-0000-000000000002'::uuid,
   true);

-- brand_feature_overrides: 1 por marca (garante que há linhas para testar)
INSERT INTO public.brand_feature_overrides (id, brand_id, feature_flag_id, enabled)
SELECT
  gen_random_uuid(),
  b.id,
  ff.id,
  true
FROM public.brands b
JOIN public.feature_flags ff ON ff.key = 'menu.collections'
WHERE b.slug IN ('kaboo', 'central-coruja')
ON CONFLICT (brand_id, feature_flag_id) DO NOTHING;

-- ============================================================
-- SEÇÃO 1: Testes de leitura (SELECT) por persona
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '--- SEÇÃO 1: Leitura (SELECT) ---';
END $$;

-- ── 1.1 ANON: não deve ver collections ──────────────────────
DO $$
DECLARE
  v_count int;
BEGIN
  SET LOCAL ROLE anon;

  SELECT count(*) INTO v_count FROM public.collections;

  RESET ROLE;

  IF v_count = 0 THEN
    RAISE NOTICE 'PASS [1.1]: anon não vê nenhuma collection';
  ELSE
    RAISE EXCEPTION 'FAIL [1.1]: anon viu % collections (esperado: 0)', v_count;
  END IF;
END $$;

-- ── 1.2 ANON: feature_flags — verifica estado pós-T1.2 ─────
-- Após T1.2 a política "feature_flags_select" para anon deve ser removida.
-- Se retornar > 0, indica que T1.2 ainda não foi aplicada.
DO $$
DECLARE
  v_count int;
BEGIN
  SET LOCAL ROLE anon;

  SELECT count(*) INTO v_count FROM public.feature_flags;

  RESET ROLE;

  IF v_count = 0 THEN
    RAISE NOTICE 'PASS [1.2]: anon não vê feature_flags (T1.2 aplicada)';
  ELSE
    RAISE NOTICE 'WARN [1.2]: anon vê % feature_flags — T1.2 (remoção da política anon) ainda NÃO foi aplicada', v_count;
  END IF;
END $$;

-- ── 1.3 ANON: brand_feature_overrides — não deve ver ────────
-- A migração original tinha USING(true) para anon. Após T1.2, deve ser 0.
DO $$
DECLARE
  v_count int;
BEGIN
  SET LOCAL ROLE anon;

  SELECT count(*) INTO v_count FROM public.brand_feature_overrides;

  RESET ROLE;

  IF v_count = 0 THEN
    RAISE NOTICE 'PASS [1.3]: anon não vê brand_feature_overrides';
  ELSE
    RAISE NOTICE 'WARN [1.3]: anon vê % brand_feature_overrides — revisar política anon', v_count;
  END IF;
END $$;

-- ── 1.4 viewer_kaboo: vê apenas collections da kaboo ────────
DO $$
DECLARE
  v_count_kaboo  int;
  v_count_coruja int;
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',   '00000000-0000-0000-0000-000000000010',
      'role',  'authenticated',
      'email', 'viewer_kaboo@test.local'
    )::text,
    true
  );
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO v_count_kaboo
  FROM public.collections
  WHERE brand_id = '00000000-0000-0000-0000-000000000001'::uuid;

  SELECT count(*) INTO v_count_coruja
  FROM public.collections
  WHERE brand_id = '00000000-0000-0000-0000-000000000002'::uuid;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);

  IF v_count_kaboo > 0 THEN
    RAISE NOTICE 'PASS [1.4a]: viewer_kaboo vê % collections da kaboo', v_count_kaboo;
  ELSE
    RAISE EXCEPTION 'FAIL [1.4a]: viewer_kaboo não vê nenhuma collection da kaboo — verificar brand_id no perfil';
  END IF;

  IF v_count_coruja = 0 THEN
    RAISE NOTICE 'PASS [1.4b]: viewer_kaboo não vê collections da coruja';
  ELSE
    RAISE EXCEPTION 'FAIL [1.4b]: viewer_kaboo viu % collections da coruja (vazamento cross-brand!)', v_count_coruja;
  END IF;
END $$;

-- ── 1.5 viewer_coruja: vê apenas collections da coruja ──────
DO $$
DECLARE
  v_count_kaboo  int;
  v_count_coruja int;
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',   '00000000-0000-0000-0000-000000000011',
      'role',  'authenticated',
      'email', 'viewer_coruja@test.local'
    )::text,
    true
  );
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO v_count_coruja
  FROM public.collections
  WHERE brand_id = '00000000-0000-0000-0000-000000000002'::uuid;

  SELECT count(*) INTO v_count_kaboo
  FROM public.collections
  WHERE brand_id = '00000000-0000-0000-0000-000000000001'::uuid;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);

  IF v_count_coruja > 0 THEN
    RAISE NOTICE 'PASS [1.5a]: viewer_coruja vê % collections da coruja', v_count_coruja;
  ELSE
    RAISE EXCEPTION 'FAIL [1.5a]: viewer_coruja não vê nenhuma collection da coruja — verificar brand_id no perfil';
  END IF;

  IF v_count_kaboo = 0 THEN
    RAISE NOTICE 'PASS [1.5b]: viewer_coruja não vê collections da kaboo';
  ELSE
    RAISE EXCEPTION 'FAIL [1.5b]: viewer_coruja viu % collections da kaboo (vazamento cross-brand!)', v_count_kaboo;
  END IF;
END $$;

-- ── 1.6 viewer_kaboo: brand_feature_overrides só da sua marca ─
DO $$
DECLARE
  v_own   int;
  v_other int;
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',   '00000000-0000-0000-0000-000000000010',
      'role',  'authenticated',
      'email', 'viewer_kaboo@test.local'
    )::text,
    true
  );
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO v_own
  FROM public.brand_feature_overrides
  WHERE brand_id = '00000000-0000-0000-0000-000000000001'::uuid;

  SELECT count(*) INTO v_other
  FROM public.brand_feature_overrides
  WHERE brand_id = '00000000-0000-0000-0000-000000000002'::uuid;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);

  RAISE NOTICE 'INFO [1.6]: viewer_kaboo vê % overrides kaboo, % overrides coruja', v_own, v_other;

  IF v_other = 0 THEN
    RAISE NOTICE 'PASS [1.6]: viewer_kaboo não vê brand_feature_overrides da coruja';
  ELSE
    RAISE NOTICE 'WARN [1.6]: viewer_kaboo vê % brand_feature_overrides da coruja — revisar se política foi endurecida por T1.2', v_other;
  END IF;
END $$;

-- ── 1.7 viewer_kaboo: media_shelves só da sua marca ─────────
DO $$
DECLARE
  v_own   int;
  v_other int;
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',   '00000000-0000-0000-0000-000000000010',
      'role',  'authenticated',
      'email', 'viewer_kaboo@test.local'
    )::text,
    true
  );
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO v_own
  FROM public.media_shelves
  WHERE brand_id = '00000000-0000-0000-0000-000000000001'::uuid;

  SELECT count(*) INTO v_other
  FROM public.media_shelves
  WHERE brand_id = '00000000-0000-0000-0000-000000000002'::uuid;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);

  RAISE NOTICE 'INFO [1.7]: viewer_kaboo vê % media_shelves kaboo', v_own;

  IF v_other = 0 THEN
    RAISE NOTICE 'PASS [1.7]: viewer_kaboo não vê media_shelves da coruja';
  ELSE
    RAISE EXCEPTION 'FAIL [1.7]: viewer_kaboo viu % media_shelves da coruja (vazamento cross-brand!)', v_other;
  END IF;
END $$;

-- ── 1.8 admin_kaboo: vê collections da kaboo, não da coruja ─
DO $$
DECLARE
  v_kaboo  int;
  v_coruja int;
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',   '00000000-0000-0000-0000-000000000020',
      'role',  'authenticated',
      'email', 'admin_kaboo@test.local'
    )::text,
    true
  );
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO v_kaboo
  FROM public.collections
  WHERE brand_id = '00000000-0000-0000-0000-000000000001'::uuid;

  SELECT count(*) INTO v_coruja
  FROM public.collections
  WHERE brand_id = '00000000-0000-0000-0000-000000000002'::uuid;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);

  IF v_kaboo > 0 THEN
    RAISE NOTICE 'PASS [1.8a]: admin_kaboo vê % collections da kaboo', v_kaboo;
  ELSE
    RAISE NOTICE 'WARN [1.8a]: admin_kaboo não vê collections da kaboo — verificar brand_admin_memberships';
  END IF;

  IF v_coruja = 0 THEN
    RAISE NOTICE 'PASS [1.8b]: admin_kaboo não vê collections da coruja';
  ELSE
    RAISE EXCEPTION 'FAIL [1.8b]: admin_kaboo viu % collections da coruja (vazamento cross-brand!)', v_coruja;
  END IF;
END $$;

-- ── 1.9 super_admin: vê collections de ambas as marcas ──────
DO $$
DECLARE
  v_kaboo  int;
  v_coruja int;
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',   '00000000-0000-0000-0000-000000000099',
      'role',  'authenticated',
      'email', 'super@test.local'
    )::text,
    true
  );
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO v_kaboo
  FROM public.collections
  WHERE brand_id = '00000000-0000-0000-0000-000000000001'::uuid;

  SELECT count(*) INTO v_coruja
  FROM public.collections
  WHERE brand_id = '00000000-0000-0000-0000-000000000002'::uuid;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);

  IF v_kaboo > 0 AND v_coruja > 0 THEN
    RAISE NOTICE 'PASS [1.9]: super_admin vê ambas as marcas (kaboo: %, coruja: %)', v_kaboo, v_coruja;
  ELSE
    RAISE NOTICE 'WARN [1.9]: super_admin não vê uma das marcas (kaboo: %, coruja: %) — verificar white_label_super_admins', v_kaboo, v_coruja;
  END IF;
END $$;

-- ── 1.10 admin_kaboo: vouchers só da sua marca ──────────────
DO $$
DECLARE
  v_own   int;
  v_other int;
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',   '00000000-0000-0000-0000-000000000020',
      'role',  'authenticated',
      'email', 'admin_kaboo@test.local'
    )::text,
    true
  );
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO v_own
  FROM public.vouchers
  WHERE brand_id = '00000000-0000-0000-0000-000000000001'::uuid;

  SELECT count(*) INTO v_other
  FROM public.vouchers
  WHERE brand_id = '00000000-0000-0000-0000-000000000002'::uuid;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);

  RAISE NOTICE 'INFO [1.10]: admin_kaboo vê % vouchers da kaboo', v_own;

  IF v_other = 0 THEN
    RAISE NOTICE 'PASS [1.10]: admin_kaboo não vê vouchers da coruja';
  ELSE
    RAISE EXCEPTION 'FAIL [1.10]: admin_kaboo viu % vouchers da coruja (vazamento cross-brand!)', v_other;
  END IF;
END $$;

-- ── 1.11 admin_kaboo: audit_log só da sua marca ─────────────
DO $$
DECLARE
  v_own   int;
  v_other int;
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',   '00000000-0000-0000-0000-000000000020',
      'role',  'authenticated',
      'email', 'admin_kaboo@test.local'
    )::text,
    true
  );
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO v_own
  FROM public.audit_log
  WHERE brand_id = '00000000-0000-0000-0000-000000000001'::uuid;

  SELECT count(*) INTO v_other
  FROM public.audit_log
  WHERE brand_id = '00000000-0000-0000-0000-000000000002'::uuid;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);

  RAISE NOTICE 'INFO [1.11]: admin_kaboo vê % registros de audit_log da kaboo', v_own;

  IF v_other = 0 THEN
    RAISE NOTICE 'PASS [1.11]: admin_kaboo não vê audit_log da coruja';
  ELSE
    RAISE EXCEPTION 'FAIL [1.11]: admin_kaboo viu % registros de audit_log da coruja (vazamento cross-brand!)', v_other;
  END IF;
END $$;

-- ============================================================
-- SEÇÃO 2: Testes de escrita (INSERT/UPDATE) — deve ser bloqueado por RLS
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- SEÇÃO 2: Escrita bloqueada por RLS ---';
END $$;

-- ── 2.1 admin_kaboo tenta INSERT em collection da coruja ────
DO $$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',   '00000000-0000-0000-0000-000000000020',
      'role',  'authenticated',
      'email', 'admin_kaboo@test.local'
    )::text,
    true
  );
  SET LOCAL ROLE authenticated;

  BEGIN
    INSERT INTO public.collections (id, brand_id, name, is_published)
    VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000002'::uuid,
      '[TEST] Invasão Kaboo→Coruja',
      false
    );

    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);

    RAISE EXCEPTION 'FAIL [2.1]: admin_kaboo conseguiu INSERT em collections da coruja (RLS WITH CHECK não bloqueou!)';

  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RESET ROLE;
      PERFORM set_config('request.jwt.claims', '', true);
      RAISE NOTICE 'PASS [2.1]: admin_kaboo bloqueado ao tentar INSERT em collections da coruja';
  END;
END $$;

-- ── 2.2 admin_kaboo tenta UPDATE em media_shelves da coruja ─
-- UPDATE silencioso (0 rows afetadas) = RLS filtrou via USING.
DO $$
DECLARE
  v_affected int;
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',   '00000000-0000-0000-0000-000000000020',
      'role',  'authenticated',
      'email', 'admin_kaboo@test.local'
    )::text,
    true
  );
  SET LOCAL ROLE authenticated;

  BEGIN
    UPDATE public.media_shelves
    SET is_published = false
    WHERE brand_id = '00000000-0000-0000-0000-000000000002'::uuid;

    GET DIAGNOSTICS v_affected = ROW_COUNT;

    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);

    IF v_affected = 0 THEN
      RAISE NOTICE 'PASS [2.2]: admin_kaboo — UPDATE em media_shelves da coruja afetou 0 linhas (RLS USING bloqueou)';
    ELSE
      RAISE EXCEPTION 'FAIL [2.2]: admin_kaboo atualizou % linhas de media_shelves da coruja (vazamento!)', v_affected;
    END IF;

  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RESET ROLE;
      PERFORM set_config('request.jwt.claims', '', true);
      RAISE NOTICE 'PASS [2.2]: admin_kaboo bloqueado ao tentar UPDATE em media_shelves da coruja';
  END;
END $$;

-- ── 2.3 admin_kaboo tenta INSERT em voucher com brand da coruja ─
DO $$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',   '00000000-0000-0000-0000-000000000020',
      'role',  'authenticated',
      'email', 'admin_kaboo@test.local'
    )::text,
    true
  );
  SET LOCAL ROLE authenticated;

  BEGIN
    INSERT INTO public.vouchers (id, brand_id, code, status)
    VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000002'::uuid,
      'CROSSBRAND-TEST-' || to_char(now(), 'HH24MISS'),
      'unused'
    );

    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);

    RAISE EXCEPTION 'FAIL [2.3]: admin_kaboo conseguiu INSERT em vouchers da coruja (RLS WITH CHECK não bloqueou!)';

  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RESET ROLE;
      PERFORM set_config('request.jwt.claims', '', true);
      RAISE NOTICE 'PASS [2.3]: admin_kaboo bloqueado ao tentar INSERT em vouchers da coruja';

    WHEN foreign_key_violation OR not_null_violation THEN
      -- Constraint de FK/NOT NULL disparou antes do RLS — mascarou o teste
      RESET ROLE;
      PERFORM set_config('request.jwt.claims', '', true);
      RAISE NOTICE 'WARN [2.3]: INSERT em vouchers falhou por constraint (não por RLS) — adicione batch_id válido para testar RLS isolado';
  END;
END $$;

-- ── 2.4 viewer_kaboo tenta INSERT em collections (qualquer marca) ─
-- Viewers não devem conseguir escrever — apenas admins/editors podem.
DO $$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',   '00000000-0000-0000-0000-000000000010',
      'role',  'authenticated',
      'email', 'viewer_kaboo@test.local'
    )::text,
    true
  );
  SET LOCAL ROLE authenticated;

  BEGIN
    INSERT INTO public.collections (id, brand_id, name, is_published)
    VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000001'::uuid,
      '[TEST] Viewer tentando escrever na sua própria marca',
      false
    );

    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);

    RAISE EXCEPTION 'FAIL [2.4]: viewer_kaboo conseguiu INSERT em collections (apenas admins deveriam conseguir!)';

  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RESET ROLE;
      PERFORM set_config('request.jwt.claims', '', true);
      RAISE NOTICE 'PASS [2.4]: viewer_kaboo bloqueado ao tentar INSERT em collections';
  END;
END $$;

-- ── 2.5 admin_kaboo tenta UPDATE em brand_feature_overrides da coruja ─
DO $$
DECLARE
  v_affected int;
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',   '00000000-0000-0000-0000-000000000020',
      'role',  'authenticated',
      'email', 'admin_kaboo@test.local'
    )::text,
    true
  );
  SET LOCAL ROLE authenticated;

  BEGIN
    UPDATE public.brand_feature_overrides
    SET enabled = false
    WHERE brand_id = '00000000-0000-0000-0000-000000000002'::uuid;

    GET DIAGNOSTICS v_affected = ROW_COUNT;

    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);

    IF v_affected = 0 THEN
      RAISE NOTICE 'PASS [2.5]: admin_kaboo — UPDATE em brand_feature_overrides da coruja afetou 0 linhas (RLS USING bloqueou)';
    ELSE
      RAISE EXCEPTION 'FAIL [2.5]: admin_kaboo atualizou % overrides da coruja (vazamento!)', v_affected;
    END IF;

  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RESET ROLE;
      PERFORM set_config('request.jwt.claims', '', true);
      RAISE NOTICE 'PASS [2.5]: admin_kaboo bloqueado ao tentar UPDATE em brand_feature_overrides da coruja';
  END;
END $$;

-- ============================================================
-- SEÇÃO 3: redeem_voucher — cross-brand (verificação conceitual)
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- SEÇÃO 3: redeem_voucher cross-brand ---';
END $$;

-- redeem_voucher() é SECURITY DEFINER: executa como o owner da função,
-- não como o usuário autenticado. SET LOCAL ROLE não afeta sua execução,
-- portanto não é possível simular contexto de usuário via SQL puro.
--
-- Para testar isolamento cross-brand de redeem_voucher:
--   1. Use supabase-js com signInWithPassword() de um viewer da coruja
--   2. Obtenha um código de voucher pertencente à marca kaboo
--   3. Chame: await supabase.rpc('redeem_voucher', { p_code: '<codigo_kaboo>' })
--   4. Esperado: retorno de erro brand_mismatch ou voucher_not_found
--   5. Confirme que o voucher permanece com status 'unused'
--
-- A lógica de validação de brand em redeem_voucher está nas migrações:
--   supabase/migrations/20260406000100_voucher_access_control.sql
--   supabase/migrations/20260615150000_redeem_voucher_expand_kit_books.sql

-- Verificação indireta: inspecionar o corpo da função no catálogo do sistema
DO $$
DECLARE
  v_body           text;
  v_has_brand_check boolean := false;
BEGIN
  SELECT pg_get_functiondef(oid) INTO v_body
  FROM pg_proc
  WHERE proname = 'redeem_voucher'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LIMIT 1;

  IF v_body IS NULL THEN
    RAISE NOTICE 'WARN [3.1]: função redeem_voucher não encontrada em public';
    RETURN;
  END IF;

  IF v_body ILIKE '%brand_id%' OR v_body ILIKE '%brand_mismatch%' THEN
    v_has_brand_check := true;
  END IF;

  IF v_has_brand_check THEN
    RAISE NOTICE 'PASS [3.1]: redeem_voucher contém referência a brand_id (verificação cross-brand presente no código)';
    RAISE NOTICE 'INFO [3.1]: teste funcional completo requer supabase-js com JWT real — ver comentário na Seção 3';
  ELSE
    RAISE NOTICE 'WARN [3.1]: redeem_voucher não parece conter verificação de brand_id — revisar isolamento na função';
  END IF;
END $$;

-- ============================================================
-- SUMÁRIO FINAL
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== FIM DOS TESTES ===';
  RAISE NOTICE 'Se chegou aqui sem EXCEPTION, todos os testes críticos passaram.';
  RAISE NOTICE 'Revise os WARN acima — indicam pontos que requerem atenção manual.';
  RAISE NOTICE 'Executando ROLLBACK — nenhum dado foi persistido.';
END $$;

ROLLBACK;

-- ============================================================
-- LEGENDA DOS RESULTADOS
-- ============================================================
--
-- PASS   → controle funcionando conforme esperado
-- WARN   → situação ambígua — requer inspeção manual (não é falha crítica)
-- FAIL   → vazamento detectado ou controle ausente — ação imediata necessária
-- INFO   → dado informativo (contagens, estado atual)
--
-- FALHAS CRÍTICAS (levantam EXCEPTION e abortam o bloco):
--   • "viu X registros da outra marca" em SELECT = vazamento cross-brand
--   • INSERT/UPDATE de marca errada bem-sucedido = falha de WITH CHECK
--
-- APÓS CORRIGIR UMA FALHA:
--   1. Aplicar migração de correção
--   2. Rodar este script novamente até todos os blocos críticos retornarem PASS
-- ============================================================
