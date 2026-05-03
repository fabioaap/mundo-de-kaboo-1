import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getMockBrandSettingsOverride } from './whiteLabelBranding';

const STORAGE_KEY = 'kaboo:mock-brand-settings-overrides';

function createMockStorage() {
    const store = new Map<string, string>();

    return {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
            store.set(key, value);
        },
        removeItem: (key: string) => {
            store.delete(key);
        },
        clear: () => {
            store.clear();
        },
    };
}

describe('getMockBrandSettingsOverride', () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

    beforeEach(() => {
        Object.defineProperty(globalThis, 'window', {
            value: { localStorage: createMockStorage() },
            configurable: true,
            writable: true,
        });
    });

    afterEach(() => {
        if (originalWindow) {
            Object.defineProperty(globalThis, 'window', originalWindow);
            return;
        }

        Reflect.deleteProperty(globalThis, 'window');
    });

    it('migrates the legacy Central Coruja override to the new baseline identity', () => {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
            'mock-central-coruja': {
                logo_url: '/central-coruja-logo.svg',
                primary_color: '#1B5E20',
                light_color: '#388E3C',
                bg_color: '#F1F8E9',
                accent_color: '#F9A825',
            },
        }));

        expect(getMockBrandSettingsOverride('mock-central-coruja')).toMatchObject({
            logo_url: '/central-coruja-logo.png',
            primary_color: '#0C1A34',
            light_color: '#5D1E76',
            bg_color: '#F8F4FF',
            accent_color: '#EA9A3B',
        });

        expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')).toMatchObject({
            'mock-central-coruja': {
                logo_url: '/central-coruja-logo.png',
                primary_color: '#0C1A34',
                light_color: '#5D1E76',
                bg_color: '#F8F4FF',
                accent_color: '#EA9A3B',
            },
        });
    });

    it('preserves non-legacy custom Central Coruja values while filling the new baseline fields', () => {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
            'mock-central-coruja': {
                primary_color: '#111827',
                accent_color: '#FFD166',
                logo_url: '/custom-coruja-logo.png',
            },
        }));

        expect(getMockBrandSettingsOverride('mock-central-coruja')).toMatchObject({
            logo_url: '/custom-coruja-logo.png',
            primary_color: '#111827',
            light_color: '#5D1E76',
            bg_color: '#F8F4FF',
            accent_color: '#FFD166',
        });
    });
});
