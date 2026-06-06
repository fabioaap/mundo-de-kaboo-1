ALTER TABLE public.media_items DROP CONSTRAINT media_items_internal_source_check;
ALTER TABLE public.media_items ADD CONSTRAINT media_items_internal_source_check
  CHECK (
    (provider = 'internal' AND storage_bucket IS NOT NULL AND storage_path IS NOT NULL)
    OR provider <> 'internal'
    OR status = 'draft'
  );;
