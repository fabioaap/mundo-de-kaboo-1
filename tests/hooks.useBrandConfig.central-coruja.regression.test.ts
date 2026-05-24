import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('buildMockBootstrap Central Coruja books menu baseline', () => {
  it('keeps Livros e Coleções enabled in the bootstrap menu and feature flags', async () => {
    const { buildMockBootstrap } = await import('../hooks/useBrandConfig');

    const bootstrap = buildMockBootstrap('central-coruja');

    expect(bootstrap.features['menu.books']?.enabled).toBe(true);
    expect(bootstrap.features['menu.collections']?.enabled).toBe(true);
    expect(bootstrap.menu.find((item) => item.key === 'books')?.enabled).toBe(true);
    expect(bootstrap.menu.find((item) => item.key === 'collections')?.enabled).toBe(true);
  });
});
