export interface BrandVisualIdentity {
    login_background_url: string | null;
    home_hero_image_url: string | null;
}

export interface BrandDesignTokens {
    green_color: string | null;
    radius_xl: string | null;
    radius_2xl: string | null;
    radius_3xl: string | null;
}

export interface MockBrandSettingsOverride {
    display_name?: string;
    logo_url?: string | null;
    primary_color?: string | null;
    light_color?: string | null;
    bg_color?: string | null;
    accent_color?: string | null;
    font_family?: string | null;
    green_color?: string | null;
    radius_xl?: string | null;
    radius_2xl?: string | null;
    radius_3xl?: string | null;
    login_background_url?: string | null;
    home_hero_image_url?: string | null;
}

const MOCK_BRAND_SETTINGS_STORAGE_KEY = 'kaboo:mock-brand-settings-overrides';
const LEGACY_CENTRAL_CORUJA_OVERRIDE = {
    logo_url: '/central-coruja-logo.svg',
    primary_color: '#1B5E20',
    light_color: '#388E3C',
    bg_color: '#F1F8E9',
    accent_color: '#F9A825',
} as const;
const CURRENT_CENTRAL_CORUJA_OVERRIDE = {
    logo_url: '/central-coruja-logo.png',
    primary_color: '#0C1A34',
    light_color: '#5D1E76',
    bg_color: '#F8F4FF',
    accent_color: '#EA9A3B',
} as const;
type CentralCorujaOverrideField = keyof typeof CURRENT_CENTRAL_CORUJA_OVERRIDE;

function normalizeNullableString(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractVisualIdentityRecord(menuConfig: Record<string, unknown> | null | undefined): Record<string, unknown> {
    return isPlainRecord(menuConfig?.visual_identity)
        ? menuConfig.visual_identity
        : {};
}

export function extractBrandVisualIdentity(menuConfig: Record<string, unknown> | null | undefined): BrandVisualIdentity {
    const visualIdentity = extractVisualIdentityRecord(menuConfig);

    return {
        login_background_url: normalizeNullableString(visualIdentity.login_background_url),
        home_hero_image_url: normalizeNullableString(visualIdentity.home_hero_image_url),
    };
}

export function extractBrandDesignTokens(menuConfig: Record<string, unknown> | null | undefined): BrandDesignTokens {
    const visualIdentity = extractVisualIdentityRecord(menuConfig);
    const designTokens = isPlainRecord(visualIdentity.design_tokens)
        ? visualIdentity.design_tokens
        : {};

    return {
        green_color: normalizeNullableString(designTokens.green_color),
        radius_xl: normalizeNullableString(designTokens.radius_xl),
        radius_2xl: normalizeNullableString(designTokens.radius_2xl),
        radius_3xl: normalizeNullableString(designTokens.radius_3xl),
    };
}

export function mergeBrandVisualIdentity(
    menuConfig: Record<string, unknown> | null | undefined,
    identity: Partial<BrandVisualIdentity>,
): Record<string, unknown> {
    const visualIdentity = extractVisualIdentityRecord(menuConfig);
    const nextIdentity = {
        ...extractBrandVisualIdentity(menuConfig),
        ...identity,
    };

    return {
        ...(isPlainRecord(menuConfig) ? menuConfig : {}),
        visual_identity: {
            ...visualIdentity,
            ...nextIdentity,
        },
    };
}

export function mergeBrandDesignTokens(
    menuConfig: Record<string, unknown> | null | undefined,
    tokens: Partial<BrandDesignTokens>,
): Record<string, unknown> {
    const visualIdentity = extractVisualIdentityRecord(menuConfig);
    const nextTokens = {
        ...extractBrandDesignTokens(menuConfig),
        ...tokens,
    };

    return {
        ...(isPlainRecord(menuConfig) ? menuConfig : {}),
        visual_identity: {
            ...visualIdentity,
            design_tokens: nextTokens,
        },
    };
}

function normalizeMockOverride(override: MockBrandSettingsOverride): MockBrandSettingsOverride {
    const normalizedDisplayName = typeof override.display_name === 'string' ? override.display_name.trim() : undefined;

    return {
        ...(normalizedDisplayName ? { display_name: normalizedDisplayName } : {}),
        ...(override.logo_url !== undefined ? { logo_url: normalizeNullableString(override.logo_url) } : {}),
        ...(override.primary_color !== undefined ? { primary_color: normalizeNullableString(override.primary_color) } : {}),
        ...(override.light_color !== undefined ? { light_color: normalizeNullableString(override.light_color) } : {}),
        ...(override.bg_color !== undefined ? { bg_color: normalizeNullableString(override.bg_color) } : {}),
        ...(override.accent_color !== undefined ? { accent_color: normalizeNullableString(override.accent_color) } : {}),
        ...(override.font_family !== undefined ? { font_family: normalizeNullableString(override.font_family) } : {}),
        ...(override.green_color !== undefined ? { green_color: normalizeNullableString(override.green_color) } : {}),
        ...(override.radius_xl !== undefined ? { radius_xl: normalizeNullableString(override.radius_xl) } : {}),
        ...(override.radius_2xl !== undefined ? { radius_2xl: normalizeNullableString(override.radius_2xl) } : {}),
        ...(override.radius_3xl !== undefined ? { radius_3xl: normalizeNullableString(override.radius_3xl) } : {}),
        ...(override.login_background_url !== undefined ? { login_background_url: normalizeNullableString(override.login_background_url) } : {}),
        ...(override.home_hero_image_url !== undefined ? { home_hero_image_url: normalizeNullableString(override.home_hero_image_url) } : {}),
    };
}

function migrateCentralCorujaOverride(override: MockBrandSettingsOverride): { override: MockBrandSettingsOverride; changed: boolean } {
    const nextOverride: MockBrandSettingsOverride = { ...override };
    let changed = false;

    (Object.keys(CURRENT_CENTRAL_CORUJA_OVERRIDE) as CentralCorujaOverrideField[]).forEach((field) => {
        const currentValue = override[field];
        const legacyValue = LEGACY_CENTRAL_CORUJA_OVERRIDE[field];
        const currentBaselineValue = CURRENT_CENTRAL_CORUJA_OVERRIDE[field];

        if (currentValue == null || currentValue === legacyValue) {
            if (currentValue !== currentBaselineValue) {
                nextOverride[field] = currentBaselineValue;
                changed = true;
            }
        }
    });

    return {
        override: changed ? normalizeMockOverride(nextOverride) : override,
        changed,
    };
}

function readAllMockBrandSettingsOverrides(): Record<string, MockBrandSettingsOverride> {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const raw = window.localStorage.getItem(MOCK_BRAND_SETTINGS_STORAGE_KEY);
        if (!raw) {
            return {};
        }

        const parsed = JSON.parse(raw) as Record<string, MockBrandSettingsOverride>;
        if (!isPlainRecord(parsed)) {
            return {};
        }

        let changed = false;
        const normalizedOverrides = Object.entries(parsed).reduce<Record<string, MockBrandSettingsOverride>>((accumulator, [brandId, override]) => {
            const normalizedOverride = normalizeMockOverride(isPlainRecord(override) ? override : {});

            if (brandId === 'mock-central-coruja') {
                const migration = migrateCentralCorujaOverride(normalizedOverride);
                accumulator[brandId] = migration.override;
                changed = changed || migration.changed;
                return accumulator;
            }

            accumulator[brandId] = normalizedOverride;
            return accumulator;
        }, {});

        if (changed) {
            window.localStorage.setItem(MOCK_BRAND_SETTINGS_STORAGE_KEY, JSON.stringify(normalizedOverrides));
        }

        return normalizedOverrides;
    } catch {
        return {};
    }
}

export function getMockBrandSettingsOverride(brandId: string): MockBrandSettingsOverride | null {
    return readAllMockBrandSettingsOverrides()[brandId] ?? null;
}

export function writeMockBrandSettingsOverride(
    brandId: string,
    override: MockBrandSettingsOverride,
): MockBrandSettingsOverride {
    const currentOverrides = readAllMockBrandSettingsOverrides();
    const nextOverride = {
        ...(currentOverrides[brandId] ?? {}),
        ...normalizeMockOverride(override),
    };

    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(
                MOCK_BRAND_SETTINGS_STORAGE_KEY,
                JSON.stringify({
                    ...currentOverrides,
                    [brandId]: nextOverride,
                }),
            );
        } catch {
            // localStorage indisponível; segue sem persistência local.
        }
    }

    return nextOverride;
}
