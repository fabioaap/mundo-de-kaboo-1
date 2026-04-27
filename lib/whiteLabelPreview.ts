export type WhiteLabelBrandId = 'kaboo' | 'central-coruja';

export type HeroParallaxMode = 'off' | 'subtle' | 'standard';

export interface WhiteLabelBrandPreviewConfig {
    id: WhiteLabelBrandId;
    name: string;
    description: string;
    heroParallaxEnabled: boolean;
    heroParallaxMode: HeroParallaxMode;
}

export interface WhiteLabelPreviewSettings {
    activeBrandId: WhiteLabelBrandId;
    previewEnabled: boolean;
    brands: Record<WhiteLabelBrandId, WhiteLabelBrandPreviewConfig>;
}

const STORAGE_KEY = 'kaboo:white-label-preview-settings';
const CHANGE_EVENT = 'kaboo:white-label-preview-change';

const DEFAULT_SETTINGS: WhiteLabelPreviewSettings = {
    activeBrandId: 'kaboo',
    previewEnabled: false,
    brands: {
        kaboo: {
            id: 'kaboo',
            name: 'Mundo de Kaboo',
            description: 'Experiência padrão da marca Kaboo.',
            heroParallaxEnabled: false,
            heroParallaxMode: 'off',
        },
        'central-coruja': {
            id: 'central-coruja',
            name: 'Central Coruja',
            description: 'Preview visual do white label com hero parallax.',
            heroParallaxEnabled: true,
            heroParallaxMode: 'subtle',
        },
    },
};

const isBrowser = typeof window !== 'undefined';

const notifyChange = () => {
    if (!isBrowser) {
        return;
    }

    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
};

const mergeSettings = (raw?: Partial<WhiteLabelPreviewSettings> | null): WhiteLabelPreviewSettings => {
    const activeBrandId = raw?.activeBrandId === 'central-coruja' ? 'central-coruja' : 'kaboo';
    const previewEnabled = raw?.previewEnabled === true;

    return {
        activeBrandId,
        previewEnabled,
        brands: {
            kaboo: {
                ...DEFAULT_SETTINGS.brands.kaboo,
                ...(raw?.brands?.kaboo ?? {}),
                id: 'kaboo',
            },
            'central-coruja': {
                ...DEFAULT_SETTINGS.brands['central-coruja'],
                ...(raw?.brands?.['central-coruja'] ?? {}),
                id: 'central-coruja',
            },
        },
    };
};

export const getWhiteLabelPreviewSettings = (): WhiteLabelPreviewSettings => {
    if (!isBrowser) {
        return DEFAULT_SETTINGS;
    }

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return DEFAULT_SETTINGS;
        }

        return mergeSettings(JSON.parse(raw) as Partial<WhiteLabelPreviewSettings>);
    } catch (error) {
        console.warn('Failed to load white label preview settings:', error);
        return DEFAULT_SETTINGS;
    }
};

export const saveWhiteLabelPreviewSettings = (settings: WhiteLabelPreviewSettings) => {
    if (!isBrowser) {
        return;
    }

    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        notifyChange();
    } catch (error) {
        console.warn('Failed to save white label preview settings:', error);
    }
};

export const setActiveWhiteLabelBrand = (brandId: WhiteLabelBrandId) => {
    const settings = getWhiteLabelPreviewSettings();
    if (brandId === 'central-coruja') {
        saveWhiteLabelPreviewSettings({ ...settings, activeBrandId: brandId });
        return;
    }

    // Kaboo remains immutable baseline: disable preview when switching back.
    saveWhiteLabelPreviewSettings({ ...settings, activeBrandId: 'kaboo', previewEnabled: false });
};

export const setWhiteLabelPreviewEnabled = (previewEnabled: boolean) => {
    const settings = getWhiteLabelPreviewSettings();
    saveWhiteLabelPreviewSettings({ ...settings, previewEnabled });
};

export const resetWhiteLabelPreview = () => {
    saveWhiteLabelPreviewSettings(DEFAULT_SETTINGS);
};

export const getEffectiveWhiteLabelPreviewBrand = (settings: WhiteLabelPreviewSettings): WhiteLabelBrandPreviewConfig => {
    if (!settings.previewEnabled) {
        return settings.brands.kaboo;
    }

    return settings.brands[settings.activeBrandId] ?? settings.brands.kaboo;
};

export const updateWhiteLabelBrandPreview = (
    brandId: WhiteLabelBrandId,
    patch: Partial<Pick<WhiteLabelBrandPreviewConfig, 'heroParallaxEnabled' | 'heroParallaxMode'>>,
) => {
    if (brandId !== 'central-coruja') {
        return;
    }

    const settings = getWhiteLabelPreviewSettings();
    saveWhiteLabelPreviewSettings({
        ...settings,
        brands: {
            ...settings.brands,
            [brandId]: {
                ...settings.brands[brandId],
                ...patch,
            },
        },
    });
};

export const subscribeToWhiteLabelPreviewSettings = (callback: () => void) => {
    if (!isBrowser) {
        return () => undefined;
    }

    const handleStorage = (event: StorageEvent) => {
        if (!event.key || event.key === STORAGE_KEY) {
            callback();
        }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(CHANGE_EVENT, callback as EventListener);

    return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener(CHANGE_EVENT, callback as EventListener);
    };
};
