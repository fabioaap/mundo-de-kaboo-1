-- ============================================================
-- Migration: corrige personagem da coleção Onde está Gaio?
-- ============================================================

UPDATE public.collections
SET
  characters = ARRAY['Gaio'],
  character_ids = ARRAY['gaio'],
  updated_at = NOW()
WHERE id = '410acf81-6d7d-4569-85e4-02ed2fb28762';
