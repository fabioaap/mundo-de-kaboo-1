-- ============================================================
-- Migration: White Label — brands, settings, feature flags, audit
-- Sprint 1 · fase 1 · 2026-04-26
-- ============================================================

BEGIN;
-- ── 1. brands ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.brands (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug       text NOT NULL,
    name       text NOT NULL,
    is_active  boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT brands_slug_unique UNIQUE (slug)
);
-- ── 2. brand_settings ─────────────────────────────────────
-- Identidade visual, assets, menu config e versão publicada.
CREATE TABLE IF NOT EXISTS public.brand_settings (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id        uuid NOT NULL REFERENCES public.brands (id) ON DELETE CASCADE,
    display_name    text,
    logo_url        text,
    primary_color   text,
    light_color     text,
    bg_color        text,
    accent_color    text,
    font_family     text,
    menu_config     jsonb NOT NULL DEFAULT '{}',
    version         integer NOT NULL DEFAULT 1,
    published_at    timestamptz,
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT brand_settings_brand_id_unique UNIQUE (brand_id)
);
-- ── 3. feature_flags ──────────────────────────────────────
-- Catálogo global de flags e defaults.
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key             text NOT NULL,
    description     text,
    default_enabled boolean NOT NULL DEFAULT false,
    default_config  jsonb NOT NULL DEFAULT '{}',
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT feature_flags_key_unique UNIQUE (key)
);
-- ── 4. brand_feature_overrides ────────────────────────────
-- Estado efetivo de cada flag por marca.
CREATE TABLE IF NOT EXISTS public.brand_feature_overrides (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id        uuid NOT NULL REFERENCES public.brands (id) ON DELETE CASCADE,
    feature_flag_id uuid NOT NULL REFERENCES public.feature_flags (id) ON DELETE CASCADE,
    enabled         boolean NOT NULL,
    config          jsonb NOT NULL DEFAULT '{}',
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT brand_feature_overrides_brand_flag_unique UNIQUE (brand_id, feature_flag_id)
);
-- ── 5. feature_flag_audit ─────────────────────────────────
-- Trilha append-only de alterações de flags por marca.
CREATE TABLE IF NOT EXISTS public.feature_flag_audit (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id        uuid NOT NULL REFERENCES public.brands (id) ON DELETE CASCADE,
    feature_flag_id uuid NOT NULL REFERENCES public.feature_flags (id) ON DELETE CASCADE,
    enabled_before  boolean,
    enabled_after   boolean NOT NULL,
    config_before   jsonb,
    config_after    jsonb NOT NULL DEFAULT '{}',
    changed_by      uuid REFERENCES auth.users (id),
    changed_at      timestamptz NOT NULL DEFAULT now(),
    reason          text
);
-- ── 6. brand_admin_memberships ────────────────────────────
-- Controla qual usuário pode gerenciar qual marca no admin.
CREATE TABLE IF NOT EXISTS public.brand_admin_memberships (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id   uuid NOT NULL REFERENCES public.brands (id) ON DELETE CASCADE,
    user_id    uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT brand_admin_memberships_brand_user_unique UNIQUE (brand_id, user_id)
);
-- ── Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_brand_settings_brand_id
    ON public.brand_settings (brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_feature_overrides_brand_id
    ON public.brand_feature_overrides (brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_feature_overrides_brand_flag
    ON public.brand_feature_overrides (brand_id, feature_flag_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_audit_brand_id_changed_at
    ON public.feature_flag_audit (brand_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_admin_memberships_user_id
    ON public.brand_admin_memberships (user_id);
-- ── RLS ───────────────────────────────────────────────────
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_feature_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flag_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_admin_memberships ENABLE ROW LEVEL SECURITY;
-- Helper: verifica se o usuário autenticado pode gerenciar a marca.
CREATE OR REPLACE FUNCTION public.can_manage_brand(p_brand_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.brand_admin_memberships bam
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE bam.brand_id = p_brand_id
          AND bam.user_id  = auth.uid()
          AND p.role IN ('admin', 'editor')
    );
$$;
-- brands: leitura pública (slugs e nomes são públicos), escrita restrita.
CREATE POLICY "brands_select_all"
    ON public.brands FOR SELECT
    TO authenticated, anon
    USING (is_active = true);
CREATE POLICY "brands_manage"
    ON public.brands FOR ALL
    TO authenticated
    USING (public.can_manage_brand(id))
    WITH CHECK (public.can_manage_brand(id));
-- brand_settings: idem.
CREATE POLICY "brand_settings_select"
    ON public.brand_settings FOR SELECT
    TO authenticated, anon
    USING (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.is_active));
CREATE POLICY "brand_settings_manage"
    ON public.brand_settings FOR ALL
    TO authenticated
    USING (public.can_manage_brand(brand_id))
    WITH CHECK (public.can_manage_brand(brand_id));
-- feature_flags: catálogo global, leitura livre.
CREATE POLICY "feature_flags_select"
    ON public.feature_flags FOR SELECT
    TO authenticated, anon
    USING (true);
CREATE POLICY "feature_flags_manage"
    ON public.feature_flags FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));
-- brand_feature_overrides: leitura livre por override ativo.
CREATE POLICY "brand_feature_overrides_select"
    ON public.brand_feature_overrides FOR SELECT
    TO authenticated, anon
    USING (true);
CREATE POLICY "brand_feature_overrides_manage"
    ON public.brand_feature_overrides FOR ALL
    TO authenticated
    USING (public.can_manage_brand(brand_id))
    WITH CHECK (public.can_manage_brand(brand_id));
-- feature_flag_audit: leitura por membros da marca.
CREATE POLICY "feature_flag_audit_select"
    ON public.feature_flag_audit FOR SELECT
    TO authenticated
    USING (public.can_manage_brand(brand_id));
CREATE POLICY "feature_flag_audit_insert"
    ON public.feature_flag_audit FOR INSERT
    TO authenticated
    WITH CHECK (public.can_manage_brand(brand_id));
-- brand_admin_memberships: admin global pode gerenciar; membro pode se ver.
CREATE POLICY "brand_admin_memberships_select"
    ON public.brand_admin_memberships FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));
CREATE POLICY "brand_admin_memberships_manage"
    ON public.brand_admin_memberships FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));
-- ── RPC: get_brand_bootstrap ──────────────────────────────
-- Retorna o contrato de bootstrap completo da marca em JSON.
-- Seguro para chamada anônima — dados já filtrados por is_active.
CREATE OR REPLACE FUNCTION public.get_brand_bootstrap(p_brand_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_brand     public.brands%ROWTYPE;
    v_settings  public.brand_settings%ROWTYPE;
    v_menu      jsonb;
    v_features  jsonb := '{}';
    v_flag      record;
    v_result    jsonb;
BEGIN
    -- 1. Resolve marca pelo slug.
    SELECT * INTO v_brand
    FROM public.brands
    WHERE slug = p_brand_slug AND is_active = true
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- 2. Settings da marca (pode não existir ainda).
    SELECT * INTO v_settings
    FROM public.brand_settings
    WHERE brand_id = v_brand.id
    LIMIT 1;

    -- 3. Menu config (usa settings.menu_config ou default canônico).
    v_menu := COALESCE(v_settings.menu_config, '[]'::jsonb);

    -- 4. Feature flags efetivos: default global sobrescrito pelo override da marca.
    FOR v_flag IN
        SELECT
            ff.key,
            COALESCE(bfo.enabled, ff.default_enabled)   AS enabled,
            COALESCE(bfo.config,  ff.default_config)    AS config
        FROM public.feature_flags ff
        LEFT JOIN public.brand_feature_overrides bfo
               ON bfo.feature_flag_id = ff.id
              AND bfo.brand_id        = v_brand.id
        ORDER BY ff.key
    LOOP
        v_features := jsonb_set(
            v_features,
            ARRAY[v_flag.key],
            jsonb_build_object('enabled', v_flag.enabled, 'config', v_flag.config)
        );
    END LOOP;

    -- 5. Monta o resultado.
    v_result := jsonb_build_object(
        'brand',    jsonb_build_object(
                        'id',   v_brand.id,
                        'slug', v_brand.slug,
                        'name', v_brand.name
                    ),
        'settings', jsonb_build_object(
                        'display_name',  COALESCE(v_settings.display_name, v_brand.name),
                        'logo_url',      v_settings.logo_url,
                        'primary_color', v_settings.primary_color,
                        'light_color',   v_settings.light_color,
                        'bg_color',      v_settings.bg_color,
                        'accent_color',  v_settings.accent_color,
                        'font_family',   v_settings.font_family,
                        'menu_config',   COALESCE(v_settings.menu_config, '{}')
                    ),
        'menu',     v_menu,
        'features', v_features,
        'version',  COALESCE(v_settings.version, 1),
        'updated_at', COALESCE(v_settings.updated_at, v_brand.updated_at)
    );

    RETURN v_result;
END;
$$;
-- ── RPC: set_brand_feature_flag ───────────────────────────
-- Altera um flag de marca de forma transacional com auditoria obrigatória.
-- Retorna a versão nova após a alteração.
CREATE OR REPLACE FUNCTION public.set_brand_feature_flag(
    p_brand_id      uuid,
    p_feature_key   text,
    p_enabled       boolean,
    p_config        jsonb    DEFAULT '{}',
    p_reason        text     DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
AS $$
DECLARE
    v_flag_id       uuid;
    v_current       public.brand_feature_overrides%ROWTYPE;
    v_enabled_before boolean;
    v_config_before  jsonb;
    v_result         jsonb;
BEGIN
    -- 1. Verifica permissão.
    IF NOT public.can_manage_brand(p_brand_id) THEN
        RAISE EXCEPTION 'permission_denied: cannot manage brand %', p_brand_id;
    END IF;

    -- 2. Resolve feature_flag.
    SELECT id INTO v_flag_id
    FROM public.feature_flags
    WHERE key = p_feature_key
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'not_found: feature flag % does not exist', p_feature_key;
    END IF;

    -- 3. Lê estado atual.
    SELECT * INTO v_current
    FROM public.brand_feature_overrides
    WHERE brand_id = p_brand_id AND feature_flag_id = v_flag_id
    LIMIT 1;

    v_enabled_before := v_current.enabled;
    v_config_before  := v_current.config;

    -- 4. Aplica upsert do override.
    INSERT INTO public.brand_feature_overrides (brand_id, feature_flag_id, enabled, config, updated_at)
    VALUES (p_brand_id, v_flag_id, p_enabled, p_config, now())
    ON CONFLICT (brand_id, feature_flag_id) DO UPDATE
        SET enabled    = EXCLUDED.enabled,
            config     = EXCLUDED.config,
            updated_at = EXCLUDED.updated_at;

    -- 5. Registra auditoria.
    INSERT INTO public.feature_flag_audit (
        brand_id, feature_flag_id,
        enabled_before, enabled_after,
        config_before, config_after,
        changed_by, changed_at, reason
    ) VALUES (
        p_brand_id, v_flag_id,
        v_enabled_before, p_enabled,
        v_config_before, p_config,
        auth.uid(), now(), p_reason
    );

    -- 6. Bump versão do brand_settings (se existir).
    UPDATE public.brand_settings
    SET version    = version + 1,
        updated_at = now()
    WHERE brand_id = p_brand_id;

    v_result := jsonb_build_object(
        'ok',           true,
        'feature_key',  p_feature_key,
        'enabled',      p_enabled,
        'brand_id',     p_brand_id
    );

    RETURN v_result;
END;
$$;
-- ── Seed inicial: marcas canônicas ────────────────────────
INSERT INTO public.brands (slug, name, is_active)
VALUES
    ('kaboo',          'Mundo de Kaboo',  true),
    ('central-coruja', 'Central Coruja',  true)
ON CONFLICT (slug) DO NOTHING;
-- Settings iniciais da Kaboo.
INSERT INTO public.brand_settings (brand_id, display_name, primary_color, light_color, bg_color, accent_color, menu_config, version)
SELECT
    b.id,
    'Mundo de Kaboo',
    '#5D1F58',
    '#883E82',
    '#F9F5F9',
    '#4EA8DE',
    '[
        {"key":"collections","label":"Coleções","route":"home","enabled":true,"order":10},
        {"key":"books","label":"Livros","route":"home","enabled":true,"order":20},
        {"key":"videos","label":"Vídeos","route":"videos","enabled":true,"order":30},
        {"key":"music","label":"Músicas","route":"music","enabled":true,"order":40},
        {"key":"formations","label":"Formações","route":"formations","enabled":true,"order":50},
        {"key":"materials","label":"Materiais","route":"materials","enabled":true,"order":60}
    ]'::jsonb,
    1
FROM public.brands b WHERE b.slug = 'kaboo'
ON CONFLICT (brand_id) DO NOTHING;
-- Settings iniciais da Central Coruja.
INSERT INTO public.brand_settings (brand_id, display_name, primary_color, light_color, bg_color, accent_color, menu_config, version)
SELECT
    b.id,
    'Central Coruja',
    '#1B5E20',
    '#388E3C',
    '#F1F8E9',
    '#F9A825',
    '[
        {"key":"collections","label":"Coleções","route":"home","enabled":true,"order":10},
        {"key":"books","label":"Livros","route":"home","enabled":true,"order":20},
        {"key":"videos","label":"Vídeos","route":"videos","enabled":true,"order":30},
        {"key":"music","label":"Músicas","route":"music","enabled":false,"order":40},
        {"key":"formations","label":"Formações","route":"formations","enabled":true,"order":50},
        {"key":"materials","label":"Materiais","route":"materials","enabled":true,"order":60}
    ]'::jsonb,
    1
FROM public.brands b WHERE b.slug = 'central-coruja'
ON CONFLICT (brand_id) DO NOTHING;
-- Catálogo inicial de feature flags canônicos.
INSERT INTO public.feature_flags (key, description, default_enabled)
VALUES
    ('menu.collections',  'Exibe a seção Coleções na nav',     true),
    ('menu.books',        'Exibe a seção Livros na nav',        true),
    ('menu.videos',       'Exibe a seção Vídeos na nav',        true),
    ('menu.music',        'Exibe a seção Músicas na nav',       true),
    ('menu.formations',   'Exibe a seção Formações na nav',     true),
    ('menu.materials',    'Exibe a seção Materiais na nav',     true),
    ('hero.parallax',     'Ativa hero parallax na Home',        false),
    ('module.characters', 'Exibe a tela de personagens',        true),
    ('module.vouchers',   'Exibe módulo de vouchers no admin',  true)
ON CONFLICT (key) DO NOTHING;
-- Override Central Coruja: desabilita músicas, ativa parallax.
INSERT INTO public.brand_feature_overrides (brand_id, feature_flag_id, enabled, config)
SELECT
    b.id,
    ff.id,
    false,
    '{}'
FROM public.brands b
JOIN public.feature_flags ff ON ff.key = 'menu.music'
WHERE b.slug = 'central-coruja'
ON CONFLICT (brand_id, feature_flag_id) DO NOTHING;
INSERT INTO public.brand_feature_overrides (brand_id, feature_flag_id, enabled, config)
SELECT
    b.id,
    ff.id,
    true,
    '{"mode":"subtle"}'
FROM public.brands b
JOIN public.feature_flags ff ON ff.key = 'hero.parallax'
WHERE b.slug = 'central-coruja'
ON CONFLICT (brand_id, feature_flag_id) DO NOTHING;
COMMIT;
