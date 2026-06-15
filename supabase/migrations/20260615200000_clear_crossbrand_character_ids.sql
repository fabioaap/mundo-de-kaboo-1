-- Data hygiene: remove character_ids that reference characters of a DIFFERENT
-- brand (or dangling ids) from collections. characters is RLS-scoped by brand,
-- so cross-brand refs render as broken chips (e.g. Central Coruja collections
-- referencing Kaboo characters). Keeps only same-brand character refs.
-- Brand-generic + idempotent: only touches rows that actually have an invalid ref.

UPDATE public.collections c
SET character_ids = (
    SELECT COALESCE(array_agg(cid), '{}')
    FROM unnest(c.character_ids) AS cid
    WHERE EXISTS (
        SELECT 1 FROM public.characters ch
        WHERE ch.id = cid AND ch.brand_id = c.brand_id
    )
)
WHERE c.character_ids IS NOT NULL
  AND array_length(c.character_ids, 1) > 0
  AND EXISTS (
      SELECT 1 FROM unnest(c.character_ids) AS cid
      WHERE NOT EXISTS (
          SELECT 1 FROM public.characters ch
          WHERE ch.id = cid AND ch.brand_id = c.brand_id
      )
  );
