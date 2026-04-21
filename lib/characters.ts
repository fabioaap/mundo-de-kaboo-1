import { CHARACTERS as CHARACTER_SEED } from '../data/characters';
import { Character, Collection } from '../types';

const MOCK_CHARACTERS_STORAGE_KEY = 'kaboo_mock_characters';
let runtimeCharactersSnapshot: Character[] | null = null;

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export const normalizeCharacterLookupKey = (value: string): string => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const createCharacterId = (value: string): string => {
  return normalizeCharacterLookupKey(value).replace(/\s+/g, '-');
};

const uniqueStrings = (values?: Array<string | null | undefined>): string[] => {
  if (!values) {
    return [];
  }

  return Array.from(
    new Map(
      values
        .map((value) => value?.trim())
        .filter(Boolean)
        .map((value) => [normalizeCharacterLookupKey(value as string), value as string])
    ).values()
  );
};

export const normalizeCharacter = (character: Partial<Character> & { name: string }): Character => {
  const normalizedName = character.name.trim() || 'Novo personagem';

  return {
    id: (character.id?.trim() || createCharacterId(normalizedName)),
    name: normalizedName,
    description: character.description?.trim() || '',
    traits: uniqueStrings(character.traits),
    aliases: uniqueStrings(character.aliases),
    image_url: character.image_url?.trim() || null,
    status: character.status === 'inactive' ? 'inactive' : 'active',
  };
};

const mergeCharacterRecords = (base: Character, override?: Character): Character => {
  if (!override) {
    return normalizeCharacter(base);
  }

  return normalizeCharacter({
    id: override.id || base.id,
    name: override.name || base.name,
    description: override.description ?? base.description,
    traits: override.traits?.length ? override.traits : base.traits,
    aliases: [...(base.aliases || []), ...(override.aliases || [])],
    image_url: override.image_url ?? base.image_url ?? null,
    status: override.status ?? base.status,
  });
};

const getSeedCharacters = (): Character[] => {
  return CHARACTER_SEED.map((character) => normalizeCharacter(character));
};

const readStoredCharacters = (): Character[] | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem(MOCK_CHARACTERS_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    return (JSON.parse(stored) as Character[]).map((character) => normalizeCharacter(character));
  } catch {
    return null;
  }
};

const sortCharacters = (characters: Character[]): Character[] => {
  return [...characters].sort((left, right) => {
    if ((left.status || 'active') !== (right.status || 'active')) {
      return (left.status || 'active') === 'active' ? -1 : 1;
    }

    return left.name.localeCompare(right.name, 'pt-BR');
  });
};

const mergeSeedCharacters = (storedCharacters: Character[] | null): { characters: Character[]; changed: boolean } => {
  const seedCharacters = getSeedCharacters();

  if (!storedCharacters || storedCharacters.length === 0) {
    return {
      characters: seedCharacters,
      changed: true,
    };
  }

  const storedById = new Map(storedCharacters.map((character) => [character.id, normalizeCharacter(character)]));
  const seedById = new Map(seedCharacters.map((character) => [character.id, character]));
  const mergedIds = new Set<string>([
    ...seedById.keys(),
    ...storedById.keys(),
  ]);

  const mergedCharacters = Array.from(mergedIds).map((id) => {
    const seedCharacter = seedById.get(id);
    const storedCharacter = storedById.get(id);

    if (seedCharacter) {
      return mergeCharacterRecords(seedCharacter, storedCharacter);
    }

    return normalizeCharacter(storedCharacter as Character);
  });

  return {
    characters: sortCharacters(mergedCharacters),
    changed: JSON.stringify(sortCharacters(storedCharacters)) !== JSON.stringify(sortCharacters(mergedCharacters)),
  };
};

const writeStoredCharacters = (characters: Character[]): void => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(MOCK_CHARACTERS_STORAGE_KEY, JSON.stringify(sortCharacters(characters)));
};

export const setCharacterRegistrySnapshot = (characters: Character[] | null): void => {
  if (!characters) {
    runtimeCharactersSnapshot = null;
    return;
  }

  const normalizedCharacters = sortCharacters(characters.map((character) => normalizeCharacter(character)));
  runtimeCharactersSnapshot = normalizedCharacters;
  writeStoredCharacters(normalizedCharacters);
};

export const getLiveCharacters = (): Character[] => {
  if (runtimeCharactersSnapshot) {
    return clone(runtimeCharactersSnapshot);
  }

  const storedCharacters = readStoredCharacters();
  const mergedCharacters = mergeSeedCharacters(storedCharacters);

  if (mergedCharacters.changed) {
    writeStoredCharacters(mergedCharacters.characters);
  }

  return mergedCharacters.characters;
};

export const getMockCharactersLive = (): Character[] => clone(getLiveCharacters());

export const getAvatarCharacters = (characters: Character[] = getLiveCharacters()): string[] => {
  return sortCharacters(characters)
    .filter((character) => (character.status || 'active') === 'active')
    .map((character) => character.name);
};

const getCharactersByLookup = (characters: Character[]) => {
  const lookup = new Map<string, Character>();

  characters.forEach((character) => {
    lookup.set(normalizeCharacterLookupKey(character.id), character);
    lookup.set(normalizeCharacterLookupKey(character.name), character);
    (character.aliases || []).forEach((alias) => {
      lookup.set(normalizeCharacterLookupKey(alias), character);
    });
  });

  return lookup;
};

export const getCharacterById = (id: string, characters: Character[] = getLiveCharacters()): Character | null => {
  const trimmedId = id?.trim();
  if (!trimmedId) {
    return null;
  }

  return characters.find((character) => character.id === trimmedId) || null;
};

export const getCharacterByAnyName = (value: string, characters: Character[] = getLiveCharacters()): Character | null => {
  const lookupValue = normalizeCharacterLookupKey(value || '');
  if (!lookupValue) {
    return null;
  }

  return getCharactersByLookup(characters).get(lookupValue) || null;
};

export const resolveCharacterIdsFromNames = (names: string[], characters: Character[] = getLiveCharacters()) => {
  const resolvedIds: string[] = [];
  const unresolvedNames: string[] = [];

  uniqueStrings(names).forEach((name) => {
    const matchedCharacter = getCharacterByAnyName(name, characters);

    if (matchedCharacter) {
      resolvedIds.push(matchedCharacter.id);
      return;
    }

    unresolvedNames.push(name);
  });

  return {
    resolvedIds: uniqueStrings(resolvedIds),
    unresolvedNames,
  };
};

export const resolveCharacterNamesFromIds = (ids: string[], characters: Character[] = getLiveCharacters()): string[] => {
  return uniqueStrings(
    ids.map((id) => getCharacterById(id, characters)?.name).filter(Boolean) as string[]
  );
};

export const syncCollectionCharacters = <T extends Partial<Collection>>(
  collectionLike: T,
  characters: Character[] = getLiveCharacters()
) => {
  const currentCharacterIds = uniqueStrings(collectionLike.character_ids);
  const currentNames = uniqueStrings(collectionLike.characters);
  const resolvedFromNames = resolveCharacterIdsFromNames(currentNames, characters);
  const mergedCharacterIds = uniqueStrings([...currentCharacterIds, ...resolvedFromNames.resolvedIds]);
  const mergedCharacterNames = uniqueStrings([
    ...resolveCharacterNamesFromIds(mergedCharacterIds, characters),
    ...resolvedFromNames.unresolvedNames,
  ]);

  return {
    ...collectionLike,
    character_ids: mergedCharacterIds,
    characters: mergedCharacterNames,
  };
};

export const syncCollectionsCharacters = (collections: Collection[], characters: Character[] = getLiveCharacters()): Collection[] => {
  return collections.map((collection) => syncCollectionCharacters(collection, characters) as Collection);
};

const getUniqueCharacterId = (requestedId: string, characters: Character[]): string => {
  if (!characters.some((character) => character.id === requestedId)) {
    return requestedId;
  }

  let suffix = 2;
  let nextId = `${requestedId}-${suffix}`;

  while (characters.some((character) => character.id === nextId)) {
    suffix += 1;
    nextId = `${requestedId}-${suffix}`;
  }

  return nextId;
};

export const mockCreateCharacter = (input: Partial<Character> & { name: string }): Character => {
  const characters = getLiveCharacters();
  const normalizedCharacter = normalizeCharacter(input);
  const nextCharacter: Character = {
    ...normalizedCharacter,
    id: getUniqueCharacterId(normalizedCharacter.id, characters),
  };
  const nextCharacters = sortCharacters([...characters, nextCharacter]);

  setCharacterRegistrySnapshot(nextCharacters);
  return clone(nextCharacter);
};

export const mockUpdateCharacter = (id: string, updates: Partial<Character>): Character | null => {
  const characters = getLiveCharacters();
  const characterIndex = characters.findIndex((character) => character.id === id);

  if (characterIndex === -1) {
    return null;
  }

  const currentCharacter = characters[characterIndex];
  const requestedName = updates.name?.trim() || currentCharacter.name;
  const hasRenamedCharacter = normalizeCharacterLookupKey(requestedName) !== normalizeCharacterLookupKey(currentCharacter.name);
  const aliases = hasRenamedCharacter
    ? uniqueStrings([...(currentCharacter.aliases || []), ...(updates.aliases || []), currentCharacter.name])
    : uniqueStrings(updates.aliases ?? currentCharacter.aliases);

  const nextCharacter = normalizeCharacter({
    ...currentCharacter,
    ...updates,
    id,
    name: requestedName,
    aliases,
  });

  const nextCharacters = [...characters];
  nextCharacters[characterIndex] = nextCharacter;
  setCharacterRegistrySnapshot(sortCharacters(nextCharacters));

  return clone(nextCharacter);
};