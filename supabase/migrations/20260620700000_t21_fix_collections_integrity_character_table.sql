-- Hotfix T2.1 — collections_integrity_check referenciava public.character (inexistente).
-- A tabela correta é public.characters. Sem este fix, todo INSERT/UPDATE de collection
-- com character_ids dispara o trigger e falha com:
--   "relation \"public.character\" does not exist"
-- bloqueando a edição de coleções no admin. Substitui apenas o nome da tabela
-- (characters.id é text, brand_id é uuid — o resto da função estava correto).

CREATE OR REPLACE FUNCTION public.collections_integrity_check()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_char_id TEXT;
  v_kit_id  UUID;
BEGIN
  IF NEW.brand_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 1) character_ids: cada personagem deve existir e pertencer à mesma marca
  IF NEW.character_ids IS NOT NULL AND array_length(NEW.character_ids, 1) > 0 THEN
    FOREACH v_char_id IN ARRAY NEW.character_ids::text[]
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.characters
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
