-- T2.3: Adiciona NOT NULL constraint em media_shelves.brand_id
-- Seguro: tabela vazia em prod (verificado antes de aplicar).
-- O DO $$ bloqueia a migration se houver linhas órfãs, evitando dados silenciosos.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.media_shelves WHERE brand_id IS NULL LIMIT 1) THEN
    RAISE EXCEPTION 'media_shelves tem linhas com brand_id NULL — constraint não aplicada';
  END IF;
END $$;

ALTER TABLE public.media_shelves ALTER COLUMN brand_id SET NOT NULL;
