import { describe, expect, it } from 'vitest';

import { areNavStatesEqual, getHashScreen, getHashUrlForScreen, getNavStateFromHashString } from './navHistory';

describe('nav history helpers', () => {
  it('serializes the Livros view into the home hash', () => {
    expect(getHashUrlForScreen('home', { collectionGroup: 'books' })).toBe('#home?collectionGroup=books');
  });

  it('parses the Livros home hash back into nav params', () => {
    expect(getNavStateFromHashString('#home?collectionGroup=books')).toEqual({
      currentScreen: 'home',
      params: { collectionGroup: 'books' },
    });
  });

  it('keeps plain home hashes param-free', () => {
    expect(getHashScreen('#home')).toBe('home');
    expect(getNavStateFromHashString('#home')).toEqual({ currentScreen: 'home' });
  });

  it('treats home states with different collection groups as different states', () => {
    expect(areNavStatesEqual(
      { currentScreen: 'home' },
      { currentScreen: 'home', params: { collectionGroup: 'books' } },
    )).toBe(false);
  });
});
