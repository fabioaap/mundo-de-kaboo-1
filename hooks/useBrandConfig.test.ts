import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveBrandSlugFromPathname, resolveBrandSlugFromSearch } from './brandSlug';

const createStorageMock = (): Storage => {
    const store = new Map<string, string>();

    return {
        get length() {
            return store.size;
        },
        clear: () => store.clear(),
        getItem: (key: string) => store.get(key) ?? null,
        key: (index: number) => Array.from(store.keys())[index] ?? null,
        removeItem: (key: string) => {
            store.delete(key);
        },
        setItem: (key: string, value: string) => {
            store.set(key, value);
        },
    };
};

beforeAll(() => {
    vi.stubGlobal('sessionStorage', createStorageMock());
    vi.stubGlobal('localStorage', createStorageMock());
});

beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.stubGlobal('window', {
        location: {
            search: '',
            pathname: '/',
            hostname: 'mundodekaboo.educacross.dev',
        },
        localStorage,
        sessionStorage,
    } as unknown as Window & typeof globalThis);
});

describe('resolveBrandSlugFromPathname', () => {
    it('returns central-coruja for coruja preview paths', () => {
        expect(resolveBrandSlugFromPathname('/coruja-lab/')).toBe('central-coruja');
        expect(resolveBrandSlugFromPathname('/coruja-qa-20260429/')).toBe('central-coruja');
        expect(resolveBrandSlugFromPathname('/preview/central-coruja/')).toBe('central-coruja');
        expect(resolveBrandSlugFromPathname('/coruja/home')).toBe('central-coruja');
    });

    it('returns null for unrelated paths', () => {
        expect(resolveBrandSlugFromPathname('/')).toBeNull();
        expect(resolveBrandSlugFromPathname('/kaboo/')).toBeNull();
        expect(resolveBrandSlugFromPathname('/admin/white-label')).toBeNull();
    });
});

describe('resolveBrandSlugFromSearch', () => {
    it('returns supported brands from query parameters', () => {
        expect(resolveBrandSlugFromSearch('?brand=central-coruja')).toBe('central-coruja');
        expect(resolveBrandSlugFromSearch('?brand=kaboo')).toBe('kaboo');
    });

    it('returns null for unsupported query parameters', () => {
        expect(resolveBrandSlugFromSearch('?brand=outro')).toBeNull();
        expect(resolveBrandSlugFromSearch('')).toBeNull();
    });
});

describe('resolveBrandSlug', () => {
    it('prefers an explicit brand query over persisted white-label preview', async () => {
        localStorage.setItem('kaboo:white-label-preview-settings', JSON.stringify({
            activeBrandId: 'central-coruja',
            previewEnabled: true,
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
                    description: 'Preview visual do white label da Central Coruja.',
                    heroParallaxEnabled: false,
                    heroParallaxMode: 'off',
                },
            },
        }));

        vi.stubGlobal('window', {
            location: {
                search: '?brand=kaboo',
                pathname: '/',
                hostname: 'mundodekaboo.educacross.dev',
            },
            localStorage,
            sessionStorage,
        } as unknown as Window & typeof globalThis);

        const { resolveBrandSlug } = await import('./useBrandConfig');

        expect(resolveBrandSlug()).toBe('kaboo');
    });
});

describe('buildMockBootstrap', () => {
    it('keeps the music menu enabled for Central Coruja', async () => {
        const { buildMockBootstrap } = await import('./useBrandConfig');
        const bootstrap = buildMockBootstrap('central-coruja');

        expect(bootstrap.features['menu.music']?.enabled).toBe(true);
        expect(bootstrap.menu.find((item) => item.key === 'music')?.enabled).toBe(true);
    });
});
