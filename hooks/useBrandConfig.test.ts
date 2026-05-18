import { beforeAll, describe, expect, it, vi } from 'vitest';
import { resolveBrandSlugFromPathname } from './brandSlug';

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

describe('buildMockBootstrap', () => {
    it('keeps the music menu enabled for Central Coruja', async () => {
        const { buildMockBootstrap } = await import('./useBrandConfig');
        const bootstrap = buildMockBootstrap('central-coruja');

        expect(bootstrap.features['menu.music']?.enabled).toBe(true);
        expect(bootstrap.menu.find((item) => item.key === 'music')?.enabled).toBe(true);
    });
});
