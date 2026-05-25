BEGIN;

ALTER TABLE public.collections
    ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands (id) ON DELETE CASCADE;

ALTER TABLE public.characters
    ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_collections_brand_id
    ON public.collections (brand_id);

CREATE INDEX IF NOT EXISTS idx_characters_brand_id
    ON public.characters (brand_id);

COMMENT ON COLUMN public.collections.brand_id
    IS 'Tenant scope for collection ownership. NULL marks legacy Kaboo content pending explicit migration.';

COMMENT ON COLUMN public.characters.brand_id
    IS 'Tenant scope for character ownership. NULL marks legacy Kaboo content pending explicit migration.';

COMMIT;
