-- WS-0: Higienização de órfãos — 2026-06-19
-- Move assets de 20 registros órfãos (vínculo perdido) para seus donos e apaga os duplicados.
--
-- PRÉ-CONDIÇÕES verificadas em prod (2026-06-19):
--   • 0 grants em user_content_grants para todos os 20 IDs
--   • 0 referências em voucher_model_items para todos os 20 IDs
--   • 0 referências em kit_book_ids de qualquer coleção
--   • 0 linhas em user_progress, media_collection_links, collection_resources (QA gate C1)
--
-- NÃO TOCADO (Tipo 1 — livre por design):
--   • LIVE 08/09 - Professora Lee (44fabac5-6fbb-497d-abe7-0cfd5ecc9cc0)
--
-- Operação:
--   Parte 1 → accessible_video de 5 orphans Coruja → livros donos
--   Parte 2 → how_to_play de 14 orphans Kaboo → kits donos
--              (Bingo pulado: URL idêntica já existe no kit 70f9e01c)
--   Parte 3 → limpa reading parasita do kit Bingo dos Sentimentos
--   Parte 4 → apaga os 20 registros orphan

BEGIN;

-- ============================================================
-- PARTE 1: accessible_video  →  livros donos (Coruja)
-- ============================================================

-- Árvore Guia  (orphan 3bd37d5a → book f529ab7c)
UPDATE collections target_c
SET collection_assets = COALESCE(target_c.collection_assets, '[]'::jsonb)
  || COALESCE(
      (SELECT jsonb_agg(elem)
       FROM jsonb_array_elements(orphan_c.collection_assets) elem
       WHERE elem->>'category' = 'accessible_video'),
      '[]'::jsonb)
FROM collections orphan_c
WHERE target_c.id = 'f529ab7c-70ff-4b16-a597-2e5866509104'
  AND orphan_c.id = '3bd37d5a-2596-42a7-afd1-8e10c1c4b2bc';

-- As Cores da Amizade  (orphan 1c8ebcd2 → book 605c384a)
UPDATE collections target_c
SET collection_assets = COALESCE(target_c.collection_assets, '[]'::jsonb)
  || COALESCE(
      (SELECT jsonb_agg(elem)
       FROM jsonb_array_elements(orphan_c.collection_assets) elem
       WHERE elem->>'category' = 'accessible_video'),
      '[]'::jsonb)
FROM collections orphan_c
WHERE target_c.id = '605c384a-06a5-4d84-a407-c57608a85340'
  AND orphan_c.id = '1c8ebcd2-53d3-449a-990d-16f70891fa7d';

-- Conhecendo a Liga das Corujinhas  (orphan 0e6af7ab → book 58b9c4bf)
UPDATE collections target_c
SET collection_assets = COALESCE(target_c.collection_assets, '[]'::jsonb)
  || COALESCE(
      (SELECT jsonb_agg(elem)
       FROM jsonb_array_elements(orphan_c.collection_assets) elem
       WHERE elem->>'category' = 'accessible_video'),
      '[]'::jsonb)
FROM collections orphan_c
WHERE target_c.id = '58b9c4bf-aafb-4987-89f1-763d8cf7916d'
  AND orphan_c.id = '0e6af7ab-d6cb-4970-8b2f-a99275ea0094';

-- Dia de Piquenique!  (orphan eea9e6d8 → book dbc603da)
UPDATE collections target_c
SET collection_assets = COALESCE(target_c.collection_assets, '[]'::jsonb)
  || COALESCE(
      (SELECT jsonb_agg(elem)
       FROM jsonb_array_elements(orphan_c.collection_assets) elem
       WHERE elem->>'category' = 'accessible_video'),
      '[]'::jsonb)
FROM collections orphan_c
WHERE target_c.id = 'dbc603da-4c08-4bd3-bfdb-fdcde7ef0a76'
  AND orphan_c.id = 'eea9e6d8-501d-4d57-bcc3-1d63dfa71f77';

-- O Trombone Silencioso  (orphan 4a45aa23 → book e643d672)
UPDATE collections target_c
SET collection_assets = COALESCE(target_c.collection_assets, '[]'::jsonb)
  || COALESCE(
      (SELECT jsonb_agg(elem)
       FROM jsonb_array_elements(orphan_c.collection_assets) elem
       WHERE elem->>'category' = 'accessible_video'),
      '[]'::jsonb)
FROM collections orphan_c
WHERE target_c.id = 'e643d672-88ef-45c1-9320-25e4ae022f0c'
  AND orphan_c.id = '4a45aa23-a862-464e-860f-dbb2d5362a45';

-- ============================================================
-- PARTE 2: how_to_play  →  kits donos (Kaboo)
-- Bingo dos Sentimentos PULADO: URL youtu.be/5dk0B32RFKs já está no kit 70f9e01c.
-- ============================================================

-- Carinhas Kaboo e da Batatinha  (orphan f0d088cc → kit 25e66aed "Carinhas do Kaboo e da Batatinha")
UPDATE collections target_c
SET collection_assets = COALESCE(target_c.collection_assets, '[]'::jsonb)
  || COALESCE(
      (SELECT jsonb_agg(elem)
       FROM jsonb_array_elements(orphan_c.collection_assets) elem
       WHERE elem->>'category' = 'how_to_play'),
      '[]'::jsonb)
FROM collections orphan_c
WHERE target_c.id = '25e66aed-3158-4534-ae64-d27a27936849'
  AND orphan_c.id = 'f0d088cc-da0f-44d4-b384-3ae3a13203aa';

-- Cores do Sentir  (orphan c02069a9 → kit 8a593fb9)
UPDATE collections target_c
SET collection_assets = COALESCE(target_c.collection_assets, '[]'::jsonb)
  || COALESCE(
      (SELECT jsonb_agg(elem)
       FROM jsonb_array_elements(orphan_c.collection_assets) elem
       WHERE elem->>'category' = 'how_to_play'),
      '[]'::jsonb)
FROM collections orphan_c
WHERE target_c.id = '8a593fb9-73b5-415a-a83d-80834abbfa50'
  AND orphan_c.id = 'c02069a9-fd72-4116-9e53-e8ee13749fbb';

-- Desafios das Gentilezas  (orphan 29b4f42f → kit 78383150 "Desafio das Gentilezas")
UPDATE collections target_c
SET collection_assets = COALESCE(target_c.collection_assets, '[]'::jsonb)
  || COALESCE(
      (SELECT jsonb_agg(elem)
       FROM jsonb_array_elements(orphan_c.collection_assets) elem
       WHERE elem->>'category' = 'how_to_play'),
      '[]'::jsonb)
FROM collections orphan_c
WHERE target_c.id = '78383150-790c-454e-9e2e-1599bcb04cbb'
  AND orphan_c.id = '29b4f42f-0cc7-427f-ae9e-47a3d90f5c59';

-- Descobertas que mudaram o mundo  (orphan 1853d32a → kit 1e519e74)
UPDATE collections target_c
SET collection_assets = COALESCE(target_c.collection_assets, '[]'::jsonb)
  || COALESCE(
      (SELECT jsonb_agg(elem)
       FROM jsonb_array_elements(orphan_c.collection_assets) elem
       WHERE elem->>'category' = 'how_to_play'),
      '[]'::jsonb)
FROM collections orphan_c
WHERE target_c.id = '1e519e74-3fb7-4e6d-b542-013204b97bc5'
  AND orphan_c.id = '1853d32a-49f2-48ae-91c9-6a2304e1421f';

-- Encontros Que Fazem Bem  (orphan d8d652a1 → kit 5b0fcecb)
UPDATE collections target_c
SET collection_assets = COALESCE(target_c.collection_assets, '[]'::jsonb)
  || COALESCE(
      (SELECT jsonb_agg(elem)
       FROM jsonb_array_elements(orphan_c.collection_assets) elem
       WHERE elem->>'category' = 'how_to_play'),
      '[]'::jsonb)
FROM collections orphan_c
WHERE target_c.id = '5b0fcecb-b3ab-4bd3-a5eb-f2b4081d2fd5'
  AND orphan_c.id = 'd8d652a1-39f9-41a2-8f2c-b06d58f6a4c2';

-- Gaio Dourado  (orphan be1eeafa → kit 5c936b01)
UPDATE collections target_c
SET collection_assets = COALESCE(target_c.collection_assets, '[]'::jsonb)
  || COALESCE(
      (SELECT jsonb_agg(elem)
       FROM jsonb_array_elements(orphan_c.collection_assets) elem
       WHERE elem->>'category' = 'how_to_play'),
      '[]'::jsonb)
FROM collections orphan_c
WHERE target_c.id = '5c936b01-29f4-4a77-93d7-199f4e764997'
  AND orphan_c.id = 'be1eeafa-ccbe-46cc-aaa8-7ed40ee47c6f';

-- Labirinto do Diálogo  (orphan c80f1093 → kit 045e34a7)
UPDATE collections target_c
SET collection_assets = COALESCE(target_c.collection_assets, '[]'::jsonb)
  || COALESCE(
      (SELECT jsonb_agg(elem)
       FROM jsonb_array_elements(orphan_c.collection_assets) elem
       WHERE elem->>'category' = 'how_to_play'),
      '[]'::jsonb)
FROM collections orphan_c
WHERE target_c.id = '045e34a7-0b56-4113-90a2-c7bd4fb50989'
  AND orphan_c.id = 'c80f1093-8e8b-4883-8c83-10588a2b3ecf';

-- Mímica do Autocuidado  (orphan f22896c5 → kit 991c3a26)
UPDATE collections target_c
SET collection_assets = COALESCE(target_c.collection_assets, '[]'::jsonb)
  || COALESCE(
      (SELECT jsonb_agg(elem)
       FROM jsonb_array_elements(orphan_c.collection_assets) elem
       WHERE elem->>'category' = 'how_to_play'),
      '[]'::jsonb)
FROM collections orphan_c
WHERE target_c.id = '991c3a26-0623-48ea-b41e-5463da9ee5d7'
  AND orphan_c.id = 'f22896c5-638c-488e-81a8-cd5c24514c65';

-- O Giro Musical da Batatinha  (orphan 7feb8fe2 → kit 8f938d86)
UPDATE collections target_c
SET collection_assets = COALESCE(target_c.collection_assets, '[]'::jsonb)
  || COALESCE(
      (SELECT jsonb_agg(elem)
       FROM jsonb_array_elements(orphan_c.collection_assets) elem
       WHERE elem->>'category' = 'how_to_play'),
      '[]'::jsonb)
FROM collections orphan_c
WHERE target_c.id = '8f938d86-4ed7-4133-830c-bd31fc2b2b06'
  AND orphan_c.id = '7feb8fe2-93cc-48f9-b901-47fe5a763794';

-- O Grande Encontro  (orphan e4ef0372 → kit 1f88cdf8)
UPDATE collections target_c
SET collection_assets = COALESCE(target_c.collection_assets, '[]'::jsonb)
  || COALESCE(
      (SELECT jsonb_agg(elem)
       FROM jsonb_array_elements(orphan_c.collection_assets) elem
       WHERE elem->>'category' = 'how_to_play'),
      '[]'::jsonb)
FROM collections orphan_c
WHERE target_c.id = '1f88cdf8-0e97-4261-8aa8-03a8e014d5c3'
  AND orphan_c.id = 'e4ef0372-4534-4a88-90e9-559b00332995';

-- O Som das Coisas  (orphan 532597f9 → kit d45f12fc)
UPDATE collections target_c
SET collection_assets = COALESCE(target_c.collection_assets, '[]'::jsonb)
  || COALESCE(
      (SELECT jsonb_agg(elem)
       FROM jsonb_array_elements(orphan_c.collection_assets) elem
       WHERE elem->>'category' = 'how_to_play'),
      '[]'::jsonb)
FROM collections orphan_c
WHERE target_c.id = 'd45f12fc-df8f-430f-b516-bdb4992a88d0'
  AND orphan_c.id = '532597f9-44c1-467f-8122-0e8caa3b194c';

-- Sequências do dia  (orphan 5b08812f → kit 1f21d6ab "Sequências do Dia")
UPDATE collections target_c
SET collection_assets = COALESCE(target_c.collection_assets, '[]'::jsonb)
  || COALESCE(
      (SELECT jsonb_agg(elem)
       FROM jsonb_array_elements(orphan_c.collection_assets) elem
       WHERE elem->>'category' = 'how_to_play'),
      '[]'::jsonb)
FROM collections orphan_c
WHERE target_c.id = '1f21d6ab-b147-494b-bfa8-4562c361f04d'
  AND orphan_c.id = '5b08812f-c2f8-486e-93d6-8714d21b166b';

-- Trilha da Curiosidade  (orphan 3696a8d3 → kit ba5460d8)
UPDATE collections target_c
SET collection_assets = COALESCE(target_c.collection_assets, '[]'::jsonb)
  || COALESCE(
      (SELECT jsonb_agg(elem)
       FROM jsonb_array_elements(orphan_c.collection_assets) elem
       WHERE elem->>'category' = 'how_to_play'),
      '[]'::jsonb)
FROM collections orphan_c
WHERE target_c.id = 'ba5460d8-2954-41e5-8cf9-db2899a8ea8c'
  AND orphan_c.id = '3696a8d3-f0ce-4961-97b7-1470b5c11b8d';

-- Trilha do Autocuidado  (orphan 54b91f59 → kit b272fedb)
UPDATE collections target_c
SET collection_assets = COALESCE(target_c.collection_assets, '[]'::jsonb)
  || COALESCE(
      (SELECT jsonb_agg(elem)
       FROM jsonb_array_elements(orphan_c.collection_assets) elem
       WHERE elem->>'category' = 'how_to_play'),
      '[]'::jsonb)
FROM collections orphan_c
WHERE target_c.id = 'b272fedb-d08c-4e92-9646-d42e02824a47'
  AND orphan_c.id = '54b91f59-f8a3-4a57-8b5f-9b7470f8504d';

-- ============================================================
-- PARTE 3: limpa reading parasita do kit Bingo dos Sentimentos
-- O kit linka "Blado e a Caixa dos Sentimentos" via kit_book_ids;
-- ter um reading inline além do link duplicava o livro no modal.
-- ============================================================

UPDATE collections
SET collection_assets = (
  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements(collection_assets) elem
  WHERE elem->>'category' IS DISTINCT FROM 'reading'
)
WHERE id = '70f9e01c-c04e-4863-8883-5057fe20a6f2';  -- Bingo dos Sentimentos (kit)

-- ============================================================
-- PARTE 4: apagar os 20 registros orphan
-- ============================================================

DELETE FROM collections
WHERE id IN (
  -- 5 Coruja — accessible_video (Libras)
  '3bd37d5a-2596-42a7-afd1-8e10c1c4b2bc',  -- A Árvore Guia (Libras)
  '1c8ebcd2-53d3-449a-990d-16f70891fa7d',  -- As cores da amizade (Libras)
  '0e6af7ab-d6cb-4970-8b2f-a99275ea0094',  -- Conhecendo a Liga das Corujinhas (Libras)
  'eea9e6d8-501d-4d57-bcc3-1d63dfa71f77',  -- Dia de piquenique (Libras)
  '4a45aa23-a862-464e-860f-dbb2d5362a45',  -- O trombone silencioso (Libras)
  -- 15 Kaboo — how_to_play
  '9f11b1ef-58e1-4dd9-a904-2d6df3030684',  -- Bingo dos Sentimentos (URL já no kit)
  'f0d088cc-da0f-44d4-b384-3ae3a13203aa',  -- Carinhas Kaboo e da Batatinha
  'c02069a9-fd72-4116-9e53-e8ee13749fbb',  -- Cores do Sentir
  '29b4f42f-0cc7-427f-ae9e-47a3d90f5c59',  -- Desafios das Gentilezas
  '1853d32a-49f2-48ae-91c9-6a2304e1421f',  -- Descobertas que mudaram o mundo
  'd8d652a1-39f9-41a2-8f2c-b06d58f6a4c2',  -- Encontros Que Fazem Bem
  'be1eeafa-ccbe-46cc-aaa8-7ed40ee47c6f',  -- Gaio Dourado
  'c80f1093-8e8b-4883-8c83-10588a2b3ecf',  -- Labirinto do Diálogo
  'f22896c5-638c-488e-81a8-cd5c24514c65',  -- Mímica do Autocuidado
  '7feb8fe2-93cc-48f9-b901-47fe5a763794',  -- O Giro Musical da Batatinha
  'e4ef0372-4534-4a88-90e9-559b00332995',  -- O Grande Encontro
  '532597f9-44c1-467f-8122-0e8caa3b194c',  -- O Som das Coisas
  '5b08812f-c2f8-486e-93d6-8714d21b166b',  -- Sequências do dia
  '3696a8d3-f0ce-4961-97b7-1470b5c11b8d',  -- Trilha da Curiosidade
  '54b91f59-f8a3-4a57-8b5f-9b7470f8504d'   -- Trilha do Autocuidado
);

COMMIT;
