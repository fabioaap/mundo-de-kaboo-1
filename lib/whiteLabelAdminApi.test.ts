import { beforeAll, describe, expect, it, vi } from 'vitest';

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

describe('getWhiteLabelFeatures', () => {
    it('keeps music enabled by default for Central Coruja mock data', async () => {
        const { getWhiteLabelFeatures } = await import('./whiteLabelAdminApi');
        const features = await getWhiteLabelFeatures('mock-central-coruja', ['menu.music']);

        expect(features['menu.music']?.enabled).toBe(true);
    });
});
