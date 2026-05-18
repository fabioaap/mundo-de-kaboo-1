import { beforeEach, describe, expect, it, vi } from 'vitest';

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

const stubBrowserStorage = () => {
  const sessionStorage = createStorageMock();
  const localStorage = createStorageMock();

  vi.stubGlobal('sessionStorage', sessionStorage);
  vi.stubGlobal('localStorage', localStorage);
  vi.stubGlobal('window', {
    sessionStorage,
    localStorage,
  });
};

describe('brand-aware character registry', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('starts Central Coruja with an empty character catalog and keeps it isolated from Kaboo seeds', async () => {
    // Regression: Central Coruja character management leaked Kaboo seed characters
    // Found by user report on 2026-05-09
    // Report: conversational validation during Central Coruja catalog cleanup
    stubBrowserStorage();

    const {
      getMockCharactersLive,
      mockCreateCharacter,
      setActiveBrandForCharacters,
    } = await import('./characters');

    setActiveBrandForCharacters('central-coruja');
    expect(getMockCharactersLive()).toEqual([]);

    const createdCharacter = mockCreateCharacter({
      name: 'Coruja Guia',
      description: 'Personagem próprio da Central Coruja.',
    });

    expect(createdCharacter.name).toBe('Coruja Guia');
    expect(getMockCharactersLive().map((character) => character.name)).toEqual(['Coruja Guia']);

    setActiveBrandForCharacters('kaboo');
    const kabooCharacters = getMockCharactersLive();
    expect(kabooCharacters.length).toBeGreaterThan(0);
    expect(kabooCharacters.some((character) => character.name === 'Kaboo')).toBe(true);
    expect(kabooCharacters.some((character) => character.name === 'Coruja Guia')).toBe(false);

    setActiveBrandForCharacters('central-coruja');
    expect(getMockCharactersLive().map((character) => character.name)).toEqual(['Coruja Guia']);
  });
});
