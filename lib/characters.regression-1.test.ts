import { describe, expect, it } from 'vitest';

import { Character } from '../types';
import { resolveCharacterNamesFromIds, syncCollectionCharacters } from './characters';

const buildCharacter = (overrides: Partial<Character> & Pick<Character, 'id' | 'name'>): Character => ({
  id: overrides.id,
  name: overrides.name,
  description: overrides.description ?? '',
  traits: overrides.traits ?? [],
  aliases: overrides.aliases ?? [],
  image_url: overrides.image_url ?? null,
  status: overrides.status ?? 'active',
});

describe('collection character visibility sync', () => {
  const characters = [
    buildCharacter({
      id: 'kaboo',
      name: 'Kaboo',
      status: 'active',
    }),
    buildCharacter({
      id: 'qa-personagem-sprint-2',
      name: 'QA Personagem Sprint 2',
      status: 'inactive',
    }),
  ];

  it('keeps inactive ids resolvable for admin editing while allowing public-safe name filtering', () => {
    expect(resolveCharacterNamesFromIds(['qa-personagem-sprint-2'], characters)).toEqual(['QA Personagem Sprint 2']);
    expect(resolveCharacterNamesFromIds(['qa-personagem-sprint-2'], characters, { includeInactive: false })).toEqual([]);
  });

  it('removes inactive character names from the synced public collection payload', () => {
    // Regression: BUG-006 — inactive linked characters still affected public collection search and details
    // Found by /qa on 2026-05-09
    // Report: .gstack/qa-reports/qa-report-sprint2-2026-05-09.md
    const syncedCollection = syncCollectionCharacters({
      character_ids: ['kaboo', 'qa-personagem-sprint-2'],
      characters: ['Kaboo', 'QA Personagem Sprint 2', 'Visitante Especial'],
    }, characters);

    expect(syncedCollection.character_ids).toEqual(['kaboo', 'qa-personagem-sprint-2']);
    expect(syncedCollection.characters).toEqual(['Kaboo', 'Visitante Especial']);
  });
});
