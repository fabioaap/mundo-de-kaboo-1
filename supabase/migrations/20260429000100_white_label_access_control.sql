BEGIN;
CREATE TABLE IF NOT EXISTS public.white_label_super_admins (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    created_by uuid REFERENCES auth.users (id),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT white_label_super_admins_user_id_unique UNIQUE (user_id)
);
CREATE INDEX IF NOT EXISTS idx_white_label_super_admins_user_id
    ON public.white_label_super_admins (user_id);
ALTER TABLE public.white_label_super_admins ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.is_white_label_super_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.white_label_super_admins wlsa
        WHERE wlsa.user_id = COALESCE(p_user_id, auth.uid())
    );
$$;
CREATE OR REPLACE FUNCTION public.can_manage_brand(p_brand_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT
        public.is_white_label_super_admin(auth.uid())
        OR EXISTS (
            SELECT 1
            FROM public.brand_admin_memberships bam
            JOIN public.profiles p ON p.id = auth.uid()
            WHERE bam.brand_id = p_brand_id
              AND bam.user_id = auth.uid()
              AND p.role IN ('admin', 'editor')
        );
$$;
DROP POLICY IF EXISTS "feature_flags_manage" ON public.feature_flags;
CREATE POLICY "feature_flags_manage"
    ON public.feature_flags FOR ALL
    TO authenticated
    USING (public.is_white_label_super_admin(auth.uid()))
    WITH CHECK (public.is_white_label_super_admin(auth.uid()));
DROP POLICY IF EXISTS "brand_admin_memberships_select" ON public.brand_admin_memberships;
CREATE POLICY "brand_admin_memberships_select"
    ON public.brand_admin_memberships FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR public.is_white_label_super_admin(auth.uid())
    );
DROP POLICY IF EXISTS "brand_admin_memberships_manage" ON public.brand_admin_memberships;
CREATE POLICY "brand_admin_memberships_manage"
    ON public.brand_admin_memberships FOR ALL
    TO authenticated
    USING (public.is_white_label_super_admin(auth.uid()))
    WITH CHECK (public.is_white_label_super_admin(auth.uid()));
CREATE POLICY "white_label_super_admins_select"
    ON public.white_label_super_admins FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR public.is_white_label_super_admin(auth.uid())
    );
CREATE POLICY "white_label_super_admins_manage"
    ON public.white_label_super_admins FOR ALL
    TO authenticated
    USING (public.is_white_label_super_admin(auth.uid()))
    WITH CHECK (public.is_white_label_super_admin(auth.uid()));
CREATE OR REPLACE FUNCTION public.list_white_label_manageable_brands()
RETURNS TABLE (
    id uuid,
    slug text,
    name text,
    is_active boolean,
    display_name text,
    access_scope text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT
        b.id,
        b.slug,
        b.name,
        b.is_active,
        COALESCE(bs.display_name, b.name) AS display_name,
        CASE
            WHEN public.is_white_label_super_admin(auth.uid()) THEN 'super_admin'
            ELSE 'brand_admin'
        END AS access_scope
    FROM public.brands b
    LEFT JOIN public.brand_settings bs
           ON bs.brand_id = b.id
    WHERE b.is_active = true
      AND (
        public.is_white_label_super_admin(auth.uid())
        OR EXISTS (
            SELECT 1
            FROM public.brand_admin_memberships bam
            JOIN public.profiles p ON p.id = auth.uid()
            WHERE bam.brand_id = b.id
              AND bam.user_id = auth.uid()
              AND p.role IN ('admin', 'editor')
        )
      )
    ORDER BY b.slug;
$$;
COMMIT;
