import { afterEach, describe, expect, it } from 'vitest';

import { getCharacterImageUrl } from './constants';
import { setCharacterRegistrySnapshot } from './lib/characters';

afterEach(() => {
  setCharacterRegistrySnapshot(null);
});

describe('getCharacterImageUrl', () => {
  it('resolves a local asset for seeded characters', () => {
    const imageUrl = getCharacterImageUrl('Kaboo');

    expect(imageUrl).toContain('kaboo');
    expect(imageUrl).toContain('.png');
  });

  it('returns an empty string for characters without local or uploaded image', () => {
    setCharacterRegistrySnapshot([
      {
        id: 'smoke-no-image',
        name: 'Smoke No Image',
        description: 'Personagem temporário sem imagem.',
        traits: [],
        aliases: [],
        image_url: null,
        status: 'active',
      },
    ]);

    expect(getCharacterImageUrl('Smoke No Image')).toBe('');
  });

  it('prefers an uploaded image when the registry provides one', () => {
    setCharacterRegistrySnapshot([
      {
        id: 'smoke-uploaded',
        name: 'Smoke Uploaded',
        description: 'Personagem temporário com upload.',
        traits: [],
        aliases: [],
        image_url: 'https://example.com/characters/smoke-uploaded.png',
        status: 'active',
      },
    ]);

    expect(getCharacterImageUrl('Smoke Uploaded')).toBe('https://example.com/characters/smoke-uploaded.png');
  });
});