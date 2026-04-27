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

const DEFAULT_MENU: BrandMenuItem[] = [
    { key: 'collections', label: 'Coleções', route: 'home', enabled: true, order: 10 },
    { key: 'books', label: 'Livros', route: 'home', enabled: true, order: 20 },
    { key: 'videos', label: 'Vídeos', route: 'videos', enabled: true, order: 30 },
    { key: 'music', label: 'Músicas', route: 'music', enabled: true, order: 40 },
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
};

/** Defaults por slug para o mock local (sem Supabase). */
const MOCK_BRAND_OVERRIDES: Record<string, Partial<BrandBootstrap>> = {
    'central-coruja': {
        brand: { id: 'mock-central-coruja', slug: 'central-coruja', name: 'Central Coruja' },
        settings: {
            display_name: 'Central Coruja',
            logo_url: null,
            primary_color: '#1B5E20',
            light_color: '#388E3C',
            bg_color: '#F1F8E9',
            accent_color: '#F9A825',
            font_family: null,
            menu_config: {},
        },
        features: {
            ...DEFAULT_FEATURES,
            'menu.music': { enabled: false, config: {} },
            'hero.parallax': { enabled: true, config: { mode: 'subtle' } },
        },
        menu: DEFAULT_MENU.map(item =>
            item.key === 'music' ? { ...item, enabled: false } : item
        ),
    },
};

// ── Helpers ───────────────────────────────────────────────

/** Resolve o slug da marca a partir de env > hostname > fallback. */
function resolveBrandSlug(): string {
    const fromEnv = import.meta.env.VITE_BRAND_SLUG as string | undefined;
    if (fromEnv) return fromEnv;

    if (typeof window !== 'undefined') {
        const host = window.location.hostname.toLowerCase();
        if (host.includes('central-coruja') || host.startsWith('coruja.')) {
            return 'central-coruja';
        }
    }

    return 'kaboo';
}

function buildMockBootstrap(slug: string): BrandBootstrap {
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
            menu_config: {},
        },
        menu: DEFAULT_MENU,
        features: DEFAULT_FEATURES,
        version: 1,
        updated_at: new Date().toISOString(),
    };

    const overrides = MOCK_BRAND_OVERRIDES[slug];
    if (!overrides) return kabooBase;

    return {
        ...kabooBase,
        ...overrides,
        settings: { ...kabooBase.settings, ...(overrides.settings ?? {}) },
        features: overrides.features ?? kabooBase.features,
        menu: overrides.menu ?? kabooBase.menu,
    };
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
            green: preset?.colors.green ?? '#70E000',
        },
        font: settings.font_family ?? preset?.font,
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
        return parsed.bootstrap;
    } catch {
        return null;
    }
}

function writeCache(slug: string, bootstrap: BrandBootstrap): void {
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ slug, bootstrap, ts: Date.now() }));
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
        return data as BrandBootstrap;
    } catch (err) {
        console.warn('[useBrandConfig] Erro ao buscar bootstrap de marca:', err);
        return buildMockBootstrap(slug);
    }
}

// ── Hook ──────────────────────────────────────────────────

const DEFAULT_SLUG = resolveBrandSlug();

export function useBrandConfig(): BrandConfig {
    const slug = DEFAULT_SLUG;

    const [bootstrap, setBootstrap] = useState<BrandBootstrap>(() => {
        const cached = readCache(slug);
        if (cached) {
            // Aplica tema imediatamente do cache para evitar flash.
            tryApplyTheme(cached.settings, slug);
            return cached;
        }
        return buildMockBootstrap(slug);
    });

    const [loading, setLoading] = useState(!readCache(slug));

    useEffect(() => {
        let cancelled = false;

        async function load() {
            const data = await fetchBootstrap(slug);
            if (!data || cancelled) return;

            writeCache(slug, data);
            tryApplyTheme(data.settings, slug);
            setBootstrap(data);
            setLoading(false);
        }

        load();
        return () => { cancelled = true; };
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
