import { describe, expect, it } from 'vitest';
import catalogSeed from '../data/catalog.seed.json';
import { Collection } from '../types';
import { filterCollectionsForBrand } from './contentHygiene';

// A legacy backfill (20260525000200) wrote Kaboo seed rows into the central-coruja brand,
// keeping the seed UUIDs. The vitrine must keep hiding them, but the admin must be able to
// see them on the remote path — otherwise the junk is invisible AND unmanageable.

const BRAND_ID = 'brand-coruja';
const SEEDED_ID = (catalogSeed as { collections: Collection[] }).collections[0].id;

const collection = (overrides: Partial<Collection>): Collection => ({
  id: 'real-id',
  title: 'Conhecendo a Liga das Corujinhas',
  brand_id: BRAND_ID,
  cover_image: 'https://cdn/real.png',
  collection_assets: [],
  ...overrides,
} as Collection);

describe('filterCollectionsForBrand — central-coruja hygiene', () => {
  const seeded = collection({ id: SEEDED_ID, title: 'Kaboo e o Espelho das Emoções' });
  const real = collection({});
  const all = [seeded, real];

  it('esconde da vitrine as linhas com id de seed (conteúdo Kaboo)', () => {
    const result = filterCollectionsForBrand(all, 'central-coruja', BRAND_ID);
    expect(result.map((c) => c.id)).toEqual([real.id]);
  });

  it('mostra ao admin as linhas com id de seed vindas do banco remoto', () => {
    const result = filterCollectionsForBrand(all, 'central-coruja', BRAND_ID, {
      adminMode: true,
      fromRemote: true,
    });
    expect(result.map((c) => c.id)).toEqual([SEEDED_ID, real.id]);
  });

  it('ainda esconde do admin as linhas de seed locais (modo mock)', () => {
    const result = filterCollectionsForBrand(all, 'central-coruja', BRAND_ID, { adminMode: true });
    expect(result.map((c) => c.id)).toEqual([real.id]);
  });

  it('nunca mostra capas /mock/, nem para o admin remoto', () => {
    const mocked = collection({ id: 'mock-cover', cover_image: '/mock/x.png' });
    const result = filterCollectionsForBrand([mocked, real], 'central-coruja', BRAND_ID, {
      adminMode: true,
      fromRemote: true,
    });
    expect(result.map((c) => c.id)).toEqual([real.id]);
  });
});
