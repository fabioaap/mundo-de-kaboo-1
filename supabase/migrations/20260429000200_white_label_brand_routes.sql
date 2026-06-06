BEGIN;
CREATE TABLE IF NOT EXISTS public.brand_routes (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id   uuid NOT NULL REFERENCES public.brands (id) ON DELETE CASCADE,
    route_type text NOT NULL,
    value      text NOT NULL,
    is_primary boolean NOT NULL DEFAULT false,
    is_active  boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT brand_routes_route_type_check CHECK (route_type IN ('path_prefix', 'hostname')),
    CONSTRAINT brand_routes_brand_route_unique UNIQUE (brand_id, route_type, value),
    CONSTRAINT brand_routes_value_unique UNIQUE (route_type, value)
);
CREATE INDEX IF NOT EXISTS idx_brand_routes_brand_id
    ON public.brand_routes (brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_routes_route_type_value
    ON public.brand_routes (route_type, value);
ALTER TABLE public.brand_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand_routes_select"
    ON public.brand_routes FOR SELECT
    TO authenticated, anon
    USING (
        is_active = true
        AND EXISTS (
            SELECT 1 FROM public.brands b
            WHERE b.id = brand_id AND b.is_active = true
        )
    );
CREATE POLICY "brand_routes_manage"
    ON public.brand_routes FOR ALL
    TO authenticated
    USING (public.can_manage_brand(brand_id))
    WITH CHECK (public.can_manage_brand(brand_id));
INSERT INTO public.brand_routes (brand_id, route_type, value, is_primary, is_active)
SELECT b.id, 'path_prefix', 'kaboo', true, true
FROM public.brands b
WHERE b.slug = 'kaboo'
ON CONFLICT (route_type, value) DO NOTHING;
INSERT INTO public.brand_routes (brand_id, route_type, value, is_primary, is_active)
SELECT b.id, 'hostname', 'kaboo', true, true
FROM public.brands b
WHERE b.slug = 'kaboo'
ON CONFLICT (route_type, value) DO NOTHING;
INSERT INTO public.brand_routes (brand_id, route_type, value, is_primary, is_active)
SELECT b.id, 'path_prefix', 'central-coruja', true, true
FROM public.brands b
WHERE b.slug = 'central-coruja'
ON CONFLICT (route_type, value) DO NOTHING;
INSERT INTO public.brand_routes (brand_id, route_type, value, is_primary, is_active)
SELECT b.id, 'hostname', 'central-coruja', true, true
FROM public.brands b
WHERE b.slug = 'central-coruja'
ON CONFLICT (route_type, value) DO NOTHING;
INSERT INTO public.brand_routes (brand_id, route_type, value, is_primary, is_active)
SELECT b.id, 'hostname', 'coruja', false, true
FROM public.brands b
WHERE b.slug = 'central-coruja'
ON CONFLICT (route_type, value) DO NOTHING;
COMMIT;
