export interface BrandVisualIdentity {
    login_background_url: string | null;
    home_hero_image_url: string | null;
}

export interface MockBrandSettingsOverride {
    display_name?: string;
    logo_url?: string | null;
    primary_color?: string | null;
    light_color?: string | null;
    bg_color?: string | null;
    accent_color?: string | null;
    font_family?: string | null;
    login_background_url?: string | null;
    home_hero_image_url?: string | null;
}

const MOCK_BRAND_SETTINGS_STORAGE_KEY = 'kaboo:mock-brand-settings-overrides';

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

export function extractBrandVisualIdentity(menuConfig: Record<string, unknown> | null | undefined): BrandVisualIdentity {
    const visualIdentity = isPlainRecord(menuConfig?.visual_identity)
        ? menuConfig.visual_identity
        : {};

    return {
        login_background_url: normalizeNullableString(visualIdentity.login_background_url),
        home_hero_image_url: normalizeNullableString(visualIdentity.home_hero_image_url),
    };
}

export function mergeBrandVisualIdentity(
    menuConfig: Record<string, unknown> | null | undefined,
    identity: Partial<BrandVisualIdentity>,
): Record<string, unknown> {
    const nextIdentity = {
        ...extractBrandVisualIdentity(menuConfig),
        ...identity,
    };

    return {
        ...(isPlainRecord(menuConfig) ? menuConfig : {}),
        visual_identity: nextIdentity,
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
        ...(override.login_background_url !== undefined ? { login_background_url: normalizeNullableString(override.login_background_url) } : {}),
        ...(override.home_hero_image_url !== undefined ? { home_hero_image_url: normalizeNullableString(override.home_hero_image_url) } : {}),
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

        return Object.entries(parsed).reduce<Record<string, MockBrandSettingsOverride>>((accumulator, [brandId, override]) => {
            accumulator[brandId] = normalizeMockOverride(isPlainRecord(override) ? override : {});
            return accumulator;
        }, {});
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