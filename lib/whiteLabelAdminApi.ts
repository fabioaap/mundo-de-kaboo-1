import { supabase, isSupabaseConfigured } from './supabase';
import { isDevMockSession } from './api';
import {
    extractBrandDesignTokens,
    extractBrandLinks,
    extractBrandVisualIdentity,
    getMockBrandSettingsOverride,
    mergeBrandDesignTokens,
    mergeBrandLinks,
    mergeBrandVisualIdentity,
    writeMockBrandSettingsOverride,
} from './whiteLabelBranding';

export type HeroParallaxMode = 'off' | 'subtle' | 'standard';

export interface WhiteLabelBrandRow {
    id: string;
    slug: string;
    name: string;
    is_active: boolean;
    display_name: string;
}

export interface WhiteLabelFeatureState {
    enabled: boolean;
    config: Record<string, unknown>;
}

export interface WhiteLabelAuditEntry {
    id: string;
    feature_key: string;
    enabled_before: boolean | null;
    enabled_after: boolean;
    config_before: Record<string, unknown> | null;
    config_after: Record<string, unknown>;
    changed_at: string;
    reason: string | null;
}

export interface WhiteLabelPublicationState {
    version: number;
    published_at: string | null;
}

export interface WhiteLabelBrandIdentity {
    display_name: string;
    logo_url: string;
    primary_color: string;
    light_color: string;
    bg_color: string;
    accent_color: string;
    font_family: string;
    green_color: string;
    radius_xl: string;
    radius_2xl: string;
    radius_3xl: string;
    login_background_url: string;
    home_hero_image_url: string;
    store_url: string;
    lead_capture_url: string;
    support_contact_url: string;
}

export type WhiteLabelRolloutWave = 'pilot' | 'group' | 'general';

export interface WhiteLabelRolloutConfig {
    enabled: boolean;
    wave: WhiteLabelRolloutWave;
    started_at: string | null;
    last_changed_at: string | null;
    last_reason: string | null;
}

export interface WhiteLabelRolloutMetrics {
    enabled_flags: number;
    total_changes: number;
    changes_24h: number;
    last_publish_at: string | null;
}

export interface WhiteLabelAlertingConfig {
    enabled: boolean;
    webhook_url: string;
    channel: string;
    changes_24h_threshold: number;
    notify_on_general_without_publish: boolean;
    updated_at: string | null;
    last_reason: string | null;
    last_dispatch_at: string | null;
    last_dispatch_status: 'idle' | 'success' | 'error';
    last_dispatch_http_status: number | null;
    last_dispatch_error: string | null;
    last_live_alert_signature: string | null;
}

export interface WhiteLabelAlertDispatchEntry {
    id: string;
    sent_at: string;
    mode: 'test' | 'live';
    status: 'success' | 'error';
    http_status: number | null;
    error: string | null;
    attempts: number;
    channel: string;
}

export type WhiteLabelOperationalEventType = 'alert_dispatch' | 'flag_change' | 'rollout_wave' | 'publication';

export interface WhiteLabelOperationalEvent {
    id: string;
    type: WhiteLabelOperationalEventType;
    occurred_at: string;
    reason: string | null;
    data: {
        dispatch?: {
            mode: 'test' | 'live';
            status: 'success' | 'error';
            channel: string;
        };
        flag?: {
            feature_key: string;
            enabled_before: boolean | null;
            enabled_after: boolean;
        };
        rollout?: {
            wave_before: WhiteLabelRolloutWave;
            wave_after: WhiteLabelRolloutWave;
        };
        publication?: {
            version: number;
        };
    };
}

export interface WhiteLabelHealthCheck {
    status: 'healthy' | 'warning' | 'critical';
    checks: Array<{
        name: string;
        status: 'pass' | 'warn' | 'fail';
        message: string;
    }>;
    timestamp: string;
}

const MOCK_BRANDS: WhiteLabelBrandRow[] = [
    {
        id: 'mock-kaboo',
        slug: 'kaboo',
        name: 'Mundo de Kaboo',
        is_active: true,
        display_name: 'Mundo de Kaboo',
    },
    {
        id: 'mock-central-coruja',
        slug: 'central-coruja',
        name: 'Central Coruja',
        is_active: true,
        display_name: 'Central Coruja',
    },
];

const MOCK_FEATURES_BY_BRAND: Record<string, Record<string, WhiteLabelFeatureState>> = {
    'mock-kaboo': {
        'menu.books': { enabled: true, config: {} },
        'menu.collections': { enabled: true, config: {} },
        'menu.music': { enabled: true, config: {} },
        'hero.parallax': { enabled: false, config: { mode: 'off' } },
        'content.offline': { enabled: false, config: {} },
    },
    'mock-central-coruja': {
        'menu.books': { enabled: true, config: {} },
        'menu.collections': { enabled: true, config: {} },
        'menu.music': { enabled: true, config: {} },
        'hero.parallax': { enabled: false, config: { mode: 'off' } },
        'content.offline': { enabled: false, config: {} },
    },
};

const MOCK_PUBLICATION_STATE: Record<string, WhiteLabelPublicationState> = {
    'mock-kaboo': { version: 1, published_at: null },
    'mock-central-coruja': { version: 1, published_at: null },
};

const MOCK_ROLLOUT_CONFIG: Record<string, WhiteLabelRolloutConfig> = {
    'mock-kaboo': { enabled: true, wave: 'general', started_at: null, last_changed_at: null, last_reason: null },
    'mock-central-coruja': { enabled: true, wave: 'pilot', started_at: null, last_changed_at: null, last_reason: null },
};

const MOCK_ROLLOUT_METRICS: Record<string, WhiteLabelRolloutMetrics> = {
    'mock-kaboo': { enabled_flags: 2, total_changes: 0, changes_24h: 0, last_publish_at: null },
    'mock-central-coruja': { enabled_flags: 0, total_changes: 0, changes_24h: 0, last_publish_at: null },
};

const MOCK_ALERTING_CONFIG: Record<string, WhiteLabelAlertingConfig> = {
    'mock-kaboo': {
        enabled: false,
        webhook_url: '',
        channel: 'ops-kaboo',
        changes_24h_threshold: 10,
        notify_on_general_without_publish: true,
        updated_at: null,
        last_reason: null,
        last_dispatch_at: null,
        last_dispatch_status: 'idle',
        last_dispatch_http_status: null,
        last_dispatch_error: null,
        last_live_alert_signature: null,
    },
    'mock-central-coruja': {
        enabled: false,
        webhook_url: '',
        channel: 'ops-central-coruja',
        changes_24h_threshold: 10,
        notify_on_general_without_publish: true,
        updated_at: null,
        last_reason: null,
        last_dispatch_at: null,
        last_dispatch_status: 'idle',
        last_dispatch_http_status: null,
        last_dispatch_error: null,
        last_live_alert_signature: null,
    },
};

const MOCK_ALERTING_HISTORY: Record<string, WhiteLabelAlertDispatchEntry[]> = {
    'mock-kaboo': [],
    'mock-central-coruja': [],
};

const DEFAULT_BRAND_IDENTITY_BY_BRAND: Record<string, WhiteLabelBrandIdentity> = {
    'mock-kaboo': {
        display_name: 'Mundo de Kaboo',
        logo_url: '',
        primary_color: '#5D1F58',
        light_color: '#883E82',
        bg_color: '#F9F5F9',
        accent_color: '#4EA8DE',
        font_family: '',
        green_color: '#70E000',
        radius_xl: '1rem',
        radius_2xl: '1.5rem',
        radius_3xl: '2rem',
        login_background_url: '',
        home_hero_image_url: '',
        store_url: 'https://empatiaeditora.com.br/',
        lead_capture_url: 'https://loja.empatiaeditora.com.br/',
        support_contact_url: 'mailto:suporte@mundodekaboo.com',
    },
    'mock-central-coruja': {
        display_name: 'Central Coruja',
        logo_url: '/central-coruja-logo.png',
        primary_color: '#0C1A34',
        light_color: '#5D1E76',
        bg_color: '#F8F4FF',
        accent_color: '#EA9A3B',
        font_family: '',
        green_color: '#70E000',
        radius_xl: '1rem',
        radius_2xl: '1.5rem',
        radius_3xl: '2rem',
        login_background_url: '',
        home_hero_image_url: '',
        store_url: 'https://loja.educabox.com.br/',
        lead_capture_url: '',
        support_contact_url: '',
    },
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeText(value: string | null | undefined): string {
    return value?.trim() ?? '';
}

function buildMockBrandIdentity(brandId: string): WhiteLabelBrandIdentity {
    const brand = MOCK_BRANDS.find((row) => row.id === brandId);
    const defaults = DEFAULT_BRAND_IDENTITY_BY_BRAND[brandId] ?? DEFAULT_BRAND_IDENTITY_BY_BRAND['mock-kaboo'];
    const override = getMockBrandSettingsOverride(brandId);

    return {
        display_name: override?.display_name ?? brand?.display_name ?? defaults.display_name,
        logo_url: Object.prototype.hasOwnProperty.call(override ?? {}, 'logo_url') ? normalizeText(override?.logo_url ?? '') : defaults.logo_url,
        primary_color: Object.prototype.hasOwnProperty.call(override ?? {}, 'primary_color') ? normalizeText(override?.primary_color ?? '') : defaults.primary_color,
        light_color: Object.prototype.hasOwnProperty.call(override ?? {}, 'light_color') ? normalizeText(override?.light_color ?? '') : defaults.light_color,
        bg_color: Object.prototype.hasOwnProperty.call(override ?? {}, 'bg_color') ? normalizeText(override?.bg_color ?? '') : defaults.bg_color,
        accent_color: Object.prototype.hasOwnProperty.call(override ?? {}, 'accent_color') ? normalizeText(override?.accent_color ?? '') : defaults.accent_color,
        font_family: Object.prototype.hasOwnProperty.call(override ?? {}, 'font_family') ? normalizeText(override?.font_family ?? '') : defaults.font_family,
        green_color: Object.prototype.hasOwnProperty.call(override ?? {}, 'green_color') ? normalizeText(override?.green_color ?? '') || defaults.green_color : defaults.green_color,
        radius_xl: Object.prototype.hasOwnProperty.call(override ?? {}, 'radius_xl') ? normalizeText(override?.radius_xl ?? '') || defaults.radius_xl : defaults.radius_xl,
        radius_2xl: Object.prototype.hasOwnProperty.call(override ?? {}, 'radius_2xl') ? normalizeText(override?.radius_2xl ?? '') || defaults.radius_2xl : defaults.radius_2xl,
        radius_3xl: Object.prototype.hasOwnProperty.call(override ?? {}, 'radius_3xl') ? normalizeText(override?.radius_3xl ?? '') || defaults.radius_3xl : defaults.radius_3xl,
        login_background_url: Object.prototype.hasOwnProperty.call(override ?? {}, 'login_background_url') ? normalizeText(override?.login_background_url ?? '') : defaults.login_background_url,
        home_hero_image_url: Object.prototype.hasOwnProperty.call(override ?? {}, 'home_hero_image_url') ? normalizeText(override?.home_hero_image_url ?? '') : defaults.home_hero_image_url,
        store_url: defaults.store_url,
        lead_capture_url: defaults.lead_capture_url,
        support_contact_url: defaults.support_contact_url,
    };
}

function getMockBrands(): WhiteLabelBrandRow[] {
    return MOCK_BRANDS.map((brand) => ({
        ...brand,
        display_name: buildMockBrandIdentity(brand.id).display_name,
    }));
}

function buildDispatchEntry(input: {
    sentAt: string;
    mode: 'test' | 'live';
    status: 'success' | 'error';
    httpStatus: number | null;
    error: string | null;
    attempts: number;
    channel: string;
}): WhiteLabelAlertDispatchEntry {
    return {
        id: `${input.sentAt}-${Math.random().toString(36).slice(2, 8)}`,
        sent_at: input.sentAt,
        mode: input.mode,
        status: input.status,
        http_status: input.httpStatus,
        error: input.error,
        attempts: input.attempts,
        channel: input.channel,
    };
}

function mergeDispatchHistory(
    existing: WhiteLabelAlertDispatchEntry[],
    nextEntry: WhiteLabelAlertDispatchEntry,
): WhiteLabelAlertDispatchEntry[] {
    return [nextEntry, ...existing].slice(0, 10);
}

export const canUseRemoteWhiteLabel = (): boolean => {
    return isSupabaseConfigured && !isDevMockSession();
};

export async function listWhiteLabelBrands(): Promise<WhiteLabelBrandRow[]> {
    if (!canUseRemoteWhiteLabel()) {
        return getMockBrands();
    }

    const { data: brands, error: brandsError } = await supabase
        .from('brands')
        .select('id, slug, name, is_active')
        .eq('is_active', true)
        .order('slug', { ascending: true });

    if (brandsError) {
        console.warn('[whiteLabelAdminApi] listWhiteLabelBrands remote failed, using mock fallback:', brandsError);
        return getMockBrands();
    }

    const brandIds = (brands ?? []).map((brand) => brand.id);
    let settingsByBrandId = new Map<string, string>();

    if (brandIds.length > 0) {
        const { data: settings, error: settingsError } = await supabase
            .from('brand_settings')
            .select('brand_id, display_name')
            .in('brand_id', brandIds);

        if (settingsError) {
            console.warn('[whiteLabelAdminApi] listWhiteLabelBrands settings remote failed, using mock fallback:', settingsError);
            return getMockBrands();
        }

        settingsByBrandId = new Map((settings ?? []).map((row) => [row.brand_id as string, (row.display_name as string) ?? '']));
    }

    return (brands ?? []).map((brand) => ({
        id: brand.id,
        slug: brand.slug,
        name: brand.name,
        is_active: brand.is_active,
        display_name: settingsByBrandId.get(brand.id) || brand.name,
    }));
}

export async function getWhiteLabelBrandIdentity(brandId: string): Promise<WhiteLabelBrandIdentity> {
    if (!canUseRemoteWhiteLabel()) {
        return buildMockBrandIdentity(brandId);
    }

    const { data, error } = await supabase
        .from('brand_settings')
        .select('display_name, logo_url, primary_color, light_color, bg_color, accent_color, font_family, menu_config')
        .eq('brand_id', brandId)
        .single();

    if (error) {
        console.warn('[whiteLabelAdminApi] getWhiteLabelBrandIdentity remote failed, using mock fallback:', error);
        return buildMockBrandIdentity(brandId);
    }

    const defaults = DEFAULT_BRAND_IDENTITY_BY_BRAND[brandId] ?? DEFAULT_BRAND_IDENTITY_BY_BRAND['mock-kaboo'];
    const menuConfig = (data.menu_config as Record<string, unknown> | null) ?? {};
    const visualIdentity = extractBrandVisualIdentity(menuConfig);
    const designTokens = extractBrandDesignTokens(menuConfig);
    const brandLinks = extractBrandLinks(menuConfig);

    return {
        display_name: normalizeText((data.display_name as string | null | undefined) ?? defaults.display_name) || defaults.display_name,
        logo_url: normalizeText((data.logo_url as string | null | undefined) ?? defaults.logo_url),
        primary_color: normalizeText((data.primary_color as string | null | undefined) ?? defaults.primary_color) || defaults.primary_color,
        light_color: normalizeText((data.light_color as string | null | undefined) ?? defaults.light_color) || defaults.light_color,
        bg_color: normalizeText((data.bg_color as string | null | undefined) ?? defaults.bg_color) || defaults.bg_color,
        accent_color: normalizeText((data.accent_color as string | null | undefined) ?? defaults.accent_color) || defaults.accent_color,
        font_family: normalizeText((data.font_family as string | null | undefined) ?? defaults.font_family),
        green_color: normalizeText(designTokens.green_color ?? defaults.green_color) || defaults.green_color,
        radius_xl: normalizeText(designTokens.radius_xl ?? defaults.radius_xl) || defaults.radius_xl,
        radius_2xl: normalizeText(designTokens.radius_2xl ?? defaults.radius_2xl) || defaults.radius_2xl,
        radius_3xl: normalizeText(designTokens.radius_3xl ?? defaults.radius_3xl) || defaults.radius_3xl,
        login_background_url: normalizeText(visualIdentity.login_background_url ?? defaults.login_background_url),
        home_hero_image_url: normalizeText(visualIdentity.home_hero_image_url ?? defaults.home_hero_image_url),
        store_url: normalizeText(brandLinks.store_url ?? defaults.store_url),
        lead_capture_url: normalizeText(brandLinks.lead_capture_url ?? defaults.lead_capture_url),
        support_contact_url: normalizeText(brandLinks.support_contact_url ?? defaults.support_contact_url),
    };
}

export async function setWhiteLabelBrandIdentity(input: {
    brandId: string;
    display_name: string;
    logo_url: string;
    primary_color: string;
    light_color: string;
    bg_color: string;
    accent_color: string;
    font_family?: string;
    green_color?: string;
    radius_xl?: string;
    radius_2xl?: string;
    radius_3xl?: string;
    login_background_url?: string;
    home_hero_image_url?: string;
    store_url?: string;
    lead_capture_url?: string;
    support_contact_url?: string;
}): Promise<WhiteLabelBrandIdentity> {
    const normalizedDisplayName = normalizeText(input.display_name);
    const normalizedLogoUrl = normalizeText(input.logo_url);
    const normalizedFontFamily = normalizeText(input.font_family);
    const normalizedGreenColor = normalizeText(input.green_color);
    const normalizedRadiusXl = normalizeText(input.radius_xl);
    const normalizedRadius2xl = normalizeText(input.radius_2xl);
    const normalizedRadius3xl = normalizeText(input.radius_3xl);
    const normalizedLoginBackgroundUrl = normalizeText(input.login_background_url);
    const normalizedHomeHeroImageUrl = normalizeText(input.home_hero_image_url);
    const normalizedStoreUrl = normalizeText(input.store_url);
    const normalizedLeadCaptureUrl = normalizeText(input.lead_capture_url);
    const normalizedSupportContactUrl = normalizeText(input.support_contact_url);

    if (!normalizedDisplayName) {
        throw new Error('display_name_required');
    }

    if (!canUseRemoteWhiteLabel()) {
        writeMockBrandSettingsOverride(input.brandId, {
            display_name: normalizedDisplayName,
            logo_url: normalizedLogoUrl || null,
            primary_color: input.primary_color,
            light_color: input.light_color,
            bg_color: input.bg_color,
            accent_color: input.accent_color,
            font_family: normalizedFontFamily || null,
            green_color: normalizedGreenColor || null,
            radius_xl: normalizedRadiusXl || null,
            radius_2xl: normalizedRadius2xl || null,
            radius_3xl: normalizedRadius3xl || null,
            login_background_url: normalizedLoginBackgroundUrl || null,
            home_hero_image_url: normalizedHomeHeroImageUrl || null,
        });

        const publication = MOCK_PUBLICATION_STATE[input.brandId] ?? { version: 1, published_at: null };
        MOCK_PUBLICATION_STATE[input.brandId] = { ...publication, version: publication.version + 1 };

        return buildMockBrandIdentity(input.brandId);
    }

    const nowIso = new Date().toISOString();
    const { data: currentSettings, error: currentSettingsError } = await supabase
        .from('brand_settings')
        .select('menu_config, version')
        .eq('brand_id', input.brandId)
        .single();

    if (currentSettingsError) {
        throw currentSettingsError;
    }

    const nextMenuConfig = mergeBrandLinks(
        mergeBrandDesignTokens(
            mergeBrandVisualIdentity(
                (currentSettings.menu_config as Record<string, unknown> | null) ?? {},
                {
                    login_background_url: normalizedLoginBackgroundUrl || null,
                    home_hero_image_url: normalizedHomeHeroImageUrl || null,
                },
            ),
            {
                green_color: normalizedGreenColor || null,
                radius_xl: normalizedRadiusXl || null,
                radius_2xl: normalizedRadius2xl || null,
                radius_3xl: normalizedRadius3xl || null,
            },
        ),
        {
            store_url: normalizedStoreUrl || null,
            lead_capture_url: normalizedLeadCaptureUrl || null,
            support_contact_url: normalizedSupportContactUrl || null,
        },
    );

    const { error: updateError } = await supabase
        .from('brand_settings')
        .update({
            display_name: normalizedDisplayName,
            logo_url: normalizedLogoUrl || null,
            primary_color: input.primary_color,
            light_color: input.light_color,
            bg_color: input.bg_color,
            accent_color: input.accent_color,
            font_family: normalizedFontFamily || null,
            menu_config: nextMenuConfig,
            version: Number(currentSettings.version ?? 1) + 1,
            updated_at: nowIso,
        })
        .eq('brand_id', input.brandId);

    if (updateError) {
        throw updateError;
    }

    return getWhiteLabelBrandIdentity(input.brandId);
}

export async function getWhiteLabelFeatures(
    brandId: string,
    keys: string[] = ['menu.books', 'menu.collections', 'menu.music', 'hero.parallax', 'content.offline'],
): Promise<Record<string, WhiteLabelFeatureState>> {
    if (!canUseRemoteWhiteLabel()) {
        return MOCK_FEATURES_BY_BRAND[brandId] ?? {
            'menu.books': { enabled: true, config: {} },
            'menu.collections': { enabled: true, config: {} },
            'menu.music': { enabled: true, config: {} },
            'hero.parallax': { enabled: false, config: { mode: 'off' } },
            'content.offline': { enabled: false, config: {} },
        };
    }

    const { data: flags, error: flagsError } = await supabase
        .from('feature_flags')
        .select('id, key, default_enabled, default_config')
        .in('key', keys);

    if (flagsError) {
        console.warn('[whiteLabelAdminApi] getWhiteLabelFeatures flags remote failed, using mock fallback:', flagsError);
        return MOCK_FEATURES_BY_BRAND[brandId] ?? {
            'menu.books': { enabled: true, config: {} },
            'menu.collections': { enabled: true, config: {} },
            'menu.music': { enabled: true, config: {} },
            'hero.parallax': { enabled: false, config: { mode: 'off' } },
            'content.offline': { enabled: false, config: {} },
        };
    }

    const flagIds = (flags ?? []).map((flag) => flag.id);

    const { data: overrides, error: overridesError } = await supabase
        .from('brand_feature_overrides')
        .select('feature_flag_id, enabled, config')
        .eq('brand_id', brandId)
        .in('feature_flag_id', flagIds);

    if (overridesError) {
        console.warn('[whiteLabelAdminApi] getWhiteLabelFeatures overrides remote failed, using mock fallback:', overridesError);
        return MOCK_FEATURES_BY_BRAND[brandId] ?? {
            'menu.books': { enabled: true, config: {} },
            'menu.collections': { enabled: true, config: {} },
            'menu.music': { enabled: true, config: {} },
            'hero.parallax': { enabled: false, config: { mode: 'off' } },
            'content.offline': { enabled: false, config: {} },
        };
    }

    const overrideByFlagId = new Map(
        (overrides ?? []).map((row) => [
            row.feature_flag_id as string,
            {
                enabled: Boolean(row.enabled),
                config: (row.config as Record<string, unknown>) ?? {},
            },
        ]),
    );

    const resolved: Record<string, WhiteLabelFeatureState> = {};

    for (const flag of flags ?? []) {
        const override = overrideByFlagId.get(flag.id as string);
        resolved[flag.key as string] = {
            enabled: override?.enabled ?? Boolean(flag.default_enabled),
            config: override?.config ?? ((flag.default_config as Record<string, unknown>) ?? {}),
        };
    }

    return resolved;
}

export async function setWhiteLabelFeature(input: {
    brandId: string;
    featureKey: string;
    enabled: boolean;
    config?: Record<string, unknown>;
    reason?: string;
}): Promise<void> {
    const applyMockFeatureUpdate = () => {
        const current = MOCK_FEATURES_BY_BRAND[input.brandId] ?? {};
        current[input.featureKey] = {
            enabled: input.enabled,
            config: input.config ?? {},
        };
        MOCK_FEATURES_BY_BRAND[input.brandId] = current;
        const publication = MOCK_PUBLICATION_STATE[input.brandId] ?? { version: 1, published_at: null };
        MOCK_PUBLICATION_STATE[input.brandId] = { ...publication, version: publication.version + 1 };
    };

    if (!canUseRemoteWhiteLabel()) {
        applyMockFeatureUpdate();
        return;
    }

    const { error } = await supabase.rpc('set_brand_feature_flag', {
        p_brand_id: input.brandId,
        p_feature_key: input.featureKey,
        p_enabled: input.enabled,
        p_config: input.config ?? {},
        p_reason: input.reason ?? null,
    });

    if (error) {
        console.warn('[whiteLabelAdminApi] setWhiteLabelFeature remote failed, using mock fallback:', error);
        applyMockFeatureUpdate();
    }
}

export async function listWhiteLabelAudit(
    brandId: string,
    limit: number = 12,
): Promise<WhiteLabelAuditEntry[]> {
    if (!canUseRemoteWhiteLabel()) {
        return [];
    }

    const { data: auditRows, error: auditError } = await supabase
        .from('feature_flag_audit')
        .select('id, feature_flag_id, enabled_before, enabled_after, config_before, config_after, changed_at, reason')
        .eq('brand_id', brandId)
        .order('changed_at', { ascending: false })
        .limit(limit);

    if (auditError) {
        throw auditError;
    }

    const featureFlagIds = (auditRows ?? []).map((row) => row.feature_flag_id as string);
    if (featureFlagIds.length === 0) {
        return [];
    }

    const { data: flags, error: flagsError } = await supabase
        .from('feature_flags')
        .select('id, key')
        .in('id', featureFlagIds);

    if (flagsError) {
        throw flagsError;
    }

    const keyById = new Map((flags ?? []).map((flag) => [flag.id as string, flag.key as string]));

    return (auditRows ?? []).map((row) => ({
        id: row.id as string,
        feature_key: keyById.get(row.feature_flag_id as string) ?? 'unknown',
        enabled_before: (row.enabled_before as boolean | null) ?? null,
        enabled_after: Boolean(row.enabled_after),
        config_before: (row.config_before as Record<string, unknown> | null) ?? null,
        config_after: (row.config_after as Record<string, unknown>) ?? {},
        changed_at: row.changed_at as string,
        reason: (row.reason as string | null) ?? null,
    }));
}

export async function getWhiteLabelPublicationState(brandId: string): Promise<WhiteLabelPublicationState> {
    if (!canUseRemoteWhiteLabel()) {
        return MOCK_PUBLICATION_STATE[brandId] ?? { version: 1, published_at: null };
    }

    const { data, error } = await supabase
        .from('brand_settings')
        .select('version, published_at')
        .eq('brand_id', brandId)
        .single();

    if (error) {
        console.warn('[whiteLabelAdminApi] getWhiteLabelPublicationState remote failed, using mock fallback:', error);
        return MOCK_PUBLICATION_STATE[brandId] ?? { version: 1, published_at: null };
    }

    return {
        version: Number(data.version ?? 1),
        published_at: (data.published_at as string | null) ?? null,
    };
}

export async function publishWhiteLabelBrand(brandId: string): Promise<WhiteLabelPublicationState> {
    if (!canUseRemoteWhiteLabel()) {
        const current = MOCK_PUBLICATION_STATE[brandId] ?? { version: 1, published_at: null };
        const next = { ...current, published_at: new Date().toISOString() };
        MOCK_PUBLICATION_STATE[brandId] = next;
        return next;
    }

    const { data, error } = await supabase
        .from('brand_settings')
        .update({ published_at: new Date().toISOString() })
        .eq('brand_id', brandId)
        .select('version, published_at')
        .single();

    if (error) {
        throw error;
    }

    return {
        version: Number(data.version ?? 1),
        published_at: (data.published_at as string | null) ?? null,
    };
}

export async function getWhiteLabelRolloutConfig(brandId: string): Promise<WhiteLabelRolloutConfig> {
    if (!canUseRemoteWhiteLabel()) {
        return MOCK_ROLLOUT_CONFIG[brandId] ?? { enabled: true, wave: 'pilot', started_at: null, last_changed_at: null, last_reason: null };
    }

    const { data, error } = await supabase
        .from('brand_settings')
        .select('menu_config')
        .eq('brand_id', brandId)
        .single();

    if (error) {
        console.warn('[whiteLabelAdminApi] getWhiteLabelRolloutConfig remote failed, using mock fallback:', error);
        return MOCK_ROLLOUT_CONFIG[brandId] ?? { enabled: true, wave: 'pilot', started_at: null, last_changed_at: null, last_reason: null };
    }

    const menuConfig = (data.menu_config as Record<string, unknown> | null) ?? {};
    const rollout = (menuConfig.white_label_rollout as Record<string, unknown> | undefined) ?? {};
    const wave = rollout.wave as WhiteLabelRolloutWave | undefined;

    return {
        enabled: (rollout.enabled as boolean | undefined) ?? true,
        wave: wave === 'pilot' || wave === 'group' || wave === 'general' ? wave : 'pilot',
        started_at: (rollout.started_at as string | null | undefined) ?? null,
        last_changed_at: (rollout.last_changed_at as string | null | undefined) ?? null,
        last_reason: (rollout.last_reason as string | null | undefined) ?? null,
    };
}

export async function setWhiteLabelRolloutWave(input: {
    brandId: string;
    wave: WhiteLabelRolloutWave;
    reason?: string;
}): Promise<WhiteLabelRolloutConfig> {
    const nowIso = new Date().toISOString();
    const normalizedReason = (input.reason ?? '').trim();

    if (!normalizedReason) {
        throw new Error('reason_required_for_rollout_change');
    }

    if (!canUseRemoteWhiteLabel()) {
        const current = MOCK_ROLLOUT_CONFIG[input.brandId] ?? { enabled: true, wave: 'pilot', started_at: null, last_changed_at: null, last_reason: null };
        const next: WhiteLabelRolloutConfig = {
            enabled: true,
            wave: input.wave,
            started_at: current.started_at ?? nowIso,
            last_changed_at: nowIso,
            last_reason: normalizedReason,
        };
        MOCK_ROLLOUT_CONFIG[input.brandId] = next;

        const metrics = MOCK_ROLLOUT_METRICS[input.brandId] ?? { enabled_flags: 0, total_changes: 0, changes_24h: 0, last_publish_at: null };
        MOCK_ROLLOUT_METRICS[input.brandId] = {
            ...metrics,
            total_changes: metrics.total_changes + 1,
            changes_24h: metrics.changes_24h + 1,
        };

        return next;
    }

    const { data: currentSettings, error: currentError } = await supabase
        .from('brand_settings')
        .select('menu_config')
        .eq('brand_id', input.brandId)
        .single();

    if (currentError) {
        throw currentError;
    }

    const menuConfig = (currentSettings.menu_config as Record<string, unknown> | null) ?? {};
    const currentRollout = (menuConfig.white_label_rollout as Record<string, unknown> | undefined) ?? {};

    const nextRollout: WhiteLabelRolloutConfig = {
        enabled: true,
        wave: input.wave,
        started_at: (currentRollout.started_at as string | null | undefined) ?? nowIso,
        last_changed_at: nowIso,
        last_reason: normalizedReason,
    };

    const nextMenuConfig: Record<string, unknown> = {
        ...menuConfig,
        white_label_rollout: nextRollout,
    };

    const { error: updateError } = await supabase
        .from('brand_settings')
        .update({ menu_config: nextMenuConfig, updated_at: nowIso })
        .eq('brand_id', input.brandId);

    if (updateError) {
        throw updateError;
    }

    return nextRollout;
}

export async function getWhiteLabelRolloutMetrics(brandId: string): Promise<WhiteLabelRolloutMetrics> {
    if (!canUseRemoteWhiteLabel()) {
        const metrics = MOCK_ROLLOUT_METRICS[brandId] ?? { enabled_flags: 0, total_changes: 0, changes_24h: 0, last_publish_at: null };
        const publishState = MOCK_PUBLICATION_STATE[brandId] ?? { version: 1, published_at: null };
        return { ...metrics, last_publish_at: publishState.published_at };
    }

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [enabledFlagsResult, totalChangesResult, changes24hResult, publicationResult] = await Promise.all([
        supabase
            .from('brand_feature_overrides')
            .select('id', { head: true, count: 'exact' })
            .eq('brand_id', brandId)
            .eq('enabled', true),
        supabase
            .from('feature_flag_audit')
            .select('id', { head: true, count: 'exact' })
            .eq('brand_id', brandId),
        supabase
            .from('feature_flag_audit')
            .select('id', { head: true, count: 'exact' })
            .eq('brand_id', brandId)
            .gte('changed_at', since24h),
        supabase
            .from('brand_settings')
            .select('published_at')
            .eq('brand_id', brandId)
            .single(),
    ]);

    if (enabledFlagsResult.error || totalChangesResult.error || changes24hResult.error || publicationResult.error) {
        console.warn('[whiteLabelAdminApi] getWhiteLabelRolloutMetrics remote failed, using mock fallback:', {
            enabledFlagsError: enabledFlagsResult.error,
            totalChangesError: totalChangesResult.error,
            changes24hError: changes24hResult.error,
            publicationError: publicationResult.error,
        });
        const metrics = MOCK_ROLLOUT_METRICS[brandId] ?? { enabled_flags: 0, total_changes: 0, changes_24h: 0, last_publish_at: null };
        const publishState = MOCK_PUBLICATION_STATE[brandId] ?? { version: 1, published_at: null };
        return { ...metrics, last_publish_at: publishState.published_at };
    }

    return {
        enabled_flags: enabledFlagsResult.count ?? 0,
        total_changes: totalChangesResult.count ?? 0,
        changes_24h: changes24hResult.count ?? 0,
        last_publish_at: (publicationResult.data.published_at as string | null) ?? null,
    };
}

export async function getWhiteLabelAlertingConfig(brandId: string): Promise<WhiteLabelAlertingConfig> {
    if (!canUseRemoteWhiteLabel()) {
        return MOCK_ALERTING_CONFIG[brandId] ?? {
            enabled: false,
            webhook_url: '',
            channel: '',
            changes_24h_threshold: 10,
            notify_on_general_without_publish: true,
            updated_at: null,
            last_reason: null,
            last_dispatch_at: null,
            last_dispatch_status: 'idle',
            last_dispatch_http_status: null,
            last_dispatch_error: null,
            last_live_alert_signature: null,
        };
    }

    const { data, error } = await supabase
        .from('brand_settings')
        .select('menu_config')
        .eq('brand_id', brandId)
        .single();

    if (error) {
        console.warn('[whiteLabelAdminApi] getWhiteLabelAlertingConfig remote failed, using mock fallback:', error);
        return MOCK_ALERTING_CONFIG[brandId] ?? {
            enabled: false,
            webhook_url: '',
            channel: '',
            changes_24h_threshold: 10,
            notify_on_general_without_publish: true,
            updated_at: null,
            last_reason: null,
            last_dispatch_at: null,
            last_dispatch_status: 'idle',
            last_dispatch_http_status: null,
            last_dispatch_error: null,
            last_live_alert_signature: null,
        };
    }

    const menuConfig = (data.menu_config as Record<string, unknown> | null) ?? {};
    const alerting = (menuConfig.white_label_alerting as Record<string, unknown> | undefined) ?? {};

    return {
        enabled: (alerting.enabled as boolean | undefined) ?? false,
        webhook_url: (alerting.webhook_url as string | undefined) ?? '',
        channel: (alerting.channel as string | undefined) ?? '',
        changes_24h_threshold: Number(alerting.changes_24h_threshold ?? 10),
        notify_on_general_without_publish: (alerting.notify_on_general_without_publish as boolean | undefined) ?? true,
        updated_at: (alerting.updated_at as string | null | undefined) ?? null,
        last_reason: (alerting.last_reason as string | null | undefined) ?? null,
        last_dispatch_at: (alerting.last_dispatch_at as string | null | undefined) ?? null,
        last_dispatch_status: ((alerting.last_dispatch_status as string | undefined) === 'success' || (alerting.last_dispatch_status as string | undefined) === 'error')
            ? alerting.last_dispatch_status as 'success' | 'error'
            : 'idle',
        last_dispatch_http_status: typeof alerting.last_dispatch_http_status === 'number' ? alerting.last_dispatch_http_status as number : null,
        last_dispatch_error: (alerting.last_dispatch_error as string | null | undefined) ?? null,
        last_live_alert_signature: (alerting.last_live_alert_signature as string | null | undefined) ?? null,
    };
}

export async function setWhiteLabelAlertingConfig(input: {
    brandId: string;
    enabled: boolean;
    webhook_url: string;
    channel: string;
    changes_24h_threshold: number;
    notify_on_general_without_publish: boolean;
    reason?: string;
}): Promise<WhiteLabelAlertingConfig> {
    const nowIso = new Date().toISOString();
    const normalizedReason = (input.reason ?? '').trim();
    const current = await getWhiteLabelAlertingConfig(input.brandId);

    if (!normalizedReason) {
        throw new Error('reason_required_for_alerting_change');
    }

    const nextConfig: WhiteLabelAlertingConfig = {
        enabled: input.enabled,
        webhook_url: input.webhook_url.trim(),
        channel: input.channel.trim(),
        changes_24h_threshold: Math.max(1, Math.floor(input.changes_24h_threshold || 1)),
        notify_on_general_without_publish: input.notify_on_general_without_publish,
        updated_at: nowIso,
        last_reason: normalizedReason,
        last_dispatch_at: null,
        last_dispatch_status: 'idle',
        last_dispatch_http_status: null,
        last_dispatch_error: null,
        last_live_alert_signature: current.last_live_alert_signature,
    };

    if (!canUseRemoteWhiteLabel()) {
        MOCK_ALERTING_CONFIG[input.brandId] = nextConfig;
        return nextConfig;
    }

    const { data: currentSettings, error: currentError } = await supabase
        .from('brand_settings')
        .select('menu_config')
        .eq('brand_id', input.brandId)
        .single();

    if (currentError) {
        throw currentError;
    }

    const menuConfig = (currentSettings.menu_config as Record<string, unknown> | null) ?? {};
    const nextMenuConfig: Record<string, unknown> = {
        ...menuConfig,
        white_label_alerting: nextConfig,
    };

    const { error: updateError } = await supabase
        .from('brand_settings')
        .update({ menu_config: nextMenuConfig, updated_at: nowIso })
        .eq('brand_id', input.brandId);

    if (updateError) {
        throw updateError;
    }

    return nextConfig;
}

export async function getWhiteLabelAlertDispatchHistory(brandId: string): Promise<WhiteLabelAlertDispatchEntry[]> {
    if (!canUseRemoteWhiteLabel()) {
        return MOCK_ALERTING_HISTORY[brandId] ?? [];
    }

    const { data, error } = await supabase
        .from('brand_settings')
        .select('menu_config')
        .eq('brand_id', brandId)
        .single();

    if (error) {
        throw error;
    }

    const menuConfig = (data.menu_config as Record<string, unknown> | null) ?? {};
    const history = Array.isArray(menuConfig.white_label_alerting_history)
        ? menuConfig.white_label_alerting_history
        : [];

    return history.map((entry) => ({
        id: String((entry as Record<string, unknown>).id ?? ''),
        sent_at: String((entry as Record<string, unknown>).sent_at ?? ''),
        mode: ((entry as Record<string, unknown>).mode === 'live' ? 'live' : 'test'),
        status: ((entry as Record<string, unknown>).status === 'error' ? 'error' : 'success'),
        http_status: typeof (entry as Record<string, unknown>).http_status === 'number'
            ? ((entry as Record<string, unknown>).http_status as number)
            : null,
        error: ((entry as Record<string, unknown>).error as string | null | undefined) ?? null,
        attempts: typeof (entry as Record<string, unknown>).attempts === 'number'
            ? ((entry as Record<string, unknown>).attempts as number)
            : 1,
        channel: String((entry as Record<string, unknown>).channel ?? ''),
    }));
}

export async function dispatchWhiteLabelAlertTest(input: {
    brandId: string;
    payload: Record<string, unknown>;
    reason?: string;
}): Promise<{ config: WhiteLabelAlertingConfig; history: WhiteLabelAlertDispatchEntry[] }> {
    const nowIso = new Date().toISOString();
    const normalizedReason = (input.reason ?? '').trim();

    if (!normalizedReason) {
        throw new Error('reason_required_for_alert_test');
    }

    const currentConfig = await getWhiteLabelAlertingConfig(input.brandId);

    if (!currentConfig.enabled) {
        throw new Error('alerting_not_enabled');
    }

    if (!currentConfig.webhook_url) {
        throw new Error('webhook_url_required');
    }

    let nextDispatchStatus: WhiteLabelAlertingConfig['last_dispatch_status'] = 'success';
    let nextDispatchHttpStatus: number | null = 200;
    let nextDispatchError: string | null = null;
    let attempts = 1;
    let nextHistory: WhiteLabelAlertDispatchEntry[] = [];

    if (!canUseRemoteWhiteLabel()) {
        const nextEntry = buildDispatchEntry({
            sentAt: nowIso,
            mode: 'test',
            status: 'success',
            httpStatus: 200,
            error: null,
            attempts: 1,
            channel: currentConfig.channel,
        });
        const nextMockConfig: WhiteLabelAlertingConfig = {
            ...currentConfig,
            updated_at: nowIso,
            last_reason: normalizedReason,
            last_dispatch_at: nowIso,
            last_dispatch_status: 'success',
            last_dispatch_http_status: 200,
            last_dispatch_error: null,
        };
        MOCK_ALERTING_CONFIG[input.brandId] = nextMockConfig;
        MOCK_ALERTING_HISTORY[input.brandId] = mergeDispatchHistory(MOCK_ALERTING_HISTORY[input.brandId] ?? [], nextEntry);
        return { config: nextMockConfig, history: MOCK_ALERTING_HISTORY[input.brandId] };
    }

    for (let attempt = 1; attempt <= 3; attempt += 1) {
        attempts = attempt;
        try {
            const response = await fetch(currentConfig.webhook_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(input.payload),
            });

            nextDispatchStatus = response.ok ? 'success' : 'error';
            nextDispatchHttpStatus = response.status;
            nextDispatchError = response.ok ? null : `Webhook respondeu com status ${response.status}`;

            if (response.ok) {
                break;
            }
        } catch (error) {
            nextDispatchStatus = 'error';
            nextDispatchHttpStatus = null;
            nextDispatchError = error instanceof Error ? error.message : 'Erro desconhecido ao enviar webhook';
        }

        if (attempt < 3) {
            await wait(500 * 2 ** (attempt - 1));
        }
    }

    const nextEntry = buildDispatchEntry({
        sentAt: nowIso,
        mode: 'test',
        status: nextDispatchStatus === 'success' ? 'success' : 'error',
        httpStatus: nextDispatchHttpStatus,
        error: nextDispatchError,
        attempts,
        channel: currentConfig.channel,
    });

    const currentHistory = await getWhiteLabelAlertDispatchHistory(input.brandId);
    nextHistory = mergeDispatchHistory(currentHistory, nextEntry);

    const nextConfig: WhiteLabelAlertingConfig = {
        ...currentConfig,
        updated_at: nowIso,
        last_reason: normalizedReason,
        last_dispatch_at: nowIso,
        last_dispatch_status: nextDispatchStatus,
        last_dispatch_http_status: nextDispatchHttpStatus,
        last_dispatch_error: nextDispatchError,
    };

    const { data: currentSettings, error: currentError } = await supabase
        .from('brand_settings')
        .select('menu_config')
        .eq('brand_id', input.brandId)
        .single();

    if (currentError) {
        throw currentError;
    }

    const menuConfig = (currentSettings.menu_config as Record<string, unknown> | null) ?? {};
    const nextMenuConfig: Record<string, unknown> = {
        ...menuConfig,
        white_label_alerting: nextConfig,
        white_label_alerting_history: nextHistory,
    };

    const { error: updateError } = await supabase
        .from('brand_settings')
        .update({ menu_config: nextMenuConfig, updated_at: nowIso })
        .eq('brand_id', input.brandId);

    if (updateError) {
        throw updateError;
    }

    return { config: nextConfig, history: nextHistory };
}

export async function dispatchWhiteLabelOperationalAlerts(input: {
    brandId: string;
    payload: Record<string, unknown>;
    alertSignature: string;
    reason?: string;
}): Promise<{ config: WhiteLabelAlertingConfig; history: WhiteLabelAlertDispatchEntry[] }> {
    const nowIso = new Date().toISOString();
    const normalizedReason = (input.reason ?? '').trim();

    if (!normalizedReason) {
        throw new Error('reason_required_for_live_alert_dispatch');
    }

    const currentConfig = await getWhiteLabelAlertingConfig(input.brandId);
    if (!currentConfig.enabled) {
        throw new Error('alerting_not_enabled');
    }
    if (!currentConfig.webhook_url) {
        throw new Error('webhook_url_required');
    }
    if (!input.alertSignature.trim()) {
        throw new Error('alert_signature_required');
    }

    let nextDispatchStatus: WhiteLabelAlertingConfig['last_dispatch_status'] = 'success';
    let nextDispatchHttpStatus: number | null = 200;
    let nextDispatchError: string | null = null;
    let attempts = 1;

    if (!canUseRemoteWhiteLabel()) {
        const nextEntry = buildDispatchEntry({
            sentAt: nowIso,
            mode: 'live',
            status: 'success',
            httpStatus: 200,
            error: null,
            attempts: 1,
            channel: currentConfig.channel,
        });
        const nextMockConfig: WhiteLabelAlertingConfig = {
            ...currentConfig,
            updated_at: nowIso,
            last_reason: normalizedReason,
            last_dispatch_at: nowIso,
            last_dispatch_status: 'success',
            last_dispatch_http_status: 200,
            last_dispatch_error: null,
            last_live_alert_signature: input.alertSignature,
        };
        MOCK_ALERTING_CONFIG[input.brandId] = nextMockConfig;
        MOCK_ALERTING_HISTORY[input.brandId] = mergeDispatchHistory(MOCK_ALERTING_HISTORY[input.brandId] ?? [], nextEntry);
        return { config: nextMockConfig, history: MOCK_ALERTING_HISTORY[input.brandId] };
    }

    for (let attempt = 1; attempt <= 3; attempt += 1) {
        attempts = attempt;
        try {
            const response = await fetch(currentConfig.webhook_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(input.payload),
            });

            nextDispatchStatus = response.ok ? 'success' : 'error';
            nextDispatchHttpStatus = response.status;
            nextDispatchError = response.ok ? null : `Webhook respondeu com status ${response.status}`;

            if (response.ok) {
                break;
            }
        } catch (error) {
            nextDispatchStatus = 'error';
            nextDispatchHttpStatus = null;
            nextDispatchError = error instanceof Error ? error.message : 'Erro desconhecido ao enviar alerta operacional';
        }

        if (attempt < 3) {
            await wait(500 * 2 ** (attempt - 1));
        }
    }

    const nextEntry = buildDispatchEntry({
        sentAt: nowIso,
        mode: 'live',
        status: nextDispatchStatus === 'success' ? 'success' : 'error',
        httpStatus: nextDispatchHttpStatus,
        error: nextDispatchError,
        attempts,
        channel: currentConfig.channel,
    });

    const currentHistory = await getWhiteLabelAlertDispatchHistory(input.brandId);
    const nextHistory = mergeDispatchHistory(currentHistory, nextEntry);

    const nextConfig: WhiteLabelAlertingConfig = {
        ...currentConfig,
        updated_at: nowIso,
        last_reason: normalizedReason,
        last_dispatch_at: nowIso,
        last_dispatch_status: nextDispatchStatus,
        last_dispatch_http_status: nextDispatchHttpStatus,
        last_dispatch_error: nextDispatchError,
        last_live_alert_signature: input.alertSignature,
    };

    const { data: currentSettings, error: currentError } = await supabase
        .from('brand_settings')
        .select('menu_config')
        .eq('brand_id', input.brandId)
        .single();

    if (currentError) {
        throw currentError;
    }

    const menuConfig = (currentSettings.menu_config as Record<string, unknown> | null) ?? {};
    const nextMenuConfig: Record<string, unknown> = {
        ...menuConfig,
        white_label_alerting: nextConfig,
        white_label_alerting_history: nextHistory,
    };

    const { error: updateError } = await supabase
        .from('brand_settings')
        .update({ menu_config: nextMenuConfig, updated_at: nowIso })
        .eq('brand_id', input.brandId);

    if (updateError) {
        throw updateError;
    }

    return { config: nextConfig, history: nextHistory };
}

export async function getWhiteLabelOperationalTimeline(brandId: string, limit: number = 50): Promise<WhiteLabelOperationalEvent[]> {
    const events: WhiteLabelOperationalEvent[] = [];

    // Dispatch history events (alert_dispatch)
    const dispatchHistory = await getWhiteLabelAlertDispatchHistory(brandId);
    for (const entry of dispatchHistory) {
        events.push({
            id: `dispatch-${entry.id}`,
            type: 'alert_dispatch',
            occurred_at: entry.sent_at,
            reason: null,
            data: {
                dispatch: {
                    mode: entry.mode,
                    status: entry.status,
                    channel: entry.channel,
                },
            },
        });
    }

    // Audit history events (flag_change)
    try {
        const audit = await listWhiteLabelAudit(brandId, 100);
        for (const entry of audit) {
            events.push({
                id: `audit-${entry.id}`,
                type: 'flag_change',
                occurred_at: entry.changed_at,
                reason: entry.reason,
                data: {
                    flag: {
                        feature_key: entry.feature_key,
                        enabled_before: entry.enabled_before,
                        enabled_after: entry.enabled_after,
                    },
                },
            });
        }
    } catch (err) {
        console.error('[getWhiteLabelOperationalTimeline] Failed to fetch audit history:', err);
    }

    // Rollout history (if available via config changes)
    try {
        const rolloutConfig = await getWhiteLabelRolloutConfig(brandId);
        if (rolloutConfig.last_changed_at) {
            events.push({
                id: `rollout-${rolloutConfig.wave}-${rolloutConfig.last_changed_at}`,
                type: 'rollout_wave',
                occurred_at: rolloutConfig.last_changed_at,
                reason: rolloutConfig.last_reason,
                data: {
                    rollout: {
                        wave_before: 'pilot',
                        wave_after: rolloutConfig.wave,
                    },
                },
            });
        }
    } catch (err) {
        console.error('[getWhiteLabelOperationalTimeline] Failed to fetch rollout config:', err);
    }

    // Publication events
    try {
        const publicationState = await getWhiteLabelPublicationState(brandId);
        if (publicationState.published_at) {
            events.push({
                id: `publication-${publicationState.version}`,
                type: 'publication',
                occurred_at: publicationState.published_at,
                reason: null,
                data: {
                    publication: {
                        version: publicationState.version,
                    },
                },
            });
        }
    } catch (err) {
        console.error('[getWhiteLabelOperationalTimeline] Failed to fetch publication state:', err);
    }

    // Sort by occurred_at descending (newest first)
    events.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

    return events.slice(0, limit);
}

export async function getWhiteLabelHealthCheck(brandId: string): Promise<WhiteLabelHealthCheck> {
    const checks: WhiteLabelHealthCheck['checks'] = [];
    let hasWarning = false;
    let hasCritical = false;

    try {
        const features = await getWhiteLabelFeatures(brandId, ['menu.music', 'hero.parallax', 'content.offline']);
        const enabledFlags = Object.values(features).filter((f) => f.enabled).length;

        if (enabledFlags === 0) {
            checks.push({
                name: 'Feature Flags',
                status: 'warn',
                message: 'Nenhuma feature flag está habilitada para esta marca.',
            });
            hasWarning = true;
        } else {
            checks.push({
                name: 'Feature Flags',
                status: 'pass',
                message: `${enabledFlags} flag(s) ativa(s)`,
            });
        }
    } catch (err) {
        checks.push({
            name: 'Feature Flags',
            status: 'fail',
            message: 'Falha ao carregar feature flags.',
        });
        hasCritical = true;
    }

    try {
        const rolloutConfig = await getWhiteLabelRolloutConfig(brandId);
        const publicationState = await getWhiteLabelPublicationState(brandId);

        if (rolloutConfig.wave === 'general' && !publicationState.published_at) {
            checks.push({
                name: 'Rollout & Publicação',
                status: 'fail',
                message: 'Rollout em geral sem publicação registrada.',
            });
            hasCritical = true;
        } else if (rolloutConfig.wave === 'general' && publicationState.published_at) {
            checks.push({
                name: 'Rollout & Publicação',
                status: 'pass',
                message: `Rollout ${rolloutConfig.wave} com publicação v${publicationState.version}`,
            });
        } else {
            checks.push({
                name: 'Rollout & Publicação',
                status: 'pass',
                message: `Rollout ${rolloutConfig.wave} ativo`,
            });
        }
    } catch (err) {
        checks.push({
            name: 'Rollout & Publicação',
            status: 'fail',
            message: 'Falha ao carregar configuração de rollout.',
        });
        hasCritical = true;
    }

    try {
        const alertingConfig = await getWhiteLabelAlertingConfig(brandId);

        if (alertingConfig.enabled) {
            if (!alertingConfig.webhook_url) {
                checks.push({
                    name: 'Alertas Externos',
                    status: 'fail',
                    message: 'Alertas habilitados, mas webhook_url não configurada.',
                });
                hasCritical = true;
            } else if (alertingConfig.last_dispatch_status === 'error') {
                checks.push({
                    name: 'Alertas Externos',
                    status: 'warn',
                    message: `Último dispatch falhou: ${alertingConfig.last_dispatch_error || 'erro desconhecido'}`,
                });
                hasWarning = true;
            } else {
                checks.push({
                    name: 'Alertas Externos',
                    status: 'pass',
                    message: `Webhook configurado para ${alertingConfig.channel}`,
                });
            }
        } else {
            checks.push({
                name: 'Alertas Externos',
                status: 'pass',
                message: 'Alertas externos desabilitados (normal)',
            });
        }
    } catch (err) {
        checks.push({
            name: 'Alertas Externos',
            status: 'fail',
            message: 'Falha ao carregar configuração de alertas.',
        });
        hasCritical = true;
    }

    try {
        const metrics = await getWhiteLabelRolloutMetrics(brandId);

        if (metrics.enabled_flags === 0 && metrics.total_changes > 0) {
            checks.push({
                name: 'Integridade de Métricas',
                status: 'warn',
                message: 'Mudanças registradas mas nenhuma flag ativa.',
            });
            hasWarning = true;
        } else {
            checks.push({
                name: 'Integridade de Métricas',
                status: 'pass',
                message: `${metrics.total_changes} mudança(s) total, ${metrics.changes_24h} nas últimas 24h`,
            });
        }
    } catch (err) {
        checks.push({
            name: 'Integridade de Métricas',
            status: 'fail',
            message: 'Falha ao carregar métricas.',
        });
        hasCritical = true;
    }

    const status: WhiteLabelHealthCheck['status'] = hasCritical ? 'critical' : hasWarning ? 'warning' : 'healthy';

    return {
        status,
        checks,
        timestamp: new Date().toISOString(),
    };
}

export function resolveHeroParallaxMode(feature: WhiteLabelFeatureState | undefined): HeroParallaxMode {
    const mode = (feature?.config?.mode as string | undefined) ?? 'off';
    if (mode === 'subtle' || mode === 'standard' || mode === 'off') {
        return mode;
    }
    return feature?.enabled ? 'subtle' : 'off';
}
