-- WS-0 ROLLBACK REFERENCE — 2026-06-19
-- ⚠️  Este arquivo é DOCUMENTAÇÃO, não deve ser executado automaticamente.
--
-- Os DELETEs (20 registros orphan) só podem ser revertidos via restore de backup Supabase:
--   Painel → Project → Backups → Ponto anterior a 2026-06-19 14:29 BRT (17:29 UTC)
--
-- Os UPDATEs (adição de assets nas coleções alvo) podem ser revertidos via SQL abaixo.
-- ATENÇÃO: só execute se tiver certeza de que não houve edições posteriores nas coleções alvo.

-- ============================================================
-- REVERTER PARTE 1: remover accessible_video adicionados aos livros Coruja
-- ============================================================

-- Árvore Guia  (f529ab7c)
UPDATE collections
SET collection_assets = (
  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements(collection_assets) elem
  WHERE elem->>'category' IS DISTINCT FROM 'accessible_video'
)
WHERE id = 'f529ab7c-70ff-4b16-a597-2e5866509104';

-- As Cores da Amizade  (605c384a)
UPDATE collections
SET collection_assets = (
  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements(collection_assets) elem
  WHERE elem->>'category' IS DISTINCT FROM 'accessible_video'
)
WHERE id = '605c384a-06a5-4d84-a407-c57608a85340';

-- Conhecendo a Liga das Corujinhas  (58b9c4bf)
UPDATE collections
SET collection_assets = (
  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements(collection_assets) elem
  WHERE elem->>'category' IS DISTINCT FROM 'accessible_video'
)
WHERE id = '58b9c4bf-aafb-4987-89f1-763d8cf7916d';

-- Dia de Piquenique!  (dbc603da)
UPDATE collections
SET collection_assets = (
  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements(collection_assets) elem
  WHERE elem->>'category' IS DISTINCT FROM 'accessible_video'
)
WHERE id = 'dbc603da-4c08-4bd3-bfdb-fdcde7ef0a76';

-- O Trombone Silencioso  (e643d672)
UPDATE collections
SET collection_assets = (
  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements(collection_assets) elem
  WHERE elem->>'category' IS DISTINCT FROM 'accessible_video'
)
WHERE id = 'e643d672-88ef-45c1-9320-25e4ae022f0c';

-- ============================================================
-- REVERTER PARTE 2: remover how_to_play adicionados aos kits Kaboo
-- ============================================================

UPDATE collections
SET collection_assets = (
  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements(collection_assets) elem
  WHERE elem->>'category' IS DISTINCT FROM 'how_to_play'
)
WHERE id IN (
  '25e66aed-3158-4534-ae64-d27a27936849',  -- Carinhas Kaboo e da Batatinha
  '8a593fb9-73b5-415a-a83d-80834abbfa50',  -- Cores do Sentir
  '78383150-790c-454e-9e2e-1599bcb04cbb',  -- Desafios das Gentilezas
  '1e519e74-3fb7-4e6d-b542-013204b97bc5',  -- Descobertas que mudaram o mundo
  '5b0fcecb-b3ab-4bd3-a5eb-f2b4081d2fd5',  -- Encontros Que Fazem Bem
  '5c936b01-29f4-4a77-93d7-199f4e764997',  -- Gaio Dourado
  '045e34a7-0b56-4113-90a2-c7bd4fb50989',  -- Labirinto do Diálogo
  '991c3a26-0623-48ea-b41e-5463da9ee5d7',  -- Mímica do Autocuidado
  '8f938d86-4ed7-4133-830c-bd31fc2b2b06',  -- O Giro Musical da Batatinha
  '1f88cdf8-0e97-4261-8aa8-03a8e014d5c3',  -- O Grande Encontro
  'd45f12fc-df8f-430f-b516-bdb4992a88d0',  -- O Som das Coisas
  '1f21d6ab-b147-494b-bfa8-4562c361f04d',  -- Sequências do dia
  'ba5460d8-2954-41e5-8cf9-db2899a8ea8c',  -- Trilha da Curiosidade
  'b272fedb-d08c-4e92-9646-d42e02824a47'   -- Trilha do Autocuidado
);

-- ============================================================
-- REVERTER PARTE 3: restaurar reading no Bingo dos Sentimentos
-- Não é possível via SQL puro — requer restore de backup para recuperar
-- o conteúdo original do campo collection_assets deste registro.
-- ID: 70f9e01c-c04e-4863-8883-5057fe20a6f2
-- ============================================================

-- ============================================================
-- REVERTER PARTE 4: restaurar os 20 registros deletados
-- SOMENTE via restore de backup Supabase. Ponto: antes de 2026-06-19 14:29 BRT
-- ============================================================
