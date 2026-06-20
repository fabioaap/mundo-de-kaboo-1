-- T2.1 — Trigger de integridade cross-brand em collections
--
-- Propósito: prevenir reincidência do leak histórico de character_ids cross-brand
-- (corrigido em 20260615200000_clear_crossbrand_character_ids.sql).
-- Este trigger garante que, a partir de agora, nenhum INSERT/UPDATE consiga
-- associar personagens ou sub-coleções de outra marca a uma collection.
--
-- Regras:
--   1. character_ids: cada ID deve existir em public.character com o mesmo brand_id
--   2. kit_book_ids: cada UUID deve existir em public.collections com o mesmo brand_id
--   3. Collections sem brand_id (brand_id IS NULL) são ignoradas (skip)

-- Idempotência: remove versões anteriores antes de recriar
DROP TRIGGER IF EXISTS collections_integrity_check ON public.collections;
DROP FUNCTION IF EXISTS public.collections_integrity_check();

SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.collections_integrity_check()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_char_id TEXT;
  v_kit_id  UUID;
BEGIN
  -- só valida se a collection tem marca definida
  IF NEW.brand_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 1) character_ids: cada personagem deve existir e pertencer à mesma marca
  IF NEW.character_ids IS NOT NULL AND array_length(NEW.character_ids, 1) > 0 THEN
    FOREACH v_char_id IN ARRAY NEW.character_ids::text[]
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.character
        WHERE id = v_char_id AND brand_id = NEW.brand_id
      ) THEN
        RAISE EXCEPTION 'character_ids integrity: personagem % não existe ou pertence a outra marca', v_char_id;
      END IF;
    END LOOP;
  END IF;

  -- 2) kit_book_ids: cada sub-coleção deve existir e pertencer à mesma marca
  IF NEW.kit_book_ids IS NOT NULL AND array_length(NEW.kit_book_ids, 1) > 0 THEN
    FOREACH v_kit_id IN ARRAY NEW.kit_book_ids::uuid[]
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.collections c
        WHERE c.id = v_kit_id AND c.brand_id = NEW.brand_id
      ) THEN
        RAISE EXCEPTION 'kit_book_ids integrity: coleção % não existe ou pertence a outra marca', v_kit_id;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER collections_integrity_check
  BEFORE INSERT OR UPDATE OF character_ids, kit_book_ids, brand_id
  ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.collections_integrity_check();
