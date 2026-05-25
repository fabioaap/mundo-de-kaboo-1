/**
 * useBrandConfig — bootstrap único de marca por sessão.
 *
 * Fluxo:
 *   1. Resolve o brandSlug (VITE_BRAND_SLUG > hostname > 'kaboo').
 *   2. Tenta carregar do cache de sessionStorage (invalidado por versão).
 *   3. Em modo mock / sem Supabase, usa defaults locais.
 *   4. Com Supabase, chama RPC get_brand_bootstrap(slug).
 *   5. Aplica tema via applyTheme e disponibiliza o contrato ao app.
 */
import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isDevMockSession } from '../lib/api';
import { applyTheme, themes, BrandTheme } from '../design-system/tokens/themes';
import { getWhiteLabelPreviewSettings, subscribeToWhiteLabelPreviewSettings } from '../lib/whiteLabelPreview';
import { resolveBrandSlugFromPathname, resolveBrandSlugFromSearch } from './brandSlug';
import {
    extractBrandDesignTokens,
    extractBrandVisualIdentity,
    getMockBrandSettingsOverride,
    mergeBrandDesignTokens,
    mergeBrandVisualIdentity,
    MockBrandSettingsOverride,
} from '../lib/whiteLabelBranding';

// ── Tipos públicos ────────────────────────────────────────

export interface BrandMenuItem {
    key: string;
    label: string;
    route: string;
    enabled: boolean;
    order: number;
}

export interface BrandSettings {
    display_name: string;
    logo_url: string | null;
    primary_color: string | null;
    light_color: string | null;
    bg_color: string | null;
    accent_color: string | null;
    font_family: string | null;
    green_color: string | null;
    radius_xl: string | null;
    radius_2xl: string | null;
    radius_3xl: string | null;
    login_background_url: string | null;
    home_hero_image_url: string | null;
    menu_config: Record<string, unknown>;
}

export interface BrandFeatureState {
    enabled: boolean;
    config: Record<string, unknown>;
}

export interface BrandBootstrap {
    brand: { id: string; slug: string; name: string };
    settings: BrandSettings;
    menu: BrandMenuItem[];
    features: Record<string, BrandFeatureState>;
    version: number;
    updated_at: string;
}

export interface BrandConfig {
    bootstrap: BrandBootstrap;
    slug: string;
    /** Verifica se um feature flag está habilitado nesta marca. */
    isFeatureEnabled: (key: string) => boolean;
    /** Retorna os itens de menu habilitados, ordenados. */
    enabledMenuItems: BrandMenuItem[];
    /** true enquanto o bootstrap ainda está carregando */
    loading: boolean;
}

// ── Constantes ────────────────────────────────────────────

const CACHE_KEY = 'kaboo:brand_bootstrap_cache';
const BRAND_BOOTSTRAP_REFRESH_EVENT = 'kaboo:brand-bootstrap-refresh';
const CENTRAL_CORUJA_DEFAULT_HERO_IMAGE_URL = '/coruja-hero-banner-v2.webp';

const DEFAULT_MENU: BrandMenuItem[] = [
    { key: 'collections', label: 'Coleções', route: 'home', enabled: true, order: 10 },
    { key: 'books', label: 'Livros', route: 'home', enabled: true, order: 20 },
    { key: 'videos', label: 'Vídeos', route: 'videos', enabled: true, order: 30 },
    { key: 'music', label: 'Áudios', route: 'music', enabled: true, order: 40 },
    { key: 'formations', label: 'Formações', route: 'formations', enabled: true, order: 50 },
    { key: 'materials', label: 'Materiais', route: 'materials', enabled: true, order: 60 },
];

const DEFAULT_FEATURES: Record<string, BrandFeatureState> = {
    'menu.collections': { enabled: true, config: {} },
    'menu.books': { enabled: true, config: {} },
    'menu.videos': { enabled: true, config: {} },
    'menu.music': { enabled: true, config: {} },
    'menu.formations': { enabled: true, config: {} },
    'menu.materials': { enabled: true, config: {} },
    'hero.parallax': { enabled: false, config: {} },
    'module.characters': { enabled: true, config: {} },
    'module.vouchers': { enabled: true, config: {} },
    'content.offline': { enabled: false, config: {} },
};

/** Defaults por slug para o mock local (sem Supabase). */
const MOCK_BRAND_OVERRIDES: Record<string, Partial<BrandBootstrap>> = {
    'central-coruja': {
        brand: { id: 'mock-central-coruja', slug: 'central-coruja', name: 'Central Coruja' },
        settings: {
            display_name: 'Central Coruja',
            logo_url: '/central-coruja-logo.png',
            primary_color: '#0C1A34',
            light_color: '#5D1E76',
            bg_color: '#F8F4FF',
            accent_color: '#EA9A3B',
            font_family: null,
            green_color: null,
            radius_xl: null,
            radius_2xl: null,
            radius_3xl: null,
            login_background_url: null,
            home_hero_image_url: '/coruja-hero-banner-v2.webp',
            menu_config: {},
        },
        features: {
            ...DEFAULT_FEATURES,
            'hero.parallax': { enabled: false, config: { mode: 'off' } },
        },
    },
};

// ── Helpers ───────────────────────────────────────────────

/** Resolve o slug da marca a partir de env > hostname > fallback. */
function resolveBrandSlug(): string {
    if (typeof window !== 'undefined') {
        const fromSearch = resolveBrandSlugFromSearch(window.location.search);
        if (fromSearch) {
            return fromSearch;
        }
    }

    const previewSettings = getWhiteLabelPreviewSettings();
    if (previewSettings.previewEnabled) {
        return previewSettings.activeBrandId;
    }

    const fromEnv = import.meta.env.VITE_BRAND_SLUG as string | undefined;
    if (fromEnv) return fromEnv;

    if (typeof window !== 'undefined') {
        const fromPathname = resolveBrandSlugFromPathname(window.location.pathname);
        if (fromPathname) {
            return fromPathname;
        }

        const host = window.location.hostname.toLowerCase();
        if (host.includes('central-coruja') || host.startsWith('coruja.')) {
            return 'central-coruja';
        }
    }

    return 'kaboo';
}

function normalizeNullableString(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
}

function normalizeBrandSettings(settings: BrandSettings, fallbackName = 'Mundo de Kaboo'): BrandSettings {
    const visualIdentity = extractBrandVisualIdentity(settings.menu_config);
    const designTokens = extractBrandDesignTokens(settings.menu_config);

    return {
        ...settings,
        display_name: settings.display_name?.trim() || fallbackName,
        logo_url: normalizeNullableString(settings.logo_url),
        primary_color: normalizeNullableString(settings.primary_color),
        light_color: normalizeNullableString(settings.light_color),
        bg_color: normalizeNullableString(settings.bg_color),
        accent_color: normalizeNullableString(settings.accent_color),
        font_family: normalizeNullableString(settings.font_family),
        green_color: normalizeNullableString(settings.green_color) ?? designTokens.green_color,
        radius_xl: normalizeNullableString(settings.radius_xl) ?? designTokens.radius_xl,
        radius_2xl: normalizeNullableString(settings.radius_2xl) ?? designTokens.radius_2xl,
        radius_3xl: normalizeNullableString(settings.radius_3xl) ?? designTokens.radius_3xl,
        login_background_url: normalizeNullableString(settings.login_background_url) ?? visualIdentity.login_background_url,
        home_hero_image_url: normalizeNullableString(settings.home_hero_image_url) ?? visualIdentity.home_hero_image_url,
        menu_config: settings.menu_config ?? {},
    };
}

function applyMockOverrideToSettings(settings: BrandSettings, override: MockBrandSettingsOverride | null): BrandSettings {
    if (!override) {
        return normalizeBrandSettings(settings);
    }

    const nextVisualIdentity = extractBrandVisualIdentity(settings.menu_config);
    const nextDesignTokens = extractBrandDesignTokens(settings.menu_config);

    if (Object.prototype.hasOwnProperty.call(override, 'login_background_url')) {
        nextVisualIdentity.login_background_url = override.login_background_url ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(override, 'home_hero_image_url')) {
        nextVisualIdentity.home_hero_image_url = override.home_hero_image_url ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(override, 'green_color')) {
        nextDesignTokens.green_color = override.green_color ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(override, 'radius_xl')) {
        nextDesignTokens.radius_xl = override.radius_xl ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(override, 'radius_2xl')) {
        nextDesignTokens.radius_2xl = override.radius_2xl ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(override, 'radius_3xl')) {
        nextDesignTokens.radius_3xl = override.radius_3xl ?? null;
    }

    const nextMenuConfig = mergeBrandDesignTokens(
        mergeBrandVisualIdentity(settings.menu_config, nextVisualIdentity),
        nextDesignTokens,
    );

    return normalizeBrandSettings({
        ...settings,
        display_name: override.display_name ?? settings.display_name,
        logo_url: Object.prototype.hasOwnProperty.call(override, 'logo_url') ? override.logo_url ?? null : settings.logo_url,
        primary_color: Object.prototype.hasOwnProperty.call(override, 'primary_color') ? override.primary_color ?? null : settings.primary_color,
        light_color: Object.prototype.hasOwnProperty.call(override, 'light_color') ? override.light_color ?? null : settings.light_color,
        bg_color: Object.prototype.hasOwnProperty.call(override, 'bg_color') ? override.bg_color ?? null : settings.bg_color,
        accent_color: Object.prototype.hasOwnProperty.call(override, 'accent_color') ? override.accent_color ?? null : settings.accent_color,
        font_family: Object.prototype.hasOwnProperty.call(override, 'font_family') ? override.font_family ?? null : settings.font_family,
        green_color: Object.prototype.hasOwnProperty.call(override, 'green_color') ? override.green_color ?? null : settings.green_color,
        radius_xl: Object.prototype.hasOwnProperty.call(override, 'radius_xl') ? override.radius_xl ?? null : settings.radius_xl,
        radius_2xl: Object.prototype.hasOwnProperty.call(override, 'radius_2xl') ? override.radius_2xl ?? null : settings.radius_2xl,
        radius_3xl: Object.prototype.hasOwnProperty.call(override, 'radius_3xl') ? override.radius_3xl ?? null : settings.radius_3xl,
        login_background_url: nextVisualIdentity.login_background_url,
        home_hero_image_url: nextVisualIdentity.home_hero_image_url,
        menu_config: nextMenuConfig,
    });
}

function normalizeBootstrap(bootstrap: BrandBootstrap): BrandBootstrap {
    const normalizedSettings = normalizeBrandSettings(bootstrap.settings, bootstrap.brand.name);
    const nextSettings = bootstrap.brand.slug === 'central-coruja' && !normalizedSettings.home_hero_image_url
        ? {
            ...normalizedSettings,
            home_hero_image_url: CENTRAL_CORUJA_DEFAULT_HERO_IMAGE_URL,
        }
        : normalizedSettings;

    return {
        ...bootstrap,
        settings: nextSettings,
    };
}

export function buildMockBootstrap(slug: string): BrandBootstrap {
    const kabooBase: BrandBootstrap = {
        brand: { id: 'mock-kaboo', slug: 'kaboo', name: 'Mundo de Kaboo' },
        settings: {
            display_name: 'Mundo de Kaboo',
            logo_url: null,
            primary_color: '#5D1F58',
            light_color: '#883E82',
            bg_color: '#F9F5F9',
            accent_color: '#4EA8DE',
            font_family: null,
            green_color: null,
            radius_xl: null,
            radius_2xl: null,
            radius_3xl: null,
            login_background_url: null,
            home_hero_image_url: null,
            menu_config: {},
        },
        menu: DEFAULT_MENU,
        features: DEFAULT_FEATURES,
        version: 1,
        updated_at: new Date().toISOString(),
    };

    const overrides = MOCK_BRAND_OVERRIDES[slug];
    const nextBootstrap = !overrides ? kabooBase : {
        ...kabooBase,
        ...overrides,
        settings: { ...kabooBase.settings, ...(overrides.settings ?? {}) },
        features: overrides.features ?? kabooBase.features,
        menu: overrides.menu ?? kabooBase.menu,
    };

    const settingsOverride = getMockBrandSettingsOverride(nextBootstrap.brand.id);

    return normalizeBootstrap({
        ...nextBootstrap,
        settings: applyMockOverrideToSettings(nextBootstrap.settings, settingsOverride),
        updated_at: new Date().toISOString(),
    });
}

function tryApplyTheme(settings: BrandSettings, slug: string): void {
    // Tenta reutilizar tema pré-definido pelo slug.
    const preset: BrandTheme | undefined = themes[slug];

    const theme: BrandTheme = {
        id: slug,
        name: settings.display_name,
        colors: {
            primary: settings.primary_color ?? preset?.colors.primary ?? '#5D1F58',
            light: settings.light_color ?? preset?.colors.light ?? '#883E82',
            bg: settings.bg_color ?? preset?.colors.bg ?? '#F9F5F9',
            accent: settings.accent_color ?? preset?.colors.accent ?? '#4EA8DE',
            green: settings.green_color ?? preset?.colors.green ?? '#70E000',
        },
        font: settings.font_family ?? preset?.font,
        tokens: {
            radius: {
                xl: settings.radius_xl ?? undefined,
                '2xl': settings.radius_2xl ?? undefined,
                '3xl': settings.radius_3xl ?? undefined,
            },
        },
    };

    applyTheme(theme);
}

function readCache(slug: string): BrandBootstrap | null {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { slug: string; bootstrap: BrandBootstrap; ts: number };
        if (parsed.slug !== slug) return null;
        // Cache válido por 60 s.
        if (Date.now() - parsed.ts > 60_000) return null;
        return normalizeBootstrap(parsed.bootstrap);
    } catch {
        return null;
    }
}

function writeCache(slug: string, bootstrap: BrandBootstrap): void {
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ slug, bootstrap: normalizeBootstrap(bootstrap), ts: Date.now() }));
    } catch {
        // sessionStorage pode estar indisponível; ignorar silenciosamente.
    }
}

async function fetchBootstrap(slug: string): Promise<BrandBootstrap | null> {
    if (!isSupabaseConfigured || isDevMockSession()) {
        return buildMockBootstrap(slug);
    }

    try {
        const { data, error } = await supabase.rpc('get_brand_bootstrap', { p_brand_slug: slug });
        if (error || !data) {
            console.warn('[useBrandConfig] RPC get_brand_bootstrap falhou, usando mock:', error?.message);
            return buildMockBootstrap(slug);
        }
        return normalizeBootstrap(data as BrandBootstrap);
    } catch (err) {
        console.warn('[useBrandConfig] Erro ao buscar bootstrap de marca:', err);
        return buildMockBootstrap(slug);
    }
}

export function invalidateBrandBootstrapCache(targetSlug?: string): void {
    try {
        sessionStorage.removeItem(CACHE_KEY);
    } catch {
        // sessionStorage indisponível; segue apenas com o evento.
    }

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(BRAND_BOOTSTRAP_REFRESH_EVENT, {
            detail: targetSlug ? { slug: targetSlug } : undefined,
        }));
    }
}

// ── Hook ──────────────────────────────────────────────────

export function useBrandConfig(): BrandConfig {
    const [slug, setSlug] = useState(() => resolveBrandSlug());

    const [bootstrap, setBootstrap] = useState<BrandBootstrap>(() => {
        const initialSlug = resolveBrandSlug();
        const cached = readCache(initialSlug);
        if (cached) {
            // Aplica tema imediatamente do cache para evitar flash.
            tryApplyTheme(cached.settings, initialSlug);
            return cached;
        }
        return buildMockBootstrap(initialSlug);
    });

    const [loading, setLoading] = useState(() => !readCache(resolveBrandSlug()));

    useEffect(() => {
        const syncResolvedSlug = () => {
            const nextSlug = resolveBrandSlug();
            setSlug((currentSlug) => currentSlug === nextSlug ? currentSlug : nextSlug);
        };

        return subscribeToWhiteLabelPreviewSettings(syncResolvedSlug);
    }, []);

    useEffect(() => {
        let cancelled = false;

        const cached = readCache(slug);
        if (cached) {
            tryApplyTheme(cached.settings, slug);
            setBootstrap(cached);
            setLoading(false);
        } else {
            const fallbackBootstrap = buildMockBootstrap(slug);
            tryApplyTheme(fallbackBootstrap.settings, slug);
            setBootstrap(fallbackBootstrap);
            setLoading(true);
        }

        async function load() {
            const data = await fetchBootstrap(slug);
            if (!data || cancelled) return;

            writeCache(slug, data);
            tryApplyTheme(data.settings, slug);
            setBootstrap(data);
            setLoading(false);
        }

        const handleRefresh = (event: Event) => {
            const detail = (event as CustomEvent<{ slug?: string }>).detail;
            if (detail?.slug && detail.slug !== slug) {
                return;
            }

            void load();
        };

        void load();
        window.addEventListener(BRAND_BOOTSTRAP_REFRESH_EVENT, handleRefresh as EventListener);

        return () => {
            cancelled = true;
            window.removeEventListener(BRAND_BOOTSTRAP_REFRESH_EVENT, handleRefresh as EventListener);
        };
    }, [slug]);

    const enabledMenuItems = bootstrap.menu
        .filter(item => {
            if (!item.enabled) return false;
            const flagKey = `menu.${item.key}`;
            const flag = bootstrap.features[flagKey];
            // Se o flag existir, respeita; caso contrário, confiam no campo enabled do item.
            return flag !== undefined ? flag.enabled : true;
        })
        .sort((a, b) => a.order - b.order);

    function isFeatureEnabled(key: string): boolean {
        return bootstrap.features[key]?.enabled ?? false;
    }

    return { bootstrap, slug, isFeatureEnabled, enabledMenuItems, loading };
}

/** Expõe apenas a resolução do slug (sem React) para uso fora de componentes. */
export { resolveBrandSlug };
