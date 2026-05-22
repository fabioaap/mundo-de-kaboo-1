import { describe, expect, it } from 'vitest';

import catalogSeed from '../data/catalog.seed.json';
import centralMaterialsSeed from '../data/central-materials.seed.json';
import { CHARACTERS as CHARACTER_SEED } from '../data/characters';
import { CentralMaterial, Character, Collection } from '../types';

import {
  filterCentralMaterialsForBrand,
  filterCharactersForBrand,
  filterCollectionsForBrand,
  shouldUseSharedMediaCatalog,
} from './contentHygiene';

type CatalogSeedShape = {
  collections?: Collection[];
};

const seedCollection = (((catalogSeed as CatalogSeedShape).collections) ?? [])[0];

if (!seedCollection) {
  throw new Error('Expected at least one seeded collection for content hygiene tests.');
}

const realCollection: Collection = {
  id: 'central-coruja-real-collection',
  title: 'Percurso de acolhimento da Coruja',
  cover_image: 'https://assets.educacross.com/coruja/acolhimento-cover.png',
  level: 'Fundamental I',
  theme: 'Escuta e acolhimento',
  learning_objectives: 'Apoiar rodas de conversa com mediação e repertório real.',
  characters: [],
  character_ids: [],
  bncc_skills: [],
  casel_competencies: [],
  age_grade: [],
  extra_materials: [],
  collection_assets: [],
  segments: ['E.F. Anos Iniciais'],
  primary_segment: 'E.F. Anos Iniciais',
};

const qaCollection: Collection = {
  ...realCollection,
  id: 'central-coruja-regression-collection',
  title: 'Regression BUG-005 Create',
  cover_image: 'https://cdn.example.com/regression-cover.png',
};

const devMockCollection: Collection = {
  ...realCollection,
  id: 'mock-171631234-real-central-coruja-book',
  title: 'Conhecendo a Liga das Corujinhas',
  cover_image: 'https://project.supabase.co/storage/v1/object/public/collections/covers/temp/coruja-book.png',
  collection_assets: [
    {
      id: 'reading-1',
      category: 'reading',
      media_type: 'document',
      title: 'Conhecendo a Liga das Corujinhas',
      url: 'https://project.supabase.co/storage/v1/object/public/collections/pdfs/temp/liga-das-corujinhas.pdf',
    },
  ],
};

const realCharacter: Character = {
  id: 'coruja-guia',
  name: 'Coruja Guia',
  description: 'Personagem original da Central Coruja.',
  traits: ['Acolhedora', 'Observadora'],
  aliases: [],
  image_url: null,
  status: 'active',
};

const qaCharacter: Character = {
  id: 'regression-qa-character',
  name: 'QA Coruja',
  description: 'Mock character for regression only.',
  traits: ['Teste'],
  aliases: [],
  image_url: 'https://cdn.example.com/regression-character.png',
  status: 'active',
};

const devMockCharacter: Character = {
  id: 'mock-character-123',
  name: 'Lia Curadora',
  description: 'Personagem real criada no ambiente operacional da Central Coruja.',
  traits: ['Curiosa'],
  aliases: [],
  image_url: 'https://project.supabase.co/storage/v1/object/public/collections/characters/lia-curadora.png',
  status: 'active',
};

describe('content hygiene for Central Coruja', () => {
  it('removes seeded and explicit QA/mock collections while preserving real content', () => {
    const filtered = filterCollectionsForBrand(
      [seedCollection, qaCollection, realCollection, devMockCollection],
      'central-coruja',
    );

    expect(filtered.map((collection) => collection.id)).toEqual([realCollection.id, devMockCollection.id]);
  });

  it('removes seeded and explicit QA/mock characters while preserving real ones', () => {
    const filtered = filterCharactersForBrand(
      [CHARACTER_SEED[0], qaCharacter, realCharacter, devMockCharacter],
      'central-coruja',
    );

    expect(filtered.map((character) => character.id)).toEqual([realCharacter.id, devMockCharacter.id]);
  });

  it('hides local seed materials and shared standalone media catalog for Central Coruja', () => {
    const materials = centralMaterialsSeed as CentralMaterial[];

    expect(filterCentralMaterialsForBrand(materials, 'central-coruja')).toEqual([]);
    expect(shouldUseSharedMediaCatalog('central-coruja')).toBe(false);
    expect(shouldUseSharedMediaCatalog('kaboo')).toBe(true);
  });
});
